import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'If an account exists with this email, you will receive a password reset link.',
        });
        setSubmitted(true);
        setEmail('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to process request',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to process request. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - Campus Kit</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-12">
            <a href="/"> <span className="text-2xl font-bold text-white">C</span>
            <h1 className="text-3xl font-bold text-white">Campus Kit</h1>
            </a>
          </div>
          {/* Card */}
          <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Reset Your Password</h2>
              <p className="text-gray-400 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {message.text}
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="your@email.com"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all"
                >
                  {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="inline-block w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300 mb-4">Check your email for a reset link</p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all"
                >
                  Go to Home
                </button>
              </div>
            )}

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-gray-400 text-sm mb-3">
                Remember your password?{' '}
                <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                  Log In
                </Link>
              </p>
              <p className="text-gray-400 text-sm">
                <Link href="/" className="text-violet-400 hover:text-violet-300 font-medium">
                 Back to Home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
