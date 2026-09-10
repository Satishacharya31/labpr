import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import formidable from 'formidable';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deleteByUrl, getMimeType, uploadStream } from '@/lib/azure-storage';

/**
 * ALL file uploads go through THIS server — no SAS, no direct-to-Azure from the browser.
 *
 * Supported content types:
 *   multipart/form-data  → file upload (PDF, DOCX, PPTX, DOC, PPT, images, etc.)
 *   application/json     → register an existing URL (no file bytes)
 *
 * Body parser is disabled so Node.js streams the request body directly
 * to formidable/Azure without buffering it in memory.
 */
export const config = {
    api: {
        bodyParser: false,    // MUST be false — lets us stream large files
        responseLimit: false, // No response size cap either
    },
};

const MAX_ASSET_SIZE    = 50 * 1024 * 1024;  // 50 MB  — images / videos / generic assets
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;  // 50 MB  — PDFs, DOCX, PPTX …

const DOCUMENT_FOLDERS = new Set(['content-pdfs', 'documents']);

const ALLOWED_MIME: Record<string, true> = {
    // Documents
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'text/plain': true,
    'text/csv': true,
    // Images
    'image/jpeg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/svg+xml': true,
    'image/x-icon': true,
    // Archives / misc
    'application/zip': true,
    'application/x-rar-compressed': true,
    'application/octet-stream': true,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSlug(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/** Read JSON body from a raw request (bodyParser is off). */
async function readJson(req: NextApiRequest): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk: Buffer) => { raw += chunk.toString('utf8'); });
        req.on('end', () => {
            try { resolve(raw ? JSON.parse(raw) : {}); }
            catch { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', reject);
    });
}

/** Parse multipart/form-data and upload the file straight to Azure. */
async function handleMultipartUpload(
    req: NextApiRequest,
    userId: string,
): Promise<{
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
    folder: string;
}> {
    return new Promise((resolve, reject) => {
        const form = formidable({
            maxFileSize: MAX_DOCUMENT_SIZE,   // 50 MB ceiling
            multiples: false,
            keepExtensions: true,
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                const errMsg = String(err);
                // formidable v3 throws error code 1009 or message containing 'maxFileSize'
                if (errMsg.includes('maxFileSize') || errMsg.includes('1009')) {
                    return reject(Object.assign(new Error('File exceeds the 50 MB limit.'), { status: 413 }));
                }
                return reject(err);
            }

            try {
                const raw = Array.isArray(files.file) ? files.file[0] : files.file;
                if (!raw) return reject(Object.assign(new Error('No file field found in form data.'), { status: 400 }));

                const folder: string = (Array.isArray(fields.folder) ? fields.folder[0] : fields.folder) || 'assets';
                const isDoc = DOCUMENT_FOLDERS.has(folder);
                const maxAllowed = isDoc ? MAX_DOCUMENT_SIZE : MAX_ASSET_SIZE;

                if (raw.size > maxAllowed) {
                    await fs.promises.unlink(raw.filepath).catch(() => {});
                    return reject(Object.assign(
                        new Error(`File too large. Max 50 MB for ${isDoc ? 'documents' : 'assets'}.`),
                        { status: 413 },
                    ));
                }

                const fileName: string = (Array.isArray(fields.fileName) ? fields.fileName[0] : fields.fileName)
                    || raw.originalFilename
                    || 'upload';

                const mimeType: string = (Array.isArray(fields.mimeType) ? fields.mimeType[0] : fields.mimeType)
                    || raw.mimetype
                    || getMimeType(fileName)
                    || 'application/octet-stream';

                // Validate MIME
                const baseMime = mimeType.split(';')[0].trim();
                if (!ALLOWED_MIME[baseMime] && !baseMime.startsWith('image/') && !baseMime.startsWith('text/') && !baseMime.startsWith('video/')) {
                    await fs.promises.unlink(raw.filepath).catch(() => {});
                    return reject(Object.assign(new Error(`File type "${baseMime}" is not allowed.`), { status: 415 }));
                }

                // Stream from temp file on disk → Azure Blob Storage
                const result = await uploadStream(
                    fs.createReadStream(raw.filepath),
                    fileName,
                    {
                        folder: `assets/${userId}/${folder}`,
                        contentType: mimeType,
                    },
                );

                // Clean up temp file
                await fs.promises.unlink(raw.filepath).catch(() => {});

                resolve({ fileName, url: result.url, mimeType, size: raw.size, folder });
            } catch (uploadErr) {
                reject(uploadErr);
            }
        });
    });
}

