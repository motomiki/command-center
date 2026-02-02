/**
 * localStorage の容量制限に合わせ、大きな Data URL アバターを縮小する。
 * AI生成アイコンなどの base64 を、PFP 用の小さな JPEG に変換する。
 */
const DEFAULT_MAX_PX = 256;
const DEFAULT_QUALITY = 0.85;
/** このバイト数を超える data URL は縮小対象 */
const RESIZE_THRESHOLD_BYTES = 80 * 1024;

/**
 * Data URL 形式の画像を指定サイズにリサイズし、JPEG の Data URL として返す。
 * 閾値未満の場合はそのまま返す。リサイズ失敗時は元の文字列を返す。
 */
export function resizeAvatarDataUrl(
  dataUrl: string,
  maxPx: number = DEFAULT_MAX_PX,
  quality: number = DEFAULT_QUALITY
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return Promise.resolve(dataUrl);
  }
  const sizeBytes = new Blob([dataUrl]).size;
  if (sizeBytes <= RESIZE_THRESHOLD_BYTES) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = maxPx;
        canvas.height = maxPx;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        const sourceSize = Math.min(img.width, img.height);
        const sx = (img.width - sourceSize) / 2;
        const sy = (img.height - sourceSize) / 2;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, maxPx, maxPx);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
