# Project Plan: Nano Banaan Dashboard (Minecraft & Typing Portfolio)

## 1. プロジェクト概要
小学生向けの放課後クラブ活動における「タイピング練習」と「Minecraft探究学習」の成果を可視化・保存するためのWebアプリケーション。
運営者（先生）が子どもの活動データを入力し、子どもはゲーミフィケーション要素（ガチャ、SSRカード、3Dモデル閲覧）のあるダッシュボードで自身の成長を確認する。

* **プロジェクト名:** Nano Banaan Dashboard
* **コンセプト:** 「未来のエンジニア・ポートフォリオ（My Deck）」
* **ターゲット:**
    * **User:** 小学生（閲覧メイン、ワクワク感、収集癖を満たす）
    * **Admin:** 運営スタッフ（データ入力、AI画像登録、評価管理）

## 2. 技術スタック
* **Framework:** Vue.js 3 (Composition API, `<script setup>`)
* **Language:** TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (メイン), Custom CSS (高度なアニメーション用)
* **3D Viewer:** `<model-viewer>` (Google)
* **Effects:** `canvas-confetti` (紙吹雪), CSS 3D Transforms
* **State Management:** Pinia（認証ストア `auth` など）
* **Backend / Auth:** Supabase（認証・profiles・cards・minecraft_works・Storage 連携、未設定時はモック利用）

## 3. 機能要件

### A. 子ども用画面 (Client View)
1.  **ログイン / ホーム:**
    * **認証:** メール/パスワードでログイン。`profiles` の `role` に応じて生徒/先生を振り分け。生徒は `login_id` で `/student/:studentId` にアクセス。
    * 自分のアバターと「今日のやる気」表示。
    * やる気メーターは **タイピング記録の改善度（最近3回の前回比）・カード獲得数・過去30日間の活動頻度・未開封カード** から算出（0–100）。週1回活動を想定し、活動頻度は過去30日間で集計。
    * 未開封の「Nano Banaan（ガチャ権利）」がある場合の通知。
2.  **ガチャシステム (Nano Banaan Machine):**
    * 先生が評価を入力すると「ガチャ権利」が発生。
    * レバーを回す/ボタンを押すと、演出と共にカードが排出される。
    * レアリティ演出（C < U < R < RR < SR < UR）。
3.  **カードギャラリー (Deck):**
    * 獲得したカードをグリッド表示。種類（タイピング / Minecraft）・レアリティ・日付などでフィルタ可能。
    * **高レアカード:** 3Dチルト、ホログラム、パーティクルエフェクト付きの豪華な表示（`SsrCard.vue`）。
4.  **詳細ビュー (CardDetailModal):**
    * **3D作品:** Minecraftの `.glb` ファイルを `MinecraftViewer.vue` で回転・拡大縮小して閲覧。
    * **タイピング:** スコア、WPM、前回比（+5UP!などの演出）。
    * **コード:** MakeCodeのURLまたはスクショの閲覧。
    * **写真:** 活動風景の記録。

### B. 管理者画面 (Admin Panel)
1.  **認証:** 先生はログイン後 `/admin` へ。ナビゲーションガードで生徒用URLへの直アクセスを制限。
2.  **生徒管理:** 生徒一覧（`StudentList`）と詳細（`StudentDetail`）。タブで「タイピングデータ」「Minecraft」「カード」を切り替え。
3.  **日次データ入力:**
    * **TypingDataForm:** 日付、タイピングスコア、WPM。前回比（`diffFromLast`）は自動計算。下書き保存・Toast フィードバック対応。
    * **MinecraftDataForm:** 成果物（.glb、スクショ、MakeCode URL）。レアリティ選択。クライアント検証あり。
    * **CardGenerationForm:** レアリティ選択、AI生成画像アップロード、タイトル・コメント入力。プレビュー・下書き保存対応。
4.  **Supabase 連携:** `SyncService` で profiles / cards / minecraft_works を同期。Storage で画像・.glb を管理。管理画面に Supabase テストページ（`SupabaseTestPage`）あり。

## 4. データ構造 (TypeScript Interfaces)

実装は `src/types/student.ts` および `src/types/card.ts` を参照。

```typescript
// レアリティ（低→高）
export type Rarity = 'C' | 'U' | 'R' | 'RR' | 'SR' | 'UR';

export interface CardData {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  type: 'typing' | 'minecraft';

  // タイピングカード用
  score?: number;
  wpm?: number;
  diffScore?: number;

  // Minecraftカード用
  projectId?: string;

  imageUrl?: string;
  rarity?: Rarity;
  isOpened?: boolean;
  issueNumber?: number;

  typingStats?: { score: number; wpm: number; diffScore: number };
  minecraftData?: { modelUrl?: string; screenshotUrl?: string; makeCodeUrl?: string };
}

export interface TypingRecord {
  date: string;   // YYYY-MM-DD
  score: number;
  wpm: number;
  diffFromLast: number; // 前回比（教師入力時に自動計算）
}

export interface MinecraftProject {
  id: string;
  title: string;
  description: string;
  modelUrl?: string;
  screenshotUrl?: string;
  makeCodeUrl?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  loginId?: string;  // URL・ログイン用（例: student-1）
  name: string;
  avatarUrl?: string;
  typingHistory: TypingRecord[];
  projects: MinecraftProject[];
}
```

