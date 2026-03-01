import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import recharts components
const AreaChart = dynamic(() => import('recharts').then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });

interface Content {
  id: string;
  title: string;
  subject: string;
  subjectSlug: string;
  slug: string;
  views: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Analytics {
  totalContents: number;
  totalViews: number;
  publishedCount: number;
  draftCount: number;
  subjectStats: { name: string; count: number; views: number }[];
  recentActivity: { date: string; uploads: number }[];
  topContent: Content[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [contents, setContents] = useState<Content[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'settings'>('overview');

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchContents();
    }
  }, [session]);

  const fetchContents = async () => {
    try {
      const res = await fetch('/api/contents');
      const data = await res.json();
      setContents(data);
      calculateAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: Content[]) => {
    const totalViews = data.reduce((sum, c) => sum + (c.views || 0), 0);
    const publishedCount = data.filter((c) => c.isPublished).length;
    const draftCount = data.filter((c) => !c.isPublished).length;

    // Subject stats
    const subjectMap = new Map<string, { count: number; views: number }>();
    data.forEach((c) => {
      const existing = subjectMap.get(c.subject) || { count: 0, views: 0 };
      subjectMap.set(c.subject, {
        count: existing.count + 1,
        views: existing.views + (c.views || 0),
      });
    });
    const subjectStats = Array.from(subjectMap.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    }));

    // Recent activity (last 7 days simulation)
    const recentActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const uploads = data.filter((c) => {
        const created = new Date(c.createdAt);
        return created.toDateString() === date.toDateString();
      }).length;
      recentActivity.push({ date: dateStr, uploads });
    }

    // Top content by views
    const topContent = [...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

    setAnalytics({
      totalContents: data.length,
      totalViews,
      publishedCount,
      draftCount,
      subjectStats,
      recentActivity,
      topContent,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const res = await fetch(`/api/contents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchContents();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Initialize settings form when session loads
  useEffect(() => {
    if (session?.user?.name) {
      setSettingsName(session.user.name);
    }
  }, [session?.user?.name]);

  // Save settings handler
  const handleSaveSettings = async () => {
    if (!settingsName.trim()) {
      setSettingsMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setSavingSettings(true);
    setSettingsMessage(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSettingsMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Update the session to reflect changes
        await updateSession({ name: settingsName.trim() });
        setTimeout(() => setSettingsMessage(null), 3000);
      } else {
        setSettingsMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Save settings failed:', error);
      setSettingsMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(null), 3000);
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Change password failed:', error);
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Content Hub</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navigation */}
        <nav className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Content Hub</span>
              </Link>

              <div className="flex items-center gap-4">
                <Link
                  href="/upload"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-violet-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </Link>

                <div className="flex items-center gap-3">
                  <img
                    src={session?.user?.image || `https://ui-avatars.com/api/?name=${session?.user?.name || 'U'}&background=7c3aed&color=fff`}
                    alt="Profile"
                    className="w-9 h-9 rounded-full border-2 border-violet-500"
                  />
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-6">
              <img
                src={session?.user?.image || `https://ui-avatars.com/api/?name=${session?.user?.name || 'U'}&background=7c3aed&color=fff&size=128`}
                alt="Profile"
                className="w-24 h-24 rounded-2xl border-4 border-violet-500/50"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">{session?.user?.name || 'User'}</h1>
                <p className="text-gray-400 mt-1">{session?.user?.email}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-sm border border-violet-500/30">
                    {session?.user?.isAdmin ? 'Admin' : 'Creator'}
                  </span>
                  <span className="text-gray-500 text-sm">
                    Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8">
            {(['overview', 'projects', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === tab
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && analytics && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Projects', value: analytics.totalContents, icon: '📁', color: 'violet' },
                  { label: 'Total Views', value: analytics.totalViews, icon: '👁️', color: 'cyan' },
                  { label: 'Published', value: analytics.publishedCount, icon: '🚀', color: 'green' },
                  { label: 'Drafts', value: analytics.draftCount, icon: '📝', color: 'amber' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{stat.icon}</span>
                      <span className={`text-xs px-2 py-1 rounded-full bg-${stat.color}-500/20 text-${stat.color}-400`}>
                        +{Math.floor(Math.random() * 20)}%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-white mt-4">{stat.value}</p>
                    <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Activity Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Upload Activity</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.recentActivity}>
                        <defs>
                          <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="uploads"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorUploads)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Subject Distribution */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Projects by Subject</h3>
                  {analytics.subjectStats.length > 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.subjectStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="count"
                          >
                            {analytics.subjectStats.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '0.5rem',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No projects yet
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {analytics.subjectStats.map((subject, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-full text-sm"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-gray-300">{subject.name}</span>
                        <span className="text-gray-500">({subject.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Content */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Top Performing Content</h3>
                {analytics.topContent.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topContent} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9ca3af" />
                        <YAxis
                          dataKey="title"
                          type="category"
                          stroke="#9ca3af"
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No content with views yet
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                  <p className="text-gray-400 mb-6">Create your first project to get started</p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Project
                  </Link>
                </div>
              ) : (
                contents.map((content) => (
                  <div
                    key={content.id}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-violet-600/20 to-purple-600/20 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-12 h-12 text-violet-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      {content.isPublished ? (
                        <span className="absolute top-3 right-3 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          Published
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-white text-lg mb-1 truncate">{content.title}</h3>
                      <p className="text-violet-400 text-sm mb-3">{content.subject}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{content.views || 0} views</span>
                        <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link
                          href={`/upload?id=${content.id}`}
                          className="flex-1 text-center py-2 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Edit
                        </Link>
                        <a
                          href={`/${content.subjectSlug}/${content.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm transition-colors"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-white mb-6">Account Settings</h3>

              {/* Success/Error Message */}
              {settingsMessage && (
                <div className={`mb-6 px-4 py-3 rounded-lg ${settingsMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                  {settingsMessage.text}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full max-w-md bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="w-full max-w-md bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white disabled:opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Password Change Section - Admin Only */}
                {(session?.user as any)?.role === 'ADMIN' && (
                <div className="pt-6 border-t border-slate-700">
                  <h4 className="text-lg font-medium text-white mb-4">Change Password</h4>
                  
                  {passwordMessage && (
                    <div className={`mb-4 px-4 py-3 rounded-lg ${passwordMessage.type === 'success'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword || !confirmPassword}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {changingPassword ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Changing Password...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </div>
                )}
                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings || settingsName === session?.user?.name}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingSettings ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-700">
                  <h4 className="text-lg font-medium text-white mb-4">Danger Zone</h4>
                  <button
                    onClick={() => alert('Account deletion requires contacting an administrator')}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
