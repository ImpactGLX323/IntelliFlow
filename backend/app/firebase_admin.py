import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)


def _resolve_credentials_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if candidate.is_absolute() and candidate.exists():
        return candidate

    cwd_path = Path.cwd() / candidate
    if cwd_path.exists():
        return cwd_path

    backend_root = Path(__file__).resolve().parents[1]
    backend_path = backend_root / candidate
    if backend_path.exists():
        return backend_path

    repo_root = Path(__file__).resolve().parents[2]
    repo_path = repo_root / candidate
    if repo_path.exists():
        return repo_path

    return candidate


def init_firebase_admin():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    raw_path = os.getenv("FIREBASE_ADMIN_SDK_PATH")
    if not raw_path:
        logger.warning("FIREBASE_ADMIN_SDK_PATH not set; skipping Firebase Admin init.")
        return None

    credentials_path = _resolve_credentials_path(raw_path)
    if not credentials_path.exists():
        logger.warning(
            "Firebase Admin SDK JSON not found at %s; skipping init.",
            credentials_path,
        )
        return None

    try:
        cred = credentials.Certificate(str(credentials_path))
        return firebase_admin.initialize_app(cred)
    except Exception as exc:
        logger.warning("Firebase Admin init failed: %s", exc)
        return None
