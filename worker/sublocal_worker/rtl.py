"""
RTL (Right-to-Left) text utilities for subtitle generation.

Handles Hebrew, Arabic, and other RTL languages in SRT files.
The approach: preserve original text direction, add Unicode RLM marks
where needed to prevent punctuation reordering, and avoid reversing strings.
"""

RTL_CODES = {"he", "ar", "fa", "ur"}

# Unicode direction marks
RLM = "‏"  # Right-to-Left Mark
LRM = "‎"  # Left-to-Right Mark
RLE = "‫"  # Right-to-Left Embedding
PDF = "‬"  # Pop Directional Formatting


def is_rtl_language(lang_code: str) -> bool:
    """Return True if the given language code is right-to-left."""
    return lang_code in RTL_CODES


def format_subtitle_text_for_target_language(text: str, lang_code: str) -> str:
    """
    Format subtitle text appropriately for the target language.

    For RTL languages (Hebrew, Arabic):
    - Add Right-to-Left Mark (RLM) at the start of each line
    - This helps video players and SRT renderers display the text correctly
    - Does NOT reverse the string or corrupt punctuation

    For LTR languages:
    - Return text as-is
    """
    if not text or not text.strip():
        return text

    if not is_rtl_language(lang_code):
        return text

    # Add RLM at the start of each line for RTL languages
    lines = text.split("\n")
    formatted_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped:
            # Add RLM at the start if not already present
            if not stripped.startswith(RLM):
                formatted_lines.append(RLM + stripped)
            else:
                formatted_lines.append(stripped)
        else:
            formatted_lines.append(line)

    return "\n".join(formatted_lines)


def wrap_text_for_subtitle(
    text: str,
    lang_code: str,
    max_chars: int = 42,
) -> str:
    """
    Wrap subtitle text to fit within max_chars per line.

    For RTL languages, wrapping is done on word boundaries.
    For LTR, same approach but left-to-right.
    Does not aggressively split — only wraps if line is genuinely too long.
    """
    if not text or len(text) <= max_chars:
        return text

    words = text.split()
    lines = []
    current_line = []
    current_len = 0

    for word in words:
        word_len = len(word)
        if current_len == 0:
            current_line.append(word)
            current_len = word_len
        elif current_len + 1 + word_len <= max_chars:
            current_line.append(word)
            current_len += 1 + word_len
        else:
            lines.append(" ".join(current_line))
            current_line = [word]
            current_len = word_len

    if current_line:
        lines.append(" ".join(current_line))

    # Limit to 2 lines max for readability
    if len(lines) > 2:
        lines = [" ".join(lines[:len(lines)//2]), " ".join(lines[len(lines)//2:])]

    return "\n".join(lines)


def prepare_subtitle_text(text: str, lang_code: str, max_chars: int = 42) -> str:
    """
    Full pipeline: wrap text then apply RTL formatting.
    """
    text = text.strip()
    if not text:
        return text
    text = wrap_text_for_subtitle(text, lang_code, max_chars)
    text = format_subtitle_text_for_target_language(text, lang_code)
    return text
