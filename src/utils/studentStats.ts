import type { Student, TypingRecord, MinecraftProject } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import {
  getCardsByStudentId,
  getUnopenedCardsByStudentId,
} from './mockDataHelpers';

/**
 * タイピング統計情報の型定義
 */
export interface TypingStats {
  highestScore: number;
  averageWpm: number;
  totalRecords: number;
  improvement: number; // 前回比の平均
  recentTrend: 'up' | 'down' | 'stable';
}

/**
 * Minecraft統計情報の型定義
 */
export interface MinecraftStats {
  totalProjects: number;
  latestProject: MinecraftProject | null;
  projectsByMonth: Record<string, number>;
}

/**
 * レアリティの順序（高→低）
 */
const RARITY_ORDER: Record<Rarity, number> = {
  UR: 6,
  SR: 5,
  RR: 4,
  R: 3,
  U: 2,
  C: 1,
};

/**
 * やる気値を計算
 * タイピング記録の改善度、カード獲得数、最近の活動頻度から算出（0-100）
 * @param student 生徒データ
 * @returns やる気値（0-100）
 */
export function calculateMotivation(student: Student): number {
  let motivation = 50; // ベース値

  // タイピング記録の改善度を評価（最大30ポイント）
  if (student.typingHistory.length > 0) {
    const recentRecords = student.typingHistory.slice(-3); // 最近3回
    const improvements = recentRecords
      .map((record) => record.diffFromLast)
      .filter((diff) => diff > 0);
    const avgImprovement = improvements.length > 0
      ? improvements.reduce((sum, diff) => sum + diff, 0) / improvements.length
      : 0;
    motivation += Math.min(avgImprovement * 2, 30);
  }

  // カード獲得数を評価（最大20ポイント）
  const cards = getCardsByStudentId(student.id);
  const cardCount = cards.length;
  motivation += Math.min(cardCount * 2, 20);

  // 最近の活動頻度を評価（最大20ポイント）
  const recentActivityDays = getRecentActivityDays(student);
  motivation += Math.min(recentActivityDays * 4, 20);

  // 未開封カードがある場合はボーナス（最大10ポイント）
  const unopenedCards = getUnopenedCardsByStudentId(student.id);
  if (unopenedCards.length > 0) {
    motivation += Math.min(unopenedCards.length * 2, 10);
  }

  return Math.min(Math.max(motivation, 0), 100);
}

/**
 * 最近の活動日数を取得（過去7日間）
 * @param student 生徒データ
 * @returns 活動日数
 */
function getRecentActivityDays(student: Student): number {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const activityDates = new Set<string>();

  // タイピング記録から活動日を取得
  student.typingHistory.forEach((record) => {
    const recordDate = new Date(record.date);
    if (recordDate >= sevenDaysAgo) {
      activityDates.add(record.date);
    }
  });

  // Minecraft成果物から活動日を取得
  student.projects.forEach((project) => {
    const projectDate = new Date(project.createdAt);
    if (projectDate >= sevenDaysAgo) {
      activityDates.add(project.createdAt);
    }
  });

  return activityDates.size;
}

/**
 * 最新のカードを取得
 * @param studentId 生徒ID
 * @param count 取得する枚数
 * @returns 最新のカードデータの配列
 */
export function getLatestCards(
  studentId: string,
  count: number
): CardData[] {
  const cards = getCardsByStudentId(studentId);
  return cards
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

/**
 * 最高レアリティを取得
 * @param cards カードデータの配列
 * @returns 最高レアリティ、カードがない場合はnull
 */
export function getHighestRarity(cards: CardData[]): Rarity | null {
  if (cards.length === 0) {
    return null;
  }

  let highestRarity: Rarity = cards[0].rarity;
  let highestOrder = RARITY_ORDER[highestRarity];

  cards.forEach((card) => {
    const order = RARITY_ORDER[card.rarity];
    if (order > highestOrder) {
      highestOrder = order;
      highestRarity = card.rarity;
    }
  });

  return highestRarity;
}

/**
 * タイピング統計を計算
 * @param typingHistory タイピング記録の配列
 * @returns タイピング統計情報
 */
export function getTypingStats(
  typingHistory: TypingRecord[]
): TypingStats {
  if (typingHistory.length === 0) {
    return {
      highestScore: 0,
      averageWpm: 0,
      totalRecords: 0,
      improvement: 0,
      recentTrend: 'stable',
    };
  }

  // 最高スコア
  const highestScore = Math.max(
    ...typingHistory.map((record) => record.score)
  );

  // 平均WPM
  const averageWpm =
    typingHistory.reduce((sum, record) => sum + record.wpm, 0) /
    typingHistory.length;

  // 前回比の平均
  const improvements = typingHistory
    .map((record) => record.diffFromLast)
    .filter((diff) => diff !== 0);
  const improvement =
    improvements.length > 0
      ? improvements.reduce((sum, diff) => sum + diff, 0) / improvements.length
      : 0;

  // 最近の傾向（最近3回の前回比から判定）
  const recentRecords = typingHistory.slice(-3);
  const recentImprovements = recentRecords.map((record) => record.diffFromLast);
  const avgRecentImprovement =
    recentImprovements.length > 0
      ? recentImprovements.reduce((sum, diff) => sum + diff, 0) /
        recentImprovements.length
      : 0;

  let recentTrend: 'up' | 'down' | 'stable' = 'stable';
  if (avgRecentImprovement > 1) {
    recentTrend = 'up';
  } else if (avgRecentImprovement < -1) {
    recentTrend = 'down';
  }

  return {
    highestScore,
    averageWpm: Math.round(averageWpm * 10) / 10,
    totalRecords: typingHistory.length,
    improvement: Math.round(improvement * 10) / 10,
    recentTrend,
  };
}

/**
 * Minecraft統計を計算
 * @param projects Minecraft成果物の配列
 * @returns Minecraft統計情報
 */
export function getMinecraftStats(
  projects: MinecraftProject[]
): MinecraftStats {
  if (projects.length === 0) {
    return {
      totalProjects: 0,
      latestProject: null,
      projectsByMonth: {},
    };
  }

  // 最新の成果物
  const latestProject = projects.reduce((latest, project) => {
    const latestDate = new Date(latest.createdAt);
    const projectDate = new Date(project.createdAt);
    return projectDate > latestDate ? project : latest;
  }, projects[0]);

  // 月別の成果物数
  const projectsByMonth: Record<string, number> = {};
  projects.forEach((project) => {
    const date = new Date(project.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    projectsByMonth[monthKey] = (projectsByMonth[monthKey] || 0) + 1;
  });

  return {
    totalProjects: projects.length,
    latestProject,
    projectsByMonth,
  };
}

