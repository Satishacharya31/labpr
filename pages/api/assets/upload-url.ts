import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateUploadUrl, getMimeType } from '@/lib/azure-storage';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: `Method ${req.method} not allowed.` });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized – please sign in first.' });
    }

    const { fileName, fileSize, mimeType, folder = 'assets' } = req.body || {};
    if (typeof fileName !== 'string' || !fileName.trim()) {
        return res.status(400).json({ error: '`fileName` is required.' });
    }

    const size = Number(fileSize);
    if (!Number.isFinite(size) || size < 0 || size > MAX_UPLOAD_SIZE) {
        return res.status(413).json({ error: 'File exceeds the 50 MB limit.' });
    }

    const contentType = typeof mimeType === 'string' && mimeType
        ? mimeType.split(';')[0].trim()
        : getMimeType(fileName);

    try {
        const result = await generateUploadUrl(fileName, {
            folder: `assets/${session.user.id}/${String(folder)}`,
            contentType,
        });
        return res.status(200).json({ ...result, fileName, fileSize: size, mimeType: contentType, folder });
    } catch (error) {
        console.error('[assets] upload URL error:', error);
        return res.status(500).json({ error: 'Failed to create upload URL.' });
    }
}