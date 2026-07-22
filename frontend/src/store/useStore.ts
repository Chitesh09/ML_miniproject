import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bookflix-backend-rka3.onrender.com';

interface Book {
  book_id: number;
  title: string;
  author: string;
  image_url: string;
  [key: string]: any;
}

export interface User {
  user_id: number;
  name?: string;
  email?: string;
  avatar_color?: string;
  preferred_genres?: string[];
}

interface UserPreferences {
  liked: number[];
  disliked: number[];
}

interface StoreState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  wishlists: Record<number, Book[]>;
  wishlist?: Book[]; // legacy migration
  addToWishlist: (book: Book) => void;
  removeFromWishlist: (bookId: number) => void;

  isModalOpen: boolean;
  selectedBook: Book | null;
  openModal: (book: Book) => void;
  closeModal: () => void;

  interactionsRefreshTrigger: number;
  triggerInteractionsRefresh: () => void;

  selectedGenre: string | null;
  setSelectedGenre: (genre: string | null) => void;

  userPreferences: Record<number, UserPreferences>;
  toggleLike: (bookId: number, book?: Book) => void;
  toggleDislike: (bookId: number, book?: Book) => void;

  bookScores: Record<number, number>;
  setBookScores: (scores: Record<number, number>) => void;
}

const initialPreferences: Record<number, UserPreferences> = {
  1: { liked: [100, 200, 300], disliked: [50] },
  2: { liked: [400, 500], disliked: [] },
  3: { liked: [], disliked: [] },
  4: { liked: [600, 700], disliked: [800] },
};

/** Fire-and-forget activity broadcast — never throws, never blocks UI */
function broadcastActivity(
  userId: number,
  action: 'liked' | 'disliked' | 'added_to_list' | 'removed_from_list',
  bookId: number,
) {
  fetch(`${API}/api/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, action, book_id: bookId }),
  }).catch(() => { /* silently ignore network errors */ });
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set((state) => {
        let newWishlists = { ...state.wishlists };
        let newWishlistState = state.wishlist;

        // Migration: move legacy global wishlist into profile bucket
        if (user && state.wishlist && state.wishlist.length > 0) {
          const userId = user.user_id;
          const existingList = newWishlists[userId] || [];
          const mergedList = [...existingList];
          for (const book of state.wishlist) {
            if (!mergedList.some(b => b.book_id === book.book_id)) {
              mergedList.push(book);
            }
          }
          newWishlists[userId] = mergedList;
          newWishlistState = undefined;
        }

        return {
          currentUser: user,
          wishlists: newWishlists,
          wishlist: newWishlistState,
        };
      }),

      wishlists: {},
      addToWishlist: (book) => set((state) => {
        if (!state.currentUser) return state;
        const userId = state.currentUser.user_id;
        const userList = state.wishlists[userId] || [];

        if (userList.some(b => b.book_id === book.book_id)) return state;

        // Broadcast to activity feed (non-blocking)
        broadcastActivity(userId, 'added_to_list', book.book_id);

        return {
          wishlists: {
            ...state.wishlists,
            [userId]: [...userList, book],
          },
        };
      }),

      removeFromWishlist: (bookId) => set((state) => {
        if (!state.currentUser) return state;
        const userId = state.currentUser.user_id;
        const userList = state.wishlists[userId] || [];

        // Broadcast to activity feed (non-blocking)
        broadcastActivity(userId, 'removed_from_list', bookId);

        return {
          wishlists: {
            ...state.wishlists,
            [userId]: userList.filter(b => b.book_id !== bookId),
          },
        };
      }),

      isModalOpen: false,
      selectedBook: null,
      openModal: (book) => set({ isModalOpen: true, selectedBook: book }),
      closeModal: () => set({ isModalOpen: false, selectedBook: null }),

      interactionsRefreshTrigger: 0,
      triggerInteractionsRefresh: () =>
        set((state) => ({ interactionsRefreshTrigger: state.interactionsRefreshTrigger + 1 })),

      selectedGenre: null,
      setSelectedGenre: (genre) => set({ selectedGenre: genre }),

      userPreferences: initialPreferences,

      toggleLike: (bookId, book) => set((state) => {
        if (!state.currentUser) return state;
        const userId = state.currentUser.user_id;
        const prefs = state.userPreferences[userId] || { liked: [], disliked: [] };

        let newLiked = [...prefs.liked];
        let newDisliked = prefs.disliked.filter(id => id !== bookId);

        if (newLiked.includes(bookId)) {
          newLiked = newLiked.filter(id => id !== bookId);
          // Un-liking — no broadcast (or broadcast a neutral event)
        } else {
          newLiked.push(bookId);
          // Broadcast like to activity feed
          broadcastActivity(userId, 'liked', bookId);
        }

        return {
          userPreferences: {
            ...state.userPreferences,
            [userId]: { liked: newLiked, disliked: newDisliked },
          },
        };
      }),

      toggleDislike: (bookId, book) => set((state) => {
        if (!state.currentUser) return state;
        const userId = state.currentUser.user_id;
        const prefs = state.userPreferences[userId] || { liked: [], disliked: [] };

        let newDisliked = [...prefs.disliked];
        let newLiked = prefs.liked.filter(id => id !== bookId);

        if (newDisliked.includes(bookId)) {
          newDisliked = newDisliked.filter(id => id !== bookId);
        } else {
          newDisliked.push(bookId);
          broadcastActivity(userId, 'disliked', bookId);
        }

        return {
          userPreferences: {
            ...state.userPreferences,
            [userId]: { liked: newLiked, disliked: newDisliked },
          },
        };
      }),

      bookScores: {},
      setBookScores: (scores) =>
        set((state) => ({ bookScores: { ...state.bookScores, ...scores } })),
    }),
    {
      name: 'bookflix-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        wishlists: state.wishlists,
        wishlist: state.wishlist,
        userPreferences: state.userPreferences,
      }),
    },
  ),
);
