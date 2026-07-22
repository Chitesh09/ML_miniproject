'use client';
import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import HeroBanner from '@/components/HeroBanner';
import CarouselRow from '@/components/CarouselRow';
import BookDetailModal from '@/components/BookDetailModal';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import TrendingRow from '@/components/TrendingRow';
import NotificationSystem from '@/components/NotificationSystem';
import { HeroSkeleton, RowSkeleton } from '@/components/Skeletons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── COLD START BANNER ─────────────────────────────────────────────────────
const ColdStartBanner = memo(function ColdStartBanner() {
  return (
    <div className="px-4 md:px-12 py-8 mb-8 animate-fade-in">
      <div className="bg-gradient-to-br from-book-dark via-book-card to-book-dark border border-gray-700/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-2xl transition-all hover:border-book-amber/40 hover:shadow-[0_0_40px_rgba(217,119,6,0.15)] group relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
        <div className="w-16 h-16 bg-book-amber/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(217,119,6,0.3)]">
          <span className="text-3xl">✨</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
          Your Personalized Library Awaits
        </h3>
        <p className="text-gray-300 max-w-xl mb-8 text-lg md:text-xl font-light">
          Hit the 👍 icon on books you enjoy, and our intelligent engine will tailor this section specifically to your unique reading taste.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-3 text-green-400 bg-green-400/10 px-6 py-3 rounded-full font-medium shadow-inner border border-green-400/20">
            <span className="text-xl">👍</span> Like what you love
          </div>
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 px-6 py-3 rounded-full font-medium shadow-inner border border-red-400/20">
            <span className="text-xl">👎</span> Skip what you don&apos;t
          </div>
        </div>
      </div>
    </div>
  );
});

// ── GENRE VIEW ────────────────────────────────────────────────────────────
interface GenreViewProps {
  selectedGenre: string;
  genreBooks: any[];
  books: any[];
}
const GenreView = memo(function GenreView({ selectedGenre, genreBooks, books }: GenreViewProps) {
  if (genreBooks.length === 0) {
    return (
      <div className="px-4 md:px-12 py-10 text-center">
        <p className="text-gray-400 text-lg">
          No exact matches for <span className="text-book-amber font-semibold">{selectedGenre}</span>.
          Showing popular picks instead.
        </p>
        <CarouselRow title="Popular Books" books={books.slice(1, 15)} />
      </div>
    );
  }
  return (
    <>
      <CarouselRow title={`Top ${selectedGenre} Books`} books={genreBooks.slice(1, 15)} />
      {genreBooks.length > 15 && (
        <CarouselRow title={`More ${selectedGenre}`} books={genreBooks.slice(15, 30)} />
      )}
      {genreBooks.length > 30 && (
        <CarouselRow title={`Even More ${selectedGenre}`} books={genreBooks.slice(30, 50)} />
      )}
    </>
  );
});

// ── MAIN VIEW ─────────────────────────────────────────────────────────────
interface MainViewProps {
  hasLiked: boolean;
  recommended: any[];
  isUpdatingRecs: boolean;
  wishlist: any[];
  books: any[];
  genreRows: { title: string; books: any[] }[];
}
const MainView = memo(function MainView({
  hasLiked,
  recommended,
  isUpdatingRecs,
  wishlist,
  books,
  genreRows,
}: MainViewProps) {
  return (
    <>
      {/* Personalised / cold-start section */}
      {!hasLiked ? (
        <ColdStartBanner />
      ) : (
        recommended.length > 0 && (
          <div className="relative animate-fade-in">
            {isUpdatingRecs && (
              <div className="absolute top-0 right-12 z-50 text-book-amber text-sm font-medium animate-pulse flex items-center gap-2 bg-book-card/80 px-3 py-1 rounded-full shadow-lg border border-book-amber/30 backdrop-blur-sm">
                <span className="animate-spin text-lg">⏳</span> Updating...
              </div>
            )}
            <div
              key={recommended.map(b => b.book_id).join(',')}
              className="transition-opacity duration-500 ease-in-out"
            >
              <CarouselRow title="Recommended for You" books={recommended} isRecommendation />
            </div>
          </div>
        )
      )}

      {/* My List */}
      {wishlist.length > 0 && (
        <div id="my-list-row">
          <CarouselRow title="My List" books={wishlist} />
        </div>
      )}

      {/* 🔥 Live Trending Row */}
      <TrendingRow />

      {/* 📡 Live Reader Activity Feed */}
      <LiveActivityFeed />

      {/* Supplemental genre rows with fallback */}
      {genreRows.map(row => (
        <CarouselRow key={row.title} title={row.title} books={row.books} />
      ))}

      {/* Remaining popular books */}
      <div id="series-row">
        <CarouselRow title="Popular Series" books={books.slice(15, 30)} />
      </div>
      <div id="authors-row">
        <CarouselRow title="Author Spotlight" books={books.slice(30, 45)} />
      </div>
      <CarouselRow title="Award Winners" books={books.slice(45, 50)} />
    </>
  );
});

