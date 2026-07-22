'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import Link from 'next/link';

export default function ProfileSelection() {
  const [users, setUsers] = useState<number[]>([]);
  const { setCurrentUser } = useStore();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isTransitioning, setIsTransitioning] = useState<number | null>(null);
  const [showAllProfiles, setShowAllProfiles] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users`)
      .then(res => res.json())
      .then(data => setUsers(data.slice(0, 20))) // Get top 20
      .catch(console.error);
  }, []);

  const selectUser = (userId: number, name: string, color: string) => {
    setIsTransitioning(userId);
    setTimeout(() => {
      setCurrentUser({ user_id: userId, name, avatar_color: color });
      router.push('/browse');
    }, 600); // Wait for animation
  };

  const realNames = [
    "Chitesh", "Yeshu", "Rishi", "Varun", 
    "Alice", "Bob", "Charlie", "Diana", 
    "Eve", "Frank", "Grace", "Heidi", 
    "Ivan", "Judy", "Mallory", "Nina", 
    "Oscar", "Peggy", "Romeo", "Sybil"
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-book-dark text-white flex flex-col items-center justify-center p-8 relative">
      {/* Top Header */}
      <div className="absolute top-6 left-8 md:left-12 right-8 md:right-12 flex items-center justify-between z-40">
        <h1 className="text-book-amber text-3xl md:text-5xl font-extrabold tracking-wider">BOOKFLIX</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 hover:border-book-amber px-4 py-2 rounded transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-book-amber hover:bg-amber-600 text-slate-950 px-4 py-2 rounded transition shadow-lg"
          >
            Sign Up
          </Link>
        </div>
      </div>
      
      <div className="animate-in fade-in zoom-in duration-700 ease-out flex flex-col items-center w-full max-w-6xl relative group/container">
        <h2 className="text-3xl md:text-6xl text-white mb-10 text-center font-medium">Who is reading today?</h2>
        
        {/* Left Arrow */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 p-3 rounded-full opacity-0 group-hover/container:opacity-100 transition-opacity duration-300 hover:bg-black/80 hover:scale-110"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* Carousel Container */}
        <div 
          ref={scrollRef}
          className="flex items-center gap-6 md:gap-10 overflow-x-auto w-full px-10 py-8 no-scrollbar snap-x snap-mandatory"
        >
          {users.map((userId, idx) => {
            const colors = ['bg-blue-800', 'bg-book-brown', 'bg-emerald-800', 'bg-purple-800', 'bg-rose-800', 'bg-teal-800'];
            const color = colors[idx % colors.length];
            const name = realNames[idx % realNames.length];

            return (
              <div 
                key={userId} 
                className={`group flex flex-col items-center cursor-pointer flex-none snap-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-24 md:w-36 ${
                  isTransitioning !== null 
                    ? isTransitioning === userId 
                      ? 'scale-125 z-50' 
                      : 'opacity-0 scale-90 pointer-events-none'
                    : 'hover:scale-110'
                }`}
                onClick={() => isTransitioning === null && selectUser(userId, name, color)}
              >
                <div className={`w-24 h-24 md:w-36 md:h-36 rounded-md ${color} flex items-center justify-center text-4xl md:text-6xl font-bold text-white shadow-xl transition-all duration-300 ${
                  isTransitioning === userId 
                    ? 'ring-4 ring-book-amber shadow-[0_0_40px_rgba(217,119,6,0.6)]' 
                    : 'group-hover:ring-4 group-hover:ring-book-amber group-hover:shadow-[0_0_30px_rgba(217,119,6,0.5)]'
                }`}>
                  {name.charAt(0)}
                </div>
                <span className={`mt-4 transition-colors duration-200 text-lg md:text-2xl font-medium ${
                  isTransitioning === userId ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 p-3 rounded-full opacity-0 group-hover/container:opacity-100 transition-opacity duration-300 hover:bg-black/80 hover:scale-110"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        <button className={`mt-12 border border-gray-500 text-gray-500 px-6 py-2 uppercase tracking-widest font-medium transition-all duration-500 ${
          isTransitioning !== null ? 'opacity-0' : 'hover:text-white hover:border-book-amber'
        }`}>
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
