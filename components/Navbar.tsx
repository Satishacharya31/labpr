import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface NavbarProps {
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
}

export default function Navbar({ searchQuery, setSearchQuery }: NavbarProps) {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isAdmin = (session?.user as any)?.isAdmin;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass dark:glass border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 lg:px-12 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl transition-colors duration-300">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-white font-bold">C</span>
                </div>
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-400 hidden sm:block">Campus Kit</span>
            </Link>

            <Link href="/guide" className="hidden md:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition-colors ml-6">
                Guide
            </Link>

            {/* Center: Search Bar */}
            {setSearchQuery && (
                <div className="flex-1 max-w-xl mx-4 sm:mx-8">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg opacity-20 group-focus-within:opacity-50 transition duration-500 blur"></div>
                        <div className="relative flex items-center bg-gray-100 dark:bg-[#151520] rounded-lg border border-gray-200 dark:border-white/10 px-3 h-10 w-full transition-colors duration-300">
                            <svg className="w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery || ''}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 ml-2 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-white transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                    </button>
                )}

                {/* Create Button (Mobile only icon, Desktop text) */}
                <Link href="/upload" className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg shadow-lg shadow-purple-500/20 transition-all font-medium text-xs sm:text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">New</span>
                </Link>

                {session?.user ? (
                    <div className="relative" ref={dropdownRef}>
                        {/* Avatar Button */}
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 focus:outline-none"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-gray-700 dark:text-white">{session.user.name}</p>
                                <p className="text-[10px] text-gray-500">{isAdmin ? 'Administrator' : 'User'}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold border border-gray-200 dark:border-white/10 ring-2 ring-transparent hover:ring-purple-500/30 transition-all text-white">
                                {session.user.image ? (
                                    <img src={session.user.image} alt="User" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    session.user.name?.[0] || 'U'
                                )}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1a24] border border-gray-100 dark:border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black ring-opacity-5">
                                <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 md:hidden">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{session.user.name}</p>
                                    <p className="text-xs text-gray-500">{session.user.email}</p>
                                </div>

                                <div className="px-2 py-1">
                                    <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors" onClick={() => setIsDropdownOpen(false)}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Profile
                                    </Link>

                                    {isAdmin && (
                                        <>
                                            <div className="my-1 border-t border-gray-100 dark:border-white/5"></div>
                                            <div className="px-3 py-1 text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Admin</div>

                                            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors" onClick={() => setIsDropdownOpen(false)}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                                Dashboard
                                            </Link>
                                            <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors" onClick={() => setIsDropdownOpen(false)}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                User Management
                                            </Link>
                                        </>
                                    )}

                                    <div className="my-1 border-t border-gray-100 dark:border-white/5"></div>
                                    <button
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/auth/signin" className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors border border-gray-200 dark:border-white/5">
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}
