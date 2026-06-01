"""Unit tests for RTL (Right-to-Left) text utilities."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sublocal_worker.rtl import (
    is_rtl_language,
    format_subtitle_text_for_target_language,
    wrap_text_for_subtitle,
    prepare_subtitle_text,
    RLM,
)


class TestIsRtlLanguage:
    def test_hebrew_is_rtl(self):
        assert is_rtl_language("he") is True

    def test_arabic_is_rtl(self):
        assert is_rtl_language("ar") is True

    def test_english_is_ltr(self):
        assert is_rtl_language("en") is False

    def test_french_is_ltr(self):
        assert is_rtl_language("fr") is False

    def test_japanese_is_ltr(self):
        assert is_rtl_language("ja") is False

    def test_unknown_is_ltr(self):
        assert is_rtl_language("xx") is False


class TestFormatSubtitleTextForTargetLanguage:
    def test_hebrew_gets_rlm(self):
        text = "שלום עולם"
        result = format_subtitle_text_for_target_language(text, "he")
        assert result.startswith(RLM)
        assert "שלום עולם" in result

    def test_arabic_gets_rlm(self):
        text = "مرحبا"
        result = format_subtitle_text_for_target_language(text, "ar")
        assert result.startswith(RLM)

    def test_english_unchanged(self):
        text = "Hello world"
        result = format_subtitle_text_for_target_language(text, "en")
        assert result == text

    def test_empty_text_unchanged(self):
        result = format_subtitle_text_for_target_language("", "he")
        assert result == ""

    def test_multiline_rtl_each_line_gets_rlm(self):
        text = "שלום\nעולם"
        result = format_subtitle_text_for_target_language(text, "he")
        lines = result.split("\n")
        for line in lines:
            if line.strip():
                assert line.startswith(RLM), f"Line missing RLM: {repr(line)}"

    def test_does_not_reverse_string(self):
        text = "abc def"
        result = format_subtitle_text_for_target_language(text, "en")
        assert result == text

    def test_does_not_add_rlm_twice(self):
        text = RLM + "שלום"
        result = format_subtitle_text_for_target_language(text, "he")
        assert result.startswith(RLM)
        # Should not add another RLM at the start
        assert not result.startswith(RLM + RLM)


class TestWrapTextForSubtitle:
    def test_short_text_unchanged(self):
        text = "Hello"
        result = wrap_text_for_subtitle(text, "en", max_chars=42)
        assert result == text

    def test_long_text_wrapped(self):
        text = "This is a very long subtitle line that exceeds the maximum character limit"
        result = wrap_text_for_subtitle(text, "en", max_chars=42)
        lines = result.split("\n")
        assert len(lines) > 1
        for line in lines:
            assert len(line) <= 42 or " " not in line  # single words may exceed

    def test_wraps_at_word_boundary(self):
        text = "Hello world foo bar baz qux quux quuz corge grault garply"
        result = wrap_text_for_subtitle(text, "en", max_chars=20)
        for line in result.split("\n"):
            assert not line.endswith(" ")
            assert not line.startswith(" ")

    def test_max_two_lines(self):
        text = "word " * 30
        result = wrap_text_for_subtitle(text, "en", max_chars=20)
        assert result.count("\n") <= 1  # at most 2 lines


class TestPrepareSubtitleText:
    def test_hebrew_gets_wrapped_and_rlm(self):
        text = "זהו טקסט עברי ארוך מאוד שצריך לעבור עיטוף כדי להתאים לרוחב השורה"
        result = prepare_subtitle_text(text, "he", max_chars=40)
        # Should have RLM
        assert RLM in result

    def test_empty_returns_empty(self):
        result = prepare_subtitle_text("", "he", max_chars=42)
        assert result == ""

    def test_whitespace_only_returns_empty(self):
        result = prepare_subtitle_text("   ", "he", max_chars=42)
        assert result == ""
