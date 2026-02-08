# TCG Generator 開発マニュアル

カード画像のテキスト表示・レイアウト・生成画像のサイズ・形式を調整する際の参照用です。

---

## 1. テキストの表示を調整する

### 1.1 描画位置（座標）

**ファイル:** `src/services/image_service.py`

| 定数 | 行付近 | 意味 | 例（ピクセル） |
|------|--------|------|----------------|
| `TITLE_POSITION` | 33–34 | タイトル（カード名）の左上座標 (x, y) | `(190, 635)` |
| `DESC_POSITION` | 34–35 | 説明文の左上座標 (x, y) | `(130, 718)` |

- カード全体は **600 × 840 px**。x は 0〜600、y は 0〜840 の範囲で指定する。
- 枠デザイン（UR など）の「タイトルバー」「説明エリア」に合わせて変更する。

### 1.2 文字色

**ファイル:** `src/services/image_service.py`

| 定数 | 意味 | 値の例（RGB） |
|------|------|----------------|
| `TEXT_FILL` | タイトルの色 | `(255, 255, 255)` 白 |
| `DESC_TEXT_FILL` | 説明文の色 | `(0, 0, 0)` 黒（背景とのコントラスト用） |
| `TEXT_STROKE_FILL` | 縁取り色（未使用時も定義あり） | `(0, 0, 0)` |

- 背景が明るい場合は黒系、暗い場合は白系にすると読みやすい。

### 1.3 フロント（SsrCard.vue）との座標同期

**生成画像（Python）とダッシュボード表示（Vue）で同じ枠を使う場合、座標を揃える必要があります。**

| 役割 | ファイル | 内容 |
|------|----------|------|
| 生成側 | `scripts/tcg_generator/src/services/image_service.py` | `TITLE_POSITION`, `DESC_POSITION`（33–35 行付近）で PNG 上のテキスト位置をピクセル指定 |
| 表示側 | `src/components/SsrCard.vue` | RR/SR/UR のカスタムフレーム表示時、`.ur-title` / `.ur-desc` でタイトル・説明文の位置を **CSS 百分率** で指定 |

- キャンバスは **600 × 840 px** のため、`image_service.py` の座標を百分率に変換して SsrCard.vue に反映する。
  - **top:** `y / 840`（例: 635 → `75.595%`）
  - **left:** `x / 600`（例: 190 → `31.667%`）
- **TITLE_POSITION** や **DESC_POSITION** を変更したら、SsrCard.vue の `<style scoped>` 内のコメント「image_service.py の座標を CSS 百分率に変換」付近の `.ur-title` / `.ur-desc` の `top`・`left` およびコメントの数値を同じ座標に合わせて更新すること。そうしないと、生成されたカード画像とアプリ上での表示位置がずれる。

### 1.4 フォントサイズ・折り返し幅・行間

**ファイル:** `src/core/config.py`

| 定数 | 行付近 | 意味 | 既定値 |
|------|--------|------|--------|
| `TITLE_FONT_SIZE` | 53 | タイトルのフォントサイズ（px） | `36` |
| `DESC_FONT_SIZE` | 54 | 説明文のフォントサイズ（px） | `22` |
| `TITLE_MAX_WIDTH` | 55 | タイトルの折り返し幅（px） | `520` |
| `DESC_MAX_WIDTH` | 56 | 説明文の折り返し幅（px） | `520` |
| `LINE_SPACING` | 57 | 行間（px） | `6` |

- 長いタイトル・説明はここで指定した幅で自動折り返しされる。

### 1.5 フォントファイル

**ファイル:** `src/core/config.py`（デフォルト名）、`src/services/image_service.py`（`_get_fonts` で利用）

| 項目 | 場所 | 内容 |
|------|------|------|
| デフォルトフォント名 | config: `DEFAULT_TITLE_FONT`, `DEFAULT_DESC_FONT` | 例: `NotoSansJP-Regular.ttf` |
| フォントの置き場所 | `assets/fonts/` | `.ttf` または `.otf` を 1 本以上配置 |
| 取得ロジック | config: `get_font_path()` | 名前未指定時はフォルダ内の最初の ttf/otf を使用 |

- 日本語表示には `assets/fonts/` に日本語対応フォントが必要。未配置時は Pillow のデフォルトフォントになり、日本語が正しく出ない場合がある。

---

## 2. 生成された画像のサイズ・形式・レイアウトを調整する

### 2.1 カード全体のサイズ

**ファイル:** `src/core/config.py`

| 定数 | 行付近 | 意味 | 既定値（px） |
|------|--------|------|--------------|
| `CARD_WIDTH` | 46 | カード画像の幅 | `600` |
| `CARD_HEIGHT` | 47 | カード画像の高さ | `840` |

- 枠画像（`assets/frames/*.png`）もこのサイズに揃える（別サイズの場合は合成時に LANCZOS でリサイズされる）。

### 2.2 イラスト領域（アート窓）のサイズと位置

**ファイル:** `src/core/config.py`

