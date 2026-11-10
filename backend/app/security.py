import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import ApiError
from app.models import User

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": user.username, "role": user.role, "exp": exp}, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise ApiError(401, "unauthorized", "Login required.")
    try:
        payload = jwt.decode(creds.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise ApiError(401, "unauthorized", "Invalid or expired token.")
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if user is None:
        raise ApiError(401, "unauthorized", "Invalid or expired token.")
    return user


def require_lead(user: User = Depends(get_current_user)) -> User:
    if user.role != "lead":
        raise ApiError(403, "forbidden", "Only a lead (admin) can delete or restore records.")
    return user


class RateLimiter:
    """In-memory sliding window. Single instance only (documented limit)."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> int | None:
        """Return None if allowed, else seconds to wait."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return max(1, int(window - (now - q[0])) + 1)
            q.append(now)
            return None

    def reset(self):
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    if settings.TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, rules: list[tuple[int, int]]):
    """Dependency factory. rules = [(limit, window_seconds), ...] read lazily so tests can change settings."""

    def dep(request: Request):
        ip = client_ip(request)
        for i, (limit, window) in enumerate(rules):
            wait = limiter.check(f"{name}:{i}:{ip}", limit, window)
            if wait is not None:
                raise ApiError(429, "rate_limited", "Too many requests. Please try again shortly.", headers={"Retry-After": str(wait)})

    return dep
