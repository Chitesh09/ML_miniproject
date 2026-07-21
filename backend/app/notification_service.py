"""
Notification Service - Generates contextual, real-time notification messages
based on activity feed data and trending signals.

Implements debouncing and a priority queue to prevent notification spam.
"""
import time
import random
import threading
from typing import List, Dict, Optional
from collections import defaultdict

from app.activity_manager import activity_manager

# How often to generate a new notification (minimum interval)
NOTIFICATION_DEBOUNCE = 8   # seconds per category
NOTIFICATION_TTL = 30       # keep in queue for 30s


TEMPLATES = {
    "liked": [
        "📚 {name} just loved \"{title}\"",
        "✨ Readers are enjoying \"{title}\" right now",
    ],
    "added_to_list": [
        "📖 Someone just added \"{title}\" to their reading list",
        "🔖 \"{title}\" is being saved by readers right now",
    ],
    "trending_genre": [
        "🔥 {genre} books are trending among readers",
        "📈 {genre} is the hot genre right now",
        "✨ Readers similar to you are loving {genre} books",
    ],
    "trending_book": [
        "🌟 \"{title}\" is getting popular with readers like you",
        "🔥 Trending: \"{title}\" is getting lots of attention",
    ],
    "community": [
        "🎯 Readers in your taste group are very active tonight",
        "📚 The community just added 5+ books to their lists",
        "✨ Great reading activity happening right now",
    ],
}


class NotificationService:
    """
    Generates contextual notification messages from real-time activity signals.
    Prevents spam via per-category debouncing.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._last_sent: Dict[str, float] = defaultdict(float)
        self._queue: List[Dict] = []

    def attach_trending(self, trending_service):
        self._trending = trending_service

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_notifications(self, limit: int = 5, user_id: Optional[int] = None) -> List[Dict]:
        """
        Generate a fresh batch of notifications based on current activity.
        Debounced per category to prevent spam.
        """
        now = time.time()
        notifications = []

        # Pull recent activity feed
        recent = activity_manager.get_recent(limit=10, exclude_user_id=user_id)

        # Activity-based notifications
        for act in recent[:3]:
            category = f"activity_{act['action']}_{act['book_id']}"
            if now - self._last_sent[category] < NOTIFICATION_DEBOUNCE:
                continue

            templates = TEMPLATES.get(act["action"], [])
            if not templates:
                continue

            text = random.choice(templates).format(
                name=act["display_text"].split(" ")[0],
                title=act["book_title"],
            )
            notifications.append({
                "id": f"notif_{act['activity_id'][:8]}",
                "text": text,
                "type": act["action"],
                "book_id": act["book_id"],
                "timestamp": now,
                "priority": 1,
            })

            with self._lock:
                self._last_sent[category] = now

            if len(notifications) >= 2:
                break

        # Trending genre notifications
        try:
            trending_genres = self._trending.get_trending_genres(limit=3)
            for tg in trending_genres[:1]:
                genre = tg["genre"]
                if tg["activity_count"] < 2:
                    continue
                category = f"genre_{genre}"
                if now - self._last_sent[category] < NOTIFICATION_DEBOUNCE * 3:
                    continue

                text = random.choice(TEMPLATES["trending_genre"]).format(genre=genre)
                notifications.append({
                    "id": f"notif_genre_{genre[:6]}_{int(now)}",
                    "text": text,
                    "type": "trending_genre",
                    "timestamp": now,
                    "priority": 2,
                })
                with self._lock:
                    self._last_sent[category] = now
        except AttributeError:
            pass  # trending not attached yet

        # Trending book notifications
        try:
            trending = self._trending.get_trending(limit=5)
            hot_books = [b for b in trending if b.get("is_hot")]
            if hot_books:
                book = hot_books[0]
                bid = book["book_id"]
                category = f"hot_book_{bid}"
                if now - self._last_sent[category] >= NOTIFICATION_DEBOUNCE * 2:
                    title = book.get("book_details", {}).get("title", "")
                    if title:
                        text = random.choice(TEMPLATES["trending_book"]).format(title=title)
                        notifications.append({
                            "id": f"notif_hot_{bid}_{int(now)}",
                            "text": text,
                            "type": "trending_book",
                            "book_id": bid,
                            "timestamp": now,
                            "priority": 2,
                        })
                        with self._lock:
                            self._last_sent[category] = now
        except AttributeError:
            pass

        # Sort by priority and return
        notifications.sort(key=lambda x: x["priority"])
        return notifications[:limit]


# Singleton
notification_service = NotificationService()
