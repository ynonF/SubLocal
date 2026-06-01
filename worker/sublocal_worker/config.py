"""Configuration and paths for SubLocal worker."""
import os
import sys
from pathlib import Path


def get_app_data_dir() -> Path:
    """Return the app data directory for SubLocal."""
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "SubLocal"


def get_models_dir() -> Path:
    """Return the directory where Whisper models are stored."""
    return get_app_data_dir() / "models"


def get_translation_packages_dir() -> Path:
    """Return the directory where translation packages are stored."""
    return get_app_data_dir() / "translation-packages"


def get_temp_dir() -> Path:
    """Return a temp directory for intermediate files."""
    import tempfile
    return Path(tempfile.gettempdir()) / "sublocal"


def ensure_dirs() -> None:
    """Create all required directories."""
    for d in [get_models_dir(), get_translation_packages_dir(), get_temp_dir()]:
        d.mkdir(parents=True, exist_ok=True)
