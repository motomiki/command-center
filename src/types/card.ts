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

