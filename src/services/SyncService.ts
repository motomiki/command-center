import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { Student } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import type { MinecraftWork } from '@/repositories/interfaces';
import {
  getCachedStudents,
  setCachedStudents,
  setCachedCards,
  setCachedMinecraftWorks,
  setLastSyncAt,
} from './LocalCache';
import { saveAsset, assetExists } from '@/utils/assetStore';

// ---------------------------------------------------------------------------
// Supabase Row type aliases
// ---------------------------------------------------------------------------

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CardRow = Database['public']['Tables']['cards']['Row'];
type MinecraftWorkRow = Database['public']['Tables']['minecraft_works']['Row'];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_BUCKET = 'assets';

/** assetStore 内で Supabase Storage アセットを識別するためのプレフィックス */
const ASSET_KEY_PREFIX = 'sb_asset:';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** 同期結果 */
export interface SyncResult {
  success: boolean;
  studentsUpdated: number;
  cardsUpdated: number;
  worksUpdated: number;
  assetsDownloaded: number;
  errors: string[];
}

/** 同期の進捗コールバック */
export type SyncProgressCallback = (message: string) => void;

// ---------------------------------------------------------------------------
// Data Mappers
// ---------------------------------------------------------------------------

/**
 * Supabase profiles 行 → アプリ内 Student 型へ変換。
 * typing_history は profiles テーブルの jsonb カラムから読み取る。
 * カラムが空・未設定の場合は既存キャッシュからフォールバックする。
 */
function mapProfileToStudent(
  profile: ProfileRow,
  projects: MinecraftWork[],
  existingStudent?: Student,
): Student {
  // typing_history カラム（jsonb）をパース
  const rawHistory = profile.typing_history;
  const typingHistory = Array.isArray(rawHistory) && rawHistory.length > 0
    ? (rawHistory as Student['typingHistory'])
    : existingStudent?.typingHistory ?? [];

  return {
    id: profile.id,
    name: profile.display_name ?? '名前なし',
    avatarUrl: profile.avatar_url ?? undefined,
    typingHistory,
    // projects は student_id でフィルタ済みの MinecraftWork[] を MinecraftProject[] へ射影
    projects: projects.map(({ studentId: _sid, ...proj }) => proj),
  };
}

/** Supabase cards 行 → アプリ内 CardData 型へ変換 */
function mapCardRowToCardData(row: CardRow): CardData {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    studentId: row.student_id,
    date: row.created_at.split('T')[0], // YYYY-MM-DD
    title: row.title,
    description: row.description ?? '',
    type: (metadata.type as CardData['type']) ?? 'minecraft',

    // Typing 系
    score: metadata.score as number | undefined,
    wpm: metadata.wpm as number | undefined,
    diffScore: metadata.diffScore as number | undefined,

    // Minecraft 系
    projectId: metadata.projectId as string | undefined,

    // 画像（後でアセット同期によりローカルキーへ差し替え）
    imageUrl: row.image_path,

    rarity: row.rarity as Rarity,
    isOpened: row.is_opened,
    issueNumber: metadata.issueNumber as number | undefined,

    typingStats: metadata.typingStats as CardData['typingStats'],
    minecraftData: metadata.minecraftData as CardData['minecraftData'],
  };
}

/** Supabase minecraft_works 行 → MinecraftWork 型へ変換 */
function mapWorkRowToMinecraftWork(row: MinecraftWorkRow): MinecraftWork {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    description: row.description ?? '',
    modelUrl: row.model_path ?? undefined,
    screenshotUrl: row.screenshot_path ?? undefined,
    makeCodeUrl: row.make_code_url ?? undefined,
    createdAt: row.created_at.split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Asset Download & Cache
// ---------------------------------------------------------------------------

/**
 * Supabase Storage からアセットをダウンロードして IndexedDB にキャッシュする。
 * 既にキャッシュ済みの場合はスキップ。
 *
 * @returns ローカルキャッシュのキー（`sb_asset:{storagePath}`）
 * @throws ダウンロード失敗時にエラーを投げる
 */
async function downloadAndCacheAsset(storagePath: string): Promise<string> {
  const cacheKey = `${ASSET_KEY_PREFIX}${storagePath}`;

  if (await assetExists(cacheKey)) {
    return cacheKey;
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `アセットのダウンロードに失敗: ${storagePath} — ${error?.message ?? 'データなし'}`,
    );
  }

  await saveAsset(data, cacheKey);
  return cacheKey;
}

/**
 * Storage パスからフォールバック用の公開 URL を生成する。
 * アセットのローカルキャッシュに失敗した場合にのみ使用。
 */
function getPublicFallbackUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  return data?.publicUrl ?? storagePath;
}

/**
 * Storage パスをローカルキーに解決する。
 * ダウンロード失敗時は公開 URL をフォールバックとして使用する。
 *
 * @returns `idb://{cacheKey}` 形式の文字列、またはフォールバック URL
 */
