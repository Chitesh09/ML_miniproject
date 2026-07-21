import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { BookOpen, Plus, Check, ChevronDown, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BookCardProps {
  book: any;
  recommendationExplanation?: string;
  confidenceScore?: number;
}

export default function BookCard({ book, recommendationExplanation, confidenceScore }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { currentUser, openModal, wishlists, addToWishlist, removeFromWishlist, userPreferences, toggleLike, toggleDislike, bookScores } = useStore();
  const router = useRouter();

  // Optimistic UI States
  const wishlist = currentUser ? (wishlists[currentUser.user_id] || []) : [];
  const isFavStore = wishlist.some(b => b.book_id === book.book_id);
  const prefs = currentUser ? (userPreferences[currentUser.user_id] || { liked: [], disliked: [] }) : { liked: [], disliked: [] };
  const isLikedStore = prefs.liked.includes(book.book_id);
  const isDislikedStore = prefs.disliked.includes(book.book_id);

  const [optFav, setOptFav] = useState<boolean | null>(null);
  const [optLike, setOptLike] = useState<boolean | null>(null);
  const [optDislike, setOptDislike] = useState<boolean | null>(null);

  const isFav = optFav !== null ? optFav : isFavStore;
  const isLiked = optLike !== null ? optLike : isLikedStore;
  const isDisliked = optDislike !== null ? optDislike : isDislikedStore;

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptFav(!isFav);
    if (isFav) removeFromWishlist(book.book_id);
    else addToWishlist(book);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptLike(!isLiked);
    if (isDisliked) setOptDislike(false);
    toggleLike(book.book_id);
  };

  const handleToggleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptDislike(!isDisliked);
    if (isLiked) setOptLike(false);
    toggleDislike(book.book_id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/book/${book.book_id}`);
  };

  const safeReplace = (url: any) =>
    typeof url === 'string' && url.length > 0 ? url.replace('http:', 'https:') : '';
  const imageUrl = safeReplace(book.image_url_m) || safeReplace(book.image_url_l) || safeReplace(book.image_url);

  // Calculate dynamic match percentage
  let matchPercentage = 0;
  let isRecalculating = false;

  if (confidenceScore !== undefined) {
    matchPercentage = Math.round(confidenceScore * 100);
  } else if (bookScores[book.book_id] !== undefined) {
    matchPercentage = Math.round(bookScores[book.book_id] * 100);
  } else if (prefs.liked.length > 0) {
    // If user has liked books but no score yet, it might be recalculating
    isRecalculating = true;
  }

  const showMatch = (prefs.liked.length > 0 && matchPercentage > 0) || isRecalculating;

  // Match Color Logic
  let matchColor = 'text-green-400';
  if (matchPercentage >= 75) matchColor = 'text-green-400';
  else if (matchPercentage >= 50) matchColor = 'text-yellow-400';
  else matchColor = 'text-red-400';

  return (
    <div 
      className="relative flex-none w-[120px] sm:w-[160px] md:w-[200px] h-[180px] sm:h-[240px] md:h-[300px] cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 hover:z-40 hover:scale-110 md:hover:scale-125 hover:shadow-[0_0_30px_rgba(0,0,0,0.8)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => openModal(book)}
    >
      <img 
        src={imageUrl} 
        alt={book.title} 
        className="w-full h-full object-cover rounded-md shadow-lg"
        onError={e => e.currentTarget.src = 'https://via.placeholder.com/200x300/1e293b/ffffff?text=No+Cover'}
      />
      
      {/* Explanation Banner */}
      {showMatch && !isHovered && (
        <div className="absolute top-0 right-0 bg-book-amber text-book-dark text-[10px] font-bold px-2 py-1 rounded-bl-md rounded-tr-md shadow-md z-20">
          {isRecalculating ? (
            <span className="inline-block w-8 h-2 bg-book-dark/30 animate-pulse rounded"></span>
          ) : (
            `${matchPercentage}% Match`
          )}
        </div>
      )}

      {/* Hover Card Expansion */}
      {isHovered && (
        <div className="absolute top-0 left-0 w-full h-full bg-book-card text-white rounded-md shadow-2xl p-3 flex flex-col justify-end transition-opacity duration-300 z-30 opacity-100 bg-gradient-to-t from-book-dark via-book-dark/90 to-transparent">
          <div className="flex gap-2 mb-2 items-center flex-wrap">
            <button onClick={handlePlayClick} className="w-8 h-8 bg-book-amber text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition shadow shrink-0 active:scale-95" title="Details">
              <BookOpen fill="currentColor" className="w-4 h-4" />
            </button>
            <button onClick={handleToggleLike} className={`w-8 h-8 border-2 ${isLiked ? 'border-green-500 bg-green-500/20 text-green-500 animate-bounce-short shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'border-gray-400 text-white'} rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow shrink-0 active:scale-95`} title="Like">
              <ThumbsUp className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button onClick={handleToggleDislike} className={`w-8 h-8 border-2 ${isDisliked ? 'border-red-500 bg-red-500/20 text-red-500 animate-bounce-short shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'border-gray-400 text-white'} rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow shrink-0 active:scale-95`} title="Dislike">
              <ThumbsDown className="w-4 h-4" fill={isDisliked ? "currentColor" : "none"} />
            </button>
            <button onClick={handleToggleWishlist} className={`w-8 h-8 border-2 ${isFav ? 'border-white bg-white/20 text-white animate-bounce-short' : 'border-gray-400 text-white'} rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow shrink-0 active:scale-95`} title="Add to List">
              {isFav ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <button className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow shrink-0 ml-auto" title="More Info">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <h4 className="font-bold text-sm line-clamp-1">{book.title}</h4>
          {showMatch && (
            <p className={`text-[10px] font-bold mt-1 transition-colors duration-300 ${matchColor}`}>
              {isRecalculating ? (
                <span className="inline-block w-12 h-2 bg-gray-500/50 animate-pulse rounded"></span>
              ) : (
                `${matchPercentage}% Match`
              )}
              <span className="text-gray-400 font-normal ml-1">{book.year_of_publication}</span>
            </p>
          )}
          {!showMatch && (
            <p className="text-[10px] text-gray-400 mt-1">{book.year_of_publication}</p>
          )}
          <p className="text-[10px] text-gray-300 mt-1 line-clamp-1">{book.genre || book.publisher}</p>
          {recommendationExplanation && (
             <p className="text-[10px] text-book-amber mt-1 font-medium leading-tight line-clamp-2 animate-fade-in drop-shadow-[0_0_5px_rgba(217,119,6,0.5)]">
               {recommendationExplanation}
             </p>
          )}
        </div>
      )}
    </div>
  );
}
