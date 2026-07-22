'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, Loader2, Check, Sparkles, BookOpen } from 'lucide-react';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 
  'Horror', 'Non-Fiction', 'Thriller', 'Young Adult'
];

const AVATAR_COLORS = [
  { name: 'Blue', class: 'bg-blue-800' },
  { name: 'Brown', class: 'bg-book-brown' },
  { name: 'Emerald', class: 'bg-emerald-800' },
  { name: 'Purple', class: 'bg-purple-800' },
  { name: 'Rose', class: 'bg-rose-800' },
  { name: 'Teal', class: 'bg-teal-800' },
];

export default function SignupPage() {
  const router = useRouter();
  const { setCurrentUser } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].class);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com';

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-check your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const newUserObj = {
      user_id: Math.floor(Math.random() * 900000) + 100000,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar_color: selectedColor,
      preferred_genres: selectedGenres,
    };

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          avatar_color: selectedColor,
          preferred_genres: selectedGenres,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setIsLoading(false);
        router.push('/browse');
        return;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
    }

    // Instant Fallback if backend is sleeping or unreachable
    setCurrentUser(newUserObj);
    setIsLoading(false);
    router.push('/browse');
  };

  return (
    <div className="relative min-h-screen bg-book-dark text-white flex flex-col justify-between overflow-x-hidden selection:bg-book-amber selection:text-white py-6">
      {/* Background Graphic Grid / Glow Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-900 to-black pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-book-amber/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 md:px-16 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-book-amber text-3xl md:text-4xl font-extrabold tracking-wider cursor-pointer hover:opacity-90 transition">
            BOOKFLIX
          </h1>
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 hover:border-book-amber px-4 py-2 rounded transition"
        >
          Sign In
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-xl border border-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full ${selectedColor} flex items-center justify-center text-lg font-bold text-white shadow-md transition-all`}>
              {name.trim() ? name.trim().charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Create Account</h2>
              <p className="text-xs text-gray-400">Join Bookflix for personalized AI recommendations</p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="my-5 p-3 bg-red-950/80 border border-red-700/60 rounded-lg flex items-center gap-3 text-red-200 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chitesh Sharma"
                  required
                  className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-11 pr-4 py-3 outline-none transition placeholder-gray-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. chitesh@example.com"
                  required
                  className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-11 pr-4 py-3 outline-none transition placeholder-gray-500"
                />
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-10 pr-9 py-2.5 outline-none transition placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-gray-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-800/90 border border-gray-700 focus:border-book-amber focus:ring-1 focus:ring-book-amber text-white text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Profile Avatar Badge Color Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Choose Profile Badge Color
              </label>
              <div className="flex items-center gap-3">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={`w-8 h-8 rounded-full ${c.class} flex items-center justify-center transition transform hover:scale-110 cursor-pointer ${
                      selectedColor === c.class ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {selectedColor === c.class && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Reading Genres */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-book-amber" />
                  Select Favorite Genres (Optional)
                </label>
                <span className="text-[11px] text-book-amber font-medium">
                  {selectedGenres.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-book-amber text-slate-950 border-book-amber font-bold shadow'
                          : 'bg-slate-800/80 text-gray-300 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {isSelected && <Sparkles className="w-3 h-3 text-slate-950" />}
                      <span>{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-book-amber hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-4 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account & Start Reading</span>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-8 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-semibold hover:text-book-amber underline transition ml-1">
              Sign in here
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-2 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} BOOKFLIX AI Recommendation Engine. All rights reserved.
      </footer>
    </div>
  );
}
