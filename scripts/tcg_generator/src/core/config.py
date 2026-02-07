"""
TCG Generator 設定の一元管理。
環境変数・定数・パスをここで定義し、他モジュールから参照する。
GEMINI_API_KEY は環境変数、または tcg_generator 直下の .env に記載。
"""
from __future__ import annotations

import os
from pathlib import Path

# このファイルの位置からプロジェクトルート（tcg_generator）を算出
_CURRENT_DIR = Path(__file__).resolve().parent
_SRC_DIR = _CURRENT_DIR.parent
_PROJECT_ROOT = _SRC_DIR.parent

# .env を読み込み（未設定時のみ。環境変数が優先）
try:
    from dotenv import load_dotenv
    _env_path = _PROJECT_ROOT / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    pass

# --- ディレクトリ ---
ASSETS_DIR = _PROJECT_ROOT / "assets"
FRAMES_DIR = ASSETS_DIR / "frames"
FONTS_DIR = ASSETS_DIR / "fonts"
STYLES_DIR = ASSETS_DIR / "styles"
OVERLAYS_DIR = ASSETS_DIR / "overlays"
DATA_DIR = _PROJECT_ROOT / "data"
OUTPUT_DIR = _PROJECT_ROOT / "output"

# --- カスタム枠を有効にするレアリティ（ここに含まれるものだけ frames/{rarity}.png を参照）---
# 微調整時はまず UR のみ有効にし、他レアはフォールバック枠を使用する。
CUSTOM_FRAME_RARITIES: frozenset[str] = frozenset({"UR"})

# --- デフォルトファイル名 ---
DEFAULT_STYLE_REF = "style_ref.png"
DEFAULT_FRAME_PREFIX = ""  # 例: "" なら frames/C.png, frames/SR.png
DEFAULT_TITLE_FONT = "NotoSansJP-Regular.ttf"
DEFAULT_DESC_FONT = "NotoSansJP-Regular.ttf"
DEFAULT_HOLO_OVERLAY = "holo.png"

# --- カード画像サイズ（ピクセル）---
CARD_WIDTH = 600
CARD_HEIGHT = 840
ART_WINDOW_WIDTH = 520
ART_WINDOW_HEIGHT = 680
ART_WINDOW_OFFSET_X = 40
ART_WINDOW_OFFSET_Y = 70

# --- API ---
# 画像生成対応モデル（Nano Banana）。旧 gemini-2.0-flash-exp-image-generation は非対応のため変更
ENV_API_KEY = "GEMINI_API_KEY"
DEFAULT_MODEL_FAST = "gemini-2.5-flash-image"
DEFAULT_MODEL_QUALITY = "gemini-3-pro-image-preview"

# --- リトライ ---
MAX_RETRIES = 5
INITIAL_BACKOFF_SEC = 2.0

# --- テキストレイアウト ---
TITLE_FONT_SIZE = 36
DESC_FONT_SIZE = 22
TITLE_MAX_WIDTH = 520
DESC_MAX_WIDTH = 520
LINE_SPACING = 6


def get_api_key() -> str:
    """環境変数から API Key を取得。未設定なら空文字。"""
    return os.environ.get(ENV_API_KEY, "").strip()


def get_style_ref_path(custom_path: str | Path | None = None) -> Path:
    """スタイル参照画像のパス。未指定なら assets/styles/style_ref.png。"""
    if custom_path:
        return Path(custom_path)
    return STYLES_DIR / DEFAULT_STYLE_REF


def get_frame_path(rarity: str, custom_frames_dir: Path | None = None) -> Path:
    """レアリティに対応する枠画像のパス。"""
    base = custom_frames_dir or FRAMES_DIR
    return base / f"{rarity}.png"


def get_font_path(name: str, font_type: str = "title") -> Path:
    """フォントファイルのパス。存在しなければ FONTS_DIR 内の最初の ttf/otf を返す。"""
    if name:
        p = FONTS_DIR / name
        if p.exists():
            return p
    # フォールバック: 同ディレクトリの任意の ttf/otf
    for ext in ("*.ttf", "*.otf"):
        for f in FONTS_DIR.glob(ext):
            return f
    raise FileNotFoundError(f"フォントが見つかりません: {FONTS_DIR}")


def get_output_dir(custom: str | Path | None = None) -> Path:
    """出力ディレクトリ。存在しなければ作成する。"""
    out = Path(custom) if custom else OUTPUT_DIR
    out.mkdir(parents=True, exist_ok=True)
    return out
