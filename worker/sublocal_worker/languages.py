"""Language code utilities and mappings."""

# Whisper uses its own language codes; map our codes to Whisper codes
WHISPER_LANGUAGE_MAP: dict[str, str] = {
    "auto": None,  # type: ignore  # means auto-detect
    "he": "he",
    "en": "en",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "ar": "ar",
    "ru": "ru",
    "pt": "pt",
    "it": "it",
    "ja": "ja",
    "ko": "ko",
    "zh": "zh",
    "tr": "tr",
    "uk": "uk",
    "pl": "pl",
}

# Human-readable language names
LANGUAGE_NAMES: dict[str, str] = {
    "auto": "Auto",
    "he": "Hebrew",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ar": "Arabic",
    "ru": "Russian",
    "pt": "Portuguese",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "pl": "Polish",
}

# RTL languages
RTL_LANGUAGES = {"he", "ar", "fa", "ur"}


def get_whisper_language(code: str) -> str | None:
    """Return the Whisper language code for a given ISO code, or None for auto."""
    if code == "auto":
        return None
    return WHISPER_LANGUAGE_MAP.get(code, code)


def get_language_name(code: str) -> str:
    """Return human-readable name for a language code."""
    return LANGUAGE_NAMES.get(code, code)


def is_rtl(code: str) -> bool:
    """Return True if the language is right-to-left."""
    return code in RTL_LANGUAGES


def get_output_language_code(code: str) -> str:
    """Return the output file language code (same as input for now)."""
    return code
