'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  type: string;
  book_id?: number;
  timestamp: number;
}

const POLL_INTERVAL = 12000;   // poll every 12s
const DISPLAY_DURATION = 5500; // each toast visible for 5.5s
const MAX_VISIBLE = 3;

export default function NotificationSystem() {
  const { currentUser } = useStore();
  const [queue, setQueue] = useState<Notification[]>([]);
  const [visible, setVisible] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Fetch fresh notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const userParam = currentUser ? `?user_id=${currentUser.user_id}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com'}/api/notifications${userParam}&limit=3`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Notification[] = (data.notifications || []).filter(
        (n: Notification) => !seenIds.current.has(n.id)
      );
      if (incoming.length === 0) return;
      incoming.forEach(n => seenIds.current.add(n.id));
      setQueue(prev => [...prev, ...incoming]);
    } catch { /* ignore */ }
  }, [currentUser]);

  // Drip visible notifications from queue
  useEffect(() => {
    if (queue.length === 0) return;
    setVisible(prev => {
      const undismissed = prev.filter(n => !dismissed.has(n.id));
      const slots = MAX_VISIBLE - undismissed.length;
      if (slots <= 0) return prev;
      const toShow = queue.slice(0, slots);
      setQueue(q => q.slice(toShow.length));
      return [...toShow, ...undismissed];
    });
  }, [queue]);

  // Auto-dismiss each toast after display duration
  useEffect(() => {
    visible.forEach(n => {
      if (!timersRef.current.has(n.id)) {
        const t = setTimeout(() => dismiss(n.id), DISPLAY_DURATION);
        timersRef.current.set(n.id, t);
      }
    });
  }, [visible]);

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(Array.from(prev).concat(id)));
    setTimeout(() => {
      setVisible(prev => prev.filter(n => n.id !== id));
      setDismissed(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 400);
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  };

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [fetchNotifications]);

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-[150] flex flex-col gap-3 items-end pointer-events-none"
      aria-live="polite"
    >
      {visible.map((n) => {
        const isDismissing = dismissed.has(n.id);
        return (
          <div
            key={n.id}
            className={`
              pointer-events-auto
              flex items-start gap-3 max-w-xs w-full
              bg-book-card/95 backdrop-blur-md
              border border-book-amber/30
              rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]
              transition-all duration-400
              ${isDismissing
                ? 'opacity-0 translate-x-8 scale-95'
                : 'opacity-100 translate-x-0 scale-100 animate-slide-up'
              }
            `}
          >
            {/* Glowing accent line */}
            <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-book-amber/60 shadow-[0_0_8px_rgba(217,119,6,0.8)]" />

            <p className="flex-1 text-sm text-gray-100 font-medium leading-snug">
              {n.text}
            </p>

            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 text-gray-500 hover:text-gray-300 transition mt-0.5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
