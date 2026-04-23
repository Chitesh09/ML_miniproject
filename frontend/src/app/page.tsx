'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function ProfileSelection() {
  const [users, setUsers] = useState<number[]>([]);
  const { setCurrentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    fetch('http://localhost:8000/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.slice(0, 4))) // Get top 4
      .catch(console.error);
  }, []);

  const selectUser = (userId: number, name: string) => {
    setCurrentUser({ user_id: userId, name });
    router.push('/browse');
  };

  const realNames = ["Chitesh", "Yeshu", "Rishi", "Varun"];

  return (
    <div className="min-h-screen bg-book-dark text-white flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 left-8 md:left-12">
        <h1 className="text-book-amber text-3xl md:text-5xl font-extrabold tracking-wider">BOOKFLIX</h1>
      </div>
      
      <div className="animate-in fade-in zoom-in duration-700 ease-out flex flex-col items-center">
        <h2 className="text-3xl md:text-6xl text-white mb-10 text-center font-medium">Who is reading today?</h2>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {users.map((userId, idx) => {
            const colors = ['bg-blue-800', 'bg-book-brown', 'bg-emerald-800', 'bg-purple-800'];
            const color = colors[idx % colors.length];
            const name = realNames[idx % realNames.length];

            return (
              <div 
                key={userId} 
                className="group flex flex-col items-center cursor-pointer w-24 md:w-40"
                onClick={() => selectUser(userId, name)}
              >
                <div className={`w-24 h-24 md:w-40 md:h-40 rounded-md ${color} flex items-center justify-center text-3xl md:text-6xl font-bold text-white group-hover:ring-4 group-hover:ring-book-amber transition-all duration-200 shadow-xl`}>
                  {name.charAt(0)}
                </div>
                <span className="mt-4 text-gray-400 group-hover:text-white transition-colors duration-200 text-lg md:text-2xl">
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        <button className="mt-20 border border-gray-500 text-gray-500 px-6 py-2 uppercase tracking-widest font-medium hover:text-white hover:border-book-amber transition duration-200">
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
