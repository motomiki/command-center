#!/usr/bin/env python3
"""
TCG カード 1枚生成用 CLI。
単発生成・バッチ（CSV）・プレビュー（AIスキップ）に対応。
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

# プロジェクトルートをパスに追加（scripts/tcg_generator から実行する想定）
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from src.core.config import DATA_DIR, get_output_dir, get_style_ref_path
from src.core.models import CardData, Rarity, rarity_from_string
from src.services.ai_service import generate_card_art
from src.services.image_service import composite_card


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="TCG カードを1枚（またはCSVで複数枚）生成します。",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--title", "-t", type=str, help="カード名（必須: 単発モード）")
    p.add_argument("--prompt", "-p", type=str, help="イラスト用プロンプト（必須: 単発モード）")
    p.add_argument("--rarity", "-r", type=str, default="C", choices=["C", "U", "R", "RR", "SR", "UR"], help="レアリティ")
    p.add_argument("--description", "-d", type=str, default="", help="カード説明（先生コメント）")
    p.add_argument("--output", "-o", type=str, default=None, help="出力ファイルパス（単発時）。未指定なら output/card_001.png 等")
    p.add_argument("--file", "-f", type=str, default=None, help="バッチ用 CSV パス（title,prompt,rarity,description,card_id 等）")
    p.add_argument("--preview", action="store_true", help="AI生成をスキップし、プレースホルダーでテキストレイアウトのみ確認")
    p.add_argument("--art-image", "-a", type=str, default=None, help="既存のイラスト画像パス（指定時はAI生成せずこの画像で合成；--preview と併用可）")
    p.add_argument("--style-ref", type=str, default=None, help="スタイル参照画像のパス")
    p.add_argument("--model", type=str, default="fast", choices=["fast", "quality"], help="画像生成モデル")
    p.add_argument("--out-dir", type=str, default=None, help="出力ディレクトリ（バッチ時・単発で --output 未指定時）")
    return p.parse_args()


def build_card(row: dict) -> CardData:
    """CSV 1行またはキー付き dict から CardData を構築。"""
    return CardData(
        title=str(row.get("title", row.get("title_ja", ""))).strip() or "無題",
        description=str(row.get("description", row.get("desc", ""))).strip(),
        rarity=rarity_from_string(str(row.get("rarity", "C"))),
        prompt=str(row.get("prompt", row.get("title", ""))).strip() or "カードのイラスト",
        card_id=str(row.get("card_id", row.get("id", ""))).strip() or None,
        date=str(row.get("date", "")).strip() or None,
        student_id=str(row.get("student_id", "")).strip() or None,
    )


def run_single(args: argparse.Namespace) -> None:
    """1枚生成。"""
    if not args.title:
        print("単発モードでは --title が必須です。", file=sys.stderr)
        sys.exit(1)
    if not args.preview and not args.art_image and not args.prompt:
        print("AI生成する場合は --prompt が必須です。--preview または --art-image でスキップできます。", file=sys.stderr)
        sys.exit(1)
    card = CardData(
        title=args.title,
        description=args.description or "",
        rarity=rarity_from_string(args.rarity),
        prompt=args.prompt or "カードのイラスト",
    )
    out_dir = get_output_dir(args.out_dir)
    output_path = Path(args.output) if args.output else out_dir / "card_001.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.art_image:
        art_path = Path(args.art_image)
        if not art_path.exists():
            print(f"イラスト画像が見つかりません: {art_path}", file=sys.stderr)
            sys.exit(1)
        composite_card(card, art_image=art_path, output_path=output_path)
        print(f"保存しました: {output_path}")
        return
    if args.preview:
        composite_card(card, art_image=None, output_path=output_path, use_placeholder_art=True)
        print(f"プレビュー保存: {output_path}")
        return

    style_path = Path(args.style_ref) if args.style_ref else get_style_ref_path()
    print(f"イラスト生成中: {card.title} ...")
    art = generate_card_art(card, style_ref_path=style_path, model_kind=args.model)
    composite_card(card, art_image=art, output_path=output_path)
    print(f"保存しました: {output_path}")


def run_batch(args: argparse.Namespace) -> None:
    """CSV から複数枚生成。"""
    csv_path = Path(args.file)
    if not csv_path.exists():
        print(f"CSV が見つかりません: {csv_path}", file=sys.stderr)
        sys.exit(1)
    out_dir = get_output_dir(args.out_dir)
    style_path = Path(args.style_ref) if args.style_ref else get_style_ref_path()

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        print("CSV に行がありません。", file=sys.stderr)
        sys.exit(1)

    for i, row in enumerate(rows):
        try:
            card = build_card(row)
        except Exception as e:
            print(f"行 {i + 2}: データエラー - {e}", file=sys.stderr)
            continue
        name = (card.card_id or f"card_{i + 1:03d}").replace("/", "_")
        output_path = out_dir / f"{name}.png"

        if args.preview:
            composite_card(card, art_image=None, output_path=output_path, use_placeholder_art=True)
            print(f"プレビュー: {output_path}")
            continue

        print(f"[{i + 1}/{len(rows)}] {card.title} ...")
        try:
            art = generate_card_art(card, style_ref_path=style_path, model_kind=args.model)
            composite_card(card, art_image=art, output_path=output_path)
            print(f"  保存: {output_path}")
        except Exception as e:
            print(f"  失敗: {e}", file=sys.stderr)


def main() -> None:
    args = parse_args()
    if args.file:
        run_batch(args)
    else:
        run_single(args)


if __name__ == "__main__":
    main()
