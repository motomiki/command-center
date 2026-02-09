/**
 * タイピング練習の記録データ
 */
export interface TypingRecord {
  date: string; // YYYY-MM-DD 実施日
  score: number; // 合計スコア
  wpm: number; // Words Per Minute（タイピング速度）
  diffFromLast: number; // 前回比（プラス/マイナス）
}

/**
 * Minecraft探究学習の成果物データ
 */
export interface MinecraftProject {
  id: string;
  title: string; // 作品名（小学生向けの平易な日本語）
  description: string; // 作品の説明
  modelUrl?: string; // .glbファイルのURL
  screenshotUrl?: string; // スクリーンショットURL
  makeCodeUrl?: string; // MakeCodeの共有URL
  createdAt: string; // YYYY-MM-DD 作成日
}

/**
 * 生徒データ
 * CardData.studentId と紐付けられる。
 * id は内部キー（UUID）。URL用には loginId（例: student-1）を使用する。
 */
export interface Student {
  id: string;
  /** URL・ログイン用の管理しやすいID（例: student-1）。Supabase 同期時は profiles.login_id から設定。 */
  loginId?: string;
  name: string; // 生徒名
  avatarUrl?: string; // アバター画像URL（オプション）
  typingHistory: TypingRecord[]; // タイピング練習の履歴
  projects: MinecraftProject[]; // Minecraft成果物のリスト
}

