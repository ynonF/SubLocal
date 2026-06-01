"""
Whisper model management for SubLocal.

Handles model downloading, caching, and loading via faster-whisper.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import Optional

from . import progress as prog
from .config import get_models_dir

# Valid Whisper model sizes
VALID_MODELS = {"tiny", "base", "small", "medium", "large-v1", "large-v2", "large-v3"}
DEFAULT_MODEL = "small"


def get_model_cache_dir(model_size: str) -> Path:
    """Return the local cache directory for a model."""
    return get_models_dir() / model_size


def load_whisper_model(
    model_size: str = DEFAULT_MODEL,
    device: str = "auto",
    compute_type: str = "auto",
):
    """
    Load a Faster-Whisper model. Downloads if not cached.

    Args:
        model_size: Whisper model size (tiny/base/small/medium/large-v3).
        device: 'auto', 'cpu', or 'cuda'.
        compute_type: 'auto', 'int8', 'float16', 'float32'.

    Returns:
        A WhisperModel instance.
    """
    from faster_whisper import WhisperModel

    if model_size not in VALID_MODELS:
        model_size = DEFAULT_MODEL

    # Resolve device
    resolved_device = _resolve_device(device)

    # Resolve compute type
    resolved_compute = _resolve_compute_type(compute_type, resolved_device)

    prog.debug(f"Loading model '{model_size}' on {resolved_device} with {resolved_compute}")
    prog.progress("download_model", 5, f"Loading AI model ({model_size})...")

    cache_dir = str(get_model_cache_dir(model_size))

    try:
        model = WhisperModel(
            model_size,
            device=resolved_device,
            compute_type=resolved_compute,
            download_root=str(get_models_dir()),
        )
        prog.debug("Model loaded successfully")
        return model
    except Exception as e:
        error_msg = str(e)
        if "CUDA" in error_msg or "cuda" in error_msg:
            prog.debug(f"CUDA failed, falling back to CPU: {error_msg}")
            prog.progress("download_model", 5, "GPU unavailable, using CPU...")
            return WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8",
                download_root=str(get_models_dir()),
            )
        raise


def _resolve_device(device: str) -> str:
    """Resolve 'auto' device to actual device."""
    if device != "auto":
        return device

    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass

    try:
        import ctranslate2
        if "cuda" in ctranslate2.get_supported_compute_types("cuda"):
            return "cuda"
    except Exception:
        pass

    return "cpu"


def _resolve_compute_type(compute_type: str, device: str) -> str:
    """Resolve 'auto' compute type based on device."""
    if compute_type != "auto":
        return compute_type

    if device == "cuda":
        return "float16"
    return "int8"
