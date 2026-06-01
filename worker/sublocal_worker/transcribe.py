"""
Transcription module using Faster-Whisper.

Extracts audio and runs Whisper transcription, returning structured segments.
"""
from __future__ import annotations
from typing import Optional

from . import progress as prog
from .languages import get_whisper_language, get_language_name
from .models import load_whisper_model
from .srt import Segment


def transcribe(
    audio_path: str,
    source_lang: str = "auto",
    model_size: str = "small",
    device: str = "auto",
    compute_type: str = "auto",
) -> tuple[list[Segment], str]:
    """
    Transcribe audio using Faster-Whisper.

    Args:
        audio_path: Path to WAV audio file.
        source_lang: ISO language code or 'auto' for detection.
        model_size: Whisper model size.
        device: 'auto', 'cpu', or 'cuda'.
        compute_type: 'auto', 'int8', 'float16'.

    Returns:
        Tuple of (segments, detected_language_code).
        Segments have: id, start, end, text, translated_text (None).
    """
    model = load_whisper_model(model_size, device, compute_type)

    whisper_lang = get_whisper_language(source_lang)

    prog.progress("transcribe", 15, "Listening to the video...")
    prog.debug(f"Transcribing with model={model_size}, lang={source_lang or 'auto'}")

    transcribe_kwargs: dict = {
        "beam_size": 5,
        "vad_filter": True,
        "vad_parameters": {"min_silence_duration_ms": 500},
    }

    if whisper_lang:
        transcribe_kwargs["language"] = whisper_lang

    try:
        raw_segments, info = model.transcribe(audio_path, **transcribe_kwargs)
    except Exception as e:
        error_msg = str(e)
        if "No speech" in error_msg or "silent" in error_msg.lower():
            raise RuntimeError(
                "No speech was detected in this video. "
                "The video may be silent, or the audio may be very quiet."
            )
        raise RuntimeError(f"Transcription failed: {error_msg}")

    detected_language = info.language or source_lang
    lang_name = get_language_name(detected_language)
    prog.debug(f"Detected language: {detected_language} ({lang_name}), duration: {info.duration:.1f}s")

    # Convert to our segment format, with progress updates
    segments: list[Segment] = []
    duration = info.duration or 1.0

    for raw_seg in raw_segments:
        seg: Segment = {
            "id": len(segments) + 1,
            "start": raw_seg.start,
            "end": raw_seg.end,
            "text": raw_seg.text.strip(),
            "translated_text": None,
        }
        segments.append(seg)

        # Emit progress based on position in audio
        pct = min(int((raw_seg.end / duration) * 55) + 15, 68)
        if len(segments) % 5 == 0:
            prog.progress("transcribe", pct, "Listening to the video...")

    prog.progress("transcribe", 70, "Transcription complete.")
    prog.debug(f"Transcribed {len(segments)} segments")

    if len(segments) == 0:
        raise RuntimeError(
            "No speech was detected in this video. "
            "The video may be silent, or the audio may be in an unsupported format."
        )

    return segments, detected_language
