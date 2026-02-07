"""
合成層: Pillow でカード枠・イラスト・テキストを合成する。
高品質リサイズ（LANCZOS）、日本語折り返し、レアリティ別枠・オーバーレイを実装。
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Union

from PIL import Image, ImageDraw, ImageFont

from src.core.config import (
    ART_WINDOW_HEIGHT,
    ART_WINDOW_OFFSET_X,
    ART_WINDOW_OFFSET_Y,
    ART_WINDOW_WIDTH,
    CARD_HEIGHT,
    CARD_WIDTH,
    CUSTOM_FRAME_RARITIES,
    DESC_FONT_SIZE,
    DESC_MAX_WIDTH,
    get_font_path,
    get_frame_path,
    OVERLAYS_DIR,
    TITLE_FONT_SIZE,
    TITLE_MAX_WIDTH,
    LINE_SPACING,
)
from src.core.models import CardData, Rarity
from src.utils.text_layout import draw_text_wrapped_ja, get_line_height, wrap_text_ja

# テキスト描画位置（枠レイアウトに合わせて調整）
TITLE_POSITION = (140, 652)
DESC_POSITION = (135, 735)
TEXT_FILL = (255, 255, 255)
# 説明文のみ黒系（DESC_POSITION 付近の背景とのコントラスト用）
DESC_TEXT_FILL = (0, 0, 0)
TEXT_STROKE_FILL = (0, 0, 0)


def _load_image(source: Union[Path, str, "Image.Image"]) -> Image.Image:
    """パス・文字列または PIL Image（および image-like）から RGBA 画像を返す。"""
    if isinstance(source, (Path, str)):
        path = Path(source)
        if not path.exists():
            raise FileNotFoundError(f"画像が見つかりません: {path}")
        return Image.open(path).convert("RGBA")
    # PIL Image
    if isinstance(source, Image.Image):
        return source.convert("RGBA")
    if hasattr(source, "convert") and callable(source.convert):
        return source.convert("RGBA")
    # google.genai の part.as_image() など別モジュールの Image 型
    if type(source).__name__ == "Image":
        # 1. 生データを優先: バイト列があればそのまま PIL で読み込む（save/load 不要）
        for attr in ("data", "_image_bytes", "image_bytes"):
            raw = getattr(source, attr, None)
            if isinstance(raw, (bytes, bytearray)):
                return Image.open(BytesIO(raw)).convert("RGBA")
        # 2. save が必要な場合: format 非対応のオブジェクトには save(buf) のみでフォールバック
        if hasattr(source, "save") and callable(source.save):
            buf = BytesIO()
            try:
                source.save(buf, format="PNG")
            except TypeError:
                source.save(buf)
            buf.seek(0)
            return Image.open(buf).convert("RGBA")
    raise TypeError(
        f"art_image は Path / str / PIL Image のいずれかで指定してください。got {type(source).__name__!r}"
    )


def _create_placeholder_art(width: int, height: int) -> Image.Image:
    """イラストがない場合のプレースホルダー画像（グラデーション風）。"""
    img = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        r = int(60 + 40 * (y / height))
        g = int(80 + 30 * (y / height))
        b = int(120 + 50 * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 200))
    return img


def _get_frame_image(card: CardData, frames_dir: Path | None = None) -> Image.Image:
    """レアリティに応じた枠画像を読み込む。CUSTOM_FRAME_RARITIES に含まれるレアのみファイルを参照し、他は単色枠を生成。"""
    if card.rarity.value not in CUSTOM_FRAME_RARITIES:
        return _create_fallback_frame(card)
    path = get_frame_path(card.rarity.value, frames_dir)
    if not path.exists():
        return _create_fallback_frame(card)
    frame = Image.open(path).convert("RGBA")
    if frame.size != (CARD_WIDTH, CARD_HEIGHT):
        frame = frame.resize((CARD_WIDTH, CARD_HEIGHT), resample=Image.Resampling.LANCZOS)
    return frame


def _create_fallback_frame(card: CardData) -> Image.Image:
    """枠画像がない場合の透明枠＋角だけ色付きの簡易枠。"""
    frame = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    border_color = (200, 180, 120, 255) if card.rarity in (Rarity.SR, Rarity.UR) else (120, 120, 120, 200)
    draw.rectangle([0, 0, CARD_WIDTH - 1, CARD_HEIGHT - 1], outline=border_color, width=8)
    return frame


def _get_fonts(draw: ImageDraw.ImageDraw):
    """タイトル用・説明用フォントを取得。フォントがない場合はデフォルト。"""
    try:
        title_font_path = get_font_path("", "title")
        desc_font_path = get_font_path("", "desc")
        title_font = ImageFont.truetype(str(title_font_path), TITLE_FONT_SIZE)
        desc_font = ImageFont.truetype(str(desc_font_path), DESC_FONT_SIZE)
    except FileNotFoundError:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
    return title_font, desc_font


def composite_card(
    card: CardData,
    art_image: Union[Path, str, Image.Image, None] = None,
    *,
    frame_path: Path | None = None,
    frames_dir: Path | None = None,
    output_path: Path | None = None,
    use_placeholder_art: bool = True,
    add_holo_overlay: bool | None = None,
) -> Image.Image:
    """
    カード画像を合成して返す（または output_path に保存）。

    Args:
        card: カードデータ（タイトル・説明・レアリティ）
        art_image: イラスト画像（パスまたは PIL Image）。None ならプレースホルダー
        frame_path: 枠画像のパス（1枚で全レア共通）。None ならレアリティ別枠を参照
        frames_dir: レアリティ別枠のディレクトリ。None なら config の FRAMES_DIR
        output_path: 保存先。指定時はここに PNG 保存
        use_placeholder_art: art_image が None のときプレースホルダーを使うか
        add_holo_overlay: SR/UR に光沢オーバーレイを乗せるか。None ならレアリティで自動

    Returns:
        合成済みの PIL Image (RGBA)
    """
    if frame_path is not None and Path(frame_path).exists():
        frame = Image.open(frame_path).convert("RGBA")
        canvas_size = frame.size
    else:
        frame = _get_frame_image(card, frames_dir)
        canvas_size = (CARD_WIDTH, CARD_HEIGHT)

    if art_image is not None:
        art = _load_image(art_image)
    elif use_placeholder_art:
        art = _create_placeholder_art(ART_WINDOW_WIDTH, ART_WINDOW_HEIGHT)
    else:
        art = _create_placeholder_art(ART_WINDOW_WIDTH, ART_WINDOW_HEIGHT)

    art = art.resize((ART_WINDOW_WIDTH, ART_WINDOW_HEIGHT), resample=Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.paste(art, (ART_WINDOW_OFFSET_X, ART_WINDOW_OFFSET_Y))
    canvas = Image.alpha_composite(canvas, frame)

    # オーバーレイ（SR/UR）
    if add_holo_overlay is None:
        add_holo_overlay = card.rarity in (Rarity.SR, Rarity.UR)
    if add_holo_overlay:
        holo_path = OVERLAYS_DIR / "holo.png"
        if holo_path.exists():
            holo = Image.open(holo_path).convert("RGBA")
            holo = holo.resize(canvas_size, resample=Image.Resampling.LANCZOS)
            canvas = Image.alpha_composite(canvas, holo)

    draw = ImageDraw.Draw(canvas)
    title_font, desc_font = _get_fonts(draw)

    # タイトル（1行で収まらない場合は折り返し）
    title_lines = wrap_text_ja(draw, card.title, title_font, TITLE_MAX_WIDTH, apply_kinsoku=True)
    line_height_title = get_line_height(draw, title_font, LINE_SPACING)
    tx, ty = TITLE_POSITION
    for i, line in enumerate(title_lines):
        draw.text((tx, ty + i * line_height_title), line, font=title_font, fill=TEXT_FILL)

    # 説明（折り返し＋禁則）
    draw_text_wrapped_ja(
        draw,
        card.description or "",
        desc_font,
        DESC_MAX_WIDTH,
        DESC_POSITION,
        DESC_TEXT_FILL,
        line_spacing=LINE_SPACING,
        apply_kinsoku=True,
    )

    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path)

    return canvas
