import pandas as pd
import numpy as np
import requests
import time
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
BOOKS_CSV = os.path.join(DATA_DIR, 'books.csv')
RATINGS_CSV = os.path.join(DATA_DIR, 'ratings.csv')

books_list = [
    ("The Ritual", "Shantel Tessier"),
    ("Hooked", "Emily McIntire"),
    ("Captive in the Dark", "C.J. Roberts"),
    ("Seduced in the Dark", "C.J. Roberts"),
    ("Tears of Tess", "Pepper Winters"),
    ("Twist Me", "Anna Zaires"),
    ("Consequences", "Aleatha Romig"),
    ("Debt Inheritance", "Pepper Winters"),
    ("The Sweetest Oblivion", "Danielle Lori"),
    ("Credence", "Penelope Douglas"),
    ("Haunting Adeline", "H.D. Carlton"),
    ("Hunting Adeline", "H.D. Carlton"),
    ("Does It Hurt?", "H.D. Carlton"),
    ("Take Me With You", "Nina G. Jones"),
    ("Mindf*ck Series", "S.T. Abby"),
    ("The Predator", "Runyx"),
    ("King", "T.M. Frazier"),
    ("There Are No Saints", "Sophie Lark"),
    ("Fear Me, Love Me", "Lilith Vincent"),
    # Additional books from requested authors
    ("God of Malice", "Rina Kent"),
    ("Twisted Love", "Ana Huang"),
    ("Neon Gods", "Katee Robert"),
    ("Dark Notes", "Pam Godwin"),
    ("Untouchable", "Sam Mariano")
]

def fetch_book_cover(title, author):
    # Try OpenLibrary search API to find a cover ID
    url = f"https://openlibrary.org/search.json?title={requests.utils.quote(title)}&author={requests.utils.quote(author)}&limit=1"
    try:
        res = requests.get(url, timeout=5).json()
        if res.get("docs") and len(res["docs"]) > 0:
            doc = res["docs"][0]
            cover_id = doc.get("cover_i")
            if cover_id:
                return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg", f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg", f"https://covers.openlibrary.org/b/id/{cover_id}-S.jpg"
    except Exception as e:
        print(f"Error fetching {title}: {e}")
    
    # Fallback placeholder
    safe_title = requests.utils.quote(title)
    return (
        f"https://via.placeholder.com/600x900/0f172a/ffffff?text={safe_title}",
        f"https://via.placeholder.com/300x450/0f172a/ffffff?text={safe_title}",
        f"https://via.placeholder.com/150x225/0f172a/ffffff?text={safe_title}"
    )

def add_books():
    print("Loading existing books...")
    if os.path.exists(BOOKS_CSV):
        books_df = pd.read_csv(BOOKS_CSV)
        max_id = books_df['book_id'].max() if not books_df.empty else 0
    else:
        books_df = pd.DataFrame(columns=['book_id', 'title', 'author', 'genre', 'year_of_publication', 'publisher', 'image_url_s', 'image_url_m', 'image_url_l'])
        max_id = 0

    new_books = []
    new_book_ids = []
    
    print("Fetching metadata for new Dark Romance books...")
    for title, author in books_list:
        # Check if already exists to prevent duplicates
        if not books_df.empty and len(books_df[(books_df['title'].str.contains(title, case=False, na=False)) & (books_df['author'].str.contains(author, case=False, na=False))]) > 0:
            print(f"Skipping {title} (Already exists)")
            continue
            
        print(f"Fetching: {title} by {author}")
        max_id += 1
        img_l, img_m, img_s = fetch_book_cover(title, author)
        
        new_books.append({
            'book_id': max_id,
            'title': title,
            'author': author,
            'genre': 'Dark Romance',
            'year_of_publication': np.random.randint(2015, 2024),
            'publisher': 'Indie Published',
            'image_url_s': img_s,
            'image_url_m': img_m,
            'image_url_l': img_l
        })
        new_book_ids.append(max_id)
        time.sleep(1) # Be nice to the API
        
    if not new_books:
        print("No new books to add.")
        return
        
    new_books_df = pd.DataFrame(new_books)
    updated_books_df = pd.concat([books_df, new_books_df], ignore_index=True)
    updated_books_df.to_csv(BOOKS_CSV, index=False)
    print(f"Added {len(new_books)} new books to books.csv!")
    
    # Generate mock ratings for these new books so KNN picks them up
    print("Generating mock ratings...")
    if os.path.exists(RATINGS_CSV):
        ratings_df = pd.read_csv(RATINGS_CSV)
        users = ratings_df['user_id'].unique().tolist()
    else:
        ratings_df = pd.DataFrame(columns=['user_id', 'book_id', 'rating'])
        users = list(range(1, 101))
        
    # We want these books to be highly correlated (users who read one, read others)
    target_users = np.random.choice(users, size=150, replace=False)
    new_ratings = []
    
    for u in target_users:
        # Each selected user rates 5-15 of the new dark romance books highly
        n_reads = np.random.randint(5, 15)
        chosen_books = np.random.choice(new_book_ids, size=min(n_reads, len(new_book_ids)), replace=False)
        for b in chosen_books:
            new_ratings.append({
                'user_id': u,
                'book_id': b,
                'rating': np.random.randint(8, 11) # High ratings (8-10) to build strong correlation
            })
            
    if new_ratings:
        new_ratings_df = pd.DataFrame(new_ratings)
        updated_ratings_df = pd.concat([ratings_df, new_ratings_df], ignore_index=True)
        updated_ratings_df.to_csv(RATINGS_CSV, index=False)
        print(f"Added {len(new_ratings)} simulated ratings for the new Dark Romance cluster!")

if __name__ == "__main__":
    add_books()
