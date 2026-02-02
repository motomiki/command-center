"""
日本語テキストの折り返し・禁則処理・フォントサイズ自動調整。
Pillow の ImageDraw で美しい文字組みを実現する。
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL import ImageDraw, ImageFont

# 行頭禁則文字（この文字で行を終わらせない）
KINSOKU_LEADING = "、。．，．：；？！）」』】｝〉》」』〃ヽヾゝゞ々ぁぃぅぇぉっゃゅょァィゥェォッャュョヵヶ"
# 行末禁則文字（この文字で行を始めない）
KINSOKU_TRAILING = "「『（［｛〈《〔〝"


def _is_leading_cannot_end(char: str) -> bool:
    """行頭禁則: この文字が行末に来てはいけない。"""
    return char in KINSOKU_LEADING


def _is_trailing_cannot_start(char: str) -> bool:
    """行末禁則: この文字が行頭に来てはいけない。"""
    return char in KINSOKU_TRAILING


def wrap_text_ja(
    draw: "ImageDraw.ImageDraw",
    text: str,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    *,
    apply_kinsoku: bool = True,
) -> list[str]:
    """
    日本語テキストを指定幅で折り返し、行リストを返す。
    文字単位で幅を測り、max_width を超える直前で改行する。
    簡易禁則: 行末が行頭禁則文字だけになったら次の文字も含める。行頭が行末禁則なら前の行へ。

    Args:
        draw: Pillow ImageDraw インスタンス
        text: 描画する文字列
        font: 使用フォント
        max_width: 1行の最大幅（ピクセル）
        apply_kinsoku: True で禁則処理を有効化

    Returns:
        折り返し後の行リスト
    """
    if not text.strip():
        return []

    lines: list[str] = []
    current = ""

    def flush_current():
        nonlocal current
        if current:
            lines.append(current)
            current = ""

    i = 0
    while i < len(text):
        char = text[i]
        test = current + char
        bbox = draw.textbbox((0, 0), test, font=font)
        w = bbox[2] - bbox[0]

        if w <= max_width:
            current = test
            i += 1
            continue

        # はみ出す
        if not current:
            current = char
            i += 1
            flush_current()
            continue

        if apply_kinsoku and current:
            # 行末禁則: 次の文字が行末禁則文字なら、その文字を今の行に含めたい
            if i < len(text) and _is_trailing_cannot_start(text[i]):
                test2 = current + text[i]
                bbox2 = draw.textbbox((0, 0), test2, font=font)
                if bbox2[2] - bbox2[0] <= max_width:
                    current = test2
                    i += 1
                    flush_current()
                    continue
            # 行頭禁則: 現在の行末が行頭禁則文字だけなら、次の1文字も含めて改行
            if _is_leading_cannot_end(char) and len(current) >= 1:
                # 今の行の最後の文字が行頭禁則で、次の char が行頭禁則 → 次の文字まで含めてから改行
                next_char = text[i + 1] if i + 1 < len(text) else ""
                if next_char and _is_leading_cannot_end(next_char):
                    test3 = current + char + next_char
                    bbox3 = draw.textbbox((0, 0), test3, font=font)
                    if bbox3[2] - bbox3[0] <= max_width:
                        current = test3
                        i += 2
                        flush_current()
                        continue

        flush_current()
        current = ""
        # 同じ char を再度評価
        continue

    if current:
        lines.append(current)
    return lines


def get_line_height(draw: "ImageDraw.ImageDraw", font: "ImageFont.FreeTypeFont", spacing: int = 0) -> int:
    """1行の高さ（フォントの ascent/descent + spacing）を返す。"""
    bbox = draw.textbbox((0, 0), "あ", font=font)
    return bbox[3] - bbox[1] + spacing


def draw_text_wrapped_ja(
    draw: "ImageDraw.ImageDraw",
    text: str,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    position: tuple[int, int],
    fill: str | tuple[int, ...],
    *,
    line_spacing: int = 6,
    apply_kinsoku: bool = True,
) -> None:
    """
    日本語を折り返して描画する。textbbox で安全に行高を算出。

    Args:
        draw: ImageDraw インスタンス
        text: 描画する文字列
        font: フォント
        max_width: 最大幅
        position: 描画開始 (x, y)
        fill: 色
        line_spacing: 行間
        apply_kinsoku: 禁則を適用するか
    """
    lines = wrap_text_ja(draw, text, font, max_width, apply_kinsoku=apply_kinsoku)
    if not lines:
        return
    line_height = get_line_height(draw, font, line_spacing)
    x, y = position
    for i, line in enumerate(lines):
        draw.text((x, y + i * line_height), line, font=font, fill=fill)


def fit_font_size(
    draw: "ImageDraw.ImageDraw",
    text: str,
    font_path: str,
    max_width: int,
    max_height: int | None,
    initial_size: int = 36,
    min_size: int = 10,
    step: int = 2,
) -> "ImageFont.FreeTypeFont":
    """
    指定幅（とオプションで高さ）に収まるようフォントサイズを小さくし、
    そのサイズの ImageFont を返す。
    1行に収まらない場合は折り返しを考慮せず、フォントサイズのみで調整する。

    Args:
        draw: ImageDraw（フォント測定用）
        text: 測定する文字列
        font_path: フォントファイルパス
        max_width: 許容幅
        max_height: 許容高さ（None なら無視）
        initial_size: 初期フォントサイズ
        min_size: 最小フォントサイズ
        step: サイズを下げる刻み

    Returns:
        収まったサイズの FreeTypeFont
    """
    from PIL import ImageFont

    size = initial_size
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        if w <= max_width and (max_height is None or h <= max_height):
            return font
        size -= step
    return ImageFont.truetype(font_path, min_size)
