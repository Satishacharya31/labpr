import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { resolveRelativeAssets } from '../lib/assets';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type FileTab = 'html' | 'css' | 'js';
type ContentType = 'CODE' | 'PDF';

interface ContentData {
  id?: string;
  title: string;
  subject: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  type: ContentType;
  fileUrl?: string; // For PDF
}

interface Asset {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  folder: string;
  createdAt: string;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<FileTab>('html');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Assets & Tree State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetsOpen, setIsAssetsOpen] = useState(true);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);

  const [content, setContent] = useState<ContentData>({
    title: '',
    subject: '',
    htmlCode: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
</head>
<body>
    
</body>
</html>`,
    cssCode: '',
    jsCode: '',
    type: 'CODE',
    fileUrl: '',
  });

  // Load content if editing
  useEffect(() => {
    if (id) {
      fetch(`/api/contents/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setContent({
              id: data.id,
              title: data.title || '',
              subject: data.subject || '',
              htmlCode: data.htmlCode || '',
              cssCode: data.cssCode || '',
              jsCode: data.jsCode || '',
              type: data.type || 'CODE',
              fileUrl: data.fileUrl || '',
            });
            if (data.isPublished) setDeployed(true);
          }
        })
        .catch(console.error);
    }
  }, [id]);

  // Load assets
  useEffect(() => {
    if (session?.user) {
      fetchAssets();
    }
  }, [session]);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Sidebar resize handlers
  // ... (Same resize logic as before)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(200, e.clientX), 500);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);


  const getPreviewHtml = () => {
    const resolvedHtml = resolveRelativeAssets(content.htmlCode, assets);
    const resolvedCss = resolveRelativeAssets(content.cssCode, assets);
    const resolvedJs = resolveRelativeAssets(content.jsCode, assets);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${resolvedCss}</style>
</head>
<body>
${resolvedHtml.replace(/<!DOCTYPE html>|<html[^>]*>|<\/html>|<head>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')}
<script>${resolvedJs}<\/script>
</body>
</html>`;
  };

  const handleSave = async (publish = false) => {
    if (!content.title || !content.subject) {
      alert('Please fill in title and subject');
      return;
    }

    setSaving(true);
    try {
      const url = id ? `/api/contents/${id}` : '/api/contents';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...content,
          isPublished: publish,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setContent((prev) => ({ ...prev, id: data.id }));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        if (publish) setDeployed(true);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    await handleSave(true);
    setDeploying(false);
  };

  // Asset Upload (Unified)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainPdf = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = isMainPdf ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isMainPdf ? '50MB' : '10MB';

    if (file.size > maxSizeBytes) {
      alert(`File too large. Maximum size is ${maxSizeLabel}.`);
      return;
    }

    if (isMainPdf) setUploadingPdf(true);
    else setUploadingAsset(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            fileName: file.name,
            folder: isMainPdf ? 'content-pdfs' : 'assets',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const uploadedAsset = data.asset;

          if (isMainPdf) {
            setContent(prev => ({ ...prev, fileUrl: uploadedAsset.url }));
          } else {
            fetchAssets();
          }
        } else {
          alert('Failed to upload file');
        }

        if (isMainPdf) setUploadingPdf(false);
        else setUploadingAsset(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      if (isMainPdf) setUploadingPdf(false);
      else setUploadingAsset(false);
    }

    e.target.value = '';
  };

  const handleDeleteAsset = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this asset?')) return;
    try {
      await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      });
      fetchAssets();
    } catch (error) { console.error(error); }
  };

  const copyAssetUrl = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    navigator.clipboard.writeText(asset.url);
    setCopiedAssetId(asset.id);
    setTimeout(() => setCopiedAssetId(null), 2000);
  };

  const insertAssetToCode = (asset: Asset) => {
    // Only insert if in Code mode
    if (content.type !== 'CODE') return;

    const isImage = asset.mimeType.startsWith('image/');
    // Use relative path
    const relativePath = `assets/${asset.name}`;

    let insertText = '';
    if (activeTab === 'html') {
      if (isImage) insertText = `<img src="${relativePath}" alt="${asset.name}" />`;
      else insertText = `<a href="${relativePath}" target="_blank">${asset.name}</a>`;
    } else if (activeTab === 'css') {
      insertText = `url("${relativePath}")`;
    } else {
      insertText = `"${relativePath}"`;
    }

    if (activeTab === 'html') setContent(prev => ({ ...prev, htmlCode: prev.htmlCode + '\n' + insertText }));
    else if (activeTab === 'css') setContent(prev => ({ ...prev, cssCode: prev.cssCode + '\n' + insertText }));
    else setContent(prev => ({ ...prev, jsCode: prev.jsCode + '\n' + insertText }));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const fileIcons = {
    html: <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 15l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M13.5 15l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>,
    css: <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.6l-8.4-3.6L5.2 3h13.6l1.6 15-8.4 3.6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>,
    js: <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M11 15h2v-4h-2m4 4h2" stroke="currentColor" strokeWidth="2" fill="none" /></svg>,
  };

  return (
    <>
      <Head>
        <title>{id ? 'Edit Project' : 'Online HTML Compiler & Project Upload'} - Campus Kit</title>
        <meta name="description" content="Upload your academic projects or use our online HTML, CSS, and JavaScript compiler. Share your work with the student community." />
        <meta name="keywords" content="html compiler, online code editor, upload project, academic resources, web development, campus kit" />
      </Head>

      <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden font-sans">
        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Saved successfully!
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="bg-[#252526] border-r border-[#3c3c3c] flex flex-col relative" style={{ width: sidebarWidth, minWidth: 200, maxWidth: 500 }}>
            {/* Header */}
            <div className="h-12 border-b border-[#3c3c3c] flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-2 text-gray-300 font-medium text-xs uppercase tracking-wide">
                <span>Explorer</span>
              </div>
              <Link href="/" className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </Link>
            </div>

            {/* Project Info & Type Selector */}
            <div className="p-3 border-b border-[#3c3c3c] space-y-3">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setContent(prev => ({ ...prev, type: 'CODE' }))}
                  className={`flex-1 py-1 text-xs rounded border ${content.type === 'CODE' ? 'bg-violet-500/20 text-violet-400 border-violet-500/50' : 'bg-[#3c3c3c] border-[#4c4c4c] text-gray-400'}`}
                >
                  Code
                </button>
                <button
                  onClick={() => setContent(prev => ({ ...prev, type: 'PDF' }))}
                  className={`flex-1 py-1 text-xs rounded border ${content.type === 'PDF' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-[#3c3c3c] border-[#4c4c4c] text-gray-400'}`}
                >
                  PDF
                </button>
              </div>
              <div>
                <input
                  type="text"
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  className="w-full bg-[#3c3c3c] border border-[#4c4c4c] rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Project Name"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={content.subject}
                  onChange={(e) => setContent({ ...content, subject: e.target.value })}
                  className="w-full bg-[#3c3c3c] border border-[#4c4c4c] rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Subject (e.g. Physics)"
                />
              </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Show Files only if CODE mode */}
              {content.type === 'CODE' && (
                <div className="px-1 space-y-0.5">
                  {(['html', 'css', 'js'] as FileTab[]).map((tab) => (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none rounded hover:bg-[#2a2d2e] transition-colors ${activeTab === tab ? 'bg-[#37373d] text-white' : 'text-gray-400'}`}
                    >
                      {fileIcons[tab]}
                      <span className="text-sm">{tab === 'html' ? 'index.html' : tab === 'css' ? 'style.css' : 'script.js'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* PDF File Indicator */}
              {content.type === 'PDF' && (
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="font-medium">Main Document</span>
                  </div>
                  {content.fileUrl ? (
                    <div className="truncate text-xs text-blue-400 hover:underline cursor-pointer" title={content.fileUrl} onClick={() => window.open(content.fileUrl, '_blank')}>
                      {content.fileUrl.split('/').pop()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic">No PDF uploaded</div>
                  )}
                </div>
              )}

              {/* Assets Folder (Always visible but collapsible) */}
              <div className="mt-2 px-1 border-t border-[#3c3c3c] pt-2">
                <div
                  onClick={() => setIsAssetsOpen(!isAssetsOpen)}
                  className="flex items-center gap-1 px-2 py-1 cursor-pointer select-none rounded hover:bg-[#2a2d2e] text-gray-400 hover:text-gray-200"
                >
                  <svg className={`w-3 h-3 transition-transform ${isAssetsOpen ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" /></svg>
                  <span className="text-sm font-medium">assets</span>
                  <div className="ml-auto text-xs text-gray-600">{assets.length}</div>
                </div>

                {isAssetsOpen && (
                  <div className="ml-4 pl-2 border-l border-[#3c3c3c] mt-1 space-y-0.5">
                    <div onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-[#2a2d2e] text-violet-400 hover:text-violet-300 group">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="text-xs italic">{uploadingAsset ? 'Uploading...' : 'Add Asset...'}</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.svg" onChange={(e) => handleFileUpload(e, false)} className="hidden" />

                    {assets.map(asset => (
                      <div key={asset.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', asset.url); }} onClick={() => insertAssetToCode(asset)} className="group flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-[#2a2d2e] text-gray-400 hover:text-white" title={asset.name}>
                        {asset.mimeType.includes('image') ? (
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : asset.mimeType.includes('pdf') ? (
                          <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                        <span className="text-xs truncate flex-1">{asset.name}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={(e) => copyAssetUrl(e, asset)} className="text-gray-500 hover:text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                          <button onClick={(e) => handleDeleteAsset(e, asset.id)} className="text-gray-500 hover:text-red-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Resize Handle */}
            <div onMouseDown={handleMouseDown} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-500/50 transition-colors group z-10"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /></div>
          </div>

          {/* Editor / Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Top Bar */}
            <div className="h-10 bg-[#1e1e1e] flex items-center justify-between border-b border-[#3c3c3c] px-3">
              {/* Tabs / Header */}
              <div className="flex items-center h-full overflow-x-auto">
                {content.type === 'CODE' ? (
                  (['html', 'css', 'js'] as FileTab[]).map((tab) => (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`h-full flex items-center gap-2 px-4 text-xs cursor-pointer border-r border-[#3c3c3c] transition-colors ${activeTab === tab ? 'bg-[#1e1e1e] text-white border-t-2 border-t-violet-500' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#1e1e1e]'}`}
                    >
                      {fileIcons[tab]}
                      <span>{tab === 'html' ? 'index.html' : tab === 'css' ? 'style.css' : 'script.js'}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center gap-2 px-4 text-xs border-r border-[#3c3c3c] bg-[#1e1e1e] text-white border-t-2 border-t-red-500">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span>PDF Preview</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Preview Toggle (Code only) */}
                {content.type === 'CODE' && (
                  <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3c3c3c]" title="Toggle Preview">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                )}
                <button onClick={() => handleSave(false)} disabled={saving} className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleDeploy} disabled={deploying} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  {deploying ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
              {content.type === 'CODE' ? (
                // CODE EDITOR
                <>
                  <div className={`${showPreview ? 'w-1/2' : 'w-full'} h-full relative group`}>
                    <MonacoEditor
                      height="100%"
                      language={activeTab === 'js' ? 'javascript' : activeTab}
                      theme="vs-dark"
                      value={activeTab === 'html' ? content.htmlCode : activeTab === 'css' ? content.cssCode : content.jsCode}
                      onChange={(value) => {
                        if (activeTab === 'html') setContent({ ...content, htmlCode: value || '' });
                        else if (activeTab === 'css') setContent({ ...content, cssCode: value || '' });
                        else setContent({ ...content, jsCode: value || '' });
                      }}
                      options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'Fira Code', Consolas, monospace", padding: { top: 16 }, scrollBeyondLastLine: false, automaticLayout: true }}
                    />
                  </div>
                  {showPreview && (
                    <div className="w-1/2 h-full border-l border-[#3c3c3c] flex flex-col bg-white">
                      {/* Preview Toolbar */}
                      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-2">
                        <span className="text-xs text-gray-500 font-medium">localhost:3000</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setPreviewDevice('mobile')} className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-gray-200 text-black' : 'text-gray-400'}`}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>
                          <button onClick={() => setPreviewDevice('desktop')} className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-gray-200 text-black' : 'text-gray-400'}`}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>
                        </div>
                      </div>
                      <div className="flex-1 relative bg-gray-50 overflow-auto flex justify-center p-4">
                        <iframe srcDoc={getPreviewHtml()} title="Preview" className={`bg-white shadow-xl transition-all duration-300 ${previewDevice === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`} sandbox="allow-scripts" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // PDF PREVIEW / UPLOAD
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  {content.fileUrl ? (
                    <div className="w-full h-full flex flex-col items-center">
                      <iframe src={content.fileUrl} className="w-full h-full rounded-lg border border-[#3c3c3c] bg-white" />
                      <button
                        onClick={() => setContent(prev => ({ ...prev, fileUrl: '' }))}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      >
                        Replace PDF
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-md w-full p-8 border-2 border-dashed border-[#3c3c3c] rounded-xl flex flex-col items-center text-center hover:border-violet-500 hover:bg-[#252526] transition-all group">
                      <div className="w-16 h-16 rounded-full bg-[#2d2d2d] flex items-center justify-center mb-4 group-hover:bg-violet-500/20">
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Upload PDF Document</h3>
                      <p className="text-sm text-gray-500 mb-6">Drag and drop your PDF here, or click to browse (max 50MB)</p>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileUpload(e, true)}
                        className="hidden"
                      />
                      <button
                        onClick={() => pdfInputRef.current?.click()}
                        disabled={uploadingPdf}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploadingPdf ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <span>Select File</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {content.type} MODE
                </span>
                <span>{deployed ? '• Published' : '• Draft'}</span>
              </div>
              <span>Campus kit Editor v2.0</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
