# Supabase セットアップガイド

このガイドでは、放課後キャンパスクラブ ダッシュボードのバックエンド（Supabase）を
ゼロからセットアップする手順を説明します。

所要時間: 約 15〜20 分

---

## 前提

- Node.js がインストール済みであること
- `npm install` が完了していること
- ブラウザから [Supabase ダッシュボード](https://supabase.com/dashboard) にアクセスできること

---

## 手順の全体像

```
Step 1: Supabase プロジェクトの作成
Step 2: .env ファイルの設定
Step 3: テーブルの作成（schema.sql）
Step 4: Storage バケットの作成（storage.sql）
Step 5: テストデータの投入（seeds.sql）
Step 6: 接続確認（管理画面のテストページ）
Step 7: (任意) 開発用 RLS 緩和（dev_helper.sql）
```

---

## Step 1: Supabase プロジェクトの作成

1. [https://supabase.com](https://supabase.com) にアクセスし、アカウントを作成またはログイン
2. ダッシュボードで **「New Project」** をクリック
3. 以下を入力:
   - **Name**: `campusclub-dashboard`（任意）
   - **Database Password**: 安全なパスワードを設定し、控えておく
   - **Region**: `Northeast Asia (Tokyo)` を推奨
4. 「Create new project」をクリックし、プロジェクトが起動するまで待つ（1〜2 分）

---

## Step 2: .env ファイルの設定

### API キーの取得

1. Supabase ダッシュボードで作成したプロジェクトを開く
2. 左メニュー **Settings** > **API** に移動
3. 以下の値をコピー:
   - **Project URL** (例: `https://abcdefgh.supabase.co`)
   - **anon public** キー (例: `eyJhbGciOi...`)

### .env の作成

プロジェクトルートに `.env` ファイルを作成します。

```bash
# .env.example をコピーして .env を作成
cp .env.example .env
```

`.env` を開き、取得した値を記入します:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...（長い文字列）
```

> **注意**: `.env` は `.gitignore` に含まれており、Git にはコミットされません。
> キーが外部に漏れないよう注意してください。

---

## Step 3: テーブルの作成

1. Supabase ダッシュボードで **SQL Editor** を開く
2. 「New query」をクリック
3. `supabase/schema.sql` の内容を **全てコピーして貼り付け**
4. 「Run」をクリック

作成されるもの:
- `profiles` テーブル（教師・生徒のプロフィール）
- `cards` テーブル（カード / ガチャ結果）
- `minecraft_works` テーブル（Minecraft 作品）
- Row Level Security (RLS) ポリシー

> **補足**: このスクリプトは冪等（何度実行しても安全）です。
> エラーが出た場合はもう一度実行しても問題ありません。

---

## Step 4: Storage バケットの作成

### 4a. バケットをダッシュボードで作成

1. Supabase ダッシュボードの左メニューで **Storage** をクリック
2. **「New bucket」** をクリック
3. 以下を設定して **「Create bucket」** をクリック
   - **Name**: `assets`（そのまま入力）
   - **Public bucket**: **オン**（チェックを入れる）
   - （任意）**File size limit**: 50 MB、**Allowed MIME types**: 画像と `model/gltf-binary` など

### 4b. ポリシーを SQL で適用

1. **SQL Editor** で「New query」をクリック
2. `supabase/storage.sql` の内容を **全てコピーして貼り付け**
3. 「Run」をクリック

これで `assets` バケットへの読み取り（全員）・書き込み（教師のみ）のポリシーが設定されます。再度「包括診断」を実行すると Storage チェックが通ります。

---

## Step 5: テストデータの投入

1. SQL Editor で「New query」をクリック
2. `supabase/seeds.sql` の内容を **全てコピーして貼り付け**
3. 「Run」をクリック

> **`typing_history` がないというエラーが出る場合**: `profiles` が以前のスキーマで作られていると、`seeds.sql` の INSERT で失敗します。そのときは先に **Step 3 の `schema.sql` をあらためて実行**してください。`schema.sql` に「既存テーブルに typing_history を追加する」処理が含まれているため、再実行後に `seeds.sql` が通ります。

投入されるデータ:
- 教師アカウント: 1 名
- 生徒アカウント: 5 名（田中太郎, 佐藤花子, 鈴木一郎, 高橋美咲, ゆうき）
- タイピング履歴: 各生徒 7 件
- Minecraft 作品: 全 11 件

### テスト用ログイン情報

| ロール | メールアドレス | パスワード |
|--------|----------------|------------|
| 教師 | teacher@example.com | teacher-dev-password-2026 |
| 生徒 | student-1@example.com | student-dev-password |
| 生徒 | student-2@example.com | student-dev-password |
| 生徒 | student-3@example.com | student-dev-password |
| 生徒 | student-4@example.com | student-dev-password |
| 生徒 | student-5@example.com | student-dev-password |

> **注意**: これらは開発用のダミーアカウントです。本番環境では使用しないでください。

---

## Step 6: 接続確認

1. 開発サーバーを起動: `npm run dev`
2. ブラウザで `http://localhost:5173/admin/supabase-test` にアクセス
3. **「包括診断」** ボタンをクリック
4. 全項目が ✅ になれば、セットアップは完了です

### チェック項目

| テスト | 内容 |
|--------|------|
| データベース接続 | Supabase API への疎通 |
| profiles テーブル | テーブルの存在と行数 |
| cards テーブル | テーブルの存在と行数 |
| minecraft_works テーブル | テーブルの存在と行数 |
| Storage バケット (assets) | バケットの存在と Public 設定 |

---

## Step 7: (任意) 開発用 RLS 緩和

> **この手順は認証（Auth UI）が未実装の段階でのみ必要です。**

現在の RLS ポリシーは「教師ロールで認証済みのユーザーのみ書き込み可能」です。
認証画面がまだないため、管理画面からデータを保存しようとすると RLS エラーになります。

開発中に管理画面の保存機能をテストするには:

1. SQL Editor で `supabase/dev_helper.sql` の **「A. RLS を緩和する」** セクションを実行
2. 管理画面でデータ保存をテスト
3. テスト完了後、**必ず**「B. RLS を元に戻す」セクションのコメントを外して実行

> **警告**: RLS 緩和状態は本番環境では絶対に使用しないでください。

---

## トラブルシューティング

### 「環境変数が未設定です」と表示される

- `.env` ファイルがプロジェクトルートに存在するか確認
- `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` のキー名にタイプミスがないか確認
- 開発サーバーを再起動（`.env` の変更は再起動が必要）

### 「接続エラー」「Failed to fetch」

- インターネット接続を確認
- `VITE_SUPABASE_URL` が `https://xxx.supabase.co` の形式か確認
- Supabase プロジェクトがアクティブ（Paused でない）か確認

### テーブルが見つからない

- `supabase/schema.sql` を SQL Editor で実行したか確認
- SQL の実行結果にエラーがないか確認

### Storage バケット（assets）が見つからない

- **バケットは SQL では作成できません。** 必ず **Step 4a** のとおり、ダッシュボードの **Storage → New bucket** で `assets` を作成してください（Public をオンにすること）。
- 作成後、Step 4b で `supabase/storage.sql` を実行し、ポリシーを適用してください。
- 保存してから「包括診断」を再実行すると反映されます。

**補足**: ダッシュボードでは「assets」が存在するのに診断だけ「見つかりません」と出る場合、**anon キーで `listBuckets()` を呼ぶと RLS により一覧が空で返る** Supabase の仕様が原因です。診断では「assets バケット内の list」で存在確認するようにしているため、バケット作成とポリシー適用後は合格になります。

### 保存時に RLS エラー

- 認証が未実装の場合は Step 7 を参照
- 認証実装済みの場合は、教師アカウントでログインしているか確認

### `column "typing_history" of relation "profiles" does not exist`

- `profiles` テーブルが、`typing_history` カラムが追加される前のスキーマで作成されている状態です。
- **対処**: SQL Editor で **`supabase/schema.sql` を再度すべて実行**してください。`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typing_history ...` により、既存の `profiles` にカラムが追加されます。
- その後、Step 5 の `seeds.sql` を再実行してください。

---

## ファイル一覧

| ファイル | 用途 |
|----------|------|
| `supabase/schema.sql` | テーブル定義 + RLS ポリシー |
| `supabase/storage.sql` | Storage ポリシー（バケットはダッシュボードで作成） |
| `supabase/seeds.sql` | 開発用テストデータ |
| `supabase/dev_helper.sql` | 開発用 RLS 緩和（任意） |
| `.env.example` | 環境変数のテンプレート |
| `docs/HANDOVER.md` | 引き継ぎ書 |
| `docs/SUPABASE_MIGRATION_PLAN.md` | 移行計画書 |