| 定数 | 行付近 | 意味 | 既定値（px） |
|------|--------|------|--------------|
| `ART_WINDOW_WIDTH` | 48 | イラストを貼り付ける領域の幅 | `520` |
| `ART_WINDOW_HEIGHT` | 49 | イラストを貼り付ける領域の高さ | `680` |
| `ART_WINDOW_OFFSET_X` | 50 | イラスト領域の左端の x 座標 | `40` |
| `ART_WINDOW_OFFSET_Y` | 51 | イラスト領域の上端の y 座標 | `70` |

- 合成の流れ（`image_service.py` の `composite_card`）:
  1. AI 生成画像を `ART_WINDOW_WIDTH × ART_WINDOW_HEIGHT` にリサイズ（LANCZOS）
  2. キャンバスに `(ART_WINDOW_OFFSET_X, ART_WINDOW_OFFSET_Y)` で貼り付け
  3. その上に枠画像を `alpha_composite` で重ねる
- 枠の「透過窓」の位置・大きさに合わせて上記 4 定数を変更する。

### 2.3 枠画像（フレーム）の仕様

| 項目 | 内容 |
|------|------|
| 置き場所 | `assets/frames/` |
| ファイル名 | レアリティごとに `C.png`, `U.png`, `R.png`, `RR.png`, `SR.png`, `UR.png` |
| 推奨サイズ | `CARD_WIDTH × CARD_HEIGHT`（600 × 840 px） |
| 形式 | PNG（RGBA、透過可） |
| 有効にするレア | `src/core/config.py` の `CUSTOM_FRAME_RARITIES`（例: `frozenset({"UR"})`）に含まれるレアのみファイルを参照 |

- イラストが見える部分は枠画像を透過にし、装飾部分は不透明にする。
- 枠画像が存在しないレアは、単色のフォールバック枠が自動生成される。

### 2.4 AI 生成画像のアスペクト比（Gemini 側）

**ファイル:** `src/services/ai_service.py`

| 項目 | 場所 | 既定値 |
|------|------|--------|
| アスペクト比 | `GenerateContentConfig` の `image_config=types.ImageConfig(aspect_ratio="3:4")` | `3:4` |

- 生成後、合成時に `ART_WINDOW_*` にリサイズされるため、カード上の見た目は 2.2 のレイアウトで決まる。
- 生成解像度や形式を変えたい場合は、`ai_service.py` の `image_config` およびレスポンスの `inline_data` の扱いを参照する。

### 2.5 出力画像の形式

- 合成結果は **PNG** で保存される（`image_service.py` の `canvas.save(output_path)`）。
- 形式を変更する場合は `composite_card` 内の保存処理および拡張子・MIME の扱いを変更する。

---

## 3. 設定の流れ（参照順）

1. **config.py** … カードサイズ、アート窓、フォントサイズ・折り返し幅・行間、枠の有効レア、API モデル名など
2. **image_service.py** … テキストの座標・色、合成順（イラスト → 枠 → オーバーレイ → テキスト）、フォント取得
3. **ai_service.py** … 生成画像のアスペクト比、プロンプト、スタイル参照の有無

---

## 4. よく使う変更例

- **タイトルを少し下へ:** `image_service.py` の `TITLE_POSITION` の y を大きくする（例: `652` → `660`）。
- **説明文を金色バーの内側に:** `DESC_POSITION` の (x, y) を枠のプレビューを見ながら調整。
- **イラストをもう少し大きく:** `config.py` の `ART_WINDOW_WIDTH` / `ART_WINDOW_HEIGHT` を大きくし、`ART_WINDOW_OFFSET_*` で位置を微調整（枠の透過窓と一致させる）。
- **SR でもカスタム枠を使う:** `config.py` の `CUSTOM_FRAME_RARITIES` に `"SR"` を追加し、`assets/frames/SR.png` を用意する。

---

## 5. 関連ファイル一覧

| ファイル | 役割 |
|----------|------|
| `src/core/config.py` | カード・アート窓サイズ、オフセット、フォントサイズ・折り返し幅・行間、枠の有効レア、API モデル |
| `src/services/image_service.py` | テキスト座標・色、合成手順、フォント読み込み、枠・オーバーレイの適用 |
| `src/services/ai_service.py` | 画像生成のプロンプト、アスペクト比、スタイル参照の有無 |
| `src/utils/text_layout.py` | 日本語の折り返し・禁則（`wrap_text_ja`, `draw_text_wrapped_ja`） |
| `assets/fonts/` | 日本語フォント（.ttf / .otf） |
| `assets/frames/` | レアリティ別枠 PNG |
| `assets/overlays/` | 光沢オーバーレイ（例: `holo.png`） |
| **プロジェクトルート** `src/components/SsrCard.vue` | ダッシュボード上のカード表示。RR/SR/UR 枠表示時、`image_service.py` の TITLE_POSITION / DESC_POSITION と CSS 百分率を同期すること（1.3 参照）。 |
