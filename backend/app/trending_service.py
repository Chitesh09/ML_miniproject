"""
Trending Service - Computes dynamic trending scores by blending:
  1. Real-time user activity (likes, adds-to-list) from ActivityManager
  2. Static popularity from the ratings dataset (via the recommender)

Books are scored and ranked; the top-N are served as "Trending Now".
"""
import time
import threading
from typing import List, Dict, Optional

from app.activity_manager import activity_manager

# Weight constants
W_STATIC = 0.40   # Weight for static dataset popularity
W_LIVE_LIKE = 0.40   # Weight for real-time likes
W_LIVE_LIST = 0.20   # Weight for real-time wishlist additions

# Cache TTL to avoid recomputing on every request
CACHE_TTL = 15  # seconds


class TrendingService:
    """
    Combines real-time activity signals with static popularity to produce
    a dynamically-updated trending book list.

    Thread-safe; results are cached to avoid hot recomputation.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._cache: Optional[List[Dict]] = None
        self._cache_ts: float = 0.0
        self._recommender = None   # injected after startup

    def attach_recommender(self, recommender):
        """Inject the recommender singleton so we can read dataset stats."""
        self._recommender = recommender
        # Pre-warm cache
        self._rebuild()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_trending(self, limit: int = 20) -> List[Dict]:
        """Return top-N trending books with score + metadata."""
        now = time.time()
        with self._lock:
            if self._cache is not None and (now - self._cache_ts) < CACHE_TTL:
                return self._cache[:limit]

        # Cache stale — rebuild outside lock to avoid blocking readers
        results = self._rebuild()
        return results[:limit]

    def get_trending_genres(self, limit: int = 5) -> List[Dict]:
        """Return genres ranked by recent activity frequency."""
        genre_counts = activity_manager.get_genre_activity_counts()
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"genre": g, "activity_count": c} for g, c in sorted_genres[:limit]]

    def get_community_boost_scores(self, book_ids: List[int]) -> Dict[int, float]:
        """
        Return a 0-1 boost score per book_id based on recent community activity.
        Used by the recommendation engine as a secondary signal.
        """
        book_counts = activity_manager.get_book_activity_counts()
        if not book_counts:
            return {bid: 0.0 for bid in book_ids}

        max_activity = max(
            (v["liked"] * 2 + v["added_to_list"])
            for v in book_counts.values()
        ) or 1

        result = {}
        for bid in book_ids:
            if bid in book_counts:
                raw = (
                    book_counts[bid]["liked"] * 2 +
                    book_counts[bid]["added_to_list"]
                )
                result[bid] = round(min(1.0, raw / max_activity) * 0.15, 4)  # max 15% boost
            else:
                result[bid] = 0.0
        return result

    # ------------------------------------------------------------------
    # Internal rebuild
    # ------------------------------------------------------------------

    def _rebuild(self) -> List[Dict]:
        if self._recommender is None or self._recommender.books is None:
            return []

        # --- Static popularity from ratings dataset ---
        books_df = self._recommender.books
        ratings_df = self._recommender.ratings

        rating_counts = ratings_df.groupby("book_id").size()
        rating_avg = ratings_df.groupby("book_id")["rating"].mean()

        max_count = max(rating_counts.max(), 1)
        max_avg = 10.0  # rating scale

        # --- Real-time activity ---
        book_activity = activity_manager.get_book_activity_counts()

        max_live = max(
            (v["liked"] * 2 + v["added_to_list"] for v in book_activity.values()),
            default=1
        ) or 1

        scores: Dict[int, float] = {}

        for _, row in books_df.iterrows():
            bid = int(row["book_id"])

            static_count = rating_counts.get(bid, 0)
            static_avg = rating_avg.get(bid, 0)
            static_score = W_STATIC * (
                0.5 * (static_count / max_count) + 0.5 * (static_avg / max_avg)
            )

            live = book_activity.get(bid, {})
            live_likes = live.get("liked", 0)
            live_list = live.get("added_to_list", 0)
            live_raw = live_likes * 2 + live_list

            live_like_score = W_LIVE_LIKE * (live_likes * 2 / max_live)
            live_list_score = W_LIVE_LIST * (live_list / max_live)

            scores[bid] = static_score + live_like_score + live_list_score

        sorted_books = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for bid, score in sorted_books[:50]:  # pre-compute top-50
            details = self._recommender.get_book_details(bid)
            if details:
                live = book_activity.get(bid, {})
                results.append({
                    "book_id": bid,
                    "trending_score": round(score, 4),
                    "live_likes": live.get("liked", 0),
                    "live_adds": live.get("added_to_list", 0),
                    "is_hot": (live.get("liked", 0) + live.get("added_to_list", 0)) >= 3,
                    "book_details": details,
                })

        with self._lock:
            self._cache = results
            self._cache_ts = time.time()

        return results


# Singleton
trending_service = TrendingService()
