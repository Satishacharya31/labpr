import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';

interface DocumentViewerProps {
    document: {
        id: string;
        title: string;
        subject: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        views: number;
        createdAt: string;
        author: string;
    } | null;
}

export default function DocumentViewer({ document }: DocumentViewerProps) {
    if (!document) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
                <Head>
                    <title>Document Not Found | Campus Kit</title>
                </Head>
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Document Not Found</h1>
                    <p className="text-gray-400 mb-6">The document you're looking for doesn't exist or has been removed.</p>
                    <Link href="/" className="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition-colors">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isPDF = document.mimeType === 'application/pdf';

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            <Head>
                <title>{document.title} | Campus Kit</title>
                <meta name="description" content={`View ${document.title} in ${document.subject} on Campus Kit.`} />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <link rel="canonical" href={`https://campuskit.vercel.app/document/${document.id}`} />
                <meta property="og:type" content="article" />
                <meta property="og:site_name" content="Campus Kit" />
                <meta property="og:url" content={`https://campuskit.vercel.app/document/${document.id}`} />
                <meta property="og:title" content={`${document.title} | Campus Kit`} />
                <meta property="og:description" content={`View ${document.title} in ${document.subject} on Campus Kit.`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${document.title} | Campus Kit`} />
                <meta name="twitter:description" content={`View ${document.title} in ${document.subject} on Campus Kit.`} />
            </Head>

            {/* Header */}
            <header className="bg-[#111118] border-b border-gray-800 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href={document.fileUrl}
                            download={document.fileName}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </a>
                        <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open in New Tab
                        </a>
                    </div>
                </div>
            </header>

            {/* Document Viewer */}
            <main className="flex-1 flex">
                {isPDF ? (
                    <iframe
                        src={`${document.fileUrl}#toolbar=1&navpanes=0`}
                        className="w-full h-full min-h-[calc(100vh-80px)]"
                        title={document.title}
                    />
                ) : document.mimeType.startsWith('image/') ? (
                    <div className="flex-1 flex items-center justify-center p-8 bg-gray-900">
                        <img
                            src={document.fileUrl}
                            alt={document.title}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-24 h-24 mb-6 rounded-2xl bg-gray-800 flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Preview not available</h2>
                        <p className="text-gray-400 mb-6">This file type ({document.mimeType}) cannot be previewed in browser.</p>
                        <a
                            href={document.fileUrl}
                            download={document.fileName}
                            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Download File
                        </a>
                    </div>
                )}
            </main>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
    const id = params?.id as string;

    if (!id) {
        return { props: { document: null } };
    }

    try {
        const doc = await prisma.content.findFirst({
            where: {
                id,
                type: { in: ['PDF', 'DOCUMENT', 'IMAGE'] },
                isPublished: true,
            },
            select: {
                id: true,
                title: true,
                subject: true,
                fileUrl: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                views: true,
                createdAt: true,
                user: {
                    select: { name: true },
                },
            },
        });

        if (!doc || !doc.fileUrl) {
            return { props: { document: null } };
        }

        // Increment view count
        await prisma.content.update({
            where: { id: doc.id },
            data: { views: { increment: 1 } },
        });

        return {
            props: {
                document: {
                    id: doc.id,
                    title: doc.title,
                    subject: doc.subject,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName || 'document',
                    fileSize: doc.fileSize || 0,
                    mimeType: doc.mimeType || 'application/octet-stream',
                    views: doc.views + 1,
                    createdAt: doc.createdAt.toISOString(),
                    author: doc.user?.name || 'Unknown',
                },
            },
        };
    } catch (error) {
        console.error('Error fetching document:', error);
        return { props: { document: null } };
    }
};
