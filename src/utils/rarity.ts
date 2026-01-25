import type { Rarity } from '@/types/card';

/**
 * レアリティを小学生向けの表示名に変換
 * UR → ウルトラレア、SR → スーパーレア、RR → ダブルレア、R → レア、U → アンコモン、C → コモン
 */
export function getRarityDisplayName(rarity: Rarity): string {
  const displayNames: Record<Rarity, string> = {
    UR: 'ウルトラレア',
    SR: 'スーパーレア',
    RR: 'ダブルレア',
    R: 'レア',
    U: 'アンコモン',
    C: 'コモン',
  };
  return displayNames[rarity];
}

/**
 * レアリティを短縮表示（ボタンなどで使用）
 */
export function getRarityShortName(rarity: Rarity): string {
  const shortNames: Record<Rarity, string> = {
    UR: 'UR',
    SR: 'SR',
    RR: 'RR',
    R: 'R',
    U: 'U',
    C: 'C',
  };
  return shortNames[rarity];
}

/**
 * レアリティをバッジ表示用の形式に変換（英語表記 + 日本語表記）
 * UR → "UR ウルトラレア"、SR → "SR スーパーレア" など
 */
export function getRarityBadgeName(rarity: Rarity): string {
  const badgeNames: Record<Rarity, string> = {
    UR: 'UR ウルトラレア',
    SR: 'SR スーパーレア',
    RR: 'RR ダブルレア',
    R: 'R レア',
    U: 'U アンコモン',
    C: 'C コモン',
  };
  return badgeNames[rarity];
}

