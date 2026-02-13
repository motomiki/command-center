# Cloud Run デプロイ手順（H1-2 / H1-3）

Cloud Build で Docker イメージをビルドし、Cloud Run にデプロイする手順です。ローカルに Docker Desktop は不要です。

**本番 URL（例）:** デプロイ成功後、Cloud Run のサービス URL（例: `https://campusclub-dashboard-xxxxx-an.a.run.app`）でアプリにアクセスできます。確認コマンド: `gcloud run services describe campusclub-dashboard --region=asia-northeast1 --format="value(status.url)"`

## 前提

- Google Cloud プロジェクトが作成済み（例: `campusclub-dashboard`）
- [gcloud CLI がインストール・ログイン済み](https://cloud.google.com/sdk/docs/install)
- 以下 API が有効: **Cloud Build API** / **Cloud Run Admin API**（Container Registry は gcr.io 利用で自動利用）

```bash
gcloud config set project campusclub-dashboard
```

## デプロイ実行

### Supabase を埋め込む場合（本番・デモ用）

Supabase の **Project URL** と **anon key** をビルド時に渡します。Supabase ダッシュボード > Settings > API で確認できます。

```bash
# プロジェクトルートで実行
gcloud builds submit --config=cloudbuild.yaml . \
  --substitutions=_VITE_SUPABASE_URL="https://あなたのプロジェクト.supabase.co",_VITE_SUPABASE_ANON_KEY="eyJ..."
```

- 値にカンマが含まれる場合は `--substitutions` の記法に注意し、必要なら別途 Secret Manager を検討してください。
- 成功すると Cloud Run のサービス URL（例: `https://campusclub-dashboard-xxxxx-an.a.run.app`）が表示されます。

### Vertex AI（デモ用）を有効にする場合

デモで「AIで文生成」を表示するには、Cloud Functions の URL をビルド時に渡します。関数 URL の確認・デプロイ手順は [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) を参照してください。

例（本プロジェクト）: `_VITE_VERTEX_AI_FUNCTION_URL="https://asia-northeast1-campusclub-dashboard.cloudfunctions.net/campusclub-vertex-ai"` を `--substitutions` に含めます。

Supabase と Vertex AI の両方を有効にする場合のコマンド例:

```bash
gcloud builds submit --config=cloudbuild.yaml . \
  --substitutions=_VITE_SUPABASE_URL="https://あなたのプロジェクト.supabase.co",_VITE_SUPABASE_ANON_KEY="eyJ...",_VITE_VERTEX_AI_FUNCTION_URL="https://asia-northeast1-campusclub-dashboard.cloudfunctions.net/campusclub-vertex-ai"
```

**推奨（PowerShell）:** プロジェクトルートの `.env` を読み、確実に正しいディレクトリからデプロイするには `scripts/deploy-cloudrun.ps1` を実行してください。同じフォルダからアップロードされるため、Supabase / Vertex が本番で反映されやすくなります。

```powershell
# プロジェクトルート（campusclub-dashboard）で実行
.\scripts\deploy-cloudrun.ps1
```

### Supabase なしでビルドする場合（モック動作）

```bash
gcloud builds submit --config=cloudbuild.yaml .
```

`_VITE_SUPABASE_URL` / `_VITE_SUPABASE_ANON_KEY` は空のままビルドされ、アプリは Supabase 未接続（モック）で動作します。

## 環境変数（H1-3）の整理

| 変数名 | 役割 | 注入タイミング |
|--------|------|----------------|
| `VITE_SUPABASE_URL` | Supabase の Project URL | **ビルド時**（Cloud Build の `--substitutions`） |
| `VITE_SUPABASE_ANON_KEY` | Supabase の anon key | **ビルド時**（同上） |
| `VITE_VERTEX_AI_FUNCTION_URL` | Cloud Functions（Vertex AI）の HTTP トリガー URL。空のときは「AIで文生成」非表示 | **ビルド時**（同上） |

Vite はこれらをビルド時に `import.meta.env` に埋め込むため、Cloud Run の「実行時」環境変数では変更できません。本番用の値は必ず `gcloud builds submit --substitutions=...` で渡してください。

**本番で「Supabase が設定されていません」やコンソールに `[Supabase] VITE_SUPABASE_URL または VITE_SUPABASE_ANON_KEY が未設定です` と出る場合:** そのリビジョンはビルド時に上記の値が渡っていません。プロジェクトルートから `scripts/deploy-cloudrun.ps1` を実行して再デプロイしてください。

## 403 Forbidden が表示される場合

URL にアクセスすると「Error: Forbidden - Your client does not have permission to get URL / from this server.」と表示される場合、**Cloud Run の IAM で未認証呼び出しが許可されていません**。デプロイ時に `--allow-unauthenticated` を指定していても、IAM ポリシーの更新が失敗していることがあります（Cloud Build のサービスアカウントに IAM 変更権限がない場合など）。

**対処:** プロジェクトオーナーまたは Cloud Run の IAM を変更できるアカウントで、次のコマンドを 1 回実行してください。

```bash
gcloud run services add-iam-policy-binding campusclub-dashboard \
  --region=asia-northeast1 \
  --member=allUsers \
  --role=roles/run.invoker \
  --project=campusclub-dashboard
```

- プロンプトで `Allow unauthenticated invocations? (y/N)` が出たら **y** を入力して実行します。
- リージョン・サービス名・プロジェクトを変えている場合は、それぞれ `--region` / サービス名 / `--project` を合わせてください。サービス名の確認: `gcloud run services list --region=asia-northeast1 --format="value(metadata.name)"`。

**必要な権限の目安:** プロジェクトオーナー、または `roles/run.admin`（Cloud Run 管理者）とリソースの IAM ポリシーを変更する権限（`run.services.setIamPolicy`）を持つロール。

組織ポリシーで `allUsers` の付与が禁止されている場合は、このコマンドがエラーになるか申請が必要になります。その場合は認証付きのみ許可し、審査員には「Google アカウントでログインしたうえでアクセス」する手順を案内してください。

**Cloud Build から未認証許可まで行う場合:** `cloudbuild.yaml` にはデプロイ後に IAM を付与するステップ（`add-iam-policy-binding`）が含まれています。このステップが動くには、Cloud Build のデフォルトサービスアカウント（`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`）に、Cloud Run の IAM を変更する権限が必要です。例: プロジェクトで「Cloud Run 管理者」ロール（`roles/run.admin`）を付与してください。付与していない場合はデプロイは成功しても IAM 更新がスキップされ、上記の手動コマンドで 1 回付与してください。

## トラブルシューティング

- **403 Forbidden（上記メッセージ）:** [403 Forbidden が表示される場合](#403-forbidden-が表示される場合) の手順で IAM を付与してください。
- **権限エラー:** Cloud Build のサービスアカウントに「Cloud Run 管理者」「ストレージ管理者」等のロールが付与されているか確認してください。
- **API が無効:** 上記の API を有効化したうえで、再度 `gcloud builds submit` を実行してください。
