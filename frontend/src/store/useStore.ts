import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Book {
  book_id: number;
  title: string;
  author: string;
  image_url: string;
  [key: string]: any;
}

interface User {
  user_id: number;
  name?: string;
}

interface StoreState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  wishlist: Book[];
  addToWishlist: (book: Book) => void;
  removeFromWishlist: (bookId: number) => void;
  
  isModalOpen: boolean;
  selectedBook: Book | null;
  openModal: (book: Book) => void;
  closeModal: () => void;

  interactionsRefreshTrigger: number;
  triggerInteractionsRefresh: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      wishlist: [],
      addToWishlist: (book) => set((state) => ({ 
        wishlist: state.wishlist.some(b => b.book_id === book.book_id) 
          ? state.wishlist 
          : [...state.wishlist, book] 
      })),
      removeFromWishlist: (bookId) => set((state) => ({
        wishlist: state.wishlist.filter(b => b.book_id !== bookId)
      })),

      isModalOpen: false,
      selectedBook: null,
      openModal: (book) => set({ isModalOpen: true, selectedBook: book }),
      closeModal: () => set({ isModalOpen: false, selectedBook: null }),

      interactionsRefreshTrigger: 0,
      triggerInteractionsRefresh: () => set((state) => ({ interactionsRefreshTrigger: state.interactionsRefreshTrigger + 1 })),
    }),
    {
      name: 'bookflix-storage',
      partialize: (state) => ({ 
        currentUser: state.currentUser, 
        wishlist: state.wishlist 
      }),
    }
  )
);
