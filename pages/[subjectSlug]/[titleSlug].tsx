import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import prisma from '@/lib/prisma'
import { resolveRelativeAssets } from '@/lib/assets'

interface Content {
  id: string
  title: string
  subject: string
  htmlCode: string
  cssCode: string | null
  jsCode: string | null
  views: number
  createdAt: string
  userId: string
}

interface Asset {
  name: string;
  url: string;
}

interface Props {
  content: Content | null
  assets: Asset[]
  canonicalUrl: string
}

export default function ContentPage({ content, assets, canonicalUrl }: Props) {
  const router = useRouter()
  const [backButtonPos, setBackButtonPos] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef({
    moved: false,
    suppressClick: false,
    offsetX: 0,
    offsetY: 0,
  })

  const clampPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') {
      return { x, y }
    }

    const buttonWidth = 120
    const buttonHeight = 44
    const margin = 8

    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - buttonWidth - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - buttonHeight - margin),
    }
  }

  const handleBackMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()

    dragStateRef.current.moved = false
    dragStateRef.current.offsetX = event.clientX - backButtonPos.x
    dragStateRef.current.offsetY = event.clientY - backButtonPos.y
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      const rawX = event.clientX - dragStateRef.current.offsetX
      const rawY = event.clientY - dragStateRef.current.offsetY
      const next = clampPosition(rawX, rawY)

      setBackButtonPos((current) => {
        if (Math.abs(next.x - current.x) > 2 || Math.abs(next.y - current.y) > 2) {
          dragStateRef.current.moved = true
        }
        return next
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (dragStateRef.current.moved) {
        dragStateRef.current.suppressClick = true
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleBackButtonClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (dragStateRef.current.suppressClick) {
      dragStateRef.current.suppressClick = false
      event.preventDefault()
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }

  useEffect(() => {
    const handleResize = () => {
      setBackButtonPos((current) => clampPosition(current.x, current.y))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!content) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Content Not Found</h1>
          <p className="text-gray-400 mb-6">The content you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Resolve relative assets in code
  const resolvedHtml = resolveRelativeAssets(content.htmlCode || '', assets);
  const resolvedCss = resolveRelativeAssets(content.cssCode || '', assets);
  const resolvedJs = resolveRelativeAssets(content.jsCode || '', assets);

  // Build complete standalone HTML document
  const fullDocument = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title}</title>
<style>
${resolvedCss}
</style>
</head>
<body>
${resolvedHtml}
<script>
${resolvedJs}
</script>
</body>
</html>`

  return (
    <>
      <Head>
        <title>{content.title} | Campus Kit</title>
        <meta name="title" content={`${content.title} | Campus Kit`} />
        <meta name="description" content={`View ${content.title} in ${content.subject} on Campus Kit.`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta name="keywords" content={`${content.subject}, ${content.title}, Campus Kit, student projects, web project`} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Campus Kit" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${content.title} | Campus Kit`} />
        <meta property="og:description" content={`View ${content.title} in ${content.subject} on Campus Kit.`} />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={`${content.title} | Campus Kit`} />
        <meta name="twitter:description" content={`View ${content.title} in ${content.subject} on Campus Kit.`} />
      </Head>

      <div
        className="fixed z-50 hidden sm:block"
        style={{ left: backButtonPos.x, top: backButtonPos.y, touchAction: 'none' }}
      >
        <button
          type="button"
          onMouseDown={handleBackMouseDown}
          onClick={handleBackButtonClick}
          className="flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg text-white text-sm hover:bg-black/70 transition-colors cursor-move"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}>
        <iframe
          srcDoc={fullDocument}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            margin: 0,
            padding: 0,
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
          title={content.title}
        />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const subjectSlug = params?.subjectSlug as string
  const titleSlug = params?.titleSlug as string
  const canonicalUrl = `https://campuskit.vercel.app/${subjectSlug}/${titleSlug}`

  if (!subjectSlug || !titleSlug) {
    return { props: { content: null, assets: [], canonicalUrl: 'https://campuskit.vercel.app/' } }
  }

  try {
    // Query database directly instead of reading from JSON file
    const content = await prisma.content.findFirst({
      where: {
        subjectSlug: subjectSlug,
        slug: titleSlug,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        subject: true,
        htmlCode: true,
        cssCode: true,
        jsCode: true,
        views: true,
        createdAt: true,
        userId: true, // Needed to fetch user's assets
      },
    })

    if (!content) {
      return { props: { content: null, assets: [], canonicalUrl } }
    }

    // Fetch user's assets
    const assets = await prisma.asset.findMany({
      where: { userId: content.userId },
      select: { name: true, url: true }
    });

    // Increment view count
    await prisma.content.update({
      where: { id: content.id },
      data: { views: { increment: 1 } },
    })

    return {
      props: {
        content: {
          id: content.id,
          title: content.title,
          subject: content.subject,
          htmlCode: content.htmlCode || '',
          cssCode: content.cssCode || '',
          jsCode: content.jsCode || '',
          views: content.views + 1,
          createdAt: content.createdAt.toISOString(),
          userId: content.userId,
        },
        assets,
        canonicalUrl,
      },
    }
  } catch (error) {
    console.error('Error fetching content:', error)
    return { props: { content: null, assets: [], canonicalUrl } }
  }
}
