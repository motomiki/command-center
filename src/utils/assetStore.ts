import { set, get, del } from 'idb-keyval';

/**
 * Saves a file (Blob) to IndexedDB.
 * @param file The file to save
 * @param customId Optional — 指定した場合はそのキーで保存する。
 *                 省略時は一意な ID を自動生成する。
 * @returns 保存に使用したキー
 */
export async function saveAsset(
  file: File | Blob,
  customId?: string,
): Promise<string> {
  const id =
    customId ??
    `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await set(id, file);
  return id;
}

/**
 * Retrieves an asset from IndexedDB.
 * @param id The unique ID of the asset
 * @returns The file (Blob) or undefined
 */
export async function getAsset(id: string): Promise<Blob | undefined> {
  return await get(id);
}

/**
 * Checks whether an asset with the given key exists in IndexedDB.
 * @param id The unique ID of the asset
 * @returns true if a value is stored for that key
 */
export async function assetExists(id: string): Promise<boolean> {
  const value = await get(id);
  return value != null;
}

/**
 * Creates an object URL for an asset stored in IndexedDB.
 * Useful for previewing images/models.
 * NOTE: Caller must revoke the URL when done!
 * @param id The unique ID of the asset
 * @returns Object URL string or undefined
 */
export async function getAssetUrl(id: string): Promise<string | undefined> {
  const blob = await getAsset(id);
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
}

/**
 * Deletes an asset from IndexedDB.
 * @param id The unique ID of the asset
 */
export async function deleteAsset(id: string): Promise<void> {
  await del(id);
}
