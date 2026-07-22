'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface DemoUser {
  user_id: number;
  name: string;
  email: string;
  avatar_color: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loadingDemo, setLoadingDemo] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com';

  useEffect(() => {
    // Fetch demo users for quick sign-in
    fetch(`${API_URL}/api/auth/demo-users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.demo_users) {
          setDemoUsers(data.demo_users.slice(0, 6)); // Top 6 quick profiles
        }
      })
      .catch(() => {
        // Fallback default demo users if API fails
        setDemoUsers([
          { user_id: 1, name: 'Chitesh', email: 'chitesh@bookflix.com', avatar_color: 'bg-blue-800' },
          { user_id: 2, name: 'Yeshu', email: 'yeshu@bookflix.com', avatar_color: 'bg-book-brown' },
          { user_id: 3, name: 'Rishi', email: 'rishi@bookflix.com', avatar_color: 'bg-emerald-800' },
          { user_id: 4, name: 'Varun', email: 'varun@bookflix.com', avatar_color: 'bg-purple-800' },
          { user_id: 5, name: 'Alice', email: 'alice@bookflix.com', avatar_color: 'bg-rose-800' },
          { user_id: 6, name: 'Bob', email: 'bob@bookflix.com', avatar_color: 'bg-teal-800' },
        ]);
      });
  }, [API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address or User ID.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to sign in. Please check your credentials.');
      }

      // Success
      setCurrentUser(data.user);
      router.push('/browse');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: DemoUser) => {
    setLoadingDemo(demoUser.user_id);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: demoUser.user_id }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setCurrentUser(data.user);
      } else {
        // Fallback directly
        setCurrentUser({
          user_id: demoUser.user_id,
          name: demoUser.name,
          email: demoUser.email,
          avatar_color: demoUser.avatar_color,
        });
      }

      setTimeout(() => {
        router.push('/browse');
      }, 400);
    } catch (err) {
      // Fallback
      setCurrentUser({
        user_id: demoUser.user_id,
        name: demoUser.name,
        email: demoUser.email,
        avatar_color: demoUser.avatar_color,
      });
      router.push('/browse');
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-book-dark text-white flex flex-col justify-between overflow-hidden selection:bg-book-amber selection:text-white">
      {/* Background Graphic Grid / Glow Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-900 to-black pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-book-amber/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 md:px-16 py-6 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-book-amber text-3xl md:text-4xl font-extrabold tracking-wider cursor-pointer hover:opacity-90 transition">
            BOOKFLIX
          </h1>
        </Link>
        <Link
          href="/signup"
          className="text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 hover:border-book-amber px-4 py-2 rounded transition"
        >
          Sign Up
        </Link>
      </header>

      {/* Main Content Form Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-2">
            Sign In
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Welcome back to Bookflix. Enter your details to continue.
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-950/80 border border-red-700/60 rounded-lg flex items-center gap-3 text-red-200 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email / Username field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email or User ID
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. chitesh@bookflix.com or 1"
                  required
                  className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-11 pr-4 py-3 outline-none transition placeholder-gray-500"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-11 pr-11 py-3 outline-none transition placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-800 border-gray-700 text-book-amber focus:ring-book-amber"
                />
                Remember me
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); setEmail('chitesh@bookflix.com'); setPassword('password123'); }} className="hover:underline hover:text-book-amber">
                Demo Credentials?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-book-amber hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Demo Section */}
          {demoUsers.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-book-amber mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Quick 1-Click Demo Profiles</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {demoUsers.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => handleDemoLogin(user)}
                    disabled={loadingDemo === user.user_id}
                    className="flex flex-col items-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-gray-700/60 hover:border-book-amber/50 transition group cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full ${user.avatar_color} flex items-center justify-center text-xs font-bold text-white shadow group-hover:scale-105 transition`}>
                      {loadingDemo === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span className="mt-1 text-[11px] text-gray-300 group-hover:text-white truncate max-w-full">
                      {user.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sign Up Link */}
          <div className="mt-8 text-center text-sm text-gray-400">
            New to Bookflix?{' '}
            <Link href="/signup" className="text-white font-semibold hover:text-book-amber underline transition ml-1">
              Sign up now
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} BOOKFLIX AI Recommendation Engine. All rights reserved.
      </footer>
    </div>
  );
}
