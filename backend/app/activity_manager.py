"""
Activity Manager - Tracks real-time user interactions across the platform.
Stores activities in a thread-safe ring buffer (no external dependencies).
"""
import time
import uuid
import threading
from collections import deque
from typing import List, Dict, Optional

# Privacy-safe display names for anonymous activity feed
ANONYMOUS_NAMES = [
    "A reader", "A book lover", "Someone", "A mystery fan",
    "A thriller lover", "A fantasy reader", "A sci-fi enthusiast",
    "A romance reader", "A history buff", "A literary explorer",
    "A bookworm", "An avid reader", "A curious mind", "A night reader",
]

ACTION_TEMPLATES = {
    "liked": [
        "{name} loved {title}",
        "{name} gave {title} a thumbs up",
        "{name} liked {title}",
    ],
    "disliked": [
        "{name} skipped {title}",
        "{name} passed on {title}",
    ],
    "added_to_list": [
        "{name} added {title} to their list",
        "{name} saved {title} for later",
        "{name} bookmarked {title}",
    ],
    "removed_from_list": [
        "{name} removed {title} from their list",
    ],
}


class ActivityManager:
    """
    Thread-safe, in-memory activity log with a fixed-size deque (ring buffer).
    Activities older than TTL are considered stale and filtered out from feeds.
    """

    MAX_ACTIVITIES = 200   # Rolling window
    ACTIVITY_TTL = 600     # 10 minutes in seconds

    def __init__(self):
        self._lock = threading.Lock()
        self._activities: deque = deque(maxlen=self.MAX_ACTIVITIES)
        self._seen: set = set()   # dedup guard on (user_id, book_id, action)
        self._counter = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def record(
        self,
        user_id: int,
        action: str,
        book_id: int,
        book_title: str,
        book_genre: str = "",
    ) -> Dict:
        """Add a new activity event. Returns the created activity dict."""
        dedup_key = f"{user_id}:{book_id}:{action}"

        with self._lock:
            # Deduplicate rapid-fire same-action events from the same user
            if dedup_key in self._seen:
                return {}
            self._seen.add(dedup_key)

            self._counter += 1
            idx = self._counter % len(ANONYMOUS_NAMES)
            display_name = ANONYMOUS_NAMES[idx]

            templates = ACTION_TEMPLATES.get(action, ["{name} interacted with {title}"])
            template = templates[self._counter % len(templates)]
            display_text = template.format(name=display_name, title=book_title)

            activity = {
                "activity_id": str(uuid.uuid4()),
                "user_id": user_id,
                "action": action,
                "book_id": book_id,
                "book_title": book_title,
                "book_genre": book_genre,
                "display_text": display_text,
                "timestamp": time.time(),
            }
            self._activities.appendleft(activity)

        # Schedule dedup key removal after TTL so the same user can re-act later
        t = threading.Timer(self.ACTIVITY_TTL, self._remove_dedup_key, args=[dedup_key])
        t.daemon = True
        t.start()

        return activity

    def get_recent(self, limit: int = 20, exclude_user_id: Optional[int] = None) -> List[Dict]:
        """Return the most recent activities, optionally excluding a specific user."""
        cutoff = time.time() - self.ACTIVITY_TTL
        with self._lock:
            result = []
            for act in self._activities:
                if act["timestamp"] < cutoff:
                    continue
                if exclude_user_id and act["user_id"] == exclude_user_id:
                    continue
                result.append({
                    "activity_id": act["activity_id"],
                    "action": act["action"],
                    "book_id": act["book_id"],
                    "book_title": act["book_title"],
                    "book_genre": act["book_genre"],
                    "display_text": act["display_text"],
                    "timestamp": act["timestamp"],
                    "time_ago": self._time_ago(act["timestamp"]),
                })
                if len(result) >= limit:
                    break
        return result

    def get_genre_activity_counts(self) -> Dict[str, int]:
        """Return how many activities each genre has in the recent window."""
        cutoff = time.time() - self.ACTIVITY_TTL
        counts: Dict[str, int] = {}
        with self._lock:
            for act in self._activities:
                if act["timestamp"] < cutoff:
                    continue
                genre = act.get("book_genre", "").strip()
                if genre:
                    counts[genre] = counts.get(genre, 0) + 1
        return counts

    def get_book_activity_counts(self) -> Dict[int, Dict[str, int]]:
        """Return per-book action counts for trending calculation."""
        cutoff = time.time() - self.ACTIVITY_TTL
        counts: Dict[int, Dict[str, int]] = {}
        with self._lock:
            for act in self._activities:
                if act["timestamp"] < cutoff:
                    continue
                bid = act["book_id"]
                if bid not in counts:
                    counts[bid] = {"liked": 0, "disliked": 0, "added_to_list": 0}
                action = act["action"]
                if action in counts[bid]:
                    counts[bid][action] += 1
        return counts

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _remove_dedup_key(self, key: str):
        with self._lock:
            self._seen.discard(key)

    @staticmethod
    def _time_ago(ts: float) -> str:
        delta = int(time.time() - ts)
        if delta < 60:
            return "just now" if delta < 5 else f"{delta}s ago"
        if delta < 3600:
            m = delta // 60
            return f"{m}m ago"
        h = delta // 3600
        return f"{h}h ago"


# Singleton instance shared across the app
activity_manager = ActivityManager()