// ─── main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized – please sign in first.' });
    }

    const userId = session.user.id;

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
        try {
            const { folder } = req.query;
            const assets = await prisma.asset.findMany({
                where: {
                    userId,
                    ...(folder ? { folder: folder as string } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, name: true, slug: true, url: true,
                    thumbnailUrl: true, mimeType: true, size: true,
                    width: true, height: true, folder: true, createdAt: true,
                },
            });
            return res.status(200).json({ assets });
        } catch (err) {
            console.error('[assets] GET error:', err);
            return res.status(500).json({ error: 'Failed to fetch assets.' });
        }
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
        try {
            let fileName: string;
            let url: string;
            let mimeType: string;
            let size: number;
            let folder: string;
            let width: number | undefined;
            let height: number | undefined;
            let thumbnailUrl: string | undefined;

            const contentType = req.headers['content-type'] || '';

            if (contentType.includes('multipart/form-data')) {
                // ── multipart: actual file upload ──
                const result = await handleMultipartUpload(req, userId);
                fileName   = result.fileName;
                url        = result.url;
                mimeType   = result.mimeType;
                size       = result.size;
                folder     = result.folder;
            } else {
                // ── JSON: register metadata for a URL already stored ──
                const body = await readJson(req);
                fileName     = body.fileName     as string;
                url          = body.url          as string;
                mimeType     = body.mimeType     as string;
                size         = Number(body.size) || 0;
                folder       = (body.folder      as string) || 'general';
                width        = body.width        ? Number(body.width)  : undefined;
                height       = body.height       ? Number(body.height) : undefined;
                thumbnailUrl = body.thumbnailUrl as string | undefined;

                if (!fileName) return res.status(400).json({ error: '`fileName` is required.' });
                if (!url)      return res.status(400).json({ error: '`url` is required.' });
                if (!mimeType) mimeType = getMimeType(fileName);
            }

            const slug = makeSlug(fileName);

            const asset = await prisma.asset.create({
                data: {
                    name: fileName,
                    slug,
                    url,
                    thumbnailUrl: thumbnailUrl ?? null,
                    mimeType,
                    size,
                    width:  width  ?? null,
                    height: height ?? null,
                    folder,
                    userId,
                },
            });

            return res.status(201).json({ asset, message: 'Asset uploaded successfully.' });
        } catch (err: unknown) {
            const status = (err as { status?: number }).status ?? 500;
            const message = err instanceof Error ? err.message : 'Upload failed.';
            console.error(`[assets] POST error (${status}):`, message);
            return res.status(status).json({ error: message });
        }
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
        try {
            const body = await readJson(req);
            const { id } = body;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Asset `id` is required.' });
            }

            const asset = await prisma.asset.findFirst({ where: { id, userId } });
            if (!asset) return res.status(404).json({ error: 'Asset not found.' });

            await deleteByUrl(asset.url);
            if (asset.thumbnailUrl) await deleteByUrl(asset.thumbnailUrl).catch(() => {});
            await prisma.asset.delete({ where: { id } });

            return res.status(200).json({ message: 'Asset deleted successfully.' });
        } catch (err) {
            console.error('[assets] DELETE error:', err);
            return res.status(500).json({ error: 'Failed to delete asset.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}
