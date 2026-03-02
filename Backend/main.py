from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_db, close_db
from app.routes.auth import router as auth_router
from app.routes.ai   import router as ai_router


# ─── Lifespan (startup / shutdown) ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


# ─── App factory ────────────────────────────────────────────
app = FastAPI(
    title="HintHive API",
    description="Authentication backend for HintHive — AI-powered code error assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")
app.include_router(ai_router,   prefix="/api/v1")


# ─── Health check ────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "HintHive API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
