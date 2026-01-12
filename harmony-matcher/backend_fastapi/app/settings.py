from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    port: int = 3001
    jwt_secret: str = "harmony-matcher-secret"

    # Paths are relative to repo root by default
    db_path: str = "backend/harmony-matcher.db"
    uploads_dir: str = "uploads"

    # Integrations
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None

    anthropic_api_key: str | None = None
    harmony_api_url: str | None = None

    @property
    def repo_root(self) -> Path:
        # backend_fastapi/app/settings.py -> backend_fastapi/app -> backend_fastapi -> repo root
        return Path(__file__).resolve().parents[2]

    @property
    def resolved_db_path(self) -> Path:
        p = Path(self.db_path)
        return p if p.is_absolute() else (self.repo_root / p)

    @property
    def resolved_uploads_dir(self) -> Path:
        p = Path(self.uploads_dir)
        return p if p.is_absolute() else (self.repo_root / p)


settings = Settings()


