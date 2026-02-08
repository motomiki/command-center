# エージェント引き継ぎ書

**作成日**: 2026年2月8日  
**更新日**: 2026年2月8日  
**対象**: 次のエージェント／開発者  
**プロジェクト**: 放課後キャンパスクラブ ダッシュボード（Supabase 導入フェーズ）

---

## 1. 直近セッションで実施した作業

Supabase 移行計画（[SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md)）に基づき、**「次のフェーズ」** として以下を実装済みです。

| 項目 | 内容 | 完了 |
|------|------|:----:|
| **UI → useRepository 移行** | 全 UI コンポーネントから `mockDataHelpers` の直接呼び出しを削除し、`useRepository()` 経由のデータアクセスに統一。 | ✅ |
| **Supabase Storage アップロード** | 管理画面の Minecraft 成果物フォームから、ファイルを Supabase Storage にアップロードする `StorageService` を追加し、`MinecraftDataForm.vue` で利用。 | ✅ |
| **生徒画面の自動同期** | `StudentDashboard.vue` の `onMounted` で `sync()` を実行。同期中インジケータを表示し、失敗時もキャッシュで動作継続。 | ✅ |

---

## 2. 変更・追加したファイル一覧

### 新規作成
- **`src/services/StorageService.ts`** ✅  
  - `uploadAsset()`, `buildAssetPath()`, `resolveAssetForSave()`  
  - Supabase 未設定時は IndexedDB にのみ保存し `idb://` を返すフォールバックあり。
- **`src/lib/supabase.ts`** ✅  
  - シングルトンクライアント、環境変数バリデーション、`getSupabaseDiagnostics()`。
- **`src/utils/seedSupabase.ts`** ✅  
  - `generateSeedSQL()`（SQL Editor 用）、`seedViaApi()`（API シード）、`printSeedSQL()`。
- **`supabase/seeds.sql`** ✅  
  - 開発用シードデータ（auth.users / profiles / minecraft_works）。SQL Editor でそのまま実行可能。冪等。
- **`supabase/storage.sql`** ✅  
  - Storage の RLS ポリシー設定。バケットはダッシュボード（Storage → New bucket）で作成し、その後この SQL でポリシーを適用。
- **`supabase/dev_helper.sql`** ✅  
  - 開発用 RLS 緩和（認証未実装時に管理画面の保存をテストする用）。本番では使用禁止。
- **`docs/SETUP_GUIDE.md`** ✅  
  - Supabase セットアップの手順書（プロジェクト作成〜接続確認・トラブルシューティング）。

### 修正したファイル（抜粋）

**生徒側**
- `src/components/StudentHome.vue` — カード取得を `cards.getByStudentId()` に変更、非同期ロード
- `src/components/StudentDashboard.vue` — 生徒・カードをリポジトリから取得、**自動同期トリガーと同期インジケータを追加**
- `src/components/StudentStats.vue` — カード取得をリポジトリ経由に
- `src/components/CardGallery.vue` — カード取得をリポジトリ経由に
- `src/components/StudentProfile.vue` — 同上

**管理画面**
- `src/components/admin/StudentList.vue` — `students.getAll()`, `cards.getAll()` で一覧取得
- `src/components/admin/StudentDetail.vue` — `students.getById()` / `save()`、未取得時はローディング表示
- `src/components/admin/modals/AddStudentModal.vue` — `students.save(newStudent)`
- `src/components/admin/forms/MinecraftDataForm.vue` — `works.save()` / `cards.save()`、**StorageService でファイルアップロード**
- `src/components/admin/forms/CardGenerationForm.vue` — `cards.save()`
- `src/components/admin/forms/TypingDataForm.vue` — 生徒取得 → `typingHistory` 更新 → `students.save()`

**ユーティリティ**
- `src/utils/studentStats.ts` — `mockDataHelpers` 依存を削除。`calculateMotivation(student, cards)` / `getLatestCards(cards, count)` に変更（引数でデータ注入）。

