import { get, set, del } from 'idb-keyval';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import type { MinecraftWork } from '@/repositories/interfaces';

/**
 * LocalCache
 *
 * Supabase から同期したメタデータを IndexedDB に保存・取得するサービス。
 * バイナリアセット（画像、.glb）は assetStore.ts が担当し、
 * このモジュールは JSON シリアライズ可能な構造化データを扱う。
 */

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const PREFIX = 'sb_cache_';

const KEYS = {
  students: `${PREFIX}students`,
  cards: `${PREFIX}cards`,
  minecraftWorks: `${PREFIX}minecraft_works`,
  lastSyncAt: `${PREFIX}last_sync_at`,
  syncMeta: `${PREFIX}sync_meta`,
} as const;

// ---------------------------------------------------------------------------
// Sync Metadata
// ---------------------------------------------------------------------------

/** 各テーブルの最終更新タイムスタンプを保持する同期メタデータ */
export interface SyncMeta {
  studentsUpdatedAt: string | null;
  cardsUpdatedAt: string | null;
  minecraftWorksUpdatedAt: string | null;
}

const DEFAULT_SYNC_META: SyncMeta = {
  studentsUpdatedAt: null,
  cardsUpdatedAt: null,
  minecraftWorksUpdatedAt: null,
};

// ---------------------------------------------------------------------------
// Helpers — 構造化クローンが走らないよう JSON 経由でプレーン化して保存
// ---------------------------------------------------------------------------

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function getCachedStudents(): Promise<Student[]> {
  const data = await get<Student[]>(KEYS.students);
  return data ?? [];
}

export async function setCachedStudents(students: Student[]): Promise<void> {
  await set(KEYS.students, toPlain(students));
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export async function getCachedCards(): Promise<CardData[]> {
  const data = await get<CardData[]>(KEYS.cards);
  return data ?? [];
}

export async function setCachedCards(cards: CardData[]): Promise<void> {
  await set(KEYS.cards, toPlain(cards));
}

// ---------------------------------------------------------------------------
// Minecraft Works (student_id 付き)
// ---------------------------------------------------------------------------

export async function getCachedMinecraftWorks(): Promise<MinecraftWork[]> {
  const data = await get<MinecraftWork[]>(KEYS.minecraftWorks);
  return data ?? [];
}

export async function setCachedMinecraftWorks(
  works: MinecraftWork[],
): Promise<void> {
  await set(KEYS.minecraftWorks, toPlain(works));
}

// ---------------------------------------------------------------------------
// Sync Meta
// ---------------------------------------------------------------------------

export async function getSyncMeta(): Promise<SyncMeta> {
  const data = await get<SyncMeta>(KEYS.syncMeta);
  return data ?? { ...DEFAULT_SYNC_META };
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  await set(KEYS.syncMeta, toPlain(meta));
}

// ---------------------------------------------------------------------------
// Last Sync Timestamp
// ---------------------------------------------------------------------------

export async function getLastSyncAt(): Promise<string | null> {
  return (await get<string>(KEYS.lastSyncAt)) ?? null;
}

export async function setLastSyncAt(timestamp: string): Promise<void> {
  await set(KEYS.lastSyncAt, timestamp);
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

/** キャッシュを全削除する（デバッグ・リセット用） */
export async function clearAllCache(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => del(key)));
}
