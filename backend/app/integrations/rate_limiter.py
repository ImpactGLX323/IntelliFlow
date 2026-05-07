from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone


_REQUEST_WINDOW = defaultdict(deque)


def allow_request(provider_key: str, *, requests_per_minute: int | None) -> bool:
    if not requests_per_minute:
        return True
    now = datetime.now(timezone.utc)
    window = _REQUEST_WINDOW[provider_key]
    threshold = now - timedelta(minutes=1)
    while window and window[0] < threshold:
        window.popleft()
    if len(window) >= requests_per_minute:
        return False
    window.append(now)
    return True
