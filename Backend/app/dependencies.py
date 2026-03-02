from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.security import decode_access_token
from app.database import get_database
from bson import ObjectId

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    FastAPI dependency — validates the Bearer access token and returns
    the user document from MongoDB.
    Raise 401 if token is invalid, 404 if user no longer exists.
    """
    payload = decode_access_token(credentials.credentials)
    user_id: str = payload.get("sub")

    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    return user
