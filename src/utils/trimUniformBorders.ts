/**
 * 生成画像の上下左右の「一色枠」を検出してトリムする。
 * プロンプトで防ぎきれない白・黒枠を後処理で除去し、品質を安定させる。
 */

const DEFAULT_MAX_BORDER_PX = 60;
const DEFAULT_COLOR_TOLERANCE = 15;
const DEFAULT_MIN_CONTENT_RATIO = 0.5;

export interface TrimUniformBordersOptions {
  /** 一色とみなしてトリムする最大ピクセル幅（デフォルト: 60） */
  maxBorderPx?: number;
  /** 同一色とみなす R,G,B 各チャンネル差の許容値 0–255（デフォルト: 15） */
  colorTolerance?: number;
  /** トリム後の幅/高さが元のこの割合未満ならトリムしない（デフォルト: 0.5） */
  minContentRatio?: number;
}

function isUniformRow(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  tolerance: number
): boolean {
  const rowStart = (y * width) * 4;
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let x = 0; x < width; x++) {
    const i = rowStart + x * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }
  return (maxR - minR) <= tolerance && (maxG - minG) <= tolerance && (maxB - minB) <= tolerance;
}

function isUniformColumn(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  tolerance: number
): boolean {
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let y = 0; y < height; y++) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }
  return (maxR - minR) <= tolerance && (maxG - minG) <= tolerance && (maxB - minB) <= tolerance;
}

/**
 * Data URL の画像から、上下左右の一色枠を検出してトリムした Data URL を返す。
 * トリム後が minContentRatio 未満になる場合はトリムせず元の dataUrl を返す。
 */
export function trimUniformBorders(
  dataUrl: string,
  options: TrimUniformBordersOptions = {}
): Promise<string> {
  const maxBorderPx = options.maxBorderPx ?? DEFAULT_MAX_BORDER_PX;
  const colorTolerance = options.colorTolerance ?? DEFAULT_COLOR_TOLERANCE;
  const minContentRatio = options.minContentRatio ?? DEFAULT_MIN_CONTENT_RATIO;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      let top = 0;
      for (let y = 0; y < Math.min(maxBorderPx, h); y++) {
        if (!isUniformRow(data, w, y, colorTolerance)) break;
        top = y + 1;
      }

      let bottom = h;
      for (let y = h - 1; y >= Math.max(0, h - maxBorderPx); y--) {
        if (!isUniformRow(data, w, y, colorTolerance)) break;
        bottom = y;
      }

      let left = 0;
      for (let x = 0; x < Math.min(maxBorderPx, w); x++) {
        if (!isUniformColumn(data, w, h, x, colorTolerance)) break;
        left = x + 1;
      }

      let right = w;
      for (let x = w - 1; x >= Math.max(0, w - maxBorderPx); x--) {
        if (!isUniformColumn(data, w, h, x, colorTolerance)) break;
        right = x;
      }

      const trimmedW = right - left;
      const trimmedH = bottom - top;
      if (trimmedW < w * minContentRatio || trimmedH < h * minContentRatio) {
        resolve(dataUrl);
        return;
      }
      if (top === 0 && bottom === h && left === 0 && right === w) {
        resolve(dataUrl);
        return;
      }

      const out = document.createElement('canvas');
      out.width = trimmedW;
      out.height = trimmedH;
      const outCtx = out.getContext('2d');
      if (!outCtx) {
        resolve(dataUrl);
        return;
      }
      outCtx.drawImage(
        img,
        left, top, trimmedW, trimmedH,
        0, 0, trimmedW, trimmedH
      );
      try {
        resolve(out.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
