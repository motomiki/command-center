// types/Student.ts

export interface TypingRecord {
  date: string;       // 実施日
  score: number;      // 合計スコア
  wpm: number;        // Speed
  diffFromLast: number; // 前回比（運営側で計算して入力、またはフロントで計算）
}

export interface MinecraftProject {
  id: string;
  title: string;
  description: string;
  modelUrl: string;       // .glbファイルのURL
  screenshotUrl: string;  // 通常のスクショ
  makeCodeUrl?: string;   // MakeCodeの共有URL
  ssrCardImageUrl: string; // AI生成されたカード画像(Nano banaan)
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  typingHistory: TypingRecord[];
  projects: MinecraftProject[];
}