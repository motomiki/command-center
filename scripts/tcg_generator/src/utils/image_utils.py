"""
画像ユーティリティ: 一色枠の検出・トリムなど。
"""
from __future__ import annotations

from PIL import Image


def trim_uniform_borders(
    img: Image.Image,
    max_border_px: int = 60,
    color_tolerance: int = 15,
    min_content_ratio: float = 0.5,
) -> Image.Image:
    """
    上下左右の一色枠を検出してトリムする。
    プロンプトで防ぎきれない白・黒枠を後処理で除去する。

    Args:
        img: RGBA 画像（RGB でも可）
        max_border_px: 一色とみなしてトリムする最大ピクセル幅
        color_tolerance: 同一色とみなす R,G,B 各チャンネル差の許容値 (0-255)
        min_content_ratio: トリム後の幅/高さが元のこの割合未満ならトリムしない

    Returns:
        トリム後の画像（トリムしない場合は img をそのまま返す）
    """
    w, h = img.size
    if w == 0 or h == 0:
        return img

    rgb = img.convert("RGB")
    pixels = rgb.load()

    def _row_uniform(y: int) -> bool:
        row_colors = [pixels[x, y] for x in range(w)]
        min_r = min(c[0] for c in row_colors)
        max_r = max(c[0] for c in row_colors)
        min_g = min(c[1] for c in row_colors)
        max_g = max(c[1] for c in row_colors)
        min_b = min(c[2] for c in row_colors)
        max_b = max(c[2] for c in row_colors)
        return (
            (max_r - min_r) <= color_tolerance
            and (max_g - min_g) <= color_tolerance
            and (max_b - min_b) <= color_tolerance
        )

    def _col_uniform(x: int) -> bool:
        col_colors = [pixels[x, y] for y in range(h)]
        min_r = min(c[0] for c in col_colors)
        max_r = max(c[0] for c in col_colors)
        min_g = min(c[1] for c in col_colors)
        max_g = max(c[1] for c in col_colors)
        min_b = min(c[2] for c in col_colors)
        max_b = max(c[2] for c in col_colors)
        return (
            (max_r - min_r) <= color_tolerance
            and (max_g - min_g) <= color_tolerance
            and (max_b - min_b) <= color_tolerance
        )

    top = 0
    for y in range(min(max_border_px, h)):
        if not _row_uniform(y):
            break
        top = y + 1

    bottom = h
    for y in range(h - 1, max(0, h - max_border_px) - 1, -1):
        if not _row_uniform(y):
            break
        bottom = y

    left = 0
    for x in range(min(max_border_px, w)):
        if not _col_uniform(x):
            break
        left = x + 1

    right = w
    for x in range(w - 1, max(0, w - max_border_px) - 1, -1):
        if not _col_uniform(x):
            break
        right = x

    trimmed_w = right - left
    trimmed_h = bottom - top
    if trimmed_w < w * min_content_ratio or trimmed_h < h * min_content_ratio:
        return img
    if top == 0 and bottom == h and left == 0 and right == w:
        return img

    return img.crop((left, top, right, bottom))
