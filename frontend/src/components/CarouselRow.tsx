import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from './BookCard';

interface CarouselRowProps {
  title: string;
  books: any[];
  isRecommendation?: boolean;
}

export default function CarouselRow({ title, books, isRecommendation = false }: CarouselRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth + (clientWidth / 4)
        : scrollLeft + clientWidth - (clientWidth / 4);
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <div className="my-8 relative group z-10">
      <h2 className="text-xl md:text-2xl font-bold text-gray-200 mb-2 px-4 md:px-12 transition hover:text-white inline-block cursor-pointer">
        {title}
      </h2>

      <div className="relative">
        {/* Left Arrow */}
        <div 
          className={`absolute top-0 bottom-0 left-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer ${!isMoved && 'hidden'}`}
          onClick={() => handleClick('left')}
        >
          <ChevronLeft className="w-8 h-8 text-white scale-150 transition hover:scale-[2]" />
        </div>

        {/* Carousel Container */}
        <div 
          ref={rowRef}
          className="flex items-center gap-2 overflow-x-auto overflow-y-hidden px-4 md:px-12 py-4 no-scrollbar snap-x snap-mandatory"
        >
          {books.map((item) => (
            <div key={item.book_id || item.book_details?.book_id} className="snap-start">
               <BookCard 
                  book={item.book_details || item} 
                  recommendationExplanation={item.explanation}
                  confidenceScore={item.confidence_score}
               />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <div 
          className="absolute top-0 bottom-0 right-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer"
          onClick={() => handleClick('right')}
        >
          <ChevronRight className="w-8 h-8 text-white scale-150 transition hover:scale-[2]" />
        </div>
      </div>
    </div>
  );
}