**スキーマ・型・リポジトリ（Supabase 準備）** ✅
- `src/repositories/interfaces.ts` — `IStudentRepository` / `ICardRepository` / `IMinecraftWorkRepository` のインターフェース定義。
- `src/repositories/mock/index.ts` — Mock リポジトリのエクスポート。
- `src/repositories/supabase/index.ts` — Supabase リポジトリのエクスポート。
- `supabase/schema.sql` — `typing_history` jsonb 含む。`pgcrypto` 拡張追加。冪等化（`create table if not exists`、`drop policy if exists`）。
- `src/types/supabase.ts` — `profiles` の Row/Insert/Update に `typing_history` を追加。
- `src/repositories/supabase/SupabaseStudentRepository.ts` — `save()` で `typing_history` を保存。
- `src/services/SyncService.ts` — `mapProfileToStudent()` で `typing_history` を DB から読み取り。

**管理画面・検証**
- `src/components/admin/SupabaseTestPage.vue` — **包括診断**を追加（DB 接続・3 テーブル・Storage バケット）。エラー時にトラブルシューティングヒントを表示。セットアップ手順リマインダーを表示。

---

## 3. アーキテクチャの要点（次のエージェント向け）

### データフロー
- **表示**: コンポーネントは `useRepository()` の `students` / `cards` / `works` を使う。  
  - Supabase 設定時 → 実体は **LocalCache（IndexedDB）** を読む Supabase リポジトリ。  
  - 未設定時 → **Mock リポジトリ**（内部で `mockDataHelpers` をラップ）。
- **同期**: 生徒画面起動時に `sync()` が Supabase → IndexedDB へ一括同期。表示は常に IndexedDB 前提。
- **保存（先生側）**: フォーム送信時にリポジトリの `save()` を呼ぶ。Supabase 設定時は DB + Storage に書き、LocalCache も更新。

### 重要ファイル
- **`src/composables/useRepository.ts`** — リポジトリの取得と `sync()` の入口。`isSupabaseConfigured` で Mock / Supabase を切り替え。公開 API: `students` / `cards` / `works` / `sync` / `isSyncing` / `lastSyncResult` / `lastSyncTimestamp` / `isSupabase`。
- **`src/services/SyncService.ts`** — `syncAll(onProgress?)`。Supabase から profiles / cards / minecraft_works と Storage アセットを取得し、LocalCache と assetStore に格納。
- **`src/services/LocalCache.ts`** — IndexedDB（idb-keyval）にメタデータを保存。`getLastSyncAt()` で最終同期時刻を取得。
- **`src/utils/assetStore.ts`** — 画像・glb 等の Blob を IndexedDB に保存。`idb://` スキームで参照。`saveAsset()` / `getAsset()` / `assetExists()`。
- **`src/repositories/mock/MockRepositories.ts`** — 唯一 `mockDataHelpers` を直接 import している場所。UI はここを触らない。

### 非同期の扱い
- リポジトリの `getById()` / `getByStudentId()` / `getAll()` はすべて **Promise**。  
- 各コンポーネントでは `ref` + `onMounted`（と必要に応じて `watch`）で取得し、ローディング表示を実装済み。

---

## 4. 未実装・残タスク

### インフラ・設定（ユーザー作業）
手順は **[docs/SETUP_GUIDE.md](./SETUP_GUIDE.md)** にまとめてあります。実行する SQL はすべて `supabase/` に用意済みです。

- [ ] Supabase プロジェクトの作成
- [ ] `.env` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定
- [ ] SQL Editor で **`supabase/schema.sql`** を実行（テーブル + RLS）
- [ ] ダッシュボードの **Storage → New bucket** で `assets` を作成（Public: オン）、続けて SQL Editor で **`supabase/storage.sql`** を実行（ポリシー適用）
- [ ] SQL Editor で **`supabase/seeds.sql`** を実行（開発用テストデータ）
- [ ] 管理画面の **Supabase 接続テスト**（`/admin/supabase-test`）で「包括診断」を実行し、全チェック合格を確認