## 5. UI/UX デザインガイドライン

* **テーマ:** 「テック × ファンタジー」。少しサイバーパンクだが、温かみのあるトーン。
* **高レアカード品質:**
  * CSS `perspective` を使用した3D視差効果。
  * `mix-blend-mode` を使用した金属光沢とホログラム表現。
  * パーティクルエフェクトの実装。
* **インタラクション:**
  * ボタンは押した感触（Scale down）を入れる。
  * 数値が増える時はカウントアップアニメーションを入れる。
* **キッズファースト:** 文言は小学生が読める平易な日本語（漢字は控えめ）。

## 6. 開発ロードマップ

1. **Phase 1: Project Setup & Components (Done)**
   - [x] Vite + Vue + TS + Tailwind 環境構築。
   - [x] `SsrCard.vue` (高品質CSS実装) の作成。
   - [x] `MinecraftViewer.vue` の実装。

2. **Phase 2: Gacha & Logic (Done)**
   - [x] `GachaMachine.vue` のアニメーション実装。
   - [x] データ構造の定義とモックデータの作成。

3. **Phase 3: Dashboard Layout (Done)**
   - [x] カードギャラリーの実装。
   - [x] 子ども用ダッシュボードの統合。

4. **Phase 4: Admin & Polish (Done)**
   > 教員（Admin）の使いやすさとデータ保全性を重視。

   **4-1. 高度なデータ入力フォーム (Done)**
   - [x] TypingDataForm: バリデーション、前回比フィードバック。
   - [x] MinecraftDataForm: .glb 検証、レアリティ選択。
   - [x] CardGenerationForm: プレビュー・レアリティ演出の確認。

   **4-2. ファイルアップロード UX (Done)**
   - [x] Drag & Drop、進捗表示、即時プレビュー。

   **4-3. データ管理と保全性 (Done)**
   - [x] 下書き保存、Toast、離脱警告。

   **4-4. Admin UI の洗練 (Done)**
   - [x] レスポンシブ、検索・フィルタリング。

5. **Phase 5: 認証・Supabase 連携 (Done)**
   - [x] Supabase Auth（メール/パスワード）、`profiles`（role, display_name, login_id, typing_history, avatar_url）。
   - [x] ルートガード（未認証→ログイン、ロール別リダイレクト、生徒は自分の `/student/:studentId` のみ）。
   - [x] SyncService: profiles / cards / minecraft_works / Storage 同期、LocalCache。
   - [x] やる気メーターの活動頻度を **過去30日間** に変更（週1回活動を想定）。

---

## 7. Auto TCG 生成パイプライン（計画）

`.cursor/rules/AUTO-TCG-GENERATION.mdc` に基づき、Gemini の画像生成モデルと Pillow を用いた TCG カード自動生成を `scripts/tcg_generator/` に実装する。

### 運用前提

- **生成単位:** 生徒がガチャを引くたびに **1枚ずつ** 生成（バッチ一括生成は行わない）。
- **想定ボリューム:** 1日あたり **約30枚**。
- **入力:** 1枚分のデータ（タイトル・プロンプト・レアリティなど）を、実行ごとに引数または JSON 等で渡す。

### ディレクトリ構成（予定）

- `scripts/tcg_generator/assets/` … カード枠（`frame.png`）、スタイル参照（`style.png`）。
- `scripts/tcg_generator/data/` … 入力例・プロンプト雛形用（任意）。
- `scripts/tcg_generator/output/` … 生成画像の保存先。
- `scripts/tcg_generator/src/` … Python ソース。

### 実装ステップ（予定）

1. **依存関係:** `requirements.txt`（google-genai, pillow, pandas 等）。
2. **データ層:** 1枚分の入力（CLI 引数 `--title`, `--prompt`, `--rarity` 等、または 1件 JSON）。
3. **アセット層:** `ai_generator.py` — Gemini API でイラスト生成、StyleReferenceImage、リトライ処理。
4. **合成層:** `compositor.py` — Pillow で枠・テキスト合成、日本語折り返し、プレースホルダー自動生成。
5. **メイン:** `main.py` — 1枚生成用 CLI。

### 成果物（予定）

- 上記を満たす Python スクリプト群。
- `scripts/tcg_generator/README.md`（実行方法・素材差し替えを日本語で記載）。
