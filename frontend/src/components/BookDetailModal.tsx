import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, BookOpen, Plus, Check, ThumbsUp, ThumbsDown, Sparkles, Clock, Compass } from 'lucide-react';
import CarouselRow from './CarouselRow';
import { useRouter } from 'next/navigation';

export default function BookDetailModal() {
  const { currentUser, isModalOpen, selectedBook, closeModal, wishlist, addToWishlist, removeFromWishlist, triggerInteractionsRefresh } = useStore();
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isFav = wishlist.some(b => b?.book_id === selectedBook?.book_id);

  useEffect(() => {
    if (isModalOpen && selectedBook) {
      setLoading(true);
      // Log click
      fetch('http://localhost:8000/api/interactions/click', { method: 'POST' }).catch(console.error);

      // Fetch similar books
      fetch('http://localhost:8000/api/recommend', {
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
  }, [isModalOpen, selectedBook]);

  if (!isModalOpen || !selectedBook) return null;

  const handleToggleWishlist = () => {
    if (isFav) removeFromWishlist(selectedBook.book_id);
    else addToWishlist(selectedBook);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    fetch(`http://localhost:8000/api/feedback?type=${type}`, { method: 'POST' }).catch(console.error);
    triggerInteractionsRefresh();
  };

  const handleReadClick = () => {
    closeModal();
    router.push(`/book/${selectedBook.book_id}`);
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
                <BookOpen fill="currentColor" className="w-5 h-5" /> Read
              </button>
              <button onClick={handleToggleWishlist} className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition bg-book-dark shadow" title="Add to My List">
                {isFav ? <Check className="w-5 h-5 text-green-400" /> : <Plus className="w-5 h-5" />}
              </button>
              <button onClick={() => handleFeedback('positive')} className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition bg-book-dark shadow" title="I like this">
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button onClick={() => handleFeedback('negative')} className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition bg-book-dark shadow" title="Not for me">
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
                  "If you enjoyed other books published by {selectedBook.publisher}, this {randomVibe.toLowerCase()} journey by {selectedBook.author} will keep you turning pages late into the night."
                </p>
              </div>
            </div>
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
