from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.ml.recommender import recommender
from app.activity_manager import activity_manager
from app.trending_service import trending_service
from app.notification_service import notification_service
import functools
import time
import urllib.parse
import random

app = FastAPI(title="BOOKFLIX - Real-Time Social Recommendation API")

# ---------------------------------------------------------------------------
# Simulated Redis Cache (in-memory LRU)
# ---------------------------------------------------------------------------
CACHE_STORE = {}
CACHE_TTL = 3600 * 6  # 6 hours

def check_cache(cache_key):
    if cache_key in CACHE_STORE:
        entry = CACHE_STORE[cache_key]
        if time.time() - entry['timestamp'] < CACHE_TTL:
            recommender.log_interaction("cache_hit")
            return entry['response']
        else:
            del CACHE_STORE[cache_key]
    return None

def set_cache(cache_key, response):
    CACHE_STORE[cache_key] = {
        'response': response,
        'timestamp': time.time()
    }

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup – load data, wire up services, seed synthetic activity
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    success = recommender.load_data()
    if not success:
        print("Warning: Data not found. Please run generate_data.py first.")
        return

    # Wire singletons together
    trending_service.attach_recommender(recommender)
    notification_service.attach_trending(trending_service)

    # Seed a few synthetic activities so the feed isn't empty on first load
    _seed_synthetic_activities()


def _seed_synthetic_activities():
    """Pre-populate activity feed with realistic-looking historic events."""
    if recommender.books is None:
        return

    sample_books = recommender.books.sample(min(15, len(recommender.books)))
    actions = ["liked", "liked", "added_to_list", "liked", "added_to_list", "disliked"]
    fake_user_ids = [999001, 999002, 999003, 999004, 999005]

    for i, (_, row) in enumerate(sample_books.iterrows()):
        action = actions[i % len(actions)]
        uid = fake_user_ids[i % len(fake_user_ids)]
        genre = str(row.get("genre", "Fiction"))
        activity_manager.record(
            user_id=uid,
            action=action,
            book_id=int(row["book_id"]),
            book_title=str(row["title"]),
            book_genre=genre,
        )
        # Stagger timestamps manually by patching the deque
        if activity_manager._activities:
            activity_manager._activities[0]["timestamp"] -= random.uniform(30, 540)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RecommendationRequest(BaseModel):
    book_id: Optional[int] = None
    user_id: Optional[int] = None
    preferred_genres: Optional[List[str]] = []
    limit: Optional[int] = 10
    alpha: Optional[float] = 0.5
    liked_books: Optional[List[int]] = []
    disliked_books: Optional[List[int]] = []

class ScoreBooksRequest(BaseModel):
    user_id: Optional[int] = None
    candidate_ids: List[int]
    liked_books: List[int]
    disliked_books: List[int]

class ActivityRequest(BaseModel):
    user_id: int
    action: str          # liked | disliked | added_to_list | removed_from_list
    book_id: int

# ---------------------------------------------------------------------------
# ── ORIGINAL ENDPOINTS (unchanged) ──────────────────────────────────────────
# ---------------------------------------------------------------------------

@app.get("/api/users")
async def get_users():
    return recommender.get_top_users(limit=20)

@app.get("/api/users/{user_id}/history")
async def get_user_history(user_id: int):
    return recommender.get_user_history(user_id)

@app.get("/api/search")
async def search(q: str):
    return recommender.search_books(q)

@app.post("/api/feedback")
async def post_feedback(type: str):
    if type == "positive":
        recommender.log_interaction("feedback_positive")
    elif type == "negative":
        recommender.log_interaction("feedback_negative")
    return {"status": "ok"}

@app.get("/api/admin/metrics")
async def get_metrics():
    return recommender.get_admin_metrics()

@app.post("/api/interactions/click")
async def log_click():
    recommender.log_interaction("click")
    return {"status": "ok"}

@app.post("/api/recommend")
async def get_recommendations(req: RecommendationRequest, background_tasks: BackgroundTasks):
    cache_key = f"{req.book_id}_{req.user_id}_{req.alpha}_{len(req.liked_books)}_{len(req.disliked_books)}"
    cached = check_cache(cache_key)
    if cached:
        return cached

    background_tasks.add_task(recommender.log_interaction, "recommend")

    response = {}

    if req.liked_books:
        base_recs = recommender.dynamic_recommendation(req.liked_books, req.disliked_books, req.limit)
        # Apply community trend boost as a secondary signal (≤ 15% influence)
        if base_recs:
            candidate_ids = [r["book_id"] for r in base_recs]
            boosts = trending_service.get_community_boost_scores(candidate_ids)
            for rec in base_recs:
                boost = boosts.get(rec["book_id"], 0.0)
                rec["confidence_score"] = round(min(1.0, rec["confidence_score"] + boost), 4)
            base_recs.sort(key=lambda x: x["confidence_score"], reverse=True)
        response = {"recommendations": base_recs}

    elif req.user_id and not req.book_id:
        response = {"recommendations": recommender.user_based_recommendation(req.user_id, req.limit)}

    elif req.book_id:
        recs = recommender.hybrid_recommendation(req.book_id, limit=req.limit, alpha=req.alpha)
        response = {"recommendations": recs}

    elif not req.book_id and req.preferred_genres:
        response = {"recommendations": recommender.cold_start(req.preferred_genres, req.limit)}
    else:
        raise HTTPException(status_code=400, detail="Must provide book_id or preferred_genres")

    set_cache(cache_key, response)
    return response

