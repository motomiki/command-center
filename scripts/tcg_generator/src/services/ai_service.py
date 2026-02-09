"""
アセット層: Gemini API を用いたカードイラスト生成。
スタイル参照画像を contents に含めて画風統一、429 時の指数バックオフリトライを実装。
"""
from __future__ import annotations

import logging
import time
from io import BytesIO
from pathlib import Path
from typing import Literal

from PIL import Image

from src.core.config import (
    DEFAULT_MODEL_FAST,
    DEFAULT_MODEL_QUALITY,
    get_api_key,
    get_style_ref_path,
    INITIAL_BACKOFF_SEC,
    MAX_RETRIES,
)
from src.core.models import CardData
from src.utils.image_utils import trim_uniform_borders

logger = logging.getLogger(__name__)

ModelKind = Literal["fast", "quality"]


def _get_client():
    """google.genai.Client を遅延インポートして返す。"""
    from google import genai

    api_key = get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY が設定されていません。環境変数を設定してください。")
    return genai.Client(api_key=api_key)


def _load_style_image(style_ref_path: Path) -> Image.Image:
    """スタイル参照画像を PIL Image で読み込む。"""
    if not style_ref_path.exists():
        raise FileNotFoundError(f"スタイル参照画像が見つかりません: {style_ref_path}")
    return Image.open(style_ref_path).convert("RGBA")


def _build_prompt(card: CardData, style_description: str) -> str:
    """AI 用プロンプトを組み立てる。先頭で枠禁止を明示し、末尾で肯定・否定を繰り返す。"""
    return (
        "Card artwork only: no frame, no border of any kind (no white border, no black border). "
        "The illustration must extend to all four edges with zero margin. "
        f"Style: {style_description}. "
        f"Subject/prompt: {card.prompt}. "
        "Do not include any text, logos, or UI elements in the image. "
        "Full bleed image: the illustration must extend to all edges with no margins. "
        "No border, no frame, no rounded corners. Square corners and sharp edges only. "
        "Fill the entire canvas edge to edge. "
        "Edge-to-edge only. Do not add any white or black frame or margin around the image."
    ).strip()


def generate_card_art(
    card: CardData,
    *,
    style_ref_path: Path | None = None,
    style_description: str = "Tech fantasy, warm lighting, consistent character style, suitable for children",
    model_kind: ModelKind = "fast",
    output_path: Path | None = None,
) -> Image.Image:
    """
    Gemini API でカード用イラストを1枚生成し、PIL Image で返す。
    レート制限（429）時は指数バックオフでリトライする。

    Args:
        card: カード入力データ（prompt を使用）
        style_ref_path: スタイル参照画像のパス。None なら config のデフォルト
        style_description: スタイルの文章説明
        model_kind: "fast" または "quality"
        output_path: 指定時はここに中間 PNG を保存（デバッグ用）

    Returns:
        生成されたイラストの PIL Image (RGBA)

    Raises:
        ValueError: API Key 未設定
        RuntimeError: 生成失敗（リトライ後も）
    """
    from google.genai import types

    client = _get_client()
    path = style_ref_path or get_style_ref_path()
    model = DEFAULT_MODEL_QUALITY if model_kind == "quality" else DEFAULT_MODEL_FAST
    prompt = _build_prompt(card, style_description)

    # スタイル参照画像があれば含める（なければプロンプトのみで生成）
    if path.exists():
        style_img = _load_style_image(path)
        buf = BytesIO()
        style_img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        contents = [prompt, types.Part.from_bytes(data=img_bytes, mime_type="image/png")]
    else:
        logger.info("スタイル参照画像がありません (%s)。プロンプトのみで生成します。", path)
        contents = [prompt]
    config = types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="3:4"),
    )

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )

            # response.parts (GenerateContentResponse) または candidates[0].content.parts
            parts = getattr(response, "parts", None)
            if parts is None and getattr(response, "candidates", None):
                cands = response.candidates
                if cands and getattr(cands[0], "content", None) and getattr(cands[0].content, "parts", None):
                    parts = cands[0].content.parts

            if not parts:
                last_error = RuntimeError("No candidates returned (safety filter or error).")
                logger.warning("%s (attempt %d)", last_error, attempt + 1)
                time.sleep(INITIAL_BACKOFF_SEC * (2**attempt))
                continue

            for part in parts:
                if getattr(part, "inline_data", None):
                    raw = part.inline_data
                    if hasattr(part, "as_image") and callable(part.as_image):
                        img = part.as_image()
                    else:
                        data = getattr(raw, "data", raw) if raw else None
                        if data:
                            img = Image.open(BytesIO(data)).convert("RGBA")
                        else:
                            continue
                    if output_path:
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        img.save(output_path)
                    img = trim_uniform_borders(img)
                    return img

            last_error = RuntimeError("Response contained no image part.")
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "resource exhausted" in err_msg or "quota" in err_msg:
                last_error = e
                wait = INITIAL_BACKOFF_SEC * (2**attempt)
                logger.warning("Rate limit (attempt %d), sleeping %.1fs: %s", attempt + 1, wait, e)
                time.sleep(wait)
            else:
                raise

    if last_error:
        raise RuntimeError(f"Image generation failed after {MAX_RETRIES} attempts.") from last_error
    raise RuntimeError("Image generation produced no image.")
