'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import Navbar from '@/components/Navbar';
import BookDetailModal from '@/components/BookDetailModal';
import { 
  User, BookOpen, Star, Heart, Bookmark, BarChart2, 
  Activity, Sparkles, ArrowLeft, Trash2, CheckCircle2, 
  TrendingUp, Award 
} from 'lucide-react';

interface AnalyticsData {
  user_id: number;
  total_reviews: number;
  average_given_rating: number;
  genre_distribution: { genre: string; count: number }[];
  user_reviews: any[];
  recent_activities: any[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, wishlists, removeFromWishlist, openModal, userPreferences } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'wishlist' | 'reviews' | 'activity'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const userWishlist = currentUser ? (wishlists[currentUser.user_id] || []) : [];
  const userPrefs = currentUser ? (userPreferences[currentUser.user_id] || { liked: [], disliked: [] }) : { liked: [], disliked: [] };

  useEffect(() => {
    if (!currentUser) {
      // Redirect to login if guest
      router.push('/login');
      return;
    }

    setIsLoading(true);
    fetch(`${API_URL}/api/users/${currentUser.user_id}/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentUser, router, API_URL]);

  if (!currentUser) return null;

  const totalLiked = userPrefs.liked.length;
  const totalWishlist = userWishlist.length;
  const totalReviews = analytics?.total_reviews || 0;
  const avgRating = analytics?.average_given_rating || 0.0;

  // Calculate genre percentages
  const totalGenreHits = analytics?.genre_distribution.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="min-h-screen bg-book-dark text-white flex flex-col selection:bg-book-amber selection:text-white">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-12 max-w-7xl mx-auto w-full">
        {/* Back Link */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-book-amber transition mb-6 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          <span>Back to Browse</span>
        </Link>

        {/* Profile Hero Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden mb-8">
          <div className="absolute top-[-40%] right-[-10%] w-96 h-96 bg-book-amber/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar Badge */}
            <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl ${currentUser.avatar_color || 'bg-blue-800'} flex items-center justify-center text-4xl md:text-5xl font-extrabold text-white shadow-2xl border-2 border-amber-500/40 shrink-0`}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
                  {currentUser.name || `User ${currentUser.user_id}`}
                </h1>
                <span className="inline-flex items-center justify-center gap-1 bg-amber-500/20 text-book-amber border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                  <Award className="w-3.5 h-3.5" /> Premium Reader
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-4">{currentUser.email || `user${currentUser.user_id}@bookflix.com`}</p>

              {/* Quick Preferences Badges */}
              {currentUser.preferred_genres && currentUser.preferred_genres.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {currentUser.preferred_genres.map((g) => (
                    <span key={g} className="text-xs bg-slate-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-md">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Core Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900/80 border border-gray-800 p-5 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Heart className="w-6 h-6 fill-rose-500/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Liked Books</p>
              <h3 className="text-2xl font-extrabold text-white">{totalLiked}</h3>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-gray-800 p-5 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-book-amber shrink-0">
              <Bookmark className="w-6 h-6 fill-amber-500/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Wishlist Saved</p>
              <h3 className="text-2xl font-extrabold text-white">{totalWishlist}</h3>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-gray-800 p-5 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Star className="w-6 h-6 fill-indigo-500/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reviews Written</p>
              <h3 className="text-2xl font-extrabold text-white">{totalReviews}</h3>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-gray-800 p-5 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Given Rating</p>
              <h3 className="text-2xl font-extrabold text-white">{avgRating > 0 ? `${avgRating} ★` : 'N/A'}</h3>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 mb-8 gap-8 text-sm font-semibold text-gray-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === 'overview' ? 'text-book-amber font-bold' : 'hover:text-white'
            }`}
          >
            <span>Genre Analytics</span>
            {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-book-amber rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`pb-3 transition relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'wishlist' ? 'text-book-amber font-bold' : 'hover:text-white'
            }`}
          >
            <span>My Wishlist</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-gray-300">{totalWishlist}</span>
            {activeTab === 'wishlist' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-book-amber rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 transition relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews' ? 'text-book-amber font-bold' : 'hover:text-white'
            }`}
          >
            <span>My Reviews</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-gray-300">{totalReviews}</span>
            {activeTab === 'reviews' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-book-amber rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === 'activity' ? 'text-book-amber font-bold' : 'hover:text-white'
            }`}
          >
            <span>Activity Feed</span>
            {activeTab === 'activity' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-book-amber rounded-full" />}
          </button>
        </div>

        {/* Tab Content Panels */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Genre Distribution Bars */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-book-amber" /> Favorite Genre Distribution
              </h3>
              <p className="text-xs text-gray-400 mb-6">Based on your activity, reviews, and reading interactions</p>

              {analytics?.genre_distribution && analytics.genre_distribution.length > 0 ? (
                <div className="space-y-4">
                  {analytics.genre_distribution.map((item, idx) => {
                    const pct = Math.round((item.count / totalGenreHits) * 100);
                    const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
                    const color = colors[idx % colors.length];

                    return (
                      <div key={item.genre} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-200">{item.genre}</span>
                          <span className="text-book-amber">{pct}% ({item.count} books)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-8 text-center">Start liking books or adding reviews to generate your genre insights!</p>
              )}
            </div>

            {/* AI Reading Summary Box */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-book-amber" /> AI Persona Profile
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  Your reading behavior indicates a strong preference for immersive narratives with intricate plotlines and rich character dynamics.
                </p>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-gray-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Target Reader Vibe:</span>
                    <strong className="text-teal-400 font-bold">Explorer</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Rec Model Score:</span>
                    <strong className="text-book-amber font-bold">98.4% Match</strong>
                  </div>
                </div>
              </div>

              <Link
                href="/browse"
                className="mt-6 w-full bg-book-amber hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs text-center transition block shadow"
              >
                Explore Personalized Recommendations
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            {userWishlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {userWishlist.map((b) => (
                  <div key={b.book_id} className="group relative bg-slate-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg transition hover:scale-105">
                    <img
                      src={b.image_url_s?.replace('http:', 'https:') || b.image_url?.replace('http:', 'https:')}
                      alt={b.title}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => openModal(b)}
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150x220?text=No+Cover')}
                    />
                    <div className="p-3">
                      <p className="text-xs font-bold text-white truncate cursor-pointer hover:text-book-amber" onClick={() => openModal(b)}>
                        {b.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{b.author}</p>
                      <button
                        onClick={() => removeFromWishlist(b.book_id)}
                        className="mt-2 w-full text-[11px] bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-700/50 py-1 rounded transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/50 border border-gray-800 rounded-2xl">
                <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-300">Your Wishlist is Empty</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">Click + My List on any book to save it for later.</p>
                <Link href="/browse" className="text-xs font-bold bg-book-amber hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-lg transition">
                  Browse Books Now
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {analytics?.user_reviews && analytics.user_reviews.length > 0 ? (
              <div className="space-y-4">
                {analytics.user_reviews.map((rev) => (
                  <div key={rev.review_id} className="bg-slate-900/80 border border-gray-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-start">
                    {rev.book_image && (
                      <img
                        src={rev.book_image.replace('http:', 'https:')}
                        alt={rev.book_title}
                        className="w-14 h-20 object-cover rounded shadow shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-white">{rev.book_title}</h4>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">Reviewed on {new Date(rev.timestamp * 1000).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-gray-800">
                        &quot;{rev.review_text}&quot;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/50 border border-gray-800 rounded-2xl">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-300">No Reviews Written Yet</h3>
                <p className="text-xs text-gray-500 mt-1">Open any book detail modal to write your first review!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-slate-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-book-amber" /> Personal Interaction Log
            </h3>
            {analytics?.recent_activities && analytics.recent_activities.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_activities.map((act, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-gray-300 py-2 border-b border-gray-800/60">
                    <CheckCircle2 className="w-4 h-4 text-book-amber shrink-0" />
                    <span>
                      You <strong className="text-white capitalize">{act.action?.replace('_', ' ')}</strong> <em className="text-book-amber">{act.book_title}</em>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-6 text-center">No recent activities recorded.</p>
            )}
          </div>
        )}
      </main>

      <BookDetailModal />
    </div>
  );
}
