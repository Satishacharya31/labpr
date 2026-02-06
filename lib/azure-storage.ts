import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

// Azure Blob Storage configuration
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'campuskit-files';

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

// Initialize clients lazily
function getContainerClient(): ContainerClient {
    if (!containerClient) {
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
        }
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);
    }
    return containerClient;
}

// Ensure container exists
export async function ensureContainer(): Promise<void> {
    const client = getContainerClient();
    await client.createIfNotExists({
        access: 'blob', // Public read access for blobs
    });
}

interface UploadResult {
    url: string;
    blobName: string;
}

interface UploadOptions {
    folder?: string;      // Folder path in blob storage
    fileName?: string;    // Custom file name (optional, generates UUID if not provided)
    contentType?: string; // MIME type
}

/**
 * Upload a file buffer to Azure Blob Storage
 */
export async function uploadFile(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    await ensureContainer();
    const client = getContainerClient();

    // Generate blob name
    const ext = originalName.split('.').pop() || '';
    const baseName = options.fileName || `${uuidv4()}`;
    const folder = options.folder || 'uploads';
    const blobName = `${folder}/${baseName}.${ext}`;

    // Get block blob client
    const blockBlobClient = client.getBlockBlobClient(blobName);

    // Upload with content type
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: options.contentType || getMimeType(originalName),
        },
    });

    return {
        url: blockBlobClient.url,
        blobName,
    };
}

/**
 * Upload a base64 encoded file
 */
export async function uploadBase64(
    base64Data: string,
    originalName: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    return uploadFile(buffer, originalName, options);
}

/**
 * Delete a blob from storage
 */
export async function deleteBlob(blobName: string): Promise<void> {
    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
}

/**
 * Delete a file by URL
 */
export async function deleteByUrl(url: string): Promise<void> {
    const blobName = extractBlobName(url);
    if (blobName) {
        await deleteBlob(blobName);
    }
}

/**
 * Extract blob name from full URL
 */
export function extractBlobName(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // Remove container name (first part after /)
        pathParts.shift(); // Remove empty string
        pathParts.shift(); // Remove container name
        return pathParts.join('/');
    } catch {
        return null;
    }
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const mimeTypes: Record<string, string> = {
        // Images
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',

        // Documents
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        // Text
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        html: 'text/html',
        css: 'text/css',
        js: 'text/javascript',

        // Archives
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',

        // Media
        mp4: 'video/mp4',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
    };

    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
