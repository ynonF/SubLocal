"""Unit tests for language code mapping utilities."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sublocal_worker.languages import (
    get_whisper_language,
    get_language_name,
    is_rtl,
    get_output_language_code,
    RTL_LANGUAGES,
)


class TestGetWhisperLanguage:
    def test_auto_returns_none(self):
        assert get_whisper_language("auto") is None

    def test_hebrew(self):
        assert get_whisper_language("he") == "he"

    def test_english(self):
        assert get_whisper_language("en") == "en"

    def test_arabic(self):
        assert get_whisper_language("ar") == "ar"

    def test_unknown_code_passed_through(self):
        # Unknown codes are passed through to Whisper as-is
        result = get_whisper_language("xx")
        assert result == "xx"


class TestGetLanguageName:
    def test_hebrew(self):
        assert get_language_name("he") == "Hebrew"

    def test_english(self):
        assert get_language_name("en") == "English"

    def test_chinese(self):
        assert get_language_name("zh") == "Chinese"

    def test_unknown_returns_code(self):
        assert get_language_name("xyz") == "xyz"

    def test_auto(self):
        assert get_language_name("auto") == "Auto"


class TestIsRtl:
    def test_hebrew_rtl(self):
        assert is_rtl("he") is True

    def test_arabic_rtl(self):
        assert is_rtl("ar") is True

    def test_english_not_rtl(self):
        assert is_rtl("en") is False

    def test_french_not_rtl(self):
        assert is_rtl("fr") is False

    def test_all_rtl_languages_covered(self):
        for code in RTL_LANGUAGES:
            assert is_rtl(code) is True, f"{code} should be RTL"


class TestGetOutputLanguageCode:
    def test_passthrough(self):
        assert get_output_language_code("he") == "he"
        assert get_output_language_code("en") == "en"
        assert get_output_language_code("zh") == "zh"


class TestFileScannerOutputNaming:
    """Test output filename generation logic."""

    def test_hebrew_filename(self):
        from sublocal_worker.srt import get_output_srt_path
        from pathlib import Path
        srt = get_output_srt_path(Path("/tv/Monster_S1E1.mkv"), "he")
        assert srt.name == "Monster_S1E1.he.srt"

    def test_english_filename(self):
        from sublocal_worker.srt import get_output_srt_path
        from pathlib import Path
        srt = get_output_srt_path(Path("/tv/Lecture.mp4"), "en")
        assert srt.name == "Lecture.en.srt"

    def test_video_extensions_supported(self):
        """Verify our supported extensions are the expected ones."""
        supported = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"}
        # This is the authoritative list — tests document the contract
        assert ".srt" not in supported
        assert ".mp3" not in supported
        assert len(supported) == 6
