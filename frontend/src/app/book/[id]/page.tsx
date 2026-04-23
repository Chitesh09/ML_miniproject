'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useStore } from '@/store/useStore';
import { BookOpen, Plus, Check } from 'lucide-react';
import CarouselRow from '@/components/CarouselRow';

export default function BookPage() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const { currentUser, wishlist, addToWishlist, removeFromWishlist } = useStore();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    if (id) {
      // For demo, we are doing a slightly hacky fetch by searching because the backend 
      // doesn't have a specific GET /book/{id} endpoint exposed currently.
      // Or we can get it from the recommendation endpoint logic.
      
      // Get similar books which also acts as our validation
      fetch('http://localhost:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: Number(id), alpha: 0.5 })
      })
      .then(res => res.json())
      .then(data => setSimilarBooks(data.recommendations || []))
      .catch(console.error);

      // In a real app we'd fetch the single book. For now we use the search endpoint as a fallback.
      fetch(`http://localhost:8000/api/search?q=${id}`)
        .then(res => res.json())
        .then(data => {
            const found = data.find((b: any) => b.book_id === Number(id));
            if(found) setBook(found);
        });
    }
  }, [id, currentUser, router]);

  const isFav = wishlist.some(b => b.book_id === Number(id));
  const handleToggleWishlist = () => {
    if(!book) return;
    if (isFav) removeFromWishlist(book.book_id);
    else addToWishlist(book);
  };

  if (!book) return <div className="min-h-screen flex items-center justify-center bg-book-dark"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-book-amber"></div></div>;

  const imageUrl = book.image_url_l?.replace('http:', 'https:') || book.image_url?.replace('http:', 'https:');

  return (
    <div className="min-h-screen bg-book-dark text-white">
      <Navbar />
      
      <div className="relative pt-24 px-4 md:px-12 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 max-w-sm">
            <img 
                src={imageUrl} 
                alt={book.title} 
                className="w-full rounded shadow-2xl"
                onError={e => e.currentTarget.src = 'https://via.placeholder.com/400x600/1e293b/ffffff?text=No+Cover'}
            />
        </div>
        
        <div className="w-full md:w-2/3 mt-4 md:mt-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-book-amber">{book.title}</h1>
            <p className="text-xl text-gray-300 mb-6">{book.author} &bull; {book.year_of_publication}</p>
            
            <div className="flex gap-4 mb-8">
              <button className="flex items-center gap-2 bg-book-amber text-white px-8 py-3 rounded font-bold hover:bg-amber-600 transition shadow">
                <BookOpen fill="currentColor" className="w-5 h-5" /> Start Reading
              </button>
              <button onClick={handleToggleWishlist} className="flex items-center gap-2 border border-gray-500 text-white px-6 py-3 rounded hover:border-white transition shadow">
                {isFav ? <><Check className="w-5 h-5 text-green-400" /> In My List</> : <><Plus className="w-5 h-5" /> Add to List</>}
              </button>
            </div>

            <div className="prose prose-invert max-w-none">
                <h3 className="text-book-amber uppercase tracking-widest text-sm mb-2">Synopsis</h3>
                <p className="text-lg leading-relaxed mb-6 text-gray-200">
                    Join the unforgettable journey within the pages of {book.title}. 
                    A masterpiece of {book.genre || book.publisher}, this book continues to resonate with readers.
                </p>
                <div className="border-t border-gray-700 pt-6 mt-6">
                    <p><span className="text-gray-500">Publisher:</span> {book.publisher}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-12 pb-12">
          {similarBooks.length > 0 && <CarouselRow title="Similar to this book" books={similarBooks} />}
      </div>
    </div>
  );
}
