export type Rarity = 'C' | 'U' | 'R' | 'RR' | 'SR' | 'UR';

export interface CardData {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  title: string; // カード名（例: 天空の城）
  description: string; // 先生からのコメント
  type: 'typing' | 'minecraft'; // カードの種類

  // タイピングカード用フィールド
  score?: number;
  wpm?: number;
  diffScore?: number;

  // Minecraftカード用フィールド
  projectId?: string;

  // オプションフィールド（将来的に使用）
  imageUrl?: string; // AI生成画像のURL
  rarity?: Rarity;
  isOpened?: boolean; // ガチャ開封済みかどうか
  issueNumber?: number; // 教師が発行したカードの通し番号（全生徒横断）

  // 紐づく成果物データ（後方互換性のため残す）
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
}

