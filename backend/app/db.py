from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings


class Base(DeclarativeBase):
    pass


_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_kwargs = {}
if _is_sqlite:
    _kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.DATABASE_URL or settings.DATABASE_URL in ("sqlite://", "sqlite:///"):
        _kwargs["poolclass"] = StaticPool

engine = create_engine(settings.DATABASE_URL, **_kwargs)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA busy_timeout=30000")
        if ":memory:" not in settings.DATABASE_URL and settings.DATABASE_URL not in ("sqlite://", "sqlite:///"):
            cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
