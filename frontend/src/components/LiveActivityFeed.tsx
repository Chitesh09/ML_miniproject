'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';

interface Activity {
  activity_id: string;
  action: string;
  book_id: number;
  book_title: string;
  book_genre: string;
  display_text: string;
  timestamp: number;
  time_ago: string;
}

const ACTION_ICONS: Record<string, string> = {
  liked: '❤️',
  disliked: '👎',
  added_to_list: '📖',
  removed_from_list: '🗑️',
};

const ACTION_COLORS: Record<string, string> = {
  liked: 'from-rose-900/60 border-rose-500/40',
  disliked: 'from-slate-800/60 border-slate-500/30',
  added_to_list: 'from-amber-900/60 border-amber-500/40',
  removed_from_list: 'from-slate-800/60 border-slate-500/30',
};

const POLL_INTERVAL = 8000; // 8 seconds

export default function LiveActivityFeed() {
  const { currentUser } = useStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPulsing, setIsPulsing] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<number | undefined>(currentUser?.user_id);

  // Keep ref in sync to avoid stale closures in interval
  useEffect(() => {
    currentUserIdRef.current = currentUser?.user_id;
  }, [currentUser]);

  const fetchActivities = useCallback(async (isFirstLoad = false) => {
    try {
      const userId = currentUserIdRef.current;
      const excludeParam = userId != null ? `&exclude_user=${userId}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com'}/api/activity-feed?limit=20${excludeParam}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Activity[] = data.activities || [];

      // Find truly new items since last poll
      const fresh = incoming.filter(a => !seenIds.current.has(a.activity_id));
      fresh.forEach(a => seenIds.current.add(a.activity_id));

      if (fresh.length > 0 && !isFirstLoad) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1500);

        // Mark fresh items for entry animation
        const freshSet = new Set(fresh.map(a => a.activity_id));
        setNewIds(freshSet);
        setTimeout(() => setNewIds(new Set()), 1200);
      }

      // Only update state if something actually changed (avoid re-render blink)
      setActivities(prev => {
        const prevIds = prev.map(a => a.activity_id).join(',');
        const nextIds = incoming.map(a => a.activity_id).join(',');
        if (prevIds === nextIds) return prev; // nothing changed — keep same reference
        return incoming;
      });

      if (isFirstLoad) setIsLoading(false);
    } catch {
      if (isFirstLoad) setIsLoading(false);
    }
  }, []); // stable — uses ref for currentUser

  useEffect(() => {
    fetchActivities(true);
    intervalRef.current = setInterval(() => fetchActivities(false), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivities]);

  if (isLoading) {
    return (
      <div className="my-8 px-4 md:px-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-200">Live Reader Activity</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-none w-56 h-20 rounded-xl bg-book-card/60 animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <div className="my-8 relative">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 px-4 md:px-12">
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </div>
        <h2 className={`text-xl md:text-2xl font-bold transition-colors duration-500 ${isPulsing ? 'text-book-amber' : 'text-gray-200'}`}>
          Live Reader Activity
        </h2>
        <span className="text-xs text-gray-500 ml-1 mt-0.5">updates every 8s</span>
      </div>

      {/* Horizontal scroll feed */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-12 pb-2"
      >
        {activities.map((act) => {
          const isNew = newIds.has(act.activity_id);
          const colorClass = ACTION_COLORS[act.action] || ACTION_COLORS['liked'];
          const icon = ACTION_ICONS[act.action] || '📚';

          return (
            <div
              key={act.activity_id}
              className={`
                flex-none w-56 rounded-xl border bg-gradient-to-br ${colorClass}
                backdrop-blur-sm p-3 flex flex-col gap-1 shadow-lg
                transition-all duration-700
                ${isNew
                  ? 'scale-105 ring-1 ring-book-amber/60 shadow-[0_0_20px_rgba(217,119,6,0.25)] animate-fade-in'
                  : 'opacity-90 hover:opacity-100 hover:scale-[1.03]'
                }
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <p className="text-xs text-gray-200 font-medium leading-snug line-clamp-2">
                  {act.display_text}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                {act.book_genre && (
                  <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                    {act.book_genre}
                  </span>
                )}
                <span className="text-[10px] text-gray-500 ml-auto whitespace-nowrap">
                  {act.time_ago}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