async function resolveAssetUrl(
  storagePath: string | null | undefined,
  errors: string[],
  onDownloaded: () => void,
): Promise<string | undefined> {
  if (!storagePath) return undefined;

  try {
    const cacheKey = await downloadAndCacheAsset(storagePath);
    onDownloaded();
    return `idb://${cacheKey}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
    console.warn(`[SyncService] ${msg}`);
    return getPublicFallbackUrl(storagePath);
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers (Supabase クエリ)
// ---------------------------------------------------------------------------

async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`profiles 取得エラー: ${error.message}`);
  return data ?? [];
}

async function fetchCards(): Promise<CardRow[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`cards 取得エラー: ${error.message}`);
  return data ?? [];
}

async function fetchMinecraftWorks(): Promise<MinecraftWorkRow[]> {
  const { data, error } = await supabase
    .from('minecraft_works')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`minecraft_works 取得エラー: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Main Sync
// ---------------------------------------------------------------------------

/**
 * 全データの同期を実行する。
 *
 * 1. Supabase から profiles / cards / minecraft_works を並列取得
 * 2. 各レコードに紐づくアセット（画像・3Dモデル）をダウンロードして IndexedDB にキャッシュ
 * 3. アプリ内型に変換し LocalCache へ保存
 *
 * @param onProgress 進捗メッセージを受け取るオプションコールバック
 */
export async function syncAll(
  onProgress?: SyncProgressCallback,
): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      studentsUpdated: 0,
      cardsUpdated: 0,
      worksUpdated: 0,
      assetsDownloaded: 0,
      errors: ['Supabase が設定されていません。.env を確認してください。'],
    };
  }

  const errors: string[] = [];
  let assetsDownloaded = 0;
  const countAsset = () => {
    assetsDownloaded++;
  };

  // --------------------------------------------------
  // 1. Supabase から並列フェッチ
  // --------------------------------------------------
  onProgress?.('Supabase からデータを取得中…');

  const [profileResult, workResult, cardResult] = await Promise.allSettled([
    fetchProfiles(),
    fetchMinecraftWorks(),
    fetchCards(),
  ]);

  const profileRows =
    profileResult.status === 'fulfilled' ? profileResult.value : [];
  const workRows =
    workResult.status === 'fulfilled' ? workResult.value : [];
  const cardRows =
    cardResult.status === 'fulfilled' ? cardResult.value : [];

  if (profileResult.status === 'rejected') {
    errors.push(`Profiles: ${String(profileResult.reason)}`);
  }
  if (workResult.status === 'rejected') {
    errors.push(`Works: ${String(workResult.reason)}`);
  }
  if (cardResult.status === 'rejected') {
    errors.push(`Cards: ${String(cardResult.reason)}`);
  }

  // --------------------------------------------------
  // 2. Minecraft Works の変換とアセットキャッシュ
  // --------------------------------------------------
  onProgress?.(`作品データを処理中… (${workRows.length} 件)`);

  const allWorks: MinecraftWork[] = [];
  const worksByStudent = new Map<string, MinecraftWork[]>();

  for (const row of workRows) {
    const work = mapWorkRowToMinecraftWork(row);

    // 3D モデル (.glb) のダウンロードとキャッシュ
    const resolvedModel = await resolveAssetUrl(
      row.model_path,
      errors,
      countAsset,
    );
    if (resolvedModel) work.modelUrl = resolvedModel;

    // スクリーンショットのダウンロードとキャッシュ
    const resolvedScreenshot = await resolveAssetUrl(
      row.screenshot_path,
      errors,
      countAsset,
    );
    if (resolvedScreenshot) work.screenshotUrl = resolvedScreenshot;

    allWorks.push(work);

    const group = worksByStudent.get(row.student_id) ?? [];
    group.push(work);
    worksByStudent.set(row.student_id, group);
  }

  // --------------------------------------------------
  // 3. Cards の変換とアセットキャッシュ
  // --------------------------------------------------
  onProgress?.(`カードデータを処理中… (${cardRows.length} 件)`);

  const allCards: CardData[] = [];

  for (const row of cardRows) {
    const card = mapCardRowToCardData(row);

    // カード画像のダウンロードとキャッシュ
    const resolvedImage = await resolveAssetUrl(
      row.image_path,
      errors,
      countAsset,
    );
    if (resolvedImage) card.imageUrl = resolvedImage;

    allCards.push(card);
  }

  // --------------------------------------------------
  // 4. Students の組み立て
  // --------------------------------------------------
  onProgress?.(`生徒データを組み立て中… (${profileRows.length} 件)`);

  const existingStudents = await getCachedStudents();
  const existingMap = new Map(existingStudents.map((s) => [s.id, s]));

  const allStudents: Student[] = profileRows.map((profile) => {
    const projects = worksByStudent.get(profile.id) ?? [];
    const existing = existingMap.get(profile.id);
    return mapProfileToStudent(profile, projects, existing);
  });

  // --------------------------------------------------
  // 5. LocalCache へ保存
  // --------------------------------------------------
  onProgress?.('ローカルキャッシュを更新中…');

  await setCachedStudents(allStudents);
  await setCachedCards(allCards);
  await setCachedMinecraftWorks(allWorks);
  await setLastSyncAt(new Date().toISOString());

  onProgress?.('同期完了');

  return {
    success: errors.length === 0,
    studentsUpdated: profileRows.length,
    cardsUpdated: cardRows.length,
    worksUpdated: workRows.length,
    assetsDownloaded,
    errors,
  };
}
