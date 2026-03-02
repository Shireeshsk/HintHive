from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_database
from app.models import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
    MessageResponse,
    UpdateProfileRequest,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


# ══════════════════════════════════════════════════════════════
#  POST /auth/signup
# ══════════════════════════════════════════════════════════════
@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest):
    db = get_database()

    # Check for duplicate email or username
    existing = await db["users"].find_one(
        {"$or": [{"email": body.email}, {"username": body.username}]}
    )
    if existing:
        field = "Email" if existing.get("email") == body.email else "Username"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{field} is already registered.",
        )

    now = datetime.utcnow()
    user_doc = {
        "username": body.username,
        "email": body.email,
        "hashed_password": hash_password(body.password),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    return UserResponse(
        id=str(result.inserted_id),
        username=user_doc["username"],
        email=user_doc["email"],
        is_active=user_doc["is_active"],
        created_at=user_doc["created_at"],
    )


# ══════════════════════════════════════════════════════════════
#  POST /auth/login
# ══════════════════════════════════════════════════════════════
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_database()

    user = await db["users"].find_one({"email": body.email})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive.",
        )

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["email"])
    refresh_token = create_refresh_token(user_id)

    # Persist the refresh token in the DB (supports revocation)
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": refresh_token, "updated_at": datetime.utcnow()}},
    )

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ══════════════════════════════════════════════════════════════
#  POST /auth/refresh  — get a new access token
# ══════════════════════════════════════════════════════════════
@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(body: RefreshRequest):
    db = get_database()

    # Decode & validate the refresh token
    payload = decode_refresh_token(body.refresh_token)
    user_id: str = payload.get("sub")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Make sure this refresh token is the one we stored (rotation-ready)
    stored = user.get("refresh_token")
    if stored != body.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has been revoked.",
        )

    # Issue a fresh pair of tokens (token rotation)
    new_access = create_access_token(user_id, user["email"])
    new_refresh = create_refresh_token(user_id)

    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": new_refresh, "updated_at": datetime.utcnow()}},
    )

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


# ══════════════════════════════════════════════════════════════
#  POST /auth/logout
# ══════════════════════════════════════════════════════════════
@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Invalidates the stored refresh token so it can no longer be used
    to generate new access tokens.
    """
    db = get_database()
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"refresh_token": ""}, "$set": {"updated_at": datetime.utcnow()}},
    )
    return MessageResponse(message="Logged out successfully.")


# ══════════════════════════════════════════════════════════════
#  GET /auth/me  — get current user's details
# ══════════════════════════════════════════════════════════════
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
    )


# ══════════════════════════════════════════════════════════════
#  PATCH /auth/profile  — update username and/or password
# ══════════════════════════════════════════════════════════════
@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    updates = {}

    # ── username change ──
    if body.username and body.username != current_user["username"]:
        clash = await db["users"].find_one({
            "username": body.username,
            "_id": {"$ne": current_user["_id"]},
        })
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken.",
            )
        updates["username"] = body.username

    # ── password change ──
    if body.new_password:
        if not body.current_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="current_password is required to set a new password.",
            )
        if not verify_password(body.current_password, current_user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        updates["hashed_password"] = hash_password(body.new_password)

    if not updates:
        # nothing to do — return current profile as-is
        return UserResponse(
            id=str(current_user["_id"]),
            username=current_user["username"],
            email=current_user["email"],
            is_active=current_user["is_active"],
            created_at=current_user["created_at"],
        )

    updates["updated_at"] = datetime.utcnow()
    await db["users"].update_one({"_id": current_user["_id"]}, {"$set": updates})

    # fetch fresh document
    updated = await db["users"].find_one({"_id": current_user["_id"]})
    return UserResponse(
        id=str(updated["_id"]),
        username=updated["username"],
        email=updated["email"],
        is_active=updated["is_active"],
        created_at=updated["created_at"],
    )
