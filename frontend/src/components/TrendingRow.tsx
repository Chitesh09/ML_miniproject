'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import BookCard from './BookCard';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface TrendingBook {
  book_id: number;
  trending_score: number;
  live_likes: number;
  live_adds: number;
  is_hot: boolean;
  book_details: any;
}

interface TrendingGenre {
  genre: string;
  activity_count: number;
}

const POLL_INTERVAL = 20000; // 20 seconds

export default function TrendingRow() {
  const [trending, setTrending] = useState<TrendingBook[]>([]);
  const [genres, setGenres] = useState<TrendingGenre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrending = useCallback(async (isFirst = false) => {
    try {
      if (!isFirst) setIsRefreshing(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com'}/api/trending-live?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const nextTrending: TrendingBook[] = data.trending || [];
      const nextGenres: TrendingGenre[] = data.trending_genres || [];

      // Only update if IDs actually changed — prevents blink on no-change polls
      setTrending(prev => {
        const prevIds = prev.map(t => t.book_id).join(',');
        const nextIds = nextTrending.map(t => t.book_id).join(',');
        return prevIds === nextIds ? prev : nextTrending;
      });
      setGenres(prev => {
        const prevG = prev.map(g => g.genre).join(',');
        const nextG = nextGenres.map(g => g.genre).join(',');
        return prevG === nextG ? prev : nextGenres;
      });
      setLastUpdated(new Date());
    } catch { /* ignore */ } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(true);
    intervalRef.current = setInterval(() => fetchTrending(false), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchTrending]);

  const scroll = (dir: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const to = dir === 'left'
        ? scrollLeft - clientWidth + clientWidth / 4
        : scrollLeft + clientWidth - clientWidth / 4;
      rowRef.current.scrollTo({ left: to, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="my-8 px-4 md:px-12">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <div className="h-6 w-40 bg-book-card animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-none w-[120px] sm:w-[160px] md:w-[200px] h-[180px] sm:h-[240px] md:h-[300px] bg-book-card animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  const books = trending.map(t => ({
    ...t.book_details,
    book_id: t.book_id,
    _is_hot: t.is_hot,
    _trending_score: t.trending_score,
    _live_likes: t.live_likes,
  }));

  return (
    <div className="my-8 relative group z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <div className="flex items-center gap-2">
          <Flame className={`w-5 h-5 text-orange-500 ${isRefreshing ? 'animate-pulse' : ''}`} />
          <h2 className="text-xl md:text-2xl font-bold text-gray-200 hover:text-white transition cursor-pointer">
            Trending Now
          </h2>
          {isRefreshing && (
            <span className="text-[10px] text-book-amber animate-pulse ml-1">● live</span>
          )}
        </div>

        {/* Trending genre pills */}
        {genres.length > 0 && (
          <div className="hidden md:flex gap-2 items-center">
            {genres.slice(0, 4).map(g => (
              <span
                key={g.genre}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap"
              >
                🔥 {g.genre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <div
          className={`absolute top-0 bottom-0 left-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer ${!isMoved && 'hidden'}`}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-8 h-8 text-white scale-150 transition hover:scale-[2]" />
        </div>

        {/* Cards */}
        <div
          ref={rowRef}
          className="flex items-start gap-2 overflow-x-auto overflow-y-visible px-4 md:px-12 py-4 no-scrollbar snap-x snap-mandatory"
        >
          {books.map((book, idx) => (
            <div key={book.book_id} className="snap-start relative">
              {/* Rank badge */}
              <div className="absolute -top-2 -left-1 z-50 w-6 h-6 rounded-full bg-book-dark border border-book-amber/50 flex items-center justify-center text-[10px] font-bold text-book-amber shadow-md">
                {idx + 1}
              </div>
              {/* Hot indicator */}
              {book._is_hot && (
                <div className="absolute -top-2 -right-1 z-50 text-base leading-none" title="Hot right now!">🔥</div>
              )}
              <BookCard book={book} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <div
          className="absolute top-0 bottom-0 right-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-8 h-8 text-white scale-150 transition hover:scale-[2]" />
        </div>
      </div>
    </div>
  );
}
