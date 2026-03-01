import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'

interface User {
    id: string
    name: string | null
    email: string | null
    role: string
    createdAt: string
    _count?: { contents: number }
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Modal states
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [editFormData, setEditFormData] = useState({ name: '', role: 'USER' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null)
    
    // Password change states
    const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
            const usersRes = await fetch('/api/admin/users')
            const usersData = await usersRes.json()
            setUsers(usersData.users || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setEditFormData({
            name: user.name || '',
            role: user.role
        })
    }

    const handleSaveUser = async () => {
        if (!editingUser) return
        setIsSubmitting(true)

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            })

            const data = await res.json()

            if (res.ok) {
                setEditingUser(null)
                fetchData()
            } else {
                alert(data.error || 'Failed to update user')
            }
        } catch (error) {
            console.error('Update failed:', error)
            alert('Failed to update user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!deleteConfirmUser) return
        setIsSubmitting(true)

        try {
            const res = await fetch(`/api/admin/users/${deleteConfirmUser.id}`, {
                method: 'DELETE'
            })

            const data = await res.json()

            if (res.ok) {
                setDeleteConfirmUser(null)
                fetchData()
            } else {
                alert(data.error || 'Failed to delete user')
            }
        } catch (error) {
            console.error('Delete failed:', error)
            alert('Failed to delete user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChangePassword = async () => {
        if (!passwordChangeUser) return
        setPasswordMessage(null)

        if (!newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' })
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
            return
        }

        if (newPassword.length < 8) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' })
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch(`/api/admin/users/${passwordChangeUser.id}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword, confirmPassword })
            })

            const data = await res.json()

            if (res.ok) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
                setTimeout(() => {
                    setPasswordChangeUser(null)
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordMessage(null)
                }, 2000)
            } else {
                setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' })
            }
        } catch (error) {
            console.error('Change password failed:', error)
            setPasswordMessage({ type: 'error', text: 'Failed to change password' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
                <title>User Management - Campus Kit</title>
            </Head>

            <div className="min-h-screen bg-[#0a0a0f] text-white">
                {/* Header */}
                <header className="bg-[#0f0f15] border-b border-white/5 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="text-sm font-medium">Back to Dashboard</span>
                            </Link>
                            <div className="w-px h-4 bg-white/10" />
                            <span className="text-sm font-semibold">User Management</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-medium">
                                    {session.user?.name?.[0] || session.user?.email?.[0] || 'A'}
                                </div>
                                <span className="text-sm text-gray-400">{session.user?.email}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Header & Search */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">Users</h1>
                            <p className="text-sm text-gray-400">Manage system users and roles</p>
                        </div>

                        <div className="w-full sm:w-72">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#12121a] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#0a0a0f]">
                                    <tr>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">User</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Email</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Role</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Content</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Joined</th>
                                        <th className="text-left px-5 py-4 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                                                No users found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-medium">
                                                            {user.name?.[0] || user.email?.[0] || 'U'}
                                                        </div>
                                                        <span className="font-medium">{user.name || 'Unnamed'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400">{user.email}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                                        ? 'bg-violet-500/20 text-violet-400'
                                                        : 'bg-gray-700/50 text-gray-300'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400">
                                                    {user._count?.contents || 0} items
                                                </td>
                                                <td className="px-5 py-4 text-gray-500 text-xs">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPasswordChangeUser(user)
                                                                setNewPassword('')
                                                                setConfirmPassword('')
                                                                setPasswordMessage(null)
                                                            }}
                                                            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            Reset Password
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmUser(user)}
                                                            disabled={user.id === (session.user as any).id}
                                                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Edit User</h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg font-medium">
                                {editingUser.name?.[0] || editingUser.email?.[0] || 'U'}
                            </div>
                            <div>
                                <p className="font-medium">{editingUser.name || 'Unnamed'}</p>
                                <p className="text-sm text-gray-400">{editingUser.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                                    placeholder="Enter name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Role</label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                    disabled={editingUser.id === (session?.user as any)?.id}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
                                >
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                                {editingUser.id === (session?.user as any)?.id && (
                                    <p className="text-xs text-amber-400 mt-2">You cannot change your own role</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Delete User</h3>
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to delete <strong className="text-white">{deleteConfirmUser.name || deleteConfirmUser.email}</strong>?
                                This will also delete all their content.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmUser(null)}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {passwordChangeUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Reset Password</h3>
                            <button
                                onClick={() => {
                                    setPasswordChangeUser(null)
                                    setNewPassword('')
                                    setConfirmPassword('')
                                    setPasswordMessage(null)
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-medium">
                                {passwordChangeUser.name?.[0] || passwordChangeUser.email?.[0] || 'U'}
                            </div>
                            <div>
                                <p className="font-medium">{passwordChangeUser.name || 'Unnamed'}</p>
                                <p className="text-sm text-gray-400">{passwordChangeUser.email}</p>
                            </div>
                        </div>

                        {passwordMessage && (
                            <div className={`mb-4 p-3 rounded-lg text-sm ${
                                passwordMessage.type === 'success'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                                    placeholder="Enter new password"
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                                    placeholder="Confirm new password"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setPasswordChangeUser(null)
                                    setNewPassword('')
                                    setConfirmPassword('')
                                    setPasswordMessage(null)
                                }}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
