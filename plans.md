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
* **Framework:** Vue.js 3 (Composition API)
* **Language:** TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (メイン), Custom CSS (高度なアニメーション用)
* **3D Viewer:** `<model-viewer>` (Google)
* **Effects:** `canvas-confetti` (紙吹雪), CSS 3D Transforms
* **State Management:** Pinia (必要に応じて導入)

## 3. 機能要件

### A. 子ども用画面 (Client View)
1.  **ログイン/ホーム:**
    * 自分のアバターと「今日のやる気」表示。
    * 未開封の「Nano Banaan（ガチャ権利）」がある場合の通知。
2.  **ガチャシステム (Nano Banaan Machine):**
    * 先生が評価を入力すると「ガチャ権利」が発生。
    * レバーを回す/ボタンを押すと、演出と共にカードが排出される。
    * レアリティ演出（C < B < A < S < SR < SSR）。
3.  **カードギャラリー (Deck):**
    * 獲得したカードをグリッド表示。
    * **SSRカード:** 3Dチルト、ホログラム、パーティクルエフェクト付きの豪華な表示。
4.  **詳細ビュー:**
    * **3D作品:** Minecraftの `.glb` ファイルをWeb上で回転・拡大縮小して閲覧。
    * **タイピング:** スコア、WPM、前回比（+5UP!などの演出）。
    * **コード:** MakeCodeのURLまたはスクショの閲覧。
    * **写真:** 活動風景の記録。

### B. 管理者画面 (Admin Panel)
1.  **生徒管理:** 生徒一覧と詳細。
2.  **日次データ入力:**
    * 日付、タイピングスコア、WPM。
    * Minecraft成果物（.glbファイル, スクショ, MakeCode URL）。
    * **評価設定:** 本日のレアリティ（C~UR）を選択。
    * **カード生成:** AI生成画像（運営が別途作成した画像）のアップロード、タイトル、コメント入力。

## 4. データ構造 (TypeScript Interfaces)

```typescript
export type Rarity = 'C' | 'U' | 'R' | 'RR' | 'SR' | 'UR';

export interface CardData {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  title: string; // カード名（例: 天空の城）
  description: string; // 先生からのコメント
  imageUrl: string; // AI生成画像のURL
  rarity: Rarity;
  
  // 紐づく成果物データ
  typingStats?: {
    score: number;
    wpm: number;
    diffScore: number; // 前回比
  };
  minecraftData?: {
    modelUrl?: string; // .glb
    screenshotUrl?: string;
    makeCodeUrl?: string;
  };
  
  isOpened: boolean; // ガチャ開封済みかどうか
}

## 5. UI/UX デザインガイドライン

* **テーマ:** 「テック × ファンタジー」。少しサイバーパンクだが、温かみのあるトーン。
* **SSRカード品質:**
* CSS `perspective` を使用した3D視差効果。
* `mix-blend-mode` を使用した金属光沢とホログラム表現。
* パーティクルエフェクトの実装。

* **インタラクション:**
* ボタンは押した感触（Scale down）を入れる。
* 数値が増える時はカウントアップアニメーションを入れる。


## 6. 開発ロードマップ

1. **Phase 1: Project Setup & Components**
* Vite + Vue + TS + Tailwind 環境構築。
* `SsrCard.vue` (高品質CSS実装) の作成。
* `MinecraftViewer.vue` の実装。

2. **Phase 2: Gacha & Logic**
* `GachaMachine.vue` のアニメーション実装。
* データ構造の定義とモックデータの作成。

3. **Phase 3: Dashboard Layout**
* カードギャラリーの実装。
* 子ども用ダッシュボードの統合。

4. **Phase 4: Admin & Polish**
* 管理画面（簡易版）の実装。
* 全体の微調整、レスポンシブ対応。