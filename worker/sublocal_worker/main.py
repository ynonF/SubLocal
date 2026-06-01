"""
SubLocal Worker — main CLI entry point.

Usage:
    python -m sublocal_worker.main --input video.mkv --target-lang he --source-lang auto ...

All progress output is emitted as JSON lines to stdout.
Debug output goes to stderr.
"""
from __future__ import annotations
import argparse
import sys
import os
import traceback
from pathlib import Path

from . import progress as prog
from .config import ensure_dirs
from .ffmpeg_utils import extract_audio, burn_subtitles_into_video, cleanup_temp_files
from .transcribe import transcribe
from .translate import get_engine, MissingTranslationPackageError, ArgosTranslateEngine
from .srt import write_srt, get_output_srt_path, get_output_video_path, Segment
from .rtl import prepare_subtitle_text
from .languages import get_language_name, is_rtl


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SubLocal Worker — local AI subtitle generator"
    )
    parser.add_argument("--input", required=False, help="Input video file path")
    parser.add_argument("--target-lang", default="he", help="Target subtitle language code")
    parser.add_argument("--source-lang", default="auto", help="Source language code or 'auto'")
    parser.add_argument("--output-mode", default="srt", choices=["srt", "srt+burn"])
    parser.add_argument("--keep-original", default="false", help="Keep original language SRT")
    parser.add_argument("--burn-video", default="false", help="Burn subtitles into video")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--device", default="auto", help="Processing device")
    parser.add_argument("--compute-type", default="auto", help="Compute type")
    parser.add_argument("--max-chars", type=int, default=42, help="Max chars per subtitle line")
    parser.add_argument("--output-folder", default="", help="Custom output folder")
    parser.add_argument("--translation-engine", default="argos", help="Translation engine ID")

    # Special commands
    parser.add_argument(
        "--install-translation-package",
        nargs=2,
        metavar=("SOURCE_LANG", "TARGET_LANG"),
        help="Install a translation package and exit",
    )

    return parser.parse_args()


def bool_arg(value: str) -> bool:
    return value.lower() in ("true", "1", "yes")


def run_job(args: argparse.Namespace) -> None:
    """Main job: transcribe + translate + write SRT."""
    ensure_dirs()

    video_path = Path(args.input)
    target_lang = args.target_lang
    source_lang = args.source_lang
    keep_original = bool_arg(args.keep_original)
    burn_video = bool_arg(args.burn_video) or args.output_mode == "srt+burn"
    max_chars = args.max_chars
    output_folder = args.output_folder or None
    engine_id = args.translation_engine

    # Validate input
    if not video_path.exists():
        prog.error(
            "SubLocal could not find the video file.",
            details=f"File not found: {video_path}",
        )
        sys.exit(1)

    audio_path = None

    try:
        # 1. Extract audio
        prog.progress("extract_audio", 3, "Preparing audio...")
        audio_path = extract_audio(str(video_path))
        prog.progress("extract_audio", 10, "Audio ready.")

        # 2. Transcribe
        segments, detected_lang = transcribe(
            audio_path=audio_path,
            source_lang=source_lang,
            model_size=args.model,
            device=args.device,
            compute_type=args.compute_type,
        )

        # If source is auto, use detected language
        actual_source_lang = detected_lang if source_lang == "auto" else source_lang

        # 3. Translate (or passthrough if same language)
        needs_translation = actual_source_lang != target_lang
        engine = get_engine(engine_id if needs_translation else "none")

        if needs_translation:
            try:
                engine.ensure_language_pair(actual_source_lang, target_lang)
            except MissingTranslationPackageError as e:
                # Package missing — download it automatically and continue.
                # No user interaction needed: just emit a friendly progress
                # message and install in the background.
                prog.progress(
                    "install_package", 70,
                    f"Downloading translation pack "
                    f"({get_language_name(e.source_lang)} → {get_language_name(e.target_lang)})...",
                )
                try:
                    ArgosTranslateEngine.install_language_pair(e.source_lang, e.target_lang)
                    # Verify it's usable now
                    engine.ensure_language_pair(actual_source_lang, target_lang)
                except Exception as install_err:
                    prog.error(
                        f"Could not download the translation pack for "
                        f"{get_language_name(e.source_lang)} → {get_language_name(e.target_lang)}. "
                        f"Check your internet connection and try again.",
                        details=str(install_err),
                    )
                    sys.exit(1)

        prog.progress("translate", 70, "Translating subtitles..." if needs_translation else "Preparing subtitles...")
        translated_segments = engine.translate_segments(
            segments=segments,
            source_lang=actual_source_lang,
            target_lang=target_lang,
        )

        # 4. Write translated SRT
        prog.progress("write_srt", 90, "Saving your subtitle file...")

        def prepare_text(text: str, lang: str) -> str:
            return prepare_subtitle_text(text, lang, max_chars)

        srt_path = get_output_srt_path(video_path, target_lang, output_folder)
        write_srt(
            segments=translated_segments,
            output_path=srt_path,
            language_code=target_lang,
            use_translated=True,
            prepare_text_fn=prepare_text,
        )
        prog.debug(f"Wrote SRT: {srt_path}")

        # 4b. Optionally write original language SRT
        original_srt_path = None
        if keep_original and needs_translation:
            original_srt_path = get_output_srt_path(
                video_path, actual_source_lang, output_folder,
                suffix=f"original.{actual_source_lang}",
            )
            write_srt(
                segments=segments,
                output_path=original_srt_path,
                language_code=actual_source_lang,
                use_translated=False,
                prepare_text_fn=prepare_text,
            )
            prog.debug(f"Wrote original SRT: {original_srt_path}")

        # 5. Optionally burn subtitles into video
        burned_video_path = None
        if burn_video:
            lang_name = get_language_name(target_lang)
            burned_video_path = get_output_video_path(video_path, lang_name, output_folder)
            burn_subtitles_into_video(
                video_path=video_path,
                srt_path=srt_path,
                output_path=burned_video_path,
            )

        # 6. Done!
        prog.done(
            output_srt_path=str(srt_path),
            output_video_path=str(burned_video_path) if burned_video_path else None,
            detected_language=detected_lang,
        )

    except MissingTranslationPackageError as e:
        # Should not normally reach here (handled above), but just in case
        prog.error(
            f"Could not download the translation pack for "
            f"{get_language_name(e.source_lang)} → {get_language_name(e.target_lang)}. "
            f"Check your internet connection and try again.",
            details=str(e),
        )
        sys.exit(1)

    except FileNotFoundError as e:
        prog.error(str(e), details=traceback.format_exc())
        sys.exit(1)

    except RuntimeError as e:
        prog.error(str(e), details=traceback.format_exc())
        sys.exit(1)

    except KeyboardInterrupt:
        prog.debug("Job cancelled by user.")
        sys.exit(0)

    except Exception as e:
        prog.error(
            "Something went wrong while processing this video.",
            details=traceback.format_exc(),
        )
        sys.exit(1)

    finally:
        # Clean up temp audio file
        if audio_path:
            cleanup_temp_files(audio_path)


def main() -> None:
    args = parse_args()

    # Handle special install command
    if args.install_translation_package:
        source_lang, target_lang = args.install_translation_package
        try:
            ArgosTranslateEngine.install_language_pair(source_lang, target_lang)
            sys.exit(0)
        except Exception as e:
            prog.error(
                f"Failed to install translation pack: {e}",
                details=traceback.format_exc(),
            )
            sys.exit(1)

    if not args.input:
        prog.error("No input video specified. Use --input <path>.")
        sys.exit(1)

    run_job(args)


if __name__ == "__main__":
    main()
