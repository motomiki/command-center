/**
 * すべての型定義をエクスポート
 * インポートの簡素化: import type { CardData, Student } from '@/types'
 */

// Card関連の型定義
export type { Rarity, CardData } from './card';

// ガチャ関連の型定義
export type { GachaState, GachaResult } from './gacha';

// 生徒関連の型定義
export type { Student, TypingRecord, MinecraftProject } from './student';

