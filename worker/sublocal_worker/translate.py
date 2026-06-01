"""
Translation engine adapter system for SubLocal.

Provides a pluggable interface so different translation backends can be swapped.
Current engines:
  - ArgosTranslateEngine: local, offline, open-source (primary)
  - NoTranslationEngine:  passthrough (same-language subtitles)

Stub engines (not fully implemented):
  - OllamaEngine: local LLM translation (coming soon)
  - NLLBEngine: Meta NLLB local model (coming soon)
"""
from __future__ import annotations
import sys
from abc import ABC, abstractmethod
from typing import Optional, Callable

from . import progress as prog
from .srt import Segment


# ---------------------------------------------------------------------------
# Base interface
# ---------------------------------------------------------------------------

class TranslationEngine(ABC):
    """Base class for translation engines."""

    id: str
    display_name: str

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if this engine can be used right now."""
        ...

    @abstractmethod
    def ensure_language_pair(self, source_lang: str, target_lang: str) -> None:
        """
        Ensure the engine has the required language pair installed.
        May download models/packages. Should raise if unavailable.
        """
        ...

    @abstractmethod
    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
        on_progress: Optional[Callable[[int, int], None]] = None,
    ) -> list[Segment]:
        """
        Translate segment texts.

        Returns a copy of segments with 'translated_text' filled in.
        Preserves all timing information.
        """
        ...


# ---------------------------------------------------------------------------
# No-op engine (same-language subtitles)
# ---------------------------------------------------------------------------

class NoTranslationEngine(TranslationEngine):
    """
    Passthrough engine — copies 'text' to 'translated_text'.

    Used when source and target language are the same,
    or when translation is disabled.
    """
    id = "none"
    display_name = "No translation"

    def is_available(self) -> bool:
        return True

    def ensure_language_pair(self, source_lang: str, target_lang: str) -> None:
        pass  # Always available

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
        on_progress: Optional[Callable[[int, int], None]] = None,
    ) -> list[Segment]:
        result = []
        for seg in segments:
            result.append({**seg, "translated_text": seg["text"]})
        return result


# ---------------------------------------------------------------------------
# Argos Translate engine
# ---------------------------------------------------------------------------

class ArgosTranslateEngine(TranslationEngine):
    """
    Local offline translation using Argos Translate.

    Argos Translate uses CTranslate2 under the hood and supports
    many language pairs. Packages are downloaded on demand.
    """
    id = "argos"
    display_name = "Argos Translate (local, offline)"

    def is_available(self) -> bool:
        try:
            import argostranslate.package
            import argostranslate.translate
            return True
        except ImportError:
            return False

    def ensure_language_pair(self, source_lang: str, target_lang: str) -> None:
        """Check if language pair is installed; raise MissingPackageError if not."""
        if source_lang == target_lang:
            return  # No translation needed

        import argostranslate.package
        import argostranslate.translate

        available = argostranslate.translate.get_installed_languages()

        src_lang_obj = None
        for lang in available:
            if lang.code == source_lang:
                src_lang_obj = lang
                to_codes = {t.code for t in lang.translations_to}
                if target_lang in to_codes:
                    return  # Package is installed
                break

        raise MissingTranslationPackageError(
            f"Translation pack for {source_lang} to {target_lang} is not installed. "
            f"Please download it first.",
            source_lang=source_lang,
            target_lang=target_lang,
        )

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
        on_progress: Optional[Callable[[int, int], None]] = None,
    ) -> list[Segment]:
        if source_lang == target_lang:
            return NoTranslationEngine().translate_segments(segments, source_lang, target_lang, on_progress)

        import argostranslate.translate

        # Get translation function
        installed_languages = argostranslate.translate.get_installed_languages()
        from_lang = next((l for l in installed_languages if l.code == source_lang), None)
        if not from_lang:
            raise RuntimeError(f"Source language '{source_lang}' not found in installed packages.")

        translation = from_lang.get_translation(target_lang)
        if not translation:
            raise MissingTranslationPackageError(
                f"No translation found for {source_lang} to {target_lang}",
                source_lang=source_lang,
                target_lang=target_lang,
            )

        result = []
        total = len(segments)

        prog.progress("translate", 70, "Translating subtitles...")

        for i, seg in enumerate(segments):
            text = seg.get("text", "").strip()
            try:
                translated = translation.translate(text) if text else ""
            except Exception as e:
                prog.debug(f"Translation failed for segment {i}: {e}")
                translated = text  # Fall back to original text

            result.append({**seg, "translated_text": translated})

            if on_progress:
                on_progress(i + 1, total)

            # Emit progress periodically
            if i % 10 == 0 or i == total - 1:
                pct = 70 + int((i / max(total, 1)) * 18)
                prog.progress("translate", pct, "Translating subtitles...")

        prog.progress("translate", 88, "Translation complete.")
        return result

    @staticmethod
    def install_language_pair(source_lang: str, target_lang: str) -> None:
        """Download and install an Argos Translate language package."""
        import argostranslate.package
        import argostranslate.translate

        prog.progress("install_package", 5, "Downloading translation pack...")

        argostranslate.package.update_package_index()
        available_packages = argostranslate.package.get_available_packages()

        package_to_install = next(
            (p for p in available_packages
             if p.from_code == source_lang and p.to_code == target_lang),
            None,
        )

        if not package_to_install:
            raise RuntimeError(
                f"No Argos Translate package available for {source_lang} to {target_lang}."
            )

        prog.progress("install_package", 30, "Downloading translation pack...")
        download_path = package_to_install.download()

        prog.progress("install_package", 80, "Installing translation pack...")
        argostranslate.package.install_from_path(download_path)

        prog.progress("install_package", 100, "Translation pack installed.")
        prog.debug(f"Installed package: {source_lang} to {target_lang}")


# ---------------------------------------------------------------------------
# Stub engines (not fully implemented)
# ---------------------------------------------------------------------------

class OllamaEngine(TranslationEngine):
    """Stub: Ollama local LLM translation (coming soon)."""
    id = "ollama"
    display_name = "Ollama (coming soon)"

    def is_available(self) -> bool:
        return False

    def ensure_language_pair(self, source_lang: str, target_lang: str) -> None:
        raise NotImplementedError("Ollama translation is not yet implemented.")

    def translate_segments(self, segments, source_lang, target_lang, on_progress=None):
        raise NotImplementedError("Ollama translation is not yet implemented.")


class NLLBEngine(TranslationEngine):
    """Stub: Meta NLLB local translation (coming soon)."""
    id = "nllb"
    display_name = "NLLB (coming soon)"

    def is_available(self) -> bool:
        return False

    def ensure_language_pair(self, source_lang: str, target_lang: str) -> None:
        raise NotImplementedError("NLLB translation is not yet implemented.")

    def translate_segments(self, segments, source_lang, target_lang, on_progress=None):
        raise NotImplementedError("NLLB translation is not yet implemented.")


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class MissingTranslationPackageError(Exception):
    """Raised when a required translation package is not installed."""

    def __init__(self, message: str, source_lang: str = "", target_lang: str = ""):
        super().__init__(message)
        self.source_lang = source_lang
        self.target_lang = target_lang


# ---------------------------------------------------------------------------
# Engine registry
# ---------------------------------------------------------------------------

_ENGINES: dict[str, TranslationEngine] = {
    "argos": ArgosTranslateEngine(),
    "none": NoTranslationEngine(),
    "ollama": OllamaEngine(),
    "nllb": NLLBEngine(),
}


def get_engine(engine_id: str) -> TranslationEngine:
    """Return a translation engine by ID."""
    engine = _ENGINES.get(engine_id)
    if not engine:
        prog.debug(f"Unknown engine '{engine_id}', falling back to 'none'")
        return _ENGINES["none"]
    return engine