### 認証（未実装）
- [ ] 計画書では「先生: メール+パスワード」「生徒: 先生発行アカウント」とあるが、**Supabase Auth の画面・フローは未実装**。
- `schema.sql` の RLS は「teacher が insert/update」等、**認証ユーザー前提**。  
  → 認証なしで管理画面から保存すると、RLS で拒否される可能性が高い。  
  → 読み取りは「everyone select」のため、anon のままでも動く可能性あり。  
  → **開発時**: 認証未実装のまま保存を試す場合は、SQL Editor で `supabase/dev_helper.sql` の「A. RLS を緩和する」を実行。テスト後は「B. 元に戻す」を必ず実行。本番では使用禁止。

### 既存の TypeScript エラー（今回の変更外）
- [ ] `src/components/GachaScene.vue` — 未使用変数 `armLen`（66 行目で定義のみ、参照なし）
- [ ] `src/services/CardGeneratorService.ts` — `@google/genai` の `responseModalities` / `inlineData`（`mimeType`・`data`）周りの型がライブラリと合わない可能性

### その他
- [ ] ガチャ演出時に「画像ロード済みであることを保証する」ロジックは未実装（計画書 Step 5 の最後）。
- [ ] 定期的な再同期（一定時間ごとの `sync()`）は未実装。現状は起動時のみ。

---

## 5. 参照ドキュメント

| ファイル | 用途 |
|----------|------|
| [docs/SETUP_GUIDE.md](./SETUP_GUIDE.md) | **Supabase セットアップ手順**（プロジェクト作成〜.env・SQL 実行・接続確認・トラブルシューティング） |
| [docs/SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md) | Supabase 導入の全体方針・スキーマ・ステップ |
| [docs/PRODUCTION_DATA_STRATEGY.md](./PRODUCTION_DATA_STRATEGY.md) | 本番環境のデータ運用（ハイブリッド・クラウド＋IndexedDB） |
| [docs/CLEANUP_PROPOSALS.md](./CLEANUP_PROPOSALS.md) | 開発完了後の整理提案（.gitignore・Unused・ドキュメント更新など） |
| [docs/PROGRESS.md](./PROGRESS.md) | プロジェクト進捗記録（Phase 1〜4 の実装完了項目） |
| [plans.md](../plans.md) | プロジェクト全体の要件・データ構造 |
| [AGENTS.md](../AGENTS.md) | AI エージェント向けガイドライン（Vue/TS/キッズ向けUI） |
| [supabase/schema.sql](../supabase/schema.sql) | テーブル定義と RLS（冪等） |
| [supabase/storage.sql](../supabase/storage.sql) | Storage ポリシー（バケットはダッシュボードで作成） |
| [supabase/seeds.sql](../supabase/seeds.sql) | 開発用シードデータ（教師・生徒・作品） |
| [supabase/dev_helper.sql](../supabase/dev_helper.sql) | 開発用 RLS 緩和（本番禁止） |

---

## 6. 動作確認のポイント

- **Supabase 未設定**（.env なし）  
  - Mock リポジトリが使われ、従来どおり IndexedDB + mockDataHelpers 由来のデータで動作するはず。
- **Supabase 設定後**  
  - 管理画面 **「Supabase 接続テスト」**（`/admin/supabase-test`）で「包括診断」を実行し、DB・3 テーブル・Storage の 5 項目がすべて合格であることを確認。  
  - テーブル・Storage 作成後、生徒画面（`/student/:studentId`）で起動時同期インジケータが出ること。  
  - 管理画面からの保存は、認証実装前は RLS で失敗する可能性あり。その場合は `supabase/dev_helper.sql` で一時緩和するか、認証実装が前提。

### 主なルート

| パス | 説明 |
|------|------|
| `/` | `/student/student-1` にリダイレクト |
| `/student/:studentId` | 生徒ダッシュボード（同期はここで起動） |
| `/admin` | 管理画面トップ（生徒一覧） |
| `/admin/students/:studentId` | 生徒詳細・編集 |
| `/admin/supabase-test` | Supabase 接続テスト・包括診断 |

---

以上を次のエージェントが引き継いで作業しやすいようにまとめた。
