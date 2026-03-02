from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str
    DB_NAME: str = "hinthive"

    # JWT
    ACCESS_TOKEN_SECRET: str
    REFRESH_TOKEN_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Groq AI
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # App
    APP_ENV: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
