import { GoogleGenAI } from '@google/genai';
import type { AIModelType } from '@/services/aiService';
import type { Rarity } from '@/types/card';

/** カードのイラストスロットは 2:3 カードの 65% 高さでほぼ 1:1。生成は 1:1 に統一して余白を防ぐ。 */
const CARD_ART_WIDTH = 520;
const CARD_ART_HEIGHT = 520;

/** 429 時に投げるエラー。retryAfterSeconds で「○秒後に再試行」表示に利用可能 */
export interface QuotaExceededError extends Error {
  retryAfterSeconds?: number;
}

const RETRY_IN_RE = /\bretry in (\d+(?:\.\d+)?)\s*s/i;

function isQuotaExceeded(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as { status?: number }).status;
    const code = (err as { code?: number }).code;
    const message = (err as { message?: string }).message ?? '';
    if (status === 429 || code === 429) return true;
    const lower = message.toLowerCase();
    if (
      lower.includes('resource_exhausted') ||
      lower.includes('429') ||
      lower.includes('quota')
    ) {
      return true;
    }
  }
  return false;
}

function parseRetryAfterSeconds(err: unknown): number | undefined {
  const message = err && typeof err === 'object' ? (err as { message?: string }).message ?? '' : '';
  const match = message.match(RETRY_IN_RE);
  if (match) {
    const sec = parseFloat(match[1]);
    return Number.isFinite(sec) ? Math.ceil(sec) : undefined;
  }
  return undefined;
}

/**
 * プロンプトをTCG用に補強する（品質向上のための自動最適化）
 */
function buildCardPrompt(userPrompt: string, title: string): string {
  const base = userPrompt.trim() || title.trim() || 'トレーディングカード';
  const style =
    '高品質なイラスト、ファンタジーまたはテック風、子ども向けで温かみのある画風。';
  const constraint =
    'カード用の正方形に近い構図。画像内に文字やロゴは描かないでください。';
  return `${style}テーマ: ${base}。${constraint}`;
}

/**
 * Gemini API でカード用イラストを生成し、Data URL を返す。
 * 429 (RESOURCE_EXHAUSTED) 時はユーザー向けメッセージと retryAfterSeconds 付きの Error を throw する。
 */
async function generateCardArtDataUrl(
  apiKey: string,
  prompt: string,
  modelType: AIModelType
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const targetModel =
    modelType === 'flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  const config = {
    responseModalities: ['IMAGE'] as const,
    imageConfig: { aspectRatio: '1:1' as const },
  };
  const contents = [{ role: 'user' as const, parts: [{ text: prompt }] }];

  let response;
  try {
    response = await ai.models.generateContent({
      model: targetModel,
      config,
      contents,
    });
  } catch (err) {
    if (isQuotaExceeded(err)) {
      const retryAfterSeconds = parseRetryAfterSeconds(err);
      const base =
        '無料枠のリミットに達しました。しばらく待ってからもう一度お試しください。利用状況は Gemini API のドキュメント（https://ai.google.dev/gemini-api/docs/rate-limits）で確認できます。';
      const suffix =
        retryAfterSeconds != null
          ? ` 約${retryAfterSeconds}秒後に再試行できます。`
          : ' 約1分後に再試行できます。';
      const quotaErr = new Error(base + suffix) as QuotaExceededError;
      quotaErr.retryAfterSeconds = retryAfterSeconds ?? 60;
      throw quotaErr;
    }
    throw err;
  }

  if (
    !response.candidates?.[0]?.content?.parts?.[0]?.inlineData
  ) {
    throw new Error('AIからの応答に画像データが含まれていませんでした。');
  }

  const part = response.candidates[0].content.parts[0];
  const { mimeType, data } = part.inlineData;
  return `data:${mimeType};base64,${data}`;
}

/**
 * 画像を指定サイズに中央トリミング（cover）でリサイズし、Canvas で描画して Blob で返す。
 * AI が返すアスペクト比が多少ずれても余白が出ないようにする。
 */
function resizeToCardArt(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CARD_ART_WIDTH;
      canvas.height = CARD_ART_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context を取得できませんでした。'));
        return;
      }
      const scale = Math.max(
        CARD_ART_WIDTH / img.naturalWidth,
        CARD_ART_HEIGHT / img.naturalHeight
      );
      const cropWidth = CARD_ART_WIDTH / scale;
      const cropHeight = CARD_ART_HEIGHT / scale;
      const cropX = (img.naturalWidth - cropWidth) / 2;
      const cropY = (img.naturalHeight - cropHeight) / 2;
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        CARD_ART_WIDTH,
        CARD_ART_HEIGHT
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Blob の生成に失敗しました。'))),
        'image/png',
        0.92
      );
    };
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    img.src = dataUrl;
  });
}

export interface GenerateCardImageOptions {
  apiKey: string;
  prompt: string;
  modelType: AIModelType;
  title: string;
  description?: string;
  rarity?: Rarity;
}

/**
 * カード用画像を AI で生成し、PNG Blob で返す。
 * 管理画面から呼び出し、返却 Blob を saveAsset してカードに紐づける。
 */
export async function generateCardImage(
  options: GenerateCardImageOptions
): Promise<Blob> {
  const { apiKey, prompt, modelType, title } = options;
  if (!apiKey?.trim()) {
    throw new Error('Gemini API Key を入力してください。');
  }
  const finalPrompt = buildCardPrompt(prompt, title);
  const dataUrl = await generateCardArtDataUrl(apiKey, finalPrompt, modelType);
  const blob = await resizeToCardArt(dataUrl);
  return blob;
}
