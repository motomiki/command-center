import { ref, readonly } from 'vue';
import type {
  IStudentRepository,
  ICardRepository,
  IMinecraftWorkRepository,
} from '@/repositories/interfaces';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  SupabaseStudentRepository,
  SupabaseCardRepository,
  SupabaseMinecraftWorkRepository,
} from '@/repositories/supabase';
import {
  MockStudentRepository,
  MockCardRepository,
  MockMinecraftWorkRepository,
} from '@/repositories/mock';
import { syncAll, type SyncResult } from '@/services/SyncService';
import { getLastSyncAt } from '@/services/LocalCache';

// ---------------------------------------------------------------------------
// Singleton Instances
// ---------------------------------------------------------------------------

let studentRepo: IStudentRepository | null = null;
let cardRepo: ICardRepository | null = null;
let minecraftWorkRepo: IMinecraftWorkRepository | null = null;

function getOrCreateStudentRepo(): IStudentRepository {
  if (!studentRepo) {
    studentRepo = isSupabaseConfigured
      ? new SupabaseStudentRepository()
      : new MockStudentRepository();
  }
  return studentRepo;
}

function getOrCreateCardRepo(): ICardRepository {
  if (!cardRepo) {
    cardRepo = isSupabaseConfigured
      ? new SupabaseCardRepository()
      : new MockCardRepository();
  }
  return cardRepo;
}

function getOrCreateMinecraftWorkRepo(): IMinecraftWorkRepository {
  if (!minecraftWorkRepo) {
    minecraftWorkRepo = isSupabaseConfigured
      ? new SupabaseMinecraftWorkRepository()
      : new MockMinecraftWorkRepository();
  }
  return minecraftWorkRepo;
}

// ---------------------------------------------------------------------------
// Sync State (Reactive)
// ---------------------------------------------------------------------------

const isSyncing = ref(false);
const lastSyncResult = ref<SyncResult | null>(null);
const lastSyncTimestamp = ref<string | null>(null);

// 初期化時に最終同期時刻を読み込む
getLastSyncAt().then((ts) => {
  lastSyncTimestamp.value = ts;
});

// ---------------------------------------------------------------------------
// Public Composable
// ---------------------------------------------------------------------------

/**
 * リポジトリと同期機能を提供するコンポーザブル。
 *
 * Supabase が設定済みの場合は Supabase リポジトリ、
 * 未設定の場合は Mock リポジトリを自動的に選択する。
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { students, cards, works, sync, isSyncing } = useRepository();
 *
 * const allStudents = await students.getAll();
 * </script>
 * ```
 */
export function useRepository() {
  /**
   * 全データの同期を実行する（Supabase → IndexedDB）。
   * Supabase 未設定時は何もしない。
   */
  async function sync(
    onProgress?: (message: string) => void,
  ): Promise<SyncResult | null> {
    if (!isSupabaseConfigured) return null;

    isSyncing.value = true;
    try {
      const result = await syncAll(onProgress);
      lastSyncResult.value = result;
      lastSyncTimestamp.value = new Date().toISOString();
      return result;
    } finally {
      isSyncing.value = false;
    }
  }

  return {
    /** 現在のバックエンドが Supabase か否か */
    isSupabase: isSupabaseConfigured,

    /** Student リポジトリ */
    students: getOrCreateStudentRepo(),

    /** Card リポジトリ */
    cards: getOrCreateCardRepo(),

    /** MinecraftWork リポジトリ */
    works: getOrCreateMinecraftWorkRepo(),

    /** 全データ同期を実行 */
    sync,

    /** 同期中かどうか（リアクティブ） */
    isSyncing: readonly(isSyncing),

    /** 最後の同期結果（リアクティブ） */
    lastSyncResult: readonly(lastSyncResult),

    /** 最後の同期日時（リアクティブ） */
    lastSyncTimestamp: readonly(lastSyncTimestamp),
  };
}
