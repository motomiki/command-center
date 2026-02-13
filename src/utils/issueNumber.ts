import type { CardData } from '@/types/card';

/**
 * 既存カード一覧から、次に付与すべき通し番号を算出する。
 * 教師が発行したカードの通し番号（全生徒横断）で使用する。
 *
 * @param cards - 全カードの配列（getAll() の結果を想定）
 * @returns 次に付与する通し番号（1 以上）
 */
export function getNextIssueNumber(cards: CardData[]): number {
  if (cards.length === 0) return 1;
  const max = Math.max(0, ...cards.map((c) => c.issueNumber ?? 0));
  return max + 1;
}
