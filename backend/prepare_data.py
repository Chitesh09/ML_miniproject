import pandas as pd
import numpy as np
import os

ARCHIVE_DIR = r"C:\Users\chite\Downloads\archive"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def main():
    print("Loading raw data...")
    # Read Books
    try:
        books = pd.read_csv(
            os.path.join(ARCHIVE_DIR, 'BX_Books.csv'),
            sep=';',
            encoding='ISO-8859-1',
            on_bad_lines='skip',
            low_memory=False
        )
    except Exception as e:
        print("Error reading books:", e)
        return

    # Keep only necessary columns based on BX dataset
    books = books[['ISBN', 'Book-Title', 'Book-Author', 'Year-Of-Publication', 'Publisher', 'Image-URL-M']]
    books.columns = ['ISBN', 'title', 'author', 'year', 'publisher', 'image_url']

    # Read Ratings
    ratings_path = os.path.join(ARCHIVE_DIR, 'BX-Book-Ratings.csv')
    ratings = pd.read_csv(
        ratings_path,
        sep=';',
        encoding='ISO-8859-1',
        on_bad_lines='skip'
    )
    ratings.columns = ['user_id', 'ISBN', 'rating']

    print("Initial shapes - Books:", books.shape, "Ratings:", ratings.shape)

    # 1. Filter out sparse users (users with less than 20 ratings)
    user_counts = ratings['user_id'].value_counts()
    active_users = user_counts[user_counts >= 20].index
    ratings = ratings[ratings['user_id'].isin(active_users)]

    # 2. Filter out sparse books (books with less than 20 ratings)
    book_counts = ratings['ISBN'].value_counts()
    popular_books = book_counts[book_counts >= 20].index
    ratings = ratings[ratings['ISBN'].isin(popular_books)]
    
    # 3. Join ratings and books dataset (inner join on ISBN)
    ratings = ratings[ratings['ISBN'].isin(books['ISBN'])]
    books = books[books['ISBN'].isin(ratings['ISBN'].unique())]

    print("Filtered shapes - Books:", books.shape, "Ratings:", ratings.shape)

    # Map ISBN to sequential integer `book_id` for matrix logic
    books = books.reset_index(drop=True)
    books['book_id'] = books.index
    
    isbn_to_id = dict(zip(books['ISBN'], books['book_id']))
    ratings['book_id'] = ratings['ISBN'].map(isbn_to_id)
    
    # BX doesn't provide nice genres, fill with publisher as proxy for Content-Based Filtering
    books['genre'] = books['publisher'].fillna('Unknown')
    
    # Clean NaNs
    books['author'] = books['author'].fillna('Unknown')
    books['title'] = books['title'].fillna('Unknown')

    print(f"Saving to {OUTPUT_DIR}")
    books.to_csv(os.path.join(OUTPUT_DIR, 'books.csv'), index=False)
    ratings.to_csv(os.path.join(OUTPUT_DIR, 'ratings.csv'), index=False)
    print("Done!")

if __name__ == "__main__":
    main()
