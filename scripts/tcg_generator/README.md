# TCG Generator

Gemini API と Pillow を使い、1枚ずつ（またはCSVで複数枚）TCG風カード画像を生成する Python CLI ツールです。

## 必要な環境

- Python 3.10 以上
- 環境変数 `GEMINI_API_KEY` に Gemini API キーを設定

## インストール

```bash
cd scripts/tcg_generator
pip install -r requirements.txt
```

## 実行方法

### 1枚だけ生成（AIでイラスト生成）

```bash
python main.py --title "炎の剣" --prompt "炎に包まれた剣が光るファンタジーイラスト" --rarity SR --output ./output/card_001.png
```

- `--title`: カード名（必須）
- `--prompt`: イラスト用プロンプト（必須）
- `--rarity`: レアリティ（C / U / R / RR / SR / UR）
- `--description`: 先生からのコメント（任意）
- `--output`: 出力ファイルパス（未指定時は `output/card_001.png`）
- `--style-ref`: スタイル参照画像のパス（未指定時は `assets/styles/style_ref.png`）
- `--model`: `fast`（高速）または `quality`（高品質）

### プレビュー（AIを使わずテキストレイアウトのみ確認）

```bash
python main.py --title "炎の剣" --prompt "炎の剣" --rarity SR --preview --output ./output/preview.png
```

`--preview` を付けると Gemini API を呼ばず、プレースホルダー画像で枠・タイトル・説明の配置だけ確認できます。

### バッチ生成（CSVから複数枚）

```bash
python main.py --file data/input.csv --out-dir ./output
```

CSV の列: `title`, `prompt`, `rarity`, `description`, `card_id` など（`title_ja`, `desc`, `id` も可）。  
出力ファイル名は `card_id` または `card_001.png`, `card_002.png` のように連番になります。

## 素材の差し替え

- **カード枠**: `assets/frames/` に `C.png`, `U.png`, `R.png`, `RR.png`, `SR.png`, `UR.png` を置くと、レアリティ別の枠が使われます。なければ単色枠が自動生成されます。
- **スタイル参照**: `assets/styles/style_ref.png` を用意すると、Gemini の画風がこの画像に近づきます。`--style-ref` で別ファイルも指定可能です。
- **フォント**: `assets/fonts/` に `.ttf` または `.otf` の日本語フォントを1本以上置くと、タイトル・説明に使われます。なければ Pillow のデフォルトフォントになります。
- **光沢オーバーレイ**: SR/UR 用に `assets/overlays/holo.png` を置くと、合成時に重ねられます。

## ディレクトリ構成

```
scripts/tcg_generator/
├── assets/
│   ├── frames/    … レアリティ別枠 (C.png, SR.png 等)
│   ├── fonts/     … 日本語フォント
│   ├── styles/    … スタイル参照画像
│   └── overlays/  … 光沢など (holo.png)
├── data/
│   ├── input.csv       … バッチ用入力例
│   └── templates.json  … プロンプト雛形
├── output/        … 生成画像の保存先
├── src/           … Python ソース
├── main.py        … 実行エントリーポイント
├── requirements.txt
└── README.md      … 本ファイル
```

## トラブルシューティング

- **「GEMINI_API_KEY が設定されていません」**: 環境変数に API キーを設定してください。
- **「スタイル参照画像が見つかりません」**: `assets/styles/style_ref.png` を用意するか、`--style-ref` でパスを指定してください。
- **「フォントが見つかりません」**: 日本語フォントを `assets/fonts/` に置くか、そのまま実行するとデフォルトフォントで描画されます（日本語は表示が崩れる場合があります）。
- **429 / レート制限**: 自動でリトライ（指数バックオフ）します。バッチで大量に生成する場合は間隔を空けて実行してください。
