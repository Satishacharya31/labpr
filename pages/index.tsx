import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import ContentCard from '@/components/ContentCard'
import Navbar from '@/components/Navbar'

interface Content {
  id: string
  title: string
  subject: string
  subjectSlug: string
  slug: string
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  type?: 'CODE' | 'PDF' | 'DOCUMENT' | 'IMAGE';
  thumbnail?: string;
  createdAt: string;
}

export default function Home() {
  const { data: session } = useSession()
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; color: string }[]>([])

  useEffect(() => {
    fetchCategories()

    const refreshCategories = () => {
      fetchCategories()
    }

    window.addEventListener('focus', refreshCategories)
    const interval = window.setInterval(refreshCategories, 60000)

    return () => {
      window.removeEventListener('focus', refreshCategories)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchContents()
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedSubject])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchContents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedSubject !== 'All') {
        const category = categories.find(c => c.name === selectedSubject)
        if (category) {
          params.append('category', category.slug)
        } else {
          params.append('subject', selectedSubject)
        }
      }

      const response = await fetch(`/api/contents?${params.toString()}`)
      const data = await response.json()
      setContents(data)
    } catch (error) {
      console.error('Error fetching contents:', error)
    } finally {
      setLoading(false)
    }
  }

  const subjects: string[] = [
    'All',
    ...Array.from(
      new Set([
        ...categories.map((category) => category.name),
        ...contents.map((content) => content.subject).filter(Boolean),
      ])
    ),
  ]

  useEffect(() => {
    if (selectedSubject !== 'All' && !subjects.includes(selectedSubject)) {
      setSelectedSubject('All')
    }
  }, [selectedSubject, subjects])

  return (
    <>
      <Head>
        <title>Campus Kit - Academic Material Search & Web Development Tools</title>
        <meta name="title" content="Campus Kit - Academic Material Search & Web Development Tools" />
        <meta name="description" content="Search academic materials, lab practicals, exam papers, and projects. Use our online HTML compiler and upload your own content for free." />
        <meta name="google-site-verification" content="GPcAMvoJqIiDxD5OD-H1As13QpgXIFrcuy0sChrji6Y" />
        <meta name="keywords" content="academic material, lab practicals, exam papers, html compiler, web development, student projects, campus kit" />
        <link rel="canonical" href="https://campuskit.vercel.app/" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Campus Kit" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content="https://campuskit.vercel.app/" />
        <meta property="og:title" content="Campus Kit - Academic Material Search & Web Development Tools" />
        <meta property="og:description" content="Search academic materials, lab practicals, exam papers, and projects. Use our online HTML compiler and upload your own content for free." />
        <meta property="og:image" content="https://campuskit.vercel.app/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://campuskit.vercel.app/" />
        <meta property="twitter:title" content="Campus Kit - Academic Material Search & Web Development Tools" />
        <meta property="twitter:description" content="Search academic materials, lab practicals, exam papers, and projects. Use our online HTML compiler and upload your own content for free." />
        <meta property="twitter:image" content="https://campuskit.vercel.app/og-image.jpg" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-white selection:bg-purple-500/30 transition-colors duration-300">

        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        {/* Navbar with Search */}
        <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* Main Content */}
        <main className="relative z-10 pt-24 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">

          {/* Hero / Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {session?.user ? `Welcome back, ${session.user.name?.split(' ')[0]}` : 'Discover Resources'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Explore and manage your assignments, lab practicals, projects, and exam papers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/upload" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 font-medium text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8 overflow-x-auto pb-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border ${selectedSubject === subject
                  ? 'bg-blue-600 dark:bg-white text-white dark:text-black border-blue-600 dark:border-white shadow-lg shadow-blue-500/20 dark:shadow-white/10'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-white hover:border-blue-200 dark:hover:border-white/10'
                  }`}
              >
                {subject}
              </button>
            ))}
          </div>

          {/* Grid Layout */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-[280px] bg-white dark:bg-white/5 rounded-2xl animate-pulse border border-gray-200 dark:border-white/5">
                  <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-t-2xl" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-100 dark:bg-white/10 rounded" />
                    <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No projects found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                We couldn't find any projects matching your criteria. Try adjusting your search or filters.
              </p>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedSubject('All'); }}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {contents.map((content) => (
                <ContentCard
                  key={content.id}
                  {...content}
                />
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  )
}
