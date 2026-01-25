import { set, get, del } from 'idb-keyval';

/**
 * Saves a file (Blob) to IndexedDB and returns a unique key.
 * @param file The file to save
 * @returns The unique ID for the asset
 */
export async function saveAsset(file: File | Blob): Promise<string> {
  const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
