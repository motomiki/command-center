import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { saveAsset, getAsset } from '@/utils/assetStore';
import { withTimeout } from '@/utils/timeout';

const DEFAULT_BUCKET = 'assets';
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Supabase Storage にファイルをアップロードし、保存パスを返す。
 *
 * Supabase が未設定の場合は IndexedDB にのみ保存し、
 * `idb://{assetId}` 形式のローカルパスを返す（開発時フォールバック）。
 *
 * @param file アップロードするファイル（File または Blob）
 * @param storagePath Storage 内の保存先パス（例: `{studentId}/{workId}/model.glb`）
 * @param bucket Storage バケット名（デフォルト: `assets`）
 * @returns Supabase 設定時は Storage パス、未設定時は `idb://{assetId}` 形式の文字列
 */
export async function uploadAsset(
  file: File | Blob,
  storagePath: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<string> {
  if (!isSupabaseConfigured) {
    // 開発モード: IndexedDB にのみ保存
    const assetId = await saveAsset(file);
    return `idb://${assetId}`;
  }

  // 本番モード: Supabase Storage にアップロード（タイムアウト付き）
  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  const { error } = await withTimeout(
    uploadPromise,
    UPLOAD_TIMEOUT_MS,
    'ファイルのアップロードがタイムアウトしました。ネットワークを確認してください。',
  );

  if (error) {
    throw new Error(`ファイルのアップロードに失敗しました: ${error.message}`);
  }

  // 教師端末でのプレビュー用にローカルキャッシュにも保存
  await saveAsset(file, `sb_asset:${storagePath}`);

  return storagePath;
}

/**
 * アセットの Storage パスを生成する。
 *
 * フォルダ構成: `/{studentId}/{workId}/{filename}`
 *
 * @param studentId 生徒 ID
 * @param workId 作品 ID
 * @param filename ファイル名（例: `model.glb`, `screenshot.png`）
 */
export function buildAssetPath(
  studentId: string,
  workId: string,
  filename: string,
): string {
  return `${studentId}/${workId}/${filename}`;
}

/**
 * ファイル（File ref）またはローカル IDB キーから、保存用 URL を解決する。
 *
 * - `file` が存在する場合: uploadAsset で Storage にアップロード（Supabase 設定時）
 * - `file` が null で `localAssetId` がある場合:
 *   - Supabase 設定時: IDB から Blob を取り出してアップロード
 *   - 未設定時: `idb://{localAssetId}` をそのまま返す
 * - 両方 falsy の場合: undefined を返す
 *
 * @param file File オブジェクト（ドラッグ&ドロップで取得したもの）
 * @param localAssetId IndexedDB のアセットキー（下書き復元時に利用）
 * @param storagePath Supabase Storage のアップロード先パス
 * @returns 保存用 URL（Storage パス or `idb://` パス or undefined）
 */
export async function resolveAssetForSave(
  file: File | null,
  localAssetId: string,
  storagePath: string,
): Promise<string | undefined> {
  if (file) {
    return uploadAsset(file, storagePath);
  }

  if (!localAssetId) return undefined;

  if (isSupabaseConfigured) {
    // 下書き復元: IDB から Blob を読み出してアップロード
    const blob = await getAsset(localAssetId);
    if (blob) {
      return uploadAsset(blob, storagePath);
    }
  }

  return `idb://${localAssetId}`;
}
