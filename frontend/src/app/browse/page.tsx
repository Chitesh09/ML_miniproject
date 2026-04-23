'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import HeroBanner from '@/components/HeroBanner';
import CarouselRow from '@/components/CarouselRow';
import BookDetailModal from '@/components/BookDetailModal';
import { HeroSkeleton, RowSkeleton } from '@/components/Skeletons';

export default function BrowsePage() {
  const { currentUser, interactionsRefreshTrigger, wishlist } = useStore();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);

  // Auth guard
  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Initial Data Fetch
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    
    // Fetch Popular
    fetch('http://localhost:8000/api/books?limit=50')
      .then(res => res.json())
      .then(data => setBooks(data))
      .catch(console.error);

    // Initial Recommended Fetch
    fetchRecommendations();
  }, [currentUser]);

  // Effect to re-fetch recommendations when interactions happen
  useEffect(() => {
    if (!currentUser || loading) return;
    fetchRecommendations();
  }, [interactionsRefreshTrigger]);

  const fetchRecommendations = () => {
    if (!currentUser) return;
    fetch('http://localhost:8000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.user_id })
    })
    .then(res => res.json())
    .then(data => setRecommended(data.recommendations || []))
    .catch(console.error)
    .finally(() => setLoading(false));
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      {loading ? (
        <HeroSkeleton />
      ) : (
        <HeroBanner book={books[0]} /> // Feature the first popular book
      )}

      <div className="relative z-20 -mt-24 md:-mt-32">
        {loading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : (
          <>
            {recommended.length > 0 && (
              <CarouselRow title="Recommended for You" books={recommended} isRecommendation />
            )}
            
            {wishlist.length > 0 && (
              <div id="my-list-row">
                <CarouselRow title="My List" books={wishlist} />
              </div>
            )}

            <CarouselRow title="Trending Now" books={books.slice(1, 15)} />
            
            <div id="series-row">
              <CarouselRow title="Popular Series" books={books.slice(15, 30)} />
            </div>
            
            <div id="authors-row">
              <CarouselRow title="Author Spotlight" books={books.slice(30, 45)} />
            </div>

            <CarouselRow title="Award Winners" books={books.slice(45, 50)} />
          </>
        )}
      </div>

      <BookDetailModal />
    </div>
  );
}
