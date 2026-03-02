# HintHive — FastAPI Auth Backend

FastAPI + MongoDB authentication backend with JWT access & refresh token rotation.

## Quick Start

```bash
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1        # Windows PowerShell

# 2. Copy env template and fill in your secrets
copy .env .env.local   # edit .env with real MONGO_URI + secrets

# 3. Run dev server
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
```

Server runs at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

---

## Project Structure

```
Backend/
├── main.py               # FastAPI app entrypoint, CORS, lifespan hooks
├── requirements.txt      # Python dependencies
├── .env                  # 🔒 Secrets (never commit this)
├── .gitignore
└── app/
    ├── config.py         # Pydantic settings loaded from .env
    ├── database.py       # Async Motor client (connect / close)
    ├── models.py         # Pydantic request/response models
    ├── security.py       # Bcrypt hashing + JWT create/decode
    ├── dependencies.py   # get_current_user FastAPI dependency
    └── routes/
        └── auth.py       # All auth endpoints
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/signup` | ❌ | Register a new user |
| `POST` | `/api/v1/auth/login` | ❌ | Login → returns access + refresh token |
| `POST` | `/api/v1/auth/refresh` | ❌ | Swap refresh token for a new token pair |
| `POST` | `/api/v1/auth/logout` | ✅ Bearer | Revoke stored refresh token |
| `GET`  | `/api/v1/auth/me` | ✅ Bearer | Get current user details |
| `GET`  | `/` | ❌ | Health check |

---

## Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | Database name (default: `hinthive`) |
| `ACCESS_TOKEN_SECRET` | Secret for signing access tokens (≥32 chars) |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens (≥32 chars) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL in minutes (default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL in days (default: 7) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

> Generate secrets: `python -c "import secrets; print(secrets.token_hex(32))"`

---

## Token Flow

```
POST /login  →  { access_token, refresh_token }
                        │
          access_token (15 min TTL)  →  use for all protected routes
          refresh_token (7 day TTL)  →  store in httpOnly cookie / secure storage
                        │
POST /refresh  →  { new_access_token, new_refresh_token }   (token rotation)
                        │
POST /logout   →  revokes refresh_token in DB
```
