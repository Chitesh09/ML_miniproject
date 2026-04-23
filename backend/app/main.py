from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from app.ml.recommender import recommender
import functools
import time

app = FastAPI(title="Book Recommendation API")

# Simulated Redis Cache using an in-memory LRU paradigm
CACHE_STORE = {}
CACHE_TTL = 3600 * 6 # 6 hours

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    success = recommender.load_data()
    if not success:
        print("Warning: Data not found. Please run generate_data.py first.")

class RecommendationRequest(BaseModel):
    book_id: Optional[int] = None
    user_id: Optional[int] = None
    preferred_genres: Optional[List[str]] = []
    limit: Optional[int] = 10
    alpha: Optional[float] = 0.5 # 1.0 CF, 0.0 Content

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
    cache_key = f"{req.book_id}_{req.user_id}_{req.alpha}"
    cached = check_cache(cache_key)
    if cached:
        return cached

    background_tasks.add_task(recommender.log_interaction, "recommend")

    response = {}
    # Personalised recommendations based on User
    if req.user_id and not req.book_id:
        response = {"recommendations": recommender.user_based_recommendation(req.user_id, req.limit)}
    
    # Hybrid book similarities
    elif req.book_id:
        recs = recommender.hybrid_recommendation(req.book_id, limit=req.limit, alpha=req.alpha)
        response = {"recommendations": recs}
        
    # Cold start
    elif not req.book_id and req.preferred_genres:
        response = {"recommendations": recommender.cold_start(req.preferred_genres, req.limit)}
    else:
        raise HTTPException(status_code=400, detail="Must provide book_id or preferred_genres")

    set_cache(cache_key, response)
    return response

@app.get("/api/books")
async def get_books(limit: int = 50):
    if recommender.books is None:
        return []
    return recommender.books.head(limit).to_dict(orient='records')