@app.post("/api/books/score")
async def score_books(req: ScoreBooksRequest):
    scores = recommender.score_books(req.candidate_ids, req.liked_books, req.disliked_books)
    return {"scores": scores}

@app.get("/api/books")
async def get_books(limit: int = 50, genre: Optional[str] = None):
    if recommender.books is None:
        return []

    df = recommender.books
    if genre:
        filtered = df[df['genre'].str.lower().str.contains(genre.lower(), na=False)]
        # FIX: If no exact match, fall back to related genres or trending books
        if filtered.empty:
            # Try partial word match
            words = genre.lower().split()
            for word in words:
                if len(word) > 3:
                    filtered = df[df['genre'].str.lower().str.contains(word, na=False)]
                    if not filtered.empty:
                        break
        # Final fallback: return top-rated books from the full dataset
        if filtered.empty:
            rating_counts = recommender.ratings.groupby('book_id').size().reset_index(name='cnt')
            merged = df.merge(rating_counts, on='book_id', how='left').fillna(0)
            filtered = merged.sort_values('cnt', ascending=False)

        return filtered.head(limit).fillna("").to_dict(orient='records')

    return df.head(limit).fillna("").to_dict(orient='records')

@app.get("/api/books/{book_id}")
async def get_book_by_id(book_id: int):
    details = recommender.get_book_details(book_id)
    if not details:
        raise HTTPException(status_code=404, detail="Book not found")
    return details

@app.get("/api/books/{book_id}/read-links")
async def get_read_links(book_id: int):
    details = recommender.get_book_details(book_id)
    if not details:
        raise HTTPException(status_code=404, detail="Book not found")

    title = details.get("title", "")
    author = details.get("author", "")

    encoded_title = urllib.parse.quote_plus(title)
    encoded_query = urllib.parse.quote_plus(f"{title} {author}".strip())

    links = [
        {"name": "Open Library",     "url": f"https://openlibrary.org/search?q={encoded_title}"},
        {"name": "Internet Archive", "url": f"https://archive.org/search.php?query={encoded_title}"},
        {"name": "Project Gutenberg","url": f"https://www.gutenberg.org/ebooks/search/?query={encoded_title}"},
        {"name": "Google Books",     "url": f"https://www.google.com/search?q={encoded_query}+google+books"}
    ]

    return {"title": title, "author": author, "read_links": links}

# ---------------------------------------------------------------------------
# ── NEW: REAL-TIME SOCIAL ENDPOINTS ─────────────────────────────────────────
# ---------------------------------------------------------------------------

@app.post("/api/activity")
async def post_activity(req: ActivityRequest, background_tasks: BackgroundTasks):
    """
    Record a user action (like, dislike, wishlist add/remove).
    Called by the frontend on every interaction so other users can see it.
    """
    valid_actions = {"liked", "disliked", "added_to_list", "removed_from_list"}
    if req.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Choose from {valid_actions}")

    details = recommender.get_book_details(req.book_id)
    if not details:
        raise HTTPException(status_code=404, detail="Book not found")

    book_title = details.get("title", "Unknown Book")
    book_genre = details.get("genre", "")

    background_tasks.add_task(
        activity_manager.record,
        user_id=req.user_id,
        action=req.action,
        book_id=req.book_id,
        book_title=book_title,
        book_genre=book_genre,
    )

    # Invalidate trending cache on activity that could shift scores
    if req.action in ("liked", "added_to_list"):
        trending_service._cache_ts = 0  # force rebuild on next request

    return {"status": "recorded"}


@app.get("/api/activity-feed")
async def get_activity_feed(limit: int = 15, exclude_user: Optional[int] = None):
    """
    Returns the live activity feed (most-recent first).
    Excludes the requesting user's own activities for a social feel.
    """
    activities = activity_manager.get_recent(limit=limit, exclude_user_id=exclude_user)
    return {"activities": activities, "count": len(activities)}


@app.get("/api/trending-live")
async def get_trending_live(limit: int = 20):
    """
    Returns the dynamic trending books list, blending static popularity
    with real-time community activity signals.
    """
    trending = trending_service.get_trending(limit=limit)
    genres = trending_service.get_trending_genres(limit=5)
    return {
        "trending": trending,
        "trending_genres": genres,
        "generated_at": time.time()
    }


@app.get("/api/notifications")
async def get_notifications(user_id: Optional[int] = None, limit: int = 3):
    """
    Returns a debounced batch of real-time notification messages
    personalised for the requesting user.
    """
    notifs = notification_service.get_notifications(limit=limit, user_id=user_id)
    return {"notifications": notifs}


@app.get("/api/genres")
async def get_genres():
    """
    Returns available genres from the dataset with book counts.
    Used for genre navigation fallback validation.
    """
    if recommender.books is None:
        return []

    genre_counts = (
        recommender.books["genre"]
        .dropna()
        .value_counts()
        .reset_index()
        .rename(columns={"index": "genre", "genre": "count"})
    )
    return genre_counts.to_dict(orient="records")
