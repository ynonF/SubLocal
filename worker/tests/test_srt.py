"""Unit tests for SRT generation utilities."""
import sys
import os
import pytest
from pathlib import Path

# Add worker directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sublocal_worker.srt import (
    seconds_to_srt_timestamp,
    format_srt_block,
    write_srt,
    get_output_srt_path,
    get_output_video_path,
    Segment,
)


class TestSecondsToSrtTimestamp:
    def test_zero(self):
        assert seconds_to_srt_timestamp(0.0) == "00:00:00,000"

    def test_one_second(self):
        assert seconds_to_srt_timestamp(1.0) == "00:00:01,000"

    def test_fractional(self):
        assert seconds_to_srt_timestamp(1.5) == "00:00:01,500"

    def test_minutes(self):
        assert seconds_to_srt_timestamp(61.0) == "00:01:01,000"

    def test_hours(self):
        assert seconds_to_srt_timestamp(3661.0) == "01:01:01,000"

    def test_milliseconds(self):
        assert seconds_to_srt_timestamp(0.001) == "00:00:00,001"

    def test_milliseconds_rounding(self):
        # 1.4999... should round to 1,500
        ts = seconds_to_srt_timestamp(1.4999)
        assert ts.endswith(",500") or ts.endswith(",499")

    def test_large_value(self):
        # 2 hours 30 minutes 45.123 seconds
        ts = seconds_to_srt_timestamp(2 * 3600 + 30 * 60 + 45.123)
        assert ts.startswith("02:30:45,")

    def test_negative_clamped_to_zero(self):
        assert seconds_to_srt_timestamp(-1.0) == "00:00:00,000"


class TestFormatSrtBlock:
    def test_basic(self):
        block = format_srt_block(1, 1.0, 4.5, "Hello world")
        lines = block.strip().split("\n")
        assert lines[0] == "1"
        assert lines[1] == "00:00:01,000 --> 00:00:04,500"
        assert lines[2] == "Hello world"

    def test_multiline_text(self):
        block = format_srt_block(2, 0.0, 2.0, "Line 1\nLine 2")
        assert "Line 1\nLine 2" in block

    def test_index(self):
        block = format_srt_block(42, 0.0, 1.0, "Test")
        assert block.startswith("42\n")


class TestWriteSrt:
    def test_writes_file(self, tmp_path):
        segments: list[Segment] = [
            {"id": 1, "start": 0.0, "end": 2.0, "text": "Hello", "translated_text": "שלום"},
            {"id": 2, "start": 2.5, "end": 4.0, "text": "World", "translated_text": "עולם"},
        ]
        output = tmp_path / "test.srt"
        write_srt(segments, output, "he", use_translated=True)

        assert output.exists()
        content = output.read_text(encoding="utf-8")
        assert "שלום" in content
        assert "עולם" in content
        assert "00:00:00,000 --> 00:00:02,000" in content

    def test_uses_original_text_when_no_translation(self, tmp_path):
        segments: list[Segment] = [
            {"id": 1, "start": 0.0, "end": 2.0, "text": "Hello", "translated_text": None},
        ]
        output = tmp_path / "test.srt"
        write_srt(segments, output, "en", use_translated=True)

        content = output.read_text(encoding="utf-8")
        assert "Hello" in content

    def test_skips_empty_segments(self, tmp_path):
        segments: list[Segment] = [
            {"id": 1, "start": 0.0, "end": 2.0, "text": "", "translated_text": ""},
            {"id": 2, "start": 2.0, "end": 4.0, "text": "Hello", "translated_text": "Hello"},
        ]
        output = tmp_path / "test.srt"
        write_srt(segments, output, "en", use_translated=True)

        content = output.read_text(encoding="utf-8")
        # Only one block should be present
        assert content.startswith("1\n")
        assert "2\n" not in content

    def test_utf8_encoding(self, tmp_path):
        segments: list[Segment] = [
            {"id": 1, "start": 0.0, "end": 2.0, "text": "Test", "translated_text": "テスト"},
        ]
        output = tmp_path / "test.srt"
        write_srt(segments, output, "ja", use_translated=True)

        content = output.read_text(encoding="utf-8")
        assert "テスト" in content

    def test_minimum_duration_enforced(self, tmp_path):
        # Segment with very short duration (< 0.5s) should be extended
        segments: list[Segment] = [
            {"id": 1, "start": 1.0, "end": 1.1, "text": "Short", "translated_text": "Short"},
        ]
        output = tmp_path / "test.srt"
        write_srt(segments, output, "en", use_translated=True)

        content = output.read_text(encoding="utf-8")
        # End time should be at least start + 0.5 = 1.5
        assert "00:00:01,500" in content


class TestOutputPaths:
    def test_srt_path_same_folder(self):
        video = Path("/videos/Monster_S1E1.mkv")
        srt = get_output_srt_path(video, "he")
        assert srt == Path("/videos/Monster_S1E1.he.srt")

    def test_srt_path_custom_folder(self):
        video = Path("/videos/episode.mkv")
        srt = get_output_srt_path(video, "fr", output_folder="/output")
        assert srt == Path("/output/episode.fr.srt")

    def test_srt_path_with_suffix(self):
        video = Path("/videos/ep.mkv")
        srt = get_output_srt_path(video, "en", suffix="original.en")
        assert srt == Path("/videos/ep.original.en.srt")

    def test_video_path(self):
        video = Path("/videos/Monster_S1E1.mkv")
        out = get_output_video_path(video, "Hebrew")
        assert out == Path("/videos/Monster_S1E1.with-hebrew-subtitles.mp4")

    def test_video_path_spaces_in_lang_name(self):
        video = Path("/videos/ep.mkv")
        out = get_output_video_path(video, "Chinese Simplified")
        assert out == Path("/videos/ep.with-chinese-simplified-subtitles.mp4")
