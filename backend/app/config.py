import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./pulseresolve.db"
    # No hardcoded default secret: if unset, a random one is generated per process (tokens reset on restart).
    SECRET_KEY: str = ""
    JWT_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173"
    TRUST_PROXY: bool = False

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-lite,gemini-3-flash-preview,gemini-2.5-flash"  # comma list, tried in order
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMS: int = 768
    AI_ENABLED: bool = True
    AI_TIMEOUT_SECONDS: float = 15.0
    AI_MAX_ATTEMPTS: int = 3
    AI_BREAKER_FAILURES: int = 3
    AI_BREAKER_SECONDS: int = 60

    # Grouping rule (tuned on data/eval_set.json)
    T_CANDIDATE_EMB: float = 0.62
    T_CANDIDATE_TFIDF: float = 0.18
    T_STRICT_PAIR: float = 0.80  # fallback verifier: merge without symptom overlap only above this
    MIN_GROUP: int = 3

    SEED_ADMIN_PASSWORD: str = ""
    SEED_AGENT_PASSWORD: str = ""
    SEED_DEMO_DATA: bool = True

    RATE_COMPLAINTS_PER_MIN: int = 6
    RATE_COMPLAINTS_PER_HOUR: int = 60
    RATE_LOGIN_PER_MIN: int = 10

    TESTING: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def gemini_keys(self) -> list[str]:
        return [k.strip() for k in self.GEMINI_API_KEY.split(",") if k.strip()]

    @property
    def gemini_models(self) -> list[str]:
        return [m.strip() for m in self.GEMINI_MODEL.split(",") if m.strip()]

    @property
    def ai_active(self) -> bool:
        return bool(self.AI_ENABLED and self.gemini_keys)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.SECRET_KEY:
        s.SECRET_KEY = secrets.token_hex(32)
    return s


settings = get_settings()
