import { GoogleGenAI } from '@google/genai';
import type { AIModelType } from '@/services/aiService';
import type { Rarity } from '@/types/card';
import { trimUniformBorders } from '@/utils/trimUniformBorders';

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

/** 絵のタッチ（画風）の選択肢。UIでボタン選択する値と一致させる。 */
export type ArtStyleKey =
  | 'fantasy'
  | 'anime'
  | 'manga'
  | 'painting'
  | 'pixel';

/** 画風キー → AIプロンプト用のスタイル説明（テキストLLMへの入力にも使用） */
const ART_STYLE_PROMPTS: Record<ArtStyleKey, string> = {
  fantasy:
    'ファンタジー風、魔法や冒険の世界観、温かみのある色彩、子ども向けで夢のあるイラスト。',
  anime:
    'アニメ風、クリーンな線画、鮮やかな色使い、日本のアニメ・イラストスタイル。',
  manga:
    '漫画風、はっきりした線、コントラストの効いたトーン、動きのある構図。',
  painting:
    '絵画風、筆のタッチがわかる質感、芸術的な雰囲気、子どもにも親しみやすいタッチ。',
  pixel:
    'ドット絵風、レトロなピクセルアート、はっきりした色と形、ゲーム風。',
};

/** テキスト生成用モデル（プロンプト最適化に使用） */
const TEXT_MODEL_FOR_PROMPT = 'gemini-2.5-flash-lite';

/**
 * テキスト理解用LLMでタイトル・コメント・画風から画像用プロンプト文を生成する。
 * 返却は英語の詳細プロンプト（画像生成APIにそのまま渡す想定）。
 */
async function generateOptimizedPrompt(
  apiKey: string,
  title: string,
  description: string,
  artStyleKey: ArtStyleKey
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const styleDesc = ART_STYLE_PROMPTS[artStyleKey];
  const userPrompt = `You are an expert prompt engineer for AI image generation. Generate a single, detailed, high-quality prompt in English that will be sent to an image generation model.

Input from the user (title and comment may be in Japanese):
- Title: ${title.trim() || '(none)'}
- Comment/Description: ${description.trim() || '(none)'}
- Visual style to apply strictly: ${styleDesc}

Requirements for your output:
1. Output ONLY the English image-generation prompt. No explanations, no "Prompt:" prefix, no markdown.
2. Expand on the title and description to create a vivid, specific scene suitable for a child-friendly trading card illustration.
3. Apply the given visual style precisely in the prompt.
4. Include these constraints in your prompt: no text or letters in the image, no borders or frames, full bleed to the edges, high quality illustration, edge to edge.
5. Keep the prompt to 2-4 clear, descriptive sentences.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: TEXT_MODEL_FOR_PROMPT,
      contents: [{ role: 'user' as const, parts: [{ text: userPrompt }] }],
    });
  } catch (err) {
    if (isQuotaExceeded(err)) {
      const retryAfterSeconds = parseRetryAfterSeconds(err);
      const base =
        '無料枠のリミットに達しました。しばらく待ってからもう一度お試しください。';
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

  const part = response.candidates?.[0]?.content?.parts?.[0];
  const text = part && 'text' in part ? (part as { text: string }).text : undefined;
  if (!text || typeof text !== 'string') {
    throw new Error('プロンプトの生成に失敗しました。テキストが返ってきませんでした。');
  }
  return text.trim();
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
    responseModalities: ['IMAGE'] as unknown as string[],
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
  const inline = part.inlineData as { mimeType?: string; data?: string } | undefined;
  if (!inline?.mimeType || !inline?.data) {
    throw new Error('AIからの応答に画像データが含まれていませんでした。');
  }
  return `data:${inline.mimeType};base64,${inline.data}`;
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
  modelType: AIModelType;
  title: string;
  description?: string;
  artStyle: ArtStyleKey;
  rarity?: Rarity;
}

/** 画像生成プロンプト末尾に付与する制約（余白・文字禁止の徹底） */
const IMAGE_PROMPT_CONSTRAINT_SUFFIX =
  ' No text, no letters, no logos. No white or black border, no frame, no margin. Full bleed only, edge to edge.';

/**
 * カード用画像を AI で生成し、PNG Blob で返す。
 * 2段構成: (1) テキストLLMでタイトル・コメント・画風から最適化プロンプト生成 (2) 画像LLMで描画。
 */
export async function generateCardImage(
  options: GenerateCardImageOptions
): Promise<Blob> {
  const { apiKey, modelType, title, description = '', artStyle } = options;
  if (!apiKey?.trim()) {
    throw new Error('Gemini API Key を入力してください。');
  }
  const optimizedPrompt = await generateOptimizedPrompt(
    apiKey,
    title,
    description,
    artStyle
  );
  const finalPrompt = optimizedPrompt + IMAGE_PROMPT_CONSTRAINT_SUFFIX;
  const dataUrl = await generateCardArtDataUrl(apiKey, finalPrompt, modelType);
  const trimmedDataUrl = await trimUniformBorders(dataUrl);
  const blob = await resizeToCardArt(trimmedDataUrl);
  return blob;
}
