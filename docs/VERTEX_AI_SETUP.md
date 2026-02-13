# Vertex AI 連携セットアップ（Phase H2）

Cloud Functions（第2世代）から Vertex AI（Gemini）を呼び出すための、Google Cloud 側の準備手順です。

## H2-1: Vertex AI API の有効化と IAM

### 1. Vertex AI API を有効化する

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

- プロジェクト ID は `gcloud config get-value project` で確認できます。
- 初回は有効化に数分かかることがあります。

### 2. Cloud Functions 用のサービスアカウントに Vertex AI 権限を付与する

Cloud Functions（第2世代）は、デフォルトで **Compute Engine のデフォルトサービスアカウント**（`PROJECT_NUMBER-compute@developer.gserviceaccount.com`）を使用します。このアカウントに **Vertex AI User** を付与します。

```bash
# プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Vertex AI User ロールを付与
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"
```

- デプロイ時に別のサービスアカウントを指定している場合は、そのアカウントに上記ロールを付与してください。
- プロジェクト番号の確認: [Google Cloud Console](https://console.cloud.google.com/) → ホーム → プロジェクト情報。

### 3. リージョン

Vertex AI はリージョンごとに利用可能です。Cloud Functions を **asia-northeast1（東京）** にデプロイする場合、Vertex AI も同じリージョン（`us-central1` なども利用可能）を指定して呼び出します。本プロジェクトの関数では **asia-northeast1** をデフォルトで使用します。

---

## H2-2 / H2-3: Cloud Functions のデプロイ

### 前提

- Python 3.11 推奨（ローカルでテストする場合）。
- プロジェクトルートの `functions/` ディレクトリにソースがあります。

### デプロイコマンド

```bash
# プロジェクトルートで実行（GOOGLE_CLOUD_PROJECT は gcloud のデフォルトプロジェクトが使われます）
gcloud functions deploy campusclub-vertex-ai \
  --gen2 \
  --runtime=python311 \
  --region=asia-northeast1 \
  --source=./functions \
  --entry-point=handle_request \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project),GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_VERTEXAI=True"
```

- **GOOGLE_CLOUD_LOCATION=global**: グローバルエンドポイントを使用し、`gemini-2.0-flash-001` の 404 を避けます。リージョン指定（例: asia-northeast1）にするとモデルが未提供で 404 になる場合があります。
- **allow-unauthenticated**: フロント（Cloud Run）から未認証で呼び出す場合に必要。本番で認証をかけたい場合は IAM や Firebase Auth 等で制御してください。
- デプロイ後、トリガー URL が表示されます。例（本プロジェクト）: `https://asia-northeast1-campusclub-dashboard.cloudfunctions.net/campusclub-vertex-ai`

### 環境変数（Vue アプリ側）

ビルド時に Cloud Functions の URL を渡します（`DEPLOY_CLOUD_RUN.md` と同様に `--substitutions` で渡す想定）。

| 変数名 | 役割 |
|--------|------|
| `VITE_VERTEX_AI_FUNCTION_URL` | Cloud Functions の HTTP トリガー URL（末尾のスラッシュなし） |

例（Cloud Build で渡す場合）:

```bash
gcloud builds submit --config=cloudbuild.yaml . \
  --substitutions=_VITE_SUPABASE_URL="...",_VITE_SUPABASE_ANON_KEY="...",_VITE_VERTEX_AI_FUNCTION_URL="https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/campusclub-vertex-ai"
```

`cloudbuild.yaml` にはすでに `_VITE_VERTEX_AI_FUNCTION_URL` の substitution と build-arg が含まれています。未指定の場合は空でビルドされ、フロントでは「AIで文生成」セクションは表示されません。

### デモ可能な状態にするには

1. **Cloud Functions がデプロイ済みであること**  
   上記「H2-2 / H2-3」の手順で `campusclub-vertex-ai` をデプロイし、トリガー URL を控えておく。
2. **Cloud Run を `_VITE_VERTEX_AI_FUNCTION_URL` を渡して再ビルド・デプロイする**  
   手順とコマンド例は [DEPLOY_CLOUD_RUN.md](DEPLOY_CLOUD_RUN.md) の「Vertex AI（デモ用）を有効にする場合」を参照。
3. **確認手順**  
   デプロイ後の Cloud Run URL にアクセス → ログイン（管理者）→ 生徒一覧 → いずれかの生徒の詳細 → カード生成フォームに「✨ AIで文生成（Vertex AI）」が表示されること。「AIで文を生成」を押すとタイトル・コメントが入力欄に反映されること。

---

## 動作確認

1. **カード用テキスト生成（card_text）**  
   - フロントの「AIで文生成」ボタンで、タイトル・コメント・褒め言葉が入力欄に反映されること。
2. **プロンプト最適化（prompt_optimize）**  
   - 画像生成フローで Vertex 経由を使う場合、英語プロンプトが返り画像生成に使われること。

API を直接叩く例（card_text）:

```bash
curl -X POST "https://YOUR_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"card_text","activityType":"typing","context":"WPM 30 を達成"}'
```

期待される応答例:

```json
{
  "title": "スピードマスター",
  "description": "今回は WPM 30 を達成！ 前回よりぐんと速くなっていて、すごい成長だね。",
  "praiseWords": "めっちゃ速い！ この調子でまた練習しよう。"
}
```

---

## トラブルシューティング（500 エラーが出る場合）

「AIで文を生成」押下時に **500 Internal Server Error** が出る場合は、次の順で原因を切り分けてください。

### 1. レスポンス body の `error` を確認する

ブラウザの開発者ツールで **Network** タブを開き、失敗した `campusclub-vertex-ai` へのリクエストを選択します。**Response** に JSON で `{"error": "..."}` が返っています。このメッセージで原因が判別できます。

- **"Vertex AI client init failed: ..."** → クライアント初期化の失敗。多くはプロジェクト ID 未設定または Vertex AI 認証まわり（下記 2・3 を確認）。
- **"Vertex AI generate_content failed: ..."** → Vertex AI の呼び出し失敗。API 未有効・IAM 不足・モデル名/リージョン不備の可能性（下記 2・3 を確認）。
- **"Project ID not set. ..."** → 環境変数 `GOOGLE_CLOUD_PROJECT` または `GCLOUD_PROJECT` が未設定。デプロイ時に `--set-env-vars` で渡しているか確認（H2-2 / H2-3 のデプロイコマンド参照）。

### 2. Cloud Logging で関数ログを確認する

1. [Google Cloud Console](https://console.cloud.google.com/) → **ロギング** → **ログエクスプローラー**
2. リソースで **Cloud Functions** を選び、関数名に `campusclub-vertex-ai` を指定
3. エラー発生時刻前後のログを確認。関数内で `logging.exception` によりスタックトレースが出力されています。「Vertex AI client init failed」または「Vertex AI generate_content failed」の直後の例外内容で詳細が分かります。

### 3. curl で API を直接叩いて確認する

トリガー URL を実際の URL に置き換えて実行します。

```bash
# ステータスコードのみ
curl -s -o /dev/null -w "%{http_code}" -X POST "https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/campusclub-vertex-ai" \
  -H "Content-Type: application/json" \
  -d '{"action":"card_text","activityType":"typing","context":"WPM 30"}'

# レスポンス body を表示（500 のときは error メッセージが返る）
curl -s -X POST "https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/campusclub-vertex-ai" \
  -H "Content-Type: application/json" \
  -d '{"action":"card_text","activityType":"typing","context":""}'
```

200 と JSON（title, description, praiseWords）が返れば関数と Vertex AI の連携は正常です。500 のときは body の `error` を読んで上記 1 と照らし合わせてください。

### 4. IAM と API の再確認

- **Vertex AI API が有効か**: `gcloud services list --enabled` に `aiplatform.googleapis.com` が含まれること。未なら `gcloud services enable aiplatform.googleapis.com` を実行。
- **サービスアカウントに Vertex AI User があるか**: H2-1 の「2. Cloud Functions 用のサービスアカウントに Vertex AI 権限を付与する」を実行済みか確認。別のサービスアカウントでデプロイしている場合は、そのアカウントに `roles/aiplatform.user` を付与する。
- **環境変数がデプロイ時に渡っているか**: `--set-env-vars "GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=asia-northeast1,GOOGLE_GENAI_USE_VERTEXAI=True"` がデプロイコマンドに含まれていること。Cloud Console の Cloud Functions → 関数選択 → 「変数とシークレット」で値も確認できます。
