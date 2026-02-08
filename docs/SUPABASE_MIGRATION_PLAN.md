# Supabase 導入とローカルキャッシュ連携計画書

本ドキュメントは、先生用端末（PC）と生徒用端末（タブレット）間でデータを共有するために Supabase を導入しつつ、**表示速度とUXを最大化するために IndexedDB をローカルキャッシュとして活用する** ハイブリッド・アーキテクチャの計画書です。

## 1. 目的とアーキテクチャ
*   **目的**:
    1.  **データ共有**: 先生が作成したデータを、物理的に離れた生徒のタブレットに届ける。
    2.  **高速表示**: 容量の大きい3Dモデル（.glb）や画像は、毎回クラウドから取得するのではなく、ローカル（IndexedDB）にキャッシュして表示する。
    3.  **オフライン閲覧**: 一度ダウンロードしたデータは、ネットワークが不安定な場所でも閲覧可能にする。

*   **アーキテクチャ概要**: **"Sync & Cache" (同期してキャッシュ)**
    *   **Master Data**: Supabase (PostgreSQL & Storage)
    *   **Local Cache**: IndexedDB (Browser)
    *   **Data Flow**:
        1.  **先生**: PCでデータを入力 → Supabase にアップロード。
        2.  **生徒**: アプリが Supabase をチェック → 新しいデータがあればダウンロード → **IndexedDB に保存**。
        3.  **表示**: 画面描画時は、**常に IndexedDB からデータを読み込む**（高速）。

---

## 2. ユーザー様にご用意いただくもの（事前準備）

実装を開始する前に、以下の準備をお願いいたします。

### A. Supabase プロジェクトの作成
1.  [Supabase](https://supabase.com/) にアクセスし、アカウント作成・ログイン。
2.  「New Project」を作成（Name: `campusclub-dashboard` 等）。
3.  **Database Password** を設定し、安全に保管してください。
4.  Region（リージョン）は **Tokyo (AWS)** を推奨します。

### B. APIキーの取得
Project Settings > API から以下の情報を控えておいてください。
*   `Project URL`
*   `anon public` Key

### C. 認証方針（再確認）
*   **先生**: メールアドレス ＋ パスワードでログイン。
*   **生徒**: 先生が発行したアカウントでログイン（または共有アカウント）。
    *   ※生徒ごとのデータを区別するため、認証機能は必須です。

---

## 3. データベース設計（Schema Design）

### 3.1 テーブル構成（PostgreSQL）

#### `profiles` テーブル
*   `id`: UUID (PK)
*   `role`: 'teacher' | 'student'
*   `display_name`: string
*   `avatar_url`: string
*   `updated_at`: timestamp (同期チェック用)

#### `cards` テーブル
*   `id`: UUID (PK)
*   `student_id`: UUID (FK)
*   `title`: string
*   `description`: text
*   `image_path`: string (Storage Path)
*   `rarity`: string
*   `is_opened`: boolean
*   `metadata`: JSONB
*   `updated_at`: timestamp (同期チェック用)

#### `minecraft_works` テーブル
*   `id`: UUID (PK)
*   `student_id`: UUID (FK)
*   `model_path`: string (Storage Path, .glb)
*   `screenshot_path`: string (Storage Path)
*   `updated_at`: timestamp

### 3.2 ストレージ（Supabase Storage）
*   `assets`: カード画像、3Dモデル、スクショなどを格納。
    *   フォルダ構成例: `/{student_id}/{work_id}/model.glb`

---

## 4. キャッシュ戦略とデータフロー

### A. データの保存（先生側）
1.  フォームに入力されたファイル（.glb, .png）を Supabase Storage にアップロード。
2.  返ってきたパス（Path）を含めて、Supabase Database にレコードを INSERT。

### B. データの同期（生徒側）
アプリ起動時、または定期的に以下のフローを実行します（`SyncService`）。

1.  **差分チェック**:
    *   Supabase の `updated_at` を確認し、ローカル（IndexedDB）にない、または古いデータを特定。
2.  **アセットのダウンロード**:
    *   新しいカードや作品があれば、関連する画像や `.glb` ファイルを Supabase Storage からダウンロード（`Blob` として取得）。
3.  **IndexedDB への保存**:
    *   取得した `Blob` を IndexedDB に保存。
    *   メタデータ（カード情報など）も IndexedDB に保存。
4.  **通知**:
    *   「新しいカードが届きました！」とユーザーに通知。

### C. データの表示（共通）
コンポーネント（`MinecraftViewer.vue` など）は、**Supabase を直接見に行きません**。
*   常に `idb://{id}` のような形式（または専用の取得関数）で、IndexedDB から `Blob URL` を生成して表示します。
*   これにより、既存の表示ロジック（`idb://` スキームの処理）を大きく変えることなく、バックエンドだけを差し替えることが可能です。

---

## 5. 実装ステップ（Step-by-Step）

### Step 1: 環境構築と接続
1.  `npm install @supabase/supabase-js`。
2.  `.env` 設定。
3.  Supabase クライアントの初期化。

### Step 2: データベースとストレージの準備
1.  SQL Editor でテーブル作成。
2.  Storage バケット作成とポリシー設定。

### Step 3: 同期ロジックの実装（核心部分）
*   **`src/services/SyncService.ts` の作成**:
    *   `syncAll()`: 全データの同期を行うメイン関数。
    *   `downloadAndCacheAsset(path)`: Storage からダウンロードして IndexedDB に入れる関数。
*   **`src/repositories/` の整備**:
    *   `CardRepository`: `getAll()` は IndexedDB から返す。`fetchRemote()` は Supabase から取得して IndexedDB を更新する。

### Step 4: 先生側（送信）の実装
*   管理画面のフォーム (`MinecraftDataForm.vue` 等) を修正。
    *   「保存」ボタン押下時 → IndexedDB に保存（自分のプレビュー用） **かつ** Supabase にアップロード（生徒への配信用）。

### Step 5: 生徒側（受信）の実装
*   `StudentHome.vue` や `App.vue` に同期トリガーを設置。
*   ログイン直後や、一定時間ごとに `SyncService.syncAll()` をバックグラウンドで実行。
*   ガチャ演出時、画像がロード済みであることを保証するロジック。

---

## 6. 技術的なポイント

### 既存コードとの親和性
現在、`src/utils/assetStore.ts` や `idb://` という仕組みで IndexedDB を扱っています。この仕組みは **捨てずに活かします**。
*   **変更前**: 手動で登録したデータのみが IndexedDB にある。
*   **変更後**: Supabase から同期されたデータも IndexedDB に入る。
*   **表示側**: どちらから来たデータか気にせず、IndexedDB から読むだけでよい。

### 3Dモデルの扱い
`.glb` ファイルは数MB〜数十MBになることがあります。
*   生徒が一斉にダウンロードすると回線が混雑する可能性があります。
*   **対策**: 初回ログイン時や、授業の冒頭ではなく「待機時間」にバックグラウンドで同期する仕組みを検討します。

---

## 7. 次のアクション

私が実装を進める場合、まずは **「Step 1: 環境構築」** と **「Step 2: データベース定義」** から着手します。
ユーザー様は **Supabase プロジェクトの準備** をお願いいたします。
