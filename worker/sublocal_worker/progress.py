"""
Progress reporting utilities.

All output goes to stdout as JSON lines.
Debug/diagnostic output goes to stderr.
"""
import json
import sys
from typing import Optional


def emit(obj: dict) -> None:
    """Emit a JSON line to stdout for the Electron host to parse."""
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def progress(stage: str, percent: int, message: str, file: Optional[str] = None) -> None:
    """Emit a progress update."""
    payload = {
        "type": "progress",
        "stage": stage,
        "percent": percent,
        "message": message,
    }
    if file:
        payload["file"] = file
    emit(payload)


def done(
    output_srt_path: str,
    output_video_path: Optional[str] = None,
    detected_language: Optional[str] = None,
) -> None:
    """Emit a done message."""
    payload: dict = {
        "type": "done",
        "outputSrtPath": output_srt_path,
    }
    if output_video_path:
        payload["outputVideoPath"] = output_video_path
    if detected_language:
        payload["detectedLanguage"] = detected_language
    emit(payload)


def error(message: str, details: Optional[str] = None) -> None:
    """Emit an error message."""
    payload: dict = {
        "type": "error",
        "message": message,
    }
    if details:
        payload["details"] = details
    emit(payload)


def debug(message: str) -> None:
    """Write a debug message to stderr (not visible to Electron UI)."""
    print(f"[DEBUG] {message}", file=sys.stderr, flush=True)
