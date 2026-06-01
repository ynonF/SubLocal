"""
FFmpeg utilities for SubLocal.

Handles audio extraction and subtitle burn-in via FFmpeg.
"""
from __future__ import annotations
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

from . import progress as prog


def find_ffmpeg() -> str:
    """
    Find FFmpeg binary.
    Checks bundled path first, then falls back to system PATH.
    """
    # Check bundled (PyInstaller / packaged app)
    if getattr(sys, "_MEIPASS", None):
        bundled = Path(sys._MEIPASS) / "ffmpeg"  # type: ignore
        if bundled.exists():
            return str(bundled)
        bundled_exe = Path(sys._MEIPASS) / "ffmpeg.exe"  # type: ignore
        if bundled_exe.exists():
            return str(bundled_exe)

    # Check next to the script
    script_dir = Path(__file__).parent.parent
    for name in ["ffmpeg", "ffmpeg.exe"]:
        candidate = script_dir / "ffmpeg" / name
        if candidate.exists():
            return str(candidate)

    # System PATH
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    raise FileNotFoundError(
        "SubLocal could not find FFmpeg. "
        "Please install FFmpeg (https://ffmpeg.org/) or use the bundled version."
    )


def extract_audio(
    video_path: str | Path,
    output_wav: Optional[str | Path] = None,
) -> str:
    """
    Extract audio from a video file as a 16kHz mono WAV.

    Args:
        video_path: Path to the input video.
        output_wav: Path for the output WAV file. If None, uses a temp file.

    Returns:
        Path to the extracted WAV file.
    """
    video_path = Path(video_path)

    if output_wav is None:
        tmp_dir = Path(tempfile.gettempdir()) / "sublocal"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        output_wav = tmp_dir / f"{video_path.stem}_audio.wav"

    output_wav = Path(output_wav)

    ffmpeg = find_ffmpeg()

    prog.progress("extract_audio", 5, "Preparing audio...")
    prog.debug(f"Extracting audio: {video_path} → {output_wav}")

    cmd = [
        ffmpeg,
        "-y",                    # overwrite output
        "-i", str(video_path),
        "-vn",                   # no video
        "-acodec", "pcm_s16le",  # PCM 16-bit
        "-ar", "16000",          # 16kHz
        "-ac", "1",              # mono
        str(output_wav),
    ]

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=600,  # 10 minute timeout for very long files
    )

    if result.returncode != 0:
        stderr_text = result.stderr.decode("utf-8", errors="replace")
        prog.debug(f"FFmpeg stderr: {stderr_text}")

        if "No such file" in stderr_text:
            raise FileNotFoundError(f"Video file not found: {video_path}")
        if "Invalid data" in stderr_text or "moov atom not found" in stderr_text:
            raise ValueError(f"This video file may be corrupted or in an unsupported format.")
        raise RuntimeError(f"Audio extraction failed. FFmpeg error: {stderr_text[-500:]}")

    if not output_wav.exists():
        raise RuntimeError("Audio extraction failed: output file was not created.")

    prog.debug(f"Audio extracted successfully: {output_wav}")
    return str(output_wav)


def burn_subtitles_into_video(
    video_path: str | Path,
    srt_path: str | Path,
    output_path: str | Path,
    font_name: str = "Arial",
) -> None:
    """
    Burn SRT subtitles into a video using FFmpeg.

    Creates a new video file — does NOT modify the original.

    Args:
        video_path: Path to the input video.
        srt_path: Path to the SRT subtitle file.
        output_path: Path for the output video.
        font_name: Font name for the burned subtitles.
    """
    video_path = Path(video_path)
    srt_path = Path(srt_path)
    output_path = Path(output_path)

    if output_path == video_path:
        raise ValueError("Output path must differ from input — cannot overwrite original video.")

    ffmpeg = find_ffmpeg()

    prog.progress("burn_video", 90, "Creating video with subtitles...")
    prog.debug(f"Burning subtitles: {srt_path} → {output_path}")

    # Escape path for FFmpeg subtitles filter (Windows needs special escaping)
    srt_str = str(srt_path.resolve())
    srt_escaped = _escape_ffmpeg_path(srt_str)

    subtitles_filter = f"subtitles={srt_escaped}:force_style='FontName={font_name},FontSize=22'"

    cmd = [
        ffmpeg,
        "-y",
        "-i", str(video_path),
        "-vf", subtitles_filter,
        "-c:a", "copy",
        "-preset", "fast",
        str(output_path),
    ]

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=3600,  # 1 hour max for burn-in
    )

    if result.returncode != 0:
        stderr_text = result.stderr.decode("utf-8", errors="replace")
        prog.debug(f"FFmpeg burn-in stderr: {stderr_text}")
        raise RuntimeError(f"Subtitle burn-in failed: {stderr_text[-500:]}")

    prog.debug(f"Burn-in complete: {output_path}")


def _escape_ffmpeg_path(path: str) -> str:
    """
    Escape a file path for use in FFmpeg filter strings.

    FFmpeg filter paths need special escaping, especially on Windows
    where drive letters (C:) need handling.
    """
    # Replace backslashes with forward slashes
    path = path.replace("\\", "/")
    # Escape colons (Windows drive letters: C: → C\\:)
    # But don't escape the first colon after a single drive letter
    import re
    # Escape colons that are NOT part of a Windows drive letter (e.g. C:)
    path = re.sub(r"(?<![A-Za-z]):", "\\:", path)
    # Escape the drive letter colon: C: → C\:
    path = re.sub(r"^([A-Za-z]):", r"\1\\:", path)
    # Escape special chars
    for ch in ["'", " "]:
        path = path.replace(ch, f"\\{ch}")
    return f"'{path}'"


def cleanup_temp_files(*paths: str | Path) -> None:
    """Remove temporary files, ignoring errors."""
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except Exception:
            pass
