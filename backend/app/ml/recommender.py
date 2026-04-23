import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

class HybridRecommender:
    def __init__(self):
        self.books = None
        self.ratings = None
        self.user_item_matrix = None
        self.book_item_matrix = None
        self.book_similarity_content = None
        self.knn_model = None
        
        # Metrics Tracking (Simulated Admin DB)
        self.metrics = {
            'total_recommendations_served': 0,
            'total_clicks': 0,
            'cache_hits': 0,
            'feedback_positive': 0,
            'feedback_negative': 0
        }
        
    def load_data(self):
        if not os.path.exists(os.path.join(DATA_DIR, 'books.csv')):
            return False
            
        self.books = pd.read_csv(os.path.join(DATA_DIR, 'books.csv'))
        self.ratings = pd.read_csv(os.path.join(DATA_DIR, 'ratings.csv'))
        self.user_ids = self.ratings['user_id'].unique().tolist()
        
        # Build user-item sparse matrix for Collaborative Filtering
        # Rows: Books, Cols: Users (for item-based CF)
        pivot = self.ratings.pivot(index='book_id', columns='user_id', values='rating').fillna(0)
        self.book_ids = pivot.index.tolist()
        self.user_item_matrix = csr_matrix(pivot.values)
        
        # Train KNN
        self.knn_model = NearestNeighbors(metric='cosine', algorithm='brute')
        self.knn_model.fit(self.user_item_matrix)
        
        # Build Content-Based Similarity
        # Using Author + Genre
        self.books['content'] = self.books['author'] + ' ' + self.books['genre']
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(self.books['content'])
        self.book_similarity_content = cosine_similarity(tfidf_matrix, tfidf_matrix)

        # Train User KNN (Rows: Users, Cols: Books)
        self.user_knn_model = NearestNeighbors(metric='cosine', algorithm='brute')
        # Transpose user_item_matrix (Books x Users -> Users x Books)
        # Note: sparse matrix transpose is .T
        self.user_knn_model.fit(self.user_item_matrix.T)
        
        return True

    def get_book_details(self, book_id):
        book = self.books[self.books['book_id'] == book_id]
        if book.empty:
            return None
        return book.iloc[0].to_dict()

    def collaborative_filtering(self, book_id, k=10):
        if book_id not in self.book_ids:
            return []
        
        idx = self.book_ids.index(book_id)
        distances, indices = self.knn_model.kneighbors(self.user_item_matrix[idx].reshape(1, -1), n_neighbors=k+1)
        
        recs = []
        for i in range(1, len(distances.flatten())):
            similar_book_id = self.book_ids[indices.flatten()[i]]
            score = 1 - distances.flatten()[i] # confidence score (cosine similarity)
            recs.append({
                'book_id': similar_book_id,
                'cf_score': score,
                'explanation': f"Users who read this also enjoyed similar books."
            })
        return recs

    def content_based(self, book_id, k=10):
        # Find index in books df
        idx = self.books[self.books['book_id'] == book_id].index
        if len(idx) == 0:
            return []
            
        idx = idx[0]
        sim_scores = list(enumerate(self.book_similarity_content[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = sim_scores[1:k+1]
        
        recs = []
        for i, score in sim_scores:
            similar_book_id = int(self.books.iloc[i]['book_id'])
            recs.append({
                'book_id': similar_book_id,
                'cb_score': score,
                'explanation': f"Shares the same genre and author profile."
            })
        return recs

    def hybrid_recommendation(self, book_id, limit=10, alpha=0.5):
        # Alpha balances CF and Content (alpha=1 means pure CF, alpha=0 means pure Content)
        cf_recs = {r['book_id']: r for r in self.collaborative_filtering(book_id, k=25)}
        cb_recs = {r['book_id']: r for r in self.content_based(book_id, k=25)}
        
        combined_scores = {}
        all_ids = set(cf_recs.keys()).union(set(cb_recs.keys()))
        
        for bid in all_ids:
            cf_val = cf_recs.get(bid, {}).get('cf_score', 0)
            cb_val = cb_recs.get(bid, {}).get('cb_score', 0)
            
            final_score = (alpha * cf_val) + ((1 - alpha) * cb_val)
            
            explanation = ""
            if cf_val > 0.5 and cb_val > 0.5:
                explanation = "Highly relevant: Shared themes and user reading patterns."
            elif cf_val > cb_val:
                explanation = "Recommended based on what similar users read."
            else:
                explanation = "Recommended due to shared authors and genres."
                
            combined_scores[bid] = {
                'book_id': bid,
                'confidence_score': round(final_score, 4),
                'explanation': explanation,
                'book_details': self.get_book_details(bid)
            }
            
        # Sort by final score
        # Using float instead of np.float64 for json serialization later
        sorted_recs = sorted(combined_scores.values(), key=lambda x: x['confidence_score'], reverse=True)
        return sorted_recs[:limit]

    def cold_start(self, preferred_genres, limit=10):
        # Recommend top rated books in preferred genres
        genre_books = self.books[self.books['genre'].isin(preferred_genres)]
        if genre_books.empty:
            genre_books = self.books # fallback to all
            
        # Mocking top rated by finding books with most ratings
        rating_counts = self.ratings.groupby('book_id').size().reset_index(name='counts')
        merged = pd.merge(genre_books, rating_counts, on='book_id', how='left').fillna(0)
        top_books = merged.sort_values(by='counts', ascending=False).head(limit)
        
        recs = []
        for _, row in top_books.iterrows():
            recs.append({
                'book_id': int(row['book_id']),
                'confidence_score': 1.0,
                'explanation': f"Popular book in your preferred genres.",
                'book_details': self.get_book_details(row['book_id'])
            })
        return recs

    def get_user_history(self, user_id):
        user_ratings = self.ratings[self.ratings['user_id'] == user_id]
        if user_ratings.empty:
            return []
        
        # Get highly rated books
        top_ratings = user_ratings[user_ratings['rating'] >= 7].sort_values(by='rating', ascending=False)
        history = []
        for _, row in top_ratings.iterrows():
            history.append({
                'book_id': int(row['book_id']),
                'rating': int(row['rating']),
                'book_details': self.get_book_details(int(row['book_id']))
            })
        return history

    def get_top_users(self, limit=10):
        # Helper to return active users for the dropdown
        if self.ratings is None:
            return []
        users = self.ratings['user_id'].value_counts().head(limit).index.tolist()
        return users

    def user_based_recommendation(self, user_id, limit=10):
        if user_id not in self.user_ids:
            return []
            
        user_idx = self.user_ids.index(user_id)
        # Find similar users
        distances, indices = self.user_knn_model.kneighbors(self.user_item_matrix.T[user_idx].reshape(1, -1), n_neighbors=5)
        
        similar_users_indices = indices.flatten()[1:] # skip self
        
        # Gather top rated books from similar users
        recs_pool = {}
        history_book_ids = self.ratings[self.ratings['user_id'] == user_id]['book_id'].tolist()
        
        for sim_idx in similar_users_indices:
            sim_user_id = self.user_ids[sim_idx]
            sim_user_ratings = self.ratings[self.ratings['user_id'] == sim_user_id]
            top_books = sim_user_ratings[sim_user_ratings['rating'] >= 8]
            
            for _, row in top_books.iterrows():
                bid = int(row['book_id'])
                if bid not in history_book_ids:
                    # simplistic scoring: frequency of occurrence
                    if bid not in recs_pool:
                        recs_pool[bid] = 0
                    recs_pool[bid] += 1
        
        # Sort and return
        sorted_recs = sorted(recs_pool.items(), key=lambda x: x[1], reverse=True)
        final_recs = []
        for bid, score in sorted_recs[:limit]:
            final_recs.append({
                'book_id': bid,
                'confidence_score': round(min(1.0, score * 0.2), 2),
                'explanation': "A user with a similar reading profile highly rated this.",
                'book_details': self.get_book_details(bid)
            })
        return final_recs

    def search_books(self, query, limit=5):
        if self.books is None or not query:
            return []
        q = query.lower()
        mask = self.books['title'].str.lower().str.contains(q, na=False) | \
               self.books['author'].str.lower().str.contains(q, na=False)
        results = self.books[mask].head(limit)
        return results.to_dict(orient='records')
        
    def log_interaction(self, action="click"):
        if action == "click":
            self.metrics['total_clicks'] += 1
        elif action == "recommend":
            self.metrics['total_recommendations_served'] += 1
        elif action == "cache_hit":
            self.metrics['cache_hits'] += 1
        elif action == "feedback_positive":
            self.metrics['feedback_positive'] += 1
        elif action == "feedback_negative":
            self.metrics['feedback_negative'] += 1

    def get_admin_metrics(self):
        ctr = 0
        if self.metrics['total_recommendations_served'] > 0:
            ctr = (self.metrics['total_clicks'] / self.metrics['total_recommendations_served']) * 100
            
        precision = 0
        total_feedback = self.metrics['feedback_positive'] + self.metrics['feedback_negative']
        if total_feedback > 0:
            precision = (self.metrics['feedback_positive'] / total_feedback) * 100
            
        return {
            "ctr_percent": round(ctr, 2),
            "precision_percent": round(precision, 2),
            "raw_stats": self.metrics
        }

recommender = HybridRecommender()
