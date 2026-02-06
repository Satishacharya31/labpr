import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'

interface Content {
  id: string
  title: string
  subject: string
  htmlCode: string
  cssCode: string
  jsCode: string
  createdAt: string
  slug: string
  subjectSlug: string
}

// Subject colors mapping
const subjectColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Physics': { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-500' },
  'Chemistry': { bg: 'bg-teal-500/10', text: 'text-teal-300', dot: 'bg-teal-500' },
  'Biology': { bg: 'bg-green-500/10', text: 'text-green-300', dot: 'bg-green-500' },
  'Computer Science': { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-500' },
  'Mathematics': { bg: 'bg-blue-500/10', text: 'text-blue-300', dot: 'bg-blue-500' },
}

const getSubjectColor = (subject: string) => {
  return subjectColors[subject] || { bg: 'bg-slate-500/10', text: 'text-slate-300', dot: 'bg-slate-500' }
}

// Icons for subjects
const subjectIcons: Record<string, string> = {
  'Physics': '🚀',
  'Chemistry': '🧪',
  'Biology': '🌿',
  'Computer Science': '💻',
  'Mathematics': '📐',
}

export default function Home() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      const response = await fetch('/api/contents')
      const data = await response.json()
      setContents(data)
    } catch (error) {
      console.error('Error fetching contents:', error)
    } finally {
      setLoading(false)
    }
  }

  const subjects: string[] = ['All', ...Array.from(new Set<string>(contents.map(c => c.subject)))]
  const filteredContents = contents.filter(c => {
    const matchesSubject = selectedSubject === 'All' || c.subject === selectedSubject
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSubject && matchesSearch
  })

  return (
    <>
      <Head>
        <title>LabCMS - Interactive Lab Reports</title>
        <meta name="description" content="Access your experiments, analyze data, and track your academic progress" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </Head>

      <div className="dark bg-background-dark text-white font-display antialiased min-h-screen relative overflow-x-hidden selection:bg-primary selection:text-white">
        {/* Background decorative elements */}
        <div className="fixed inset-0 z-0 bg-glow pointer-events-none"></div>
        <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Navigation */}
        <div className="relative z-50 w-full px-4 pt-4 flex justify-center">
          <nav className="w-full max-w-[1200px] glass-panel rounded-full px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 text-white group">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">science</span>
                </div>
                <span className="text-xl font-bold tracking-tight">LabCMS</span>
              </Link>
              <div className="hidden md:flex items-center gap-1 pl-4">
                <Link href="/" className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all">My Reports</Link>
                <Link href="/profile" className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all">Profile</Link>
                <Link href="/upload" className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all">Upload</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center bg-[#101622]/50 border border-white/5 rounded-full px-3 py-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all w-64">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm text-white placeholder-slate-500 w-full h-full py-1 outline-none"
                />
              </div>
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition-colors relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1e2736]"></span>
              </button>
              <Link href="/admin/login" className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 transition-transform">
                A
              </Link>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="relative z-10 w-full max-w-[1200px] mx-auto px-6 pb-20 pt-12 flex flex-col gap-10">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
            <div className="flex flex-col gap-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Spring Semester 2026</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight">
                Interactive <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Lab Reports</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Access your experiments, analyze real-time data, and track your academic progress all in one secure place.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="h-12 px-6 rounded-full bg-[#1e2736] hover:bg-[#252f40] text-white font-medium border border-white/5 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">history</span>
                <span>History</span>
              </button>
              <Link href="/upload" className="h-12 px-6 rounded-full bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 transform hover:scale-105">
                <span className="material-symbols-outlined">add</span>
                <span>New Submission</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              <button
                onClick={() => setSelectedSubject('All')}
                className={`px-6 h-10 rounded-full font-bold text-sm transition-all ${selectedSubject === 'All'
                  ? 'bg-white text-background-dark shadow-lg shadow-white/10'
                  : 'bg-[#1e2736] hover:bg-[#283245] border border-white/5 text-slate-300 hover:text-white font-medium'
                  }`}
              >
                All Reports
              </button>
              {subjects.filter(s => s !== 'All').map((subject) => {
                const colors = getSubjectColor(subject)
                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-6 h-10 rounded-full text-sm transition-all flex items-center gap-2 group ${selectedSubject === subject
                      ? 'bg-white text-background-dark font-bold shadow-lg shadow-white/10'
                      : 'bg-[#1e2736] hover:bg-[#283245] border border-white/5 text-slate-300 hover:text-white font-medium'
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${colors.dot} group-hover:shadow-[0_0_8px] transition-all`}></span>
                    {subject}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="text-slate-400">Loading your reports...</p>
              </div>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary">folder_open</span>
              </div>
              <h3 className="text-xl font-bold text-white">No Reports Found</h3>
              <p className="text-slate-400 max-w-md">
                {searchQuery ? `No results for "${searchQuery}"` : 'Start by creating your first lab report or try a different filter.'}
              </p>
              <Link href="/upload" className="mt-4 h-12 px-6 rounded-full bg-primary hover:bg-blue-600 text-white font-bold transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">add</span>
                <span>Create New Report</span>
              </Link>
            </div>
          ) : (
            /* Grid Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredContents.map((content) => {
                const colors = getSubjectColor(content.subject)
                const icon = subjectIcons[content.subject] || '📄'

                return (
                  <Link
                    key={content.id}
                    href={`/${content.subjectSlug}/${content.slug}`}
                    className="glass-card rounded-[2rem] p-4 flex flex-col gap-4 group cursor-pointer relative overflow-hidden"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-0 right-0 p-4 z-10">
                      <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 shadow-lg">
                        Published
                      </div>
                    </div>

                    {/* Image/Preview Area */}
                    <div className="w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden relative bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <span className="text-6xl opacity-50 group-hover:scale-110 transition-transform duration-500">{icon}</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent"></div>
                      <div className="absolute bottom-3 left-3">
                        <div className={`flex items-center gap-2 text-xs font-medium ${colors.text} ${colors.bg} px-2 py-1 rounded-lg border border-current/20 backdrop-blur-md`}>
                          <span className="material-symbols-outlined text-[14px]">science</span>
                          {content.subject}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-1 px-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                        {content.title}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {content.htmlCode.replace(/<[^>]*>/g, '').substring(0, 80)}...
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-2 px-1 border-t border-white/5">
                      <span className="text-xs text-slate-500">
                        {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-sm font-semibold text-primary flex items-center gap-1 group/btn">
                        View Report
                        <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                      </span>
                    </div>
                  </Link>
                )
              })}

              {/* Add New Card */}
              <Link
                href="/upload"
                className="glass-card rounded-[2rem] p-4 flex flex-col items-center justify-center gap-4 group cursor-pointer relative overflow-hidden border-dashed border-2 border-white/10 hover:border-primary/50 min-h-[340px]"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-4xl text-primary">add</span>
                </div>
                <div className="text-center px-4">
                  <h3 className="text-lg font-bold text-white">Start New Report</h3>
                  <p className="text-sm text-slate-500 mt-2">Choose a template or start from scratch.</p>
                </div>
              </Link>
            </div>
          )}
        </main>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <Link
            href="/upload"
            className="w-16 h-16 rounded-full bg-primary hover:bg-blue-600 text-white shadow-2xl shadow-primary/40 flex items-center justify-center transition-all hover:scale-110 group"
          >
            <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform duration-300">add</span>
          </Link>
        </div>
      </div>
    </>
  )
}
