import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (register tables)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.errors import install_handlers
from app.routers import alerts, auth, complaints, dashboard, incidents, track
from app.seed import seed_demo_complaints, seed_users

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if not settings.TESTING:
        db = SessionLocal()
        try:
            seed_users(db)
            if settings.SEED_DEMO_DATA:
                seed_demo_complaints(db)
        finally:
            db.close()
    yield


app = FastAPI(title="PulseResolve API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
install_handlers(app)

for r in (auth.router, complaints.router, incidents.router, dashboard.router, alerts.router, track.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health")
def health():
    from app.services import ai

    s = ai.status()
    return {"status": "ok", "ai": "available" if ai.available() else "fallback", "ai_models_ready": s["ready"], "ai_models_total": s["total"]}
