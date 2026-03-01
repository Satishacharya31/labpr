import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

interface ContentWithUser {
    id: string
    title: string
    subject: string
    slug: string
    subjectSlug: string
    views: number
    isPublished: boolean
    createdAt: string
    user: {
        id: string
        name: string | null
        email: string | null
    }
}

interface Stats {
    totalUsers: number
    totalContents: number
    totalViews: number
    publishedCount: number
}

export default function AdminPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [contents, setContents] = useState<ContentWithUser[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (status === 'loading') return
        if (!session?.user) {
            router.push('/login')
            return
        }
        if (!(session.user as any).isAdmin) {
            router.push('/')
            return
        }
        fetchData()
    }, [session, status, router])

    const fetchData = async () => {
        try {
            const [usersRes, contentsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/contents')
            ])

            const usersData = await usersRes.json()
            const contentsData = await contentsRes.json()

            setContents(contentsData.contents || [])

            // Calculate stats
            const totalViews = (contentsData.contents || []).reduce((sum: number, c: ContentWithUser) => sum + (c.views || 0), 0)
            const publishedCount = (contentsData.contents || []).filter((c: ContentWithUser) => c.isPublished).length

            setStats({
                totalUsers: usersData.users?.length || 0,
                totalContents: contentsData.contents?.length || 0,
                totalViews,
                publishedCount
            })
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteContent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this content?')) return

        try {
            const res = await fetch(`/api/contents/${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchData()
            }
        } catch (error) {
            console.error('Delete failed:', error)
        }
    }

    const filteredContents = contents.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!session?.user || !(session.user as any).isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-6 max-w-md text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
                    <p className="text-sm text-gray-400">Admin privileges required to access this page.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Admin Panel - Campus Kit</title>
            </Head>

            <div className="min-h-screen bg-[#0a0a0f] text-white">
                {/* Header */}
                <header className="bg-[#0f0f15] border-b border-white/5 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-sm font-bold">C</span>
                                </div>
                                <span className="font-semibold">Campus kit</span>
                            </Link>
                            <span className="text-xs px-2.5 py-1 bg-violet-500/20 text-violet-400 rounded-full font-medium">Admin</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </Link>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-medium">
                                    {session.user?.name?.[0] || session.user?.email?.[0] || 'A'}
                                </div>
                                <span className="text-sm text-gray-400">{session.user?.email}</span>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-violet-500 to-purple-600', link: '/admin/users' },
                                { label: 'All Content', value: stats.totalContents, icon: '📄', color: 'from-blue-500 to-cyan-600' },
                                { label: 'Total Views', value: stats.totalViews, icon: '👁️', color: 'from-cyan-500 to-teal-600' },
                                { label: 'Published', value: stats.publishedCount, icon: '🚀', color: 'from-green-500 to-emerald-600' },
                            ].map((stat, i) => (
                                stat.link ? (
                                    <Link href={stat.link} key={i} className="bg-[#12121a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors block">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-2xl">{stat.icon}</span>
                                            <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${stat.color}`} />
                                        </div>
                                        <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                                    </Link>
                                ) : (
                                    <div key={i} className="bg-[#12121a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-2xl">{stat.icon}</span>
                                            <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${stat.color}`} />
                                        </div>
                                        <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Search & Header for Content */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                        <h2 className="text-lg font-semibold">Content Management</h2>
                        <div className="w-full sm:w-72">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search content..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#12121a] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contents Table */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#0a0a0f]">
                                    <tr>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Title</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Subject</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Owner</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Views</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Status</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredContents.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                                                No content found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContents.map((content) => (
                                            <tr key={content.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className="font-medium">{content.title}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">
                                                        {content.subject}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400">
                                                    {content.user.name || content.user.email || 'Unknown'}
                                                </td>
                                                <td className="px-5 py-4 text-gray-400">{content.views || 0}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${content.isPublished
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        {content.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/upload?id=${content.id}`}
                                                            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            Edit
                                                        </Link>
                                                        <a
                                                            href={`/${content.subjectSlug}/${content.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 bg-gray-700/50 text-gray-300 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            View
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteContent(content.id)}
                                                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
