#!/usr/bin/env python3
"""
Noto Sans JP を Google Fonts 公式リポジトリからダウンロードし、
assets/fonts/ に配置する。OFL ライセンスで再配布可。
"""
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

# プロジェクトルート（tcg_generator）
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
FONTS_DIR = PROJECT_ROOT / "assets" / "fonts"
OUTPUT_PATH = FONTS_DIR / "NotoSansJP-Regular.ttf"

# Google Fonts 公式 (variable font, OFL)
SOURCE_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"


def main() -> int:
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as resp:
            if resp.status != 200:
                print(f"HTTP {resp.status}", file=sys.stderr)
                return 1
            data = resp.read()
    except Exception as e:
        print(f"Download failed: {e}", file=sys.stderr)
        return 1
    OUTPUT_PATH.write_bytes(data)
    print(f"Saved: {OUTPUT_PATH} ({len(data) / (1024*1024):.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
