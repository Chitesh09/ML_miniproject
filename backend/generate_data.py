import pandas as pd
import numpy as np
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def generate_mock_data():
    print("Generating mock data...")
    # Books
    n_books = 500
    np.random.seed(42)
    genres = ['Fiction', 'Sci-Fi', 'Fantasy', 'Romance', 'Mystery', 'Non-Fiction', 'Biography']
    books_data = {
        'book_id': range(1, n_books + 1),
        'title': [f'Book Title {i}' for i in range(1, n_books + 1)],
        'author': [f'Author {np.random.randint(1, 100)}' for i in range(1, n_books + 1)],
        'genre': np.random.choice(genres, n_books),
        'publication_year': np.random.randint(1990, 2024, n_books)
    }
    books_df = pd.DataFrame(books_data)
    books_df.to_csv(os.path.join(DATA_DIR, 'books.csv'), index=False)

    # Users
    n_users = 1000
    
    # Ratings (sparsity ~5%)
    n_ratings = int(n_books * n_users * 0.05)
    ratings_data = {
        'user_id': np.random.randint(1, n_users + 1, n_ratings),
        'book_id': np.random.randint(1, n_books + 1, n_ratings),
        'rating': np.random.randint(1, 11, n_ratings) # 1 to 10
    }
    ratings_df = pd.DataFrame(ratings_data).drop_duplicates(subset=['user_id', 'book_id'])
    ratings_df.to_csv(os.path.join(DATA_DIR, 'ratings.csv'), index=False)
    print("Data generated in", DATA_DIR)

if __name__ == "__main__":
    generate_mock_data()
