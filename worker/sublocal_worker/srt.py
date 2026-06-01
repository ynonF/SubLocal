"""
SRT subtitle file generation utilities.

Handles timestamp formatting, segment writing, and file output.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import TypedDict, Optional


class Segment(TypedDict):
    id: int
    start: float
    end: float
    text: str
    translated_text: Optional[str]


def seconds_to_srt_timestamp(seconds: float) -> str:
    """
    Convert a float number of seconds to SRT timestamp format.

    Example: 61.5 → "00:01:01,500"
    """
    if seconds < 0:
        seconds = 0.0

    total_ms = round(seconds * 1000)
    ms = total_ms % 1000
    total_s = total_ms // 1000
    secs = total_s % 60
    total_m = total_s // 60
    mins = total_m % 60
    hours = total_m // 60

    return f"{hours:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_srt_block(
    index: int,
    start: float,
    end: float,
    text: str,
) -> str:
    """
    Format a single SRT subtitle block.

    Example output:
        1
        00:00:01,000 --> 00:00:04,500
        Hello world
    """
    ts_start = seconds_to_srt_timestamp(start)
    ts_end = seconds_to_srt_timestamp(end)
    return f"{index}\n{ts_start} --> {ts_end}\n{text}\n"


def write_srt(
    segments: list[Segment],
    output_path: str | Path,
    language_code: str,
    use_translated: bool = True,
    prepare_text_fn=None,
) -> None:
    """
    Write segments to an SRT file.

    Args:
        segments: List of subtitle segments with timing and text.
        output_path: File path to write to.
        language_code: Target language code (used for RTL formatting).
        use_translated: If True, use 'translated_text' field; otherwise use 'text'.
        prepare_text_fn: Optional function(text, lang_code) → str for RTL/wrapping.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    blocks = []
    srt_index = 1

    for seg in segments:
        raw_text = seg.get("translated_text") if use_translated else None
        if not raw_text:
            raw_text = seg.get("text", "")

        if not raw_text or not raw_text.strip():
            continue

        text = raw_text.strip()

        # Apply RTL/wrapping preparation if provided
        if prepare_text_fn:
            text = prepare_text_fn(text, language_code)

        # Ensure minimum segment duration for readability (at least 0.5s)
        start = seg["start"]
        end = seg["end"]
        if end - start < 0.5:
            end = start + 0.5

        block = format_srt_block(srt_index, start, end, text)
        blocks.append(block)
        srt_index += 1

    content = "\n".join(blocks)
    if not content.endswith("\n"):
        content += "\n"

    # Write UTF-8 (without BOM by default; BOM can be added for compatibility)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)


def get_output_srt_path(
    video_path: str | Path,
    lang_code: str,
    output_folder: Optional[str | Path] = None,
    suffix: str = "",
) -> Path:
    """
    Generate the output SRT file path.

    Example: /videos/Monster_S1E1.mkv → /videos/Monster_S1E1.he.srt
    With suffix 'original.en': /videos/Monster_S1E1.original.en.srt
    """
    video_path = Path(video_path)
    stem = video_path.stem

    if suffix:
        filename = f"{stem}.{suffix}.srt"
    else:
        filename = f"{stem}.{lang_code}.srt"

    if output_folder:
        return Path(output_folder) / filename
    return video_path.parent / filename


def get_output_video_path(
    video_path: str | Path,
    lang_name: str,
    output_folder: Optional[str | Path] = None,
) -> Path:
    """
    Generate the output burned-subtitle video path.

    Example: Monster_S1E1.mkv → Monster_S1E1.with-hebrew-subtitles.mp4
    """
    video_path = Path(video_path)
    stem = video_path.stem
    slug = lang_name.lower().replace(" ", "-")
    filename = f"{stem}.with-{slug}-subtitles.mp4"

    if output_folder:
        return Path(output_folder) / filename
    return video_path.parent / filename
