import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { X, BookOpen, Plus, Check, ThumbsUp, ThumbsDown, Sparkles, Clock, Compass, ExternalLink, ChevronDown, Star, Send, MessageSquare } from 'lucide-react';
import CarouselRow from './CarouselRow';
import { useRouter } from 'next/navigation';

export default function BookDetailModal() {
  const { currentUser, isModalOpen, selectedBook, closeModal, wishlists, addToWishlist, removeFromWishlist, triggerInteractionsRefresh } = useStore();
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [showReadDropdown, setShowReadDropdown] = useState(false);
  const [readLinks, setReadLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linksError, setLinksError] = useState(false);
  
  // Reviews state
  const [reviewsData, setReviewsData] = useState<{ reviews: any[]; average_rating: number; total_reviews: number }>({ reviews: [], average_rating: 0, total_reviews: 0 });
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const wishlist = currentUser ? (wishlists[currentUser.user_id] || []) : [];
  const isFav = wishlist.some(b => b?.book_id === selectedBook?.book_id);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowReadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isModalOpen && selectedBook) {
      setFeedbackGiven(null);
      setLoading(true);
      setShowReadDropdown(false);
      setReadLinks([]);
      setReviewText('');
      setReviewMsg(null);
      
      // Log click
      fetch(`${API_URL}/api/interactions/click`, { method: 'POST' }).catch(console.error);

      // Fetch reviews
      fetch(`${API_URL}/api/books/${selectedBook.book_id}/reviews`)
        .then(res => res.json())
        .then(data => setReviewsData(data))
        .catch(console.error);

      // Fetch similar books
      fetch(`${API_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: selectedBook.book_id, alpha: 0.5 })
      })
      .then(res => res.json())
      .then(data => setSimilarBooks(data.recommendations || []))
      .catch(console.error)
      .finally(() => setLoading(false));
    } else {
      setSimilarBooks([]);
    }
  }, [isModalOpen, selectedBook, API_URL]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!reviewText.trim()) return;

    setIsSubmittingReview(true);
    setReviewMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/books/${selectedBook.book_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          user_name: currentUser.name || `User ${currentUser.user_id}`,
          avatar_color: currentUser.avatar_color || 'bg-blue-800',
          rating: userRating,
          review_text: reviewText,
        }),
      });

      if (res.ok) {
        setReviewText('');
        setReviewMsg('Thank you! Your review has been published.');
        // Refresh reviews list
        const d = await (await fetch(`${API_URL}/api/books/${selectedBook.book_id}/reviews`)).json();
        setReviewsData(d);
        triggerInteractionsRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!isModalOpen || !selectedBook) return null;

  const handleToggleWishlist = () => {
    if (isFav) removeFromWishlist(selectedBook.book_id);
    else addToWishlist(selectedBook);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/feedback?type=${type}`, { method: 'POST' }).catch(console.error);
    setFeedbackGiven(type);
    triggerInteractionsRefresh();
  };

  const handleReadClick = () => {
    closeModal();
    router.push(`/book/${selectedBook.book_id}`);
  };

  const handleReadOnlineClick = async () => {
    if (showReadDropdown) {
      setShowReadDropdown(false);
      return;
    }
    
    setShowReadDropdown(true);
    
    if (readLinks.length === 0) {
      setLoadingLinks(true);
      setLinksError(false);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/books/${selectedBook.book_id}/read-links`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReadLinks(data.read_links || []);
      } catch (err) {
        console.error(err);
        setLinksError(true);
      } finally {
        setLoadingLinks(false);
      }
    }
  };

  const imageUrl = selectedBook.image_url_l?.replace('http:', 'https:') || selectedBook.image_url?.replace('http:', 'https:');

  // Simulated AI Insights
  const estimatedHours = Math.max(2, Math.floor(selectedBook.title.length / 5));
  const vibes = ["Atmospheric", "Thought-provoking", "Fast-paced", "Emotional", "Dark & Mysterious", "Light & Uplifting", "Complex"];
  const randomVibe = vibes[selectedBook.book_id % vibes.length];

  // Dynamic match percentage
  const userSeed = currentUser ? currentUser.user_id : 1;
  const matchPercentage = 65 + ((selectedBook.book_id * userSeed) % 31);

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center overflow-y-auto overflow-x-hidden p-4 md:p-10 no-scrollbar">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />

      {/* Modal Content */}
      <div className="relative bg-book-card text-book-light w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden z-10 my-auto animate-in fade-in zoom-in-95 duration-200 border border-gray-700">
        
        {/* Close Button */}
        <button 
          onClick={closeModal}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-book-dark hover:bg-black rounded-full flex items-center justify-center transition border border-gray-600 shadow"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Hero Section of Modal */}
        <div className="relative w-full h-[40vh] md:h-[50vh]">
          <img 
            src={imageUrl} 
            alt={selectedBook.title}
            className="w-full h-full object-cover opacity-80"
            onError={e => e.currentTarget.src = 'https://via.placeholder.com/1000x500/0f172a/ffffff?text=BOOKFLIX'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-book-card via-book-card/60 to-transparent" />
          
          <div className="absolute bottom-0 left-0 p-8 w-full flex flex-col justify-end">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-shadow-book text-white line-clamp-2">{selectedBook.title}</h2>
            <div className="flex gap-4">
              <button onClick={handleReadClick} className="flex items-center gap-2 bg-book-amber text-white px-6 py-2 rounded font-bold hover:bg-amber-600 transition shadow-lg">
                <BookOpen fill="currentColor" className="w-5 h-5" /> Details
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button onClick={handleReadOnlineClick} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-500 transition shadow-lg">
                  <ExternalLink className="w-5 h-5" /> Read Online <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {showReadDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 bg-book-dark border border-gray-600 rounded-lg shadow-xl w-64 overflow-hidden z-50">
                    {loadingLinks ? (
                      <div className="p-4 text-center text-gray-400 text-sm animate-pulse">Loading sources...</div>
                    ) : linksError || readLinks.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">No free sources found. Try preview or purchase options.</div>
                    ) : (
                      <div className="flex flex-col">
                        {readLinks.map((link, i) => (
                          <a 
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-3 hover:bg-gray-700 text-white text-sm flex items-center justify-between border-b border-gray-700 last:border-0 transition"
                            onClick={() => setShowReadDropdown(false)}
                          >
                            <span>Read on {link.name}</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={handleToggleWishlist} className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition bg-book-dark shadow" title="Add to My List">
                {isFav ? <Check className="w-5 h-5 text-green-400" /> : <Plus className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => handleFeedback('positive')} 
                className={`w-10 h-10 border-2 rounded-full flex items-center justify-center transition shadow ${feedbackGiven === 'positive' ? 'border-green-400 bg-green-400/20 text-green-400' : 'border-gray-400 hover:border-white hover:bg-white/20 bg-book-dark'}`} 
                title="I like this"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleFeedback('negative')} 
                className={`w-10 h-10 border-2 rounded-full flex items-center justify-center transition shadow ${feedbackGiven === 'negative' ? 'border-red-400 bg-red-400/20 text-red-400' : 'border-gray-400 hover:border-white hover:bg-white/20 bg-book-dark'}`} 
                title="Not for me"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 border-b border-gray-700">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 text-sm mb-4">
              <span className="text-green-400 font-bold">{matchPercentage}% Match</span>
              <span className="text-gray-400">{selectedBook.year_of_publication}</span>
              <span className="border border-gray-600 px-1 text-gray-300 rounded text-xs">HD</span>
            </div>
            <p className="text-gray-200 text-lg leading-relaxed">
               Experience the captivating story of {selectedBook.title}. A critically acclaimed work that has left an indelible mark on its readers. Dive deep into the pages and explore the vivid imagination of the author.
            </p>
          </div>
          <div className="text-sm space-y-3">
            <p><span className="text-gray-500">Author:</span> <span className="text-gray-300">{selectedBook.author}</span></p>
            <p><span className="text-gray-500">Publisher:</span> <span className="text-gray-300">{selectedBook.publisher}</span></p>
            <p><span className="text-gray-500">Genre:</span> <span className="text-gray-300">{selectedBook.genre || "Fiction"}</span></p>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="p-8 bg-book-dark/50 border-b border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-book-amber">
            <Sparkles className="w-5 h-5" /> AI Reading Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-book-card border border-gray-700 p-4 rounded-lg flex items-start gap-4 shadow-sm">
              <Clock className="w-8 h-8 text-indigo-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Estimated Read Time</h4>
                <p className="text-sm text-gray-400">~{estimatedHours} hours at average reading speed.</p>
              </div>
            </div>
            <div className="bg-book-card border border-gray-700 p-4 rounded-lg flex items-start gap-4 shadow-sm">
              <Compass className="w-8 h-8 text-teal-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Book Vibe</h4>
                <p className="text-sm text-gray-400">Considered highly <strong className="text-teal-300">{randomVibe.toLowerCase()}</strong> by similar readers.</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-4 rounded-lg sm:col-span-2 flex items-start gap-4 shadow-sm">
              <Sparkles className="w-8 h-8 text-book-amber mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Why you should read this</h4>
                <p className="text-sm text-indigo-200 mt-1 italic">
                  &quot;If you enjoyed other books published by {selectedBook.publisher}, this {randomVibe.toLowerCase()} journey by {selectedBook.author} will keep you turning pages late into the night.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Reviews & Star Ratings Section */}
        <div className="p-8 border-b border-gray-700 bg-slate-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-book-amber" /> Community Reviews
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">See what fellow readers think or leave your rating</p>
            </div>
            {reviewsData.total_reviews > 0 && (
              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-gray-700">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(reviewsData.average_rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-white">{reviewsData.average_rating}</span>
                <span className="text-xs text-gray-400">({reviewsData.total_reviews} reviews)</span>
              </div>
            )}
          </div>

          {/* Submit Review Form */}
          <form onSubmit={handleReviewSubmit} className="mb-8 bg-slate-800/70 p-5 rounded-xl border border-gray-700/80">
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Write a Review</h4>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-400 mr-2">Your Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  onClick={() => setUserRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className={`w-6 h-6 cursor-pointer transition ${
                    star <= (hoverRating ?? userRating)
                      ? 'text-amber-400 fill-amber-400 scale-110'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                />
              ))}
              <span className="text-xs font-bold text-book-amber ml-2">
                {userRating} / 5 Stars
              </span>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={currentUser ? "What did you think of this book? Share your thoughts..." : "Please sign in to leave a review."}
              rows={3}
              required
              disabled={!currentUser}
              className="w-full bg-slate-950/80 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-book-amber focus:ring-1 focus:ring-book-amber outline-none transition placeholder-gray-500 disabled:opacity-50"
            />

            {reviewMsg && (
              <p className="text-xs text-emerald-400 font-semibold mt-2">{reviewMsg}</p>
            )}

            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSubmittingReview || !currentUser || !reviewText.trim()}
                className="bg-book-amber hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Review</span>
              </button>
            </div>
          </form>

          {/* Existing Reviews List */}
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 no-scrollbar">
            {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
              reviewsData.reviews.map((rev) => (
                <div key={rev.review_id} className="p-4 bg-slate-800/40 rounded-lg border border-gray-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${rev.avatar_color || 'bg-blue-800'} flex items-center justify-center text-xs font-bold text-white shadow`}>
                        {rev.user_name ? rev.user_name.charAt(0) : 'U'}
                      </div>
                      <span className="text-sm font-semibold text-white">{rev.user_name}</span>
                    </div>
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
                  <p className="text-xs text-gray-300 leading-relaxed">{rev.review_text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic text-center py-4">No reviews yet. Be the first to share your review!</p>
            )}
          </div>
        </div>

        {/* Similar Books Row */}
        <div className="pb-8 pt-4">
          {loading ? (
             <div className="p-8 text-center text-gray-500 animate-pulse">Finding similar books...</div>
          ) : (
            similarBooks.length > 0 && <CarouselRow title="More Like This" books={similarBooks} />
          )}
        </div>
      </div>
    </div>
  );
}
