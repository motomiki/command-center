# AI Agent Guidelines（ハッカソン公開用）

本プロジェクトは **Google Cloud ハッカソン** に応募している「コマンドセンター｜放課後キャンパスクラブ」です。  
小学生がワクワクする、リッチなUIの学習記録アプリを Vue.js + TypeScript で実装しています。以下のガイドラインに従ってコード生成・修正を行ってください。

## 1. 基本的な振る舞い

* **品質優先:** 簡素な実装よりも、視覚的に魅力的で「すごい！」と思わせる実装を優先してください。
* **キッズファースト:** UIの文言は小学生（低学年含む）が読める平易な日本語（またはカタカナ英語）を使用してください。難しい漢字は避けてください。
* **コンポーネント指向:** 再利用可能な粒度でコンポーネントを分割してください。

## 2. 技術スタックとコーディング規約

* **Framework:** Vue 3 Composition API (`<script setup lang="ts">`) を使用。Options APIは禁止。
* **Style:** Tailwind CSS を基本としますが、複雑なアニメーションやエフェクト（特にSSRカード）には `<style scoped>` 内でのカスタムCSSを使用してください。
* **Type Safety:** `any` 型の使用は極力避け、`src/types/` で定義された Interface や型を使用してください。
* **Linter:** ESLint / Prettier のルールに従ってください。

## 3. ハッカソン採用ツール（必須要件）

本作品は次の Google Cloud 要件を満たしています。改修時もこれらを前提にしてください。

| 要件 | 採用ツール | 役割 |
|------|------------|------|
| **必須1** | **Cloud Run** | Vue.js フロントのホスティング（Docker + Nginx）。`Dockerfile` / `cloudbuild.yaml` でデプロイ。 |
| **必須2** | **Vertex AI (Gemini)** | カード文生成・褒め言葉・プロンプト最適化。Cloud Functions 経由で呼び出し、API キーをフロントに露出させない。 |
| その他 | Supabase, @google/model-viewer | 認証・DB・Storage、Minecraft 3D 表示。 |

* Vertex AI 連携: `src/services/vertexAiService.ts`、Cloud Functions は `functions/` を参照。

## 4. 特定機能の実装指示

### SSRカード (SsrCard.vue)

* ユーザーが所有感を満たせるよう、`transform: rotate3d` や `backdrop-filter`、`mix-blend-mode` を駆使して、物理的なカードのような質感を再現してください。
* レアリティ（SSR, SR）の場合は、必ずパーティクルや光沢アニメーションを含めてください。

### ガチャ演出 (GachaMachine.vue)

* `canvas-confetti` ライブラリを使用して、高レアリティ排出時の祝祭感を最大化してください。
* 状態管理（待機中 → スピン中 → 排出 → 開封）を明確にし、UXを阻害しない適切な待ち時間を設定してください。

### 3Dビューアー (MinecraftViewer.vue)

* `@google/model-viewer` を使用してください。
* 読み込み中はローディングインジケータを表示し、子どもが待てるようにしてください。

## 5. 参照

* **型・データ構造:** `src/types/`（`card.ts`, `student.ts`, `supabase.ts` 等）
* **審査員向けデプロイ・デモ:** 本リポジトリの README および、デプロイ手順は `gcloud builds submit` + `cloudbuild.yaml` を参照（README に要約あり）

## 6. エラーハンドリング

* 画像の読み込み失敗や3Dモデルのロードエラー時は、壊れたアイコンを表示するのではなく、親しみやすい代替画像やメッセージを表示してください。
