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
    _seed_synthetic_reviews()


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
# In-memory User Store with Seeded Demo Accounts
# ---------------------------------------------------------------------------
USERS_DB = {}

DEMO_NAMES = [
    "Chitesh", "Yeshu", "Rishi", "Varun", 
    "Alice", "Bob", "Charlie", "Diana", 
    "Eve", "Frank", "Grace", "Heidi", 
    "Ivan", "Judy", "Mallory", "Nina", 
    "Oscar", "Peggy", "Romeo", "Sybil"
]

def _init_users_db():
    global USERS_DB
    colors = ["bg-blue-800", "bg-book-brown", "bg-emerald-800", "bg-purple-800", "bg-rose-800", "bg-teal-800"]
    for idx, name in enumerate(DEMO_NAMES, start=1):
        email = f"{name.lower()}@bookflix.com"
        USERS_DB[email] = {
            "user_id": idx,
            "name": name,
            "email": email,
            "password": "password123",
            "avatar_color": colors[(idx - 1) % len(colors)],
            "preferred_genres": ["Fantasy", "Science Fiction"] if idx % 2 == 0 else ["Romance", "Mystery"],
        }

_init_users_db()

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    preferred_genres: Optional[List[str]] = []
    avatar_color: Optional[str] = "bg-blue-800"

class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    user_id: Optional[int] = None

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

class ReviewRequest(BaseModel):
    user_id: int
    user_name: Optional[str] = "Anonymous Reader"
    avatar_color: Optional[str] = "bg-blue-800"
    rating: int  # 1 to 5
    review_text: str

# ---------------------------------------------------------------------------
# In-Memory Reviews Store & Seeding
# ---------------------------------------------------------------------------
REVIEWS_DB = {}

def _seed_synthetic_reviews():
    global REVIEWS_DB
    if recommender.books is None or recommender.books.empty:
        return

    sample_books = recommender.books.head(20)
    sample_texts = [
        "An absolute masterpiece! The world-building and character development blew me away.",
        "Really captivating storyline with plot twists that kept me reading late into the night.",
        "Thought-provoking and beautifully written. Highly recommend to any avid reader!",
        "Fast-paced and exciting! A great addition to my top reads of the year.",
        "Fascinating concepts, though the middle chapters dragged slightly. Still a 4-star read!"
    ]
    sample_users = [
        (1, "Chitesh", "bg-blue-800"),
        (2, "Yeshu", "bg-book-brown"),
        (3, "Rishi", "bg-emerald-800"),
        (4, "Varun", "bg-purple-800"),
        (5, "Alice", "bg-rose-800"),
    ]

    for idx, row in sample_books.iterrows():
        bid = int(row["book_id"])
        REVIEWS_DB[bid] = []
        for k in range(2):
            uid, uname, color = sample_users[(idx + k) % len(sample_users)]
            text = sample_texts[(idx + k) % len(sample_texts)]
            rating = 4 + ((idx + k) % 2)
            REVIEWS_DB[bid].append({
                "review_id": f"rev_{bid}_{uid}_{k}",
                "user_id": uid,
                "user_name": uname,
                "avatar_color": color,
                "rating": rating,
                "review_text": text,
                "timestamp": time.time() - (k + 1) * 86400,
            })


