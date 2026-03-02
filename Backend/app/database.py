from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

_client: AsyncIOMotorClient = None


async def connect_db():
    """Called on application startup — opens a Motor client."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    # Quick ping to validate connection
    await _client.admin.command("ping")
    print(f"✅  Connected to MongoDB  →  database: '{settings.DB_NAME}'")


async def close_db():
    """Called on application shutdown."""
    global _client
    if _client:
        _client.close()
        print("🔌  MongoDB connection closed.")


def get_database():
    """Returns the Motor database handle."""
    return _client[settings.DB_NAME]
