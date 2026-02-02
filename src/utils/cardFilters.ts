import type { CardData, Rarity } from '@/types/card';

/**
 * カード統計情報の型定義
 */
export interface CardStatistics {
  total: number;
  byRarity: Record<Rarity, number>;
  opened: number;
  unopened: number;
  withTyping: number;
  withMinecraft: number;
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
 * レアリティでカードをフィルタリング
 * @param cards カードデータの配列
 * @param rarities フィルタするレアリティの配列（空配列の場合はすべてのレアリティ）
 * @returns フィルタリングされたカードデータの配列
 */
export function filterCardsByRarity(
  cards: CardData[],
  rarities: Rarity[]
): CardData[] {
  if (rarities.length === 0) {
    return cards;
  }
  return cards.filter((card) => card.rarity && rarities.includes(card.rarity));
}

/**
 * 開封状態でカードをフィルタリング
 * @param cards カードデータの配列
 * @param isOpened true = 開封済みのみ, false = 未開封のみ, null = すべて
 * @returns フィルタリングされたカードデータの配列
 */
export function filterCardsByOpenedStatus(
  cards: CardData[],
  isOpened: boolean | null
): CardData[] {
  if (isOpened === null) {
    return cards;
  }
  return cards.filter((card) => card.isOpened === isOpened);
}

/**
 * カードタイプでフィルタリング
 * @param cards カードデータの配列
 * @param type 'typing' = タイピング記録あり, 'minecraft' = Minecraft成果物あり, 'both' = 両方あり, 'none' = どちらもなし, 'all' = すべて
 * @returns フィルタリングされたカードデータの配列
 */
export function filterCardsByType(
  cards: CardData[],
  type: 'typing' | 'minecraft' | 'both' | 'none' | 'all'
): CardData[] {
  if (type === 'all') {
    return cards;
  }

  return cards.filter((card) => {
    const hasTyping = !!card.typingStats;
    const hasMinecraft = !!card.minecraftData;

    switch (type) {
      case 'typing':
        return hasTyping && !hasMinecraft;
      case 'minecraft':
        return hasMinecraft && !hasTyping;
      case 'both':
        return hasTyping && hasMinecraft;
      case 'none':
        return !hasTyping && !hasMinecraft;
      default:
        return true;
    }
  });
}

/**
 * 検索クエリでカードを検索
 * @param cards カードデータの配列
 * @param query 検索クエリ（タイトルと説明文を検索）
 * @returns 検索結果のカードデータの配列
 */
export function searchCards(cards: CardData[], query: string): CardData[] {
  if (!query.trim()) {
    return cards;
  }

  const lowerQuery = query.toLowerCase().trim();
  return cards.filter(
    (card) =>
      card.title.toLowerCase().includes(lowerQuery) ||
      card.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * カードをソート
 * @param cards カードデータの配列
 * @param sortBy ソート基準（'date' | 'rarity' | 'title'）
 * @param order ソート順（'asc' | 'desc'）
 * @returns ソートされたカードデータの配列
 */
export function sortCards(
  cards: CardData[],
  sortBy: 'date' | 'rarity' | 'title',
  order: 'asc' | 'desc'
): CardData[] {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'rarity':
        comparison = RARITY_ORDER[a.rarity || 'C'] - RARITY_ORDER[b.rarity || 'C'];
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title, 'ja');
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * カード統計情報を取得
 * @param cards カードデータの配列
 * @returns 統計情報
 */
export function getCardStatistics(cards: CardData[]): CardStatistics {
  const statistics: CardStatistics = {
    total: cards.length,
    byRarity: {
      UR: 0,
      SR: 0,
      RR: 0,
      R: 0,
      U: 0,
      C: 0,
    },
    opened: 0,
    unopened: 0,
    withTyping: 0,
    withMinecraft: 0,
  };

  cards.forEach((card) => {
    // レアリティ別のカウント
    statistics.byRarity[card.rarity || 'C']++;

    // 開封状態のカウント
    if (card.isOpened) {
      statistics.opened++;
    } else {
      statistics.unopened++;
    }

    // タイピング記録のカウント
    if (card.typingStats) {
      statistics.withTyping++;
    }

    // Minecraft成果物のカウント
    if (card.minecraftData) {
      statistics.withMinecraft++;
    }
  });

  return statistics;
}

/**
 * すべてのフィルタとソートを適用
 * @param cards カードデータの配列
 * @param filters フィルタ状態
 * @returns フィルタリング・ソートされたカードデータの配列
 */
export interface FilterState {
  rarities: Rarity[];
  isOpened: boolean | null;
  type: 'typing' | 'minecraft' | 'both' | 'none' | 'all';
  searchQuery: string;
  sortBy: 'date' | 'rarity' | 'title';
  sortOrder: 'asc' | 'desc';
}

export function applyFilters(
  cards: CardData[],
  filters: FilterState
): CardData[] {
  let result = [...cards];

  // レアリティフィルタ
  result = filterCardsByRarity(result, filters.rarities);

  // 開封状態フィルタ
  result = filterCardsByOpenedStatus(result, filters.isOpened);

  // タイプフィルタ
  result = filterCardsByType(result, filters.type);

  // 検索
  result = searchCards(result, filters.searchQuery);

  // ソート
  result = sortCards(result, filters.sortBy, filters.sortOrder);

  return result;
}