# ---------------------------------------------------------------------------
# ── AUTHENTICATION ENDPOINTS ─────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@app.post("/api/auth/register")
async def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    if email_clean in USERS_DB:
        raise HTTPException(status_code=400, detail="Account with this email already exists.")

    new_id = max([u["user_id"] for u in USERS_DB.values()] or [0]) + 1
    user_record = {
        "user_id": new_id,
        "name": req.name.strip(),
        "email": email_clean,
        "password": req.password,
        "avatar_color": req.avatar_color or "bg-blue-800",
        "preferred_genres": req.preferred_genres or [],
    }
    USERS_DB[email_clean] = user_record

    return {
        "status": "success",
        "message": "Account created successfully!",
        "user": {
            "user_id": user_record["user_id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "avatar_color": user_record["avatar_color"],
            "preferred_genres": user_record["preferred_genres"],
        }
    }

@app.post("/api/auth/login")
async def login_user(req: LoginRequest):
    # Support login by user_id directly
    if req.user_id:
        found_by_id = next((u for u in USERS_DB.values() if u["user_id"] == req.user_id), None)
        if found_by_id:
            return {
                "status": "success",
                "user": {
                    "user_id": found_by_id["user_id"],
                    "name": found_by_id["name"],
                    "email": found_by_id["email"],
                    "avatar_color": found_by_id["avatar_color"],
                    "preferred_genres": found_by_id.get("preferred_genres", []),
                }
            }
        # Fallback if user_id in ratings dataset but not explicitly in USERS_DB
        return {
            "status": "success",
            "user": {
                "user_id": req.user_id,
                "name": f"User {req.user_id}",
                "email": f"user{req.user_id}@bookflix.com",
                "avatar_color": "bg-blue-800",
                "preferred_genres": [],
            }
        }

    if not req.email:
        raise HTTPException(status_code=400, detail="Email or User ID is required.")

    email_clean = req.email.strip().lower()
    user_record = USERS_DB.get(email_clean)

    if not user_record:
        # Check if email is numeric string user_id
        if email_clean.isdigit():
            uid = int(email_clean)
            return await login_user(LoginRequest(user_id=uid))
        raise HTTPException(status_code=401, detail="No account found with this email address.")

    # Validate password if provided
    if req.password and user_record.get("password") and req.password != user_record["password"]:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    return {
        "status": "success",
        "user": {
            "user_id": user_record["user_id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "avatar_color": user_record.get("avatar_color", "bg-blue-800"),
            "preferred_genres": user_record.get("preferred_genres", []),
        }
    }

@app.get("/api/auth/demo-users")
async def get_demo_users():
    demo_list = [
        {
            "user_id": u["user_id"],
            "name": u["name"],
            "email": u["email"],
            "avatar_color": u.get("avatar_color", "bg-blue-800"),
        }
        for u in list(USERS_DB.values())[:20]
    ]
    return {"demo_users": demo_list}



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


# ---------------------------------------------------------------------------
# ── REVIEWS & USER ANALYTICS ENDPOINTS ─────────────────────────────────────
# ---------------------------------------------------------------------------

@app.get("/api/books/{book_id}/reviews")
async def get_book_reviews(book_id: int):
    """Fetch all reviews, average rating, and rating distribution for a book."""
    reviews = REVIEWS_DB.get(book_id, [])
    if not reviews:
        return {
            "book_id": book_id,
            "average_rating": 0.0,
            "total_reviews": 0,
            "rating_distribution": {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
            "reviews": []
        }

    total = len(reviews)
    avg_rating = round(sum(r["rating"] for r in reviews) / total, 1)
    dist = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in reviews:
        r_val = int(r["rating"])
        if r_val in dist:
            dist[r_val] += 1

    return {
        "book_id": book_id,
        "average_rating": avg_rating,
        "total_reviews": total,
        "rating_distribution": dist,
        "reviews": sorted(reviews, key=lambda x: x["timestamp"], reverse=True)
    }

@app.post("/api/books/{book_id}/reviews")
async def post_book_review(book_id: int, req: ReviewRequest, background_tasks: BackgroundTasks):
    """Submit a star rating and written review for a book."""
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars.")
    if not req.review_text.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty.")

    details = recommender.get_book_details(book_id)
    if not details:
        raise HTTPException(status_code=404, detail="Book not found")

    new_review = {
        "review_id": f"rev_{book_id}_{req.user_id}_{int(time.time())}",
        "user_id": req.user_id,
        "user_name": req.user_name or "Anonymous Reader",
        "avatar_color": req.avatar_color or "bg-blue-800",
        "rating": req.rating,
        "review_text": req.review_text.strip(),
        "timestamp": time.time(),
    }

    if book_id not in REVIEWS_DB:
        REVIEWS_DB[book_id] = []
    
    # Replace existing review by same user or append
    existing_idx = next((i for i, r in enumerate(REVIEWS_DB[book_id]) if r["user_id"] == req.user_id), None)
    if existing_idx is not None:
        REVIEWS_DB[book_id][existing_idx] = new_review
    else:
        REVIEWS_DB[book_id].append(new_review)

    # Broadcast activity feed event
    book_title = details.get("title", "Unknown Book")
    book_genre = details.get("genre", "")
    background_tasks.add_task(
        activity_manager.record,
        user_id=req.user_id,
        action="liked" if req.rating >= 4 else "disliked",
        book_id=book_id,
        book_title=book_title,
        book_genre=book_genre,
    )

    reviews = REVIEWS_DB[book_id]
    avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)

    return {
        "status": "success",
        "review": new_review,
        "average_rating": avg_rating,
        "total_reviews": len(reviews)
    }

@app.get("/api/users/{user_id}/analytics")
async def get_user_analytics(user_id: int):
    """
    Returns aggregated analytics for a user: total reviews, favorite genres breakdown,
    rating history, and recent activity log.
    """
    # Find all reviews written by user across all books
    user_reviews = []
    genre_counts = {}
    
    for book_id, r_list in REVIEWS_DB.items():
        for rev in r_list:
            if rev["user_id"] == user_id:
                details = recommender.get_book_details(book_id) or {}
                genre = details.get("genre", "Fiction")
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
                user_reviews.append({
                    **rev,
                    "book_title": details.get("title", f"Book #{book_id}"),
                    "book_image": details.get("image_url_s") or details.get("image_url", ""),
                    "genre": genre,
                })

    # Also count genres from synthetic/recorded activities
    recent_activities = activity_manager.get_recent(limit=50)
    user_activities = [a for a in recent_activities if a.get("user_id") == user_id]

    for act in user_activities:
        g = act.get("book_genre", "Fiction")
        if g:
            genre_counts[g] = genre_counts.get(g, 0) + 1

    total_reviews = len(user_reviews)
    avg_given_rating = round(sum(r["rating"] for r in user_reviews) / total_reviews, 1) if total_reviews > 0 else 0.0

    # Format genre distribution list
    genres_formatted = [
        {"genre": g, "count": c}
        for g, c in sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "user_id": user_id,
        "total_reviews": total_reviews,
        "average_given_rating": avg_given_rating,
        "genre_distribution": genres_formatted,
        "user_reviews": sorted(user_reviews, key=lambda x: x["timestamp"], reverse=True),
        "recent_activities": user_activities,
    }

