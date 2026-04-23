import { Info, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

interface HeroBannerProps {
  book: any;
}

export default function HeroBanner({ book }: HeroBannerProps) {
  const router = useRouter();
  const { openModal } = useStore();

  if (!book) return null;

  const imageUrl = book.image_url_l?.replace('http:', 'https:') || book.image_url?.replace('http:', 'https:');

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] text-white">
      <div className="absolute w-full h-full">
        <img 
          src={imageUrl} 
          alt={book.title} 
          className="w-full h-full object-cover opacity-50 blur-[2px] scale-105"
          onError={e => e.currentTarget.src = 'https://via.placeholder.com/1920x1080/0f172a/ffffff?text=BOOKFLIX'}
        />
        {/* Dynamic Image Overlay (simulating cinematic look) */}
        <div className="absolute inset-0 bg-gradient-to-r from-book-dark via-book-dark/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-book-dark via-transparent to-transparent" />
      </div>

      <div className="absolute top-[30%] md:top-[40%] left-4 md:left-12 max-w-xl z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-shadow-book tracking-tight line-clamp-2 text-book-amber">
          {book.title}
        </h1>
        
        <p className="text-lg md:text-xl font-medium text-gray-300 mb-6 text-shadow-book drop-shadow-md line-clamp-1">
          {book.author} &bull; {book.year_of_publication || 'Unknown'} &bull; {book.publisher}
        </p>

        <p className="text-sm md:text-base text-gray-200 mb-8 max-w-lg line-clamp-3 md:line-clamp-4 drop-shadow">
           A literary journey awaits. Explore the compelling world of {book.title} crafted by the renowned {book.author}. 
           Discover why readers around the globe are captivated by this masterpiece.
        </p>

        <div className="flex gap-4">
          <button 
            onClick={() => router.push(`/book/${book.book_id}`)}
            className="flex items-center gap-2 bg-book-amber text-white px-6 py-2 md:py-3 rounded md:rounded-md font-bold text-lg hover:bg-amber-600 transition shadow-lg"
          >
            <BookOpen fill="currentColor" className="w-5 h-5" /> Read
          </button>
          <button 
            onClick={() => openModal(book)}
            className="flex items-center gap-2 bg-book-card/80 text-white px-6 py-2 md:py-3 rounded md:rounded-md font-bold text-lg border border-gray-600 hover:bg-book-card hover:border-gray-400 transition shadow-lg"
          >
            <Info className="w-5 h-5" /> Insights
          </button>
        </div>
      </div>
    </div>
  );
}