// ── BROWSE PAGE ───────────────────────────────────────────────────────────
export default function BrowsePage() {
  const { currentUser, wishlists, selectedGenre, userPreferences, setBookScores } = useStore();
  const router = useRouter();

  const wishlist = currentUser ? (wishlists[currentUser.user_id] || []) : [];
  const prefs = currentUser
    ? (userPreferences[currentUser.user_id] || { liked: [], disliked: [] })
    : { liked: [], disliked: [] };

  const scoreFetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [genreBooks, setGenreBooks] = useState<any[]>([]);
  const [genreRows, setGenreRows] = useState<{ title: string; books: any[] }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUpdatingRecs, setIsUpdatingRecs] = useState(false);

  // ── AUTH GUARD ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  // ── GENRE FILTER ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGenre) return;
    fetch(`${API}/api/books?limit=50&genre=${encodeURIComponent(selectedGenre)}`)
      .then(r => r.json())
      .then(data => setGenreBooks(data))
      .catch(() => {});
  }, [selectedGenre]);

  // ── INITIAL DATA ──────────────────────────────────────────────────
  const fetchRecommendations = useCallback((showLoading = true) => {
    if (!currentUser) return;
    if (showLoading) setLoading(true);
    fetch(`${API}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.user_id,
        liked_books: prefs.liked,
        disliked_books: prefs.disliked,
      }),
    })
      .then(r => r.json())
      .then(data => setRecommended(data.recommendations || []))
      .catch(() => {})
      .finally(() => {
        if (showLoading) setLoading(false);
        setIsUpdatingRecs(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    Promise.all([
      fetch(`${API}/api/books?limit=50`).then(r => r.json()),
      fetch(`${API}/api/books?limit=50&genre=Fiction`).then(r => r.json()),
      fetch(`${API}/api/books?limit=50&genre=Mystery`).then(r => r.json()),
      fetch(`${API}/api/books?limit=50&genre=Romance`).then(r => r.json()),
    ])
      .then(([popular, fiction, mystery, romance]) => {
        setBooks(popular);

        const ensureBooks = (arr: any[], fallback: any[], offset = 0) =>
          arr.length >= 5 ? arr : fallback.slice(offset, offset + 15);

        setGenreRows([
          { title: 'Fiction Favourites', books: ensureBooks(fiction, popular, 0) },
          { title: 'Mystery & Suspense',  books: ensureBooks(mystery, popular, 15) },
          { title: 'Romance Picks',       books: ensureBooks(romance, popular, 30) },
        ]);

        setLoading(false);
        fetchRecommendations(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser, fetchRecommendations]);

  // ── RE-FETCH RECS ON INTERACTION (debounced) ─────────────────────
  useEffect(() => {
    if (!currentUser) return;

    // Skip the very first mount to avoid double-fetching recs
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (scoreFetchTimeout.current) clearTimeout(scoreFetchTimeout.current);

    if (prefs.liked.length > 0 || prefs.disliked.length > 0) {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      setToastMessage('✨ Got it. Improving your recommendations...');
      toastTimeout.current = setTimeout(() => setToastMessage(null), 3000);
    }

    setIsUpdatingRecs(true);
    scoreFetchTimeout.current = setTimeout(() => {
      fetchRecommendations(false);

      const candidateIds = Array.from(new Set(
        [...books, ...genreBooks].map(b => b?.book_id).filter(Boolean)
      ));

      if (candidateIds.length > 0) {
        fetch(`${API}/api/books/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            candidate_ids: candidateIds,
            liked_books: prefs.liked,
            disliked_books: prefs.disliked,
          }),
        })
          .then(r => r.json())
          .then(data => { if (data.scores) setBookScores(data.scores); })
          .catch(() => {});
      }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.liked, prefs.disliked]);

  if (!currentUser) return null;

  const heroBannerBook = selectedGenre && genreBooks.length > 0 ? genreBooks[0] : books[0];

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      {loading ? (
        <HeroSkeleton />
      ) : (
        <HeroBanner book={heroBannerBook} />
      )}

      <div className="relative z-20 mt-8 md:mt-12">
        {loading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : selectedGenre ? (
          <GenreView
            selectedGenre={selectedGenre}
            genreBooks={genreBooks}
            books={books}
          />
        ) : (
          <MainView
            hasLiked={prefs.liked.length > 0}
            recommended={recommended}
            isUpdatingRecs={isUpdatingRecs}
            wishlist={wishlist}
            books={books}
            genreRows={genreRows}
          />
        )}
      </div>

      <BookDetailModal />

      {/* Personalised interaction toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] bg-book-card border border-book-amber/50 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(217,119,6,0.3)] animate-slide-up flex items-center gap-3 backdrop-blur-md">
          <span className="text-lg">✨</span>
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Real-time notification toasts (separate layer) */}
      <NotificationSystem />
    </div>
  );
}
