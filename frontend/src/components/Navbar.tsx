import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { currentUser, setCurrentUser } = useStore();
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        fetch(`http://localhost:8000/api/search?q=${searchQuery}`)
          .then(res => res.json())
          .then(data => setSearchResults(data))
          .catch(console.error);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside search and notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (bookId: number) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/book/${bookId}`);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    router.push('/');
  };

  return (
    <nav className={`fixed w-full z-50 transition-colors duration-500 ease-in-out ${isScrolled ? 'bg-book-dark shadow-lg' : 'bg-transparent bg-gradient-to-b from-book-dark/90 to-transparent'}`}>
      <div className="flex items-center justify-between px-4 md:px-12 py-4">
        {/* Left section */}
        <div className="flex items-center gap-8">
          <Link href="/browse">
            <h1 className="text-book-amber text-2xl md:text-3xl font-extrabold cursor-pointer tracking-wider">BOOKFLIX</h1>
          </Link>
          <div className="hidden md:flex gap-4 text-sm font-medium text-gray-300">
            <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-book-amber transition cursor-pointer">Home</button>
            <button onClick={() => {
              const el = document.getElementById("series-row");
              if(el) { 
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }} className="hover:text-book-amber transition cursor-pointer">Series</button>
            <button onClick={() => {
              const el = document.getElementById("authors-row");
              if(el) { 
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }} className="hover:text-book-amber transition cursor-pointer">Authors</button>
            <button onClick={() => {
              const el = document.getElementById("my-list-row");
              if(el) { 
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
              else alert("Add books to your list first!");
            }} className="hover:text-book-amber transition cursor-pointer">My List</button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-6">
          {/* Search */}
          <div className="relative flex items-center" ref={searchRef}>
            <div className={`flex items-center bg-black/40 border ${isSearchOpen ? 'border-book-amber px-2 py-1' : 'border-transparent'} transition-all duration-300 rounded`}>
              <Search 
                className={`w-5 h-5 cursor-pointer transition ${isSearchOpen ? 'text-book-amber' : 'text-white'}`} 
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (!isSearchOpen) setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
                }}
              />
              <input
                id="searchInput"
                type="text"
                placeholder="Titles, authors, genres"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent text-white text-sm outline-none transition-all duration-300 ${isSearchOpen ? 'w-48 md:w-64 ml-2 opacity-100' : 'w-0 opacity-0'}`}
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && isSearchOpen && (
              <div className="absolute top-12 right-0 w-72 bg-book-card border border-gray-700 rounded shadow-2xl overflow-y-auto max-h-96 z-[60]">
                {searchResults.map((b) => (
                  <div 
                    key={b.book_id} 
                    onClick={() => handleResultClick(b.book_id)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 transition"
                  >
                    <img 
                      src={b.image_url_s?.replace('http:', 'https:') || b.image_url?.replace('http:', 'https:')} 
                      alt={b.title} 
                      className="w-10 h-14 object-cover rounded shadow"
                      onError={e => e.currentTarget.src = 'https://via.placeholder.com/40x56?text=No+Cover'}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white line-clamp-1">{b.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{b.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative hidden md:block" ref={notifRef}>
            <div className="relative cursor-pointer" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="w-5 h-5 text-white hover:text-book-amber transition" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {showNotifications && (
              <div className="absolute top-10 right-0 w-64 bg-book-card border border-gray-700 rounded shadow-2xl z-[60] overflow-hidden">
                <div className="p-3 border-b border-gray-700 font-bold text-white text-sm">Notifications</div>
                <div className="p-4 hover:bg-gray-800 transition cursor-pointer flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-book-amber text-book-dark flex items-center justify-center font-bold">New</div>
                  <div className="text-sm text-gray-300">
                    <p className="text-white font-semibold">Fresh Recommendations!</p>
                    <p className="text-xs">Based on your recent reads.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Dropdown */}
          {currentUser && (
            <div className="group relative cursor-pointer flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-800 flex items-center justify-center text-white font-bold">
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="hidden group-hover:block absolute top-8 right-0 pt-4 z-[60]">
                <div className="bg-book-card border border-gray-700 w-40 flex flex-col p-2 text-sm text-white rounded shadow-2xl">
                  <div className="px-2 py-2 border-b border-gray-700 font-bold text-book-amber">{currentUser.name || `User ${currentUser.user_id}`}</div>
                  <Link href="/" className="px-2 py-2 hover:bg-gray-800 transition rounded mt-1">Change Profile</Link>
                  <button onClick={handleSignOut} className="px-2 py-2 text-left hover:bg-gray-800 transition rounded w-full">Sign out</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
