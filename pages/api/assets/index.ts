import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadBase64, deleteByUrl, getMimeType, isImage } from '@/lib/azure-storage';

// Disable default body parser for file uploads
const MAX_ASSET_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '75mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized - Please login' });
    }

    // GET - List user's assets
    if (req.method === 'GET') {
        try {
            const { folder } = req.query;

            const assets = await prisma.asset.findMany({
                where: {
                    userId: session.user.id,
                    ...(folder ? { folder: folder as string } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    url: true,
                    thumbnailUrl: true,
                    mimeType: true,
                    size: true,
                    width: true,
                    height: true,
                    folder: true,
                    createdAt: true,
                },
            });

            return res.status(200).json({ assets });
        } catch (error) {
            console.error('Failed to fetch assets:', error);
            return res.status(500).json({ error: 'Failed to fetch assets' });
        }
    }

    // POST - Upload new asset
    if (req.method === 'POST') {
        try {
            const { file, fileName, folder = 'general' } = req.body;

            if (!file || !fileName) {
                return res.status(400).json({ error: 'File and fileName are required' });
            }

            const bufferSize = Buffer.from(file.replace(/^data:[^;]+;base64,/, ''), 'base64').length;
            const maxAllowedSize = folder === 'content-pdfs' ? MAX_DOCUMENT_SIZE_BYTES : MAX_ASSET_SIZE_BYTES;

            if (bufferSize > maxAllowedSize) {
                const maxLabel = folder === 'content-pdfs' ? '50MB' : '10MB';
                return res.status(413).json({ error: `File too large. Maximum size is ${maxLabel}.` });
            }

            // Upload to Azure Blob Storage
            const mimeType = getMimeType(fileName);
            const result = await uploadBase64(file, fileName, {
                folder: `assets/${session.user.id}/${folder}`,
                contentType: mimeType,
            });

            // Create slug from filename
            const slug = fileName
                .toLowerCase()
                .replace(/[^a-z0-9.]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Get image dimensions if it's an image (would need image processing library)
            let width: number | undefined;
            let height: number | undefined;

            // For now, we'll extract dimensions on the client side
            // In production, you'd use a library like sharp to get dimensions

            // Save to database
            const asset = await prisma.asset.create({
                data: {
                    name: fileName,
                    slug,
                    url: result.url,
                    mimeType,
                    size: bufferSize,
                    width,
                    height,
                    folder,
                    userId: session.user.id,
                },
            });

            return res.status(201).json({
                asset,
                message: 'Asset uploaded successfully',
            });
        } catch (error) {
            console.error('Failed to upload asset:', error);
            return res.status(500).json({ error: 'Failed to upload asset' });
        }
    }

    // DELETE - Delete asset by ID
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ error: 'Asset ID is required' });
            }

            // Find the asset
            const asset = await prisma.asset.findFirst({
                where: {
                    id,
                    userId: session.user.id,
                },
            });

            if (!asset) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            // Delete from Azure Blob Storage
            await deleteByUrl(asset.url);
            if (asset.thumbnailUrl) {
                await deleteByUrl(asset.thumbnailUrl);
            }

            // Delete from database
            await prisma.asset.delete({
                where: { id },
            });

            return res.status(200).json({ message: 'Asset deleted successfully' });
        } catch (error) {
            console.error('Failed to delete asset:', error);
            return res.status(500).json({ error: 'Failed to delete asset' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
