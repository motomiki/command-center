# ハッカソン審査員向け：提出ドキュメント

本ドキュメントは、Google Cloud ハッカソン審査用のエントリーポイントです。**採用ツールの充足**と**デプロイ・デモの再現手順**をまとめています。

---

## 1. 採用ツール一覧

本作品は、ハッカソン要件「アプリケーション実行プロダクト 1 以上」「Google Cloud AI 技術 1 以上」を次の構成で満たしています。

### 必須1: Google Cloud アプリケーション実行プロダクト

| 採用ツール | 役割 | 対応状況 |
|------------|------|----------|
| **Cloud Run** | Vue.js フロントエンドのホスティング。Docker コンテナ化（マルチステージビルド + Nginx）でデプロイ。 | **完了**（Dockerfile / cloudbuild.yaml でデプロイ済み。本番 URL で公開可能） |
| **Cloud Functions（第2世代）** | Vertex AI（Gemini）呼び出しのバックエンド。API キーをクライアントに露出させない。 | **完了**（HTTP トリガーで card_text / prompt_optimize を提供） |

### 必須2: Google Cloud AI 技術

| 採用ツール | 役割 | 対応状況 |
|------------|------|----------|
| **Vertex AI (Gemini)** | カード用テキスト生成（タイトル・フレーバーテキスト・褒め言葉）。プロンプト最適化。Vertex AI 経由で利用。 | **デモ可能**（Cloud Functions 経由でフロントの「AIで文生成」から利用可能） |

### その他（任意・既存スタック）

| 技術 | 役割 |
|------|------|
| **Supabase** | 認証 (Auth)、PostgreSQL（profiles / cards / minecraft_works）、Storage（画像・.glb） |
| **@google/model-viewer** | Minecraft 3D モデル表示（Google 技術としてアピール可能） |

---

## 2. 審査員向け デプロイ手順

手順の詳細は各リンク先を参照してください。ここでは再現に必要な流れのみ要約します。

### 前提

- Google Cloud プロジェクトが作成済みであること
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) がインストール・ログイン済みであること
- 有効化する API: **Cloud Build API** / **Cloud Run Admin API**（必須1 のみの場合）。デモで AI を使う場合は **Vertex AI API** も有効化

### 必須1 の確認（Cloud Run）

1. プロジェクトルートで [DEPLOY_CLOUD_RUN.md](DEPLOY_CLOUD_RUN.md) の「デプロイ実行」に従い、次を実行する。
   - Supabase を使う場合（本番・デモ推奨）: `gcloud builds submit --config=cloudbuild.yaml . --substitutions=_VITE_SUPABASE_URL="https://...",_VITE_SUPABASE_ANON_KEY="..."`
   - Supabase なしでビルドする場合: `gcloud builds submit --config=cloudbuild.yaml .`
2. デプロイ後に表示される **Cloud Run のサービス URL** にアクセスし、アプリのログイン画面が表示されることを確認する。
3. **403 Forbidden** が表示される場合は、[DEPLOY_CLOUD_RUN.md の「403 Forbidden が表示される場合」](DEPLOY_CLOUD_RUN.md#403-forbidden-が表示される場合) に記載の IAM 付与コマンドを 1 回実行する。

**PowerShell 利用時:** プロジェクトルートで `.\scripts\deploy-cloudrun.ps1` を実行すると、`.env` を読みながらデプロイできます。詳細は [DEPLOY_CLOUD_RUN.md](DEPLOY_CLOUD_RUN.md) を参照してください。

### 必須2 の確認（Vertex AI デモ）

1. [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) の **H2-1**（Vertex AI API 有効化・サービスアカウントへ Vertex AI User 付与）を実行する。
2. 同ドキュメントの **H2-2 / H2-3** に従い、Cloud Functions（第2世代）`campusclub-vertex-ai` をデプロイし、表示された **トリガー URL** を控える。
3. Cloud Run を「Vertex AI あり」で再デプロイする。[DEPLOY_CLOUD_RUN.md の「Vertex AI（デモ用）を有効にする場合」](DEPLOY_CLOUD_RUN.md#vertex-aiデモ用を有効にする場合) のとおり、`_VITE_VERTEX_AI_FUNCTION_URL` を `--substitutions` に含めてビルドする。

---

## 3. 審査員向け デモ手順

審査員が「必須要件を満たしている」ことを確認するためのチェックリストです。詳細な動作確認は [VERTEX_AI_SETUP.md の「デモ可能な状態にするには」「動作確認」](VERTEX_AI_SETUP.md#デモ可能な状態にするには) を参照してください。

### チェックリスト

1. **Cloud Run でアプリが動いていること**
   - Cloud Run のサービス URL を開く。
   - ログイン画面が表示されることを確認する。

2. **Vertex AI（Gemini）が動いていること**
   - 管理者アカウントでログインする。
   - 生徒一覧からいずれかの生徒の詳細画面を開く。
   - **「カード生成」タブ** に **「✨ AIで文生成（Vertex AI）」** のセクションが表示されることを確認する。
   - 「AIで文を生成」ボタンを押し、タイトル・コメント（褒め言葉）が入力欄に反映されることを確認する。

上記が満たされていれば、必須1（Cloud Run / Cloud Functions）と必須2（Vertex AI）の両方を本番構成で利用している状態です。

---

## 4. コード公開前の確認（リポジトリ公開時）

- **`.env`** はコミットしない（`.gitignore` 済み）。`.env.example` のみ公開し、審査員は各自で `.env` を作成する。
- **Unused/** は開発用・サンプル退避用のため `.gitignore` に含まれており、公開リポジトリには含めない。過去にコミット済みの場合は、プロジェクトルートで次を実行してからコミットする:  
  `git rm -r --cached Unused`
- **dist/** はビルド成果物のため `.gitignore` 済み。Cloud Build がコンテナ内で再ビルドする。
- ビルド確認: `npm run build` で成功すること。Lint は `npx eslint . --ext .vue,.js,.jsx,.ts,.tsx --fix --ignore-path .gitignore` で実行可能。

---

## 5. 参照リンク

- **プロジェクトの要件・データ構造:** [plans.md](../plans.md)
- **開発ガイドライン（AI Agent 向け）:** [AGENTS.md](../AGENTS.md)
- **ハッカソン実施計画・アーキテクチャ:** [HACKATHON_PLANS.md](HACKATHON_PLANS.md)
- **Cloud Run デプロイ詳細・403 対処・環境変数:** [DEPLOY_CLOUD_RUN.md](DEPLOY_CLOUD_RUN.md)
- **Vertex AI 有効化・Cloud Functions デプロイ・動作確認:** [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md)
