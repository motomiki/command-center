/**
 * Vertex AI 連携（Cloud Functions 経由）。
 * API キーをフロントに露出させず、必須2（Vertex AI）を満たすための呼び出し先。
 */

const BASE_URL = import.meta.env.VITE_VERTEX_AI_FUNCTION_URL ?? '';

export interface CardTextResult {
  title: string;
  description: string;
  praiseWords: string;
}

export interface PromptOptimizeResult {
  optimizedPrompt: string;
}

/** Cloud Functions の URL が設定されているか */
export function isVertexAiAvailable(): boolean {
  return typeof BASE_URL === 'string' && BASE_URL.length > 0;
}

/**
 * カード用テキスト（タイトル・コメント・褒め言葉）を Vertex AI 経由で生成する。
 * @param activityType - 活動の種類（typing | minecraft）
 * @param context - 補足（例: "WPM 30 達成"）
 */
export async function generateCardText(
  activityType: 'typing' | 'minecraft',
  context: string = ''
): Promise<CardTextResult> {
  if (!isVertexAiAvailable()) {
    throw new Error(
      'Vertex AI の URL が設定されていません。VITE_VERTEX_AI_FUNCTION_URL をビルド時に設定してください。'
    );
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'card_text',
      activityType,
      context: context.trim(),
    }),
  });

  const rawBody = await res.text();
  const data: { error?: string; title?: string; description?: string; praiseWords?: string } =
    (() => {
      try {
        return rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return {};
      }
    })();

  if (!res.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : rawBody.trim()
          ? `リクエストに失敗しました（${res.status}）: ${rawBody.slice(0, 200)}`
          : `リクエストに失敗しました（${res.status}）`;
    console.error('[Vertex AI card_text]', res.status, data?.error ?? rawBody.slice(0, 500));
    throw new Error(message);
  }

  return {
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    praiseWords: typeof data.praiseWords === 'string' ? data.praiseWords : '',
  };
}

/**
 * 画像生成用の英語プロンプトを Vertex AI 経由で最適化する。
 * タイトル・コメント・画風から 1 本のプロンプト文を返す。
 */
export async function optimizeImagePrompt(
  title: string,
  description: string,
  artStyle: string
): Promise<PromptOptimizeResult> {
  if (!isVertexAiAvailable()) {
    throw new Error(
      'Vertex AI の URL が設定されていません。VITE_VERTEX_AI_FUNCTION_URL をビルド時に設定してください。'
    );
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prompt_optimize',
      title: title.trim(),
      description: description.trim(),
      artStyle,
    }),
  });

  const rawBody = await res.text();
  const data: { error?: string; optimizedPrompt?: string } = (() => {
    try {
      return rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return {};
    }
  })();

  if (!res.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : rawBody.trim()
          ? `プロンプトの生成に失敗しました（${res.status}）: ${rawBody.slice(0, 200)}`
          : `プロンプトの生成に失敗しました（${res.status}）`;
    console.error('[Vertex AI prompt_optimize]', res.status, data?.error ?? rawBody.slice(0, 500));
    throw new Error(message);
  }

  const optimizedPrompt = typeof data.optimizedPrompt === 'string' ? data.optimizedPrompt : '';
  if (!optimizedPrompt) {
    throw new Error('プロンプトの生成に失敗しました。テキストが返ってきませんでした。');
  }

  return { optimizedPrompt };
}
