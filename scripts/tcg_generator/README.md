# TCG Generator

Gemini API と Pillow を使い、1枚ずつ（またはCSVで複数枚）TCG風カード画像を生成する Python CLI ツールです。

**開発時の調整（テキスト位置・色、カード・イラストのサイズ・レイアウトなど）:** [docs/DEVELOPMENT_MANUAL.md](docs/DEVELOPMENT_MANUAL.md) を参照してください。

## 必要な環境

- Python 3.10 以上
- Gemini API キー（次のいずれかで設定）
  - **推奨:** `scripts/tcg_generator/.env` に `GEMINI_API_KEY=あなたのキー` を1行で記載（`.env.example` をコピーして編集）
  - または環境変数: PowerShell では `$env:GEMINI_API_KEY = "あなたのキー"`（`set` は cmd 用で PowerShell では効きません）

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

- **カード枠**: `assets/frames/` にレアリティ別の枠 PNG を置きます。**現状は UR のみカスタム枠が有効**（`src/core/config.py` の `CUSTOM_FRAME_RARITIES` で制御）です。UR の場合は `UR.png` を置くとその枠が使われ、それ以外のレアリティ（C, U, R, RR, SR）は単色枠が自動生成されます。微調整後に SR などを有効にする場合は、`CUSTOM_FRAME_RARITIES` に `"SR"` などを追加し、対応する `SR.png` などを `assets/frames/` に配置してください。
- **スタイル参照**: `assets/styles/style_ref.png` を用意すると、Gemini の画風がこの画像に近づきます。なくてもプロンプトのみで生成されます。`--style-ref` で別ファイルも指定可能です。
- **フォント**: `assets/fonts/` に `.ttf` または `.otf` の日本語フォントを1本以上置くと、タイトル・説明に使われます。本リポジトリでは **Noto Sans JP**（Google Fonts、OFL）を `scripts/download_font.py` で取得して `assets/fonts/NotoSansJP-Regular.ttf` に配置しています。未配置の場合は `python scripts/download_font.py` で取得できます。フォントがない場合は Pillow のデフォルトフォントになり、日本語が正しく表示されません。
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

- **「GEMINI_API_KEY が設定されていません」**: `scripts/tcg_generator/.env` に `GEMINI_API_KEY=あなたのキー` を書くか、PowerShell で `$env:GEMINI_API_KEY = "あなたのキー"` を実行してから同じウィンドウで `python main.py` を実行してください。
- **スタイル参照**: 未配置でもプロンプトのみで生成されます。画風を統一したい場合は `assets/styles/style_ref.png` を用意するか、`--style-ref` でパスを指定してください。
- **「フォントが見つかりません」**: 日本語フォントを `assets/fonts/` に置くか、そのまま実行するとデフォルトフォントで描画されます（日本語は表示が崩れる場合があります）。
- **429 / レート制限**: 自動でリトライ（指数バックオフ）します。バッチで大量に生成する場合は間隔を空けて実行してください。
