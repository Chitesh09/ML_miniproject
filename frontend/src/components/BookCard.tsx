import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { BookOpen, Plus, Check, ChevronDown, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BookCardProps {
  book: any;
  recommendationExplanation?: string;
  confidenceScore?: number;
}

export default function BookCard({ book, recommendationExplanation, confidenceScore }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { currentUser, openModal, wishlist, addToWishlist, removeFromWishlist } = useStore();
  const router = useRouter();

  const isFav = wishlist.some(b => b.book_id === book.book_id);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFav) removeFromWishlist(book.book_id);
    else addToWishlist(book);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/book/${book.book_id}`);
  };

  const imageUrl = book.image_url_m?.replace('http:', 'https:') || book.image_url?.replace('http:', 'https:');

  // Calculate dynamic match percentage
  let matchPercentage = 0;
  if (confidenceScore) {
    matchPercentage = Math.round(confidenceScore * 100);
  } else {
    // Generate a deterministic pseudo-random match between 65% and 95% based on book and user
    const userSeed = currentUser ? currentUser.user_id : 1;
    matchPercentage = 65 + ((book.book_id * userSeed) % 31);
  }

  return (
    <div 
      className="relative flex-none w-[120px] sm:w-[160px] md:w-[200px] h-[180px] sm:h-[240px] md:h-[300px] cursor-pointer transition-transform duration-300 ease-out z-10 hover:z-40 hover:scale-110 md:hover:scale-125"
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
      {recommendationExplanation && !isHovered && (
        <div className="absolute top-0 right-0 bg-book-amber text-book-dark text-[10px] font-bold px-2 py-1 rounded-bl-md rounded-tr-md shadow-md z-20">
          {matchPercentage}% Match
        </div>
      )}

      {/* Hover Card Expansion */}
      {isHovered && (
        <div className="absolute top-0 left-0 w-full h-full bg-book-card text-white rounded-md shadow-2xl p-3 flex flex-col justify-end transition-opacity duration-300 z-30 opacity-100 bg-gradient-to-t from-book-dark via-book-dark/90 to-transparent">
          <div className="flex gap-2 mb-2 items-center">
            <button onClick={handlePlayClick} className="w-8 h-8 bg-book-amber text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition shadow" title="Details">
              <BookOpen fill="currentColor" className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); window.open(`https://books.google.com/books?q=${encodeURIComponent(book.title + ' ' + book.author)}`, '_blank'); }} className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 transition shadow" title="Read Online">
              <ExternalLink className="w-4 h-4" />
            </button>
            <button onClick={handleToggleWishlist} className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow" title="Add to List">
              {isFav ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <button className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white hover:bg-white/20 transition shadow ml-auto" title="More Info">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <h4 className="font-bold text-sm line-clamp-1">{book.title}</h4>
          <p className="text-[10px] text-green-400 font-bold mt-1">{matchPercentage}% Match <span className="text-gray-400 font-normal ml-1">{book.year_of_publication}</span></p>
          <p className="text-[10px] text-gray-300 mt-1 line-clamp-1">{book.genre || book.publisher}</p>
          {recommendationExplanation && (
             <p className="text-[9px] text-book-amber mt-1 italic line-clamp-2">{recommendationExplanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
