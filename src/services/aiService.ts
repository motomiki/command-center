import { GoogleGenAI } from '@google/genai';

export type AIModelType = 'flash' | 'pro';
export type AvatarStyleType = 'anime' | 'pixel';

/**
 * Geminiを使用して生徒のアイコン画像を生成する（Base64形式のData URLで返却）
 */
export async function generateStudentIcon(
  prompt: string,
  apiKey: string,
  modelType: AIModelType = 'flash',
  gender: 'boy' | 'girl' = 'boy',
  style: AvatarStyleType = 'anime'
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  // モデルの選択 - flash の場合は画像生成対応のモデルを使用
  const targetModel = modelType === 'flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

  const config = {
    responseModalities: [
      'IMAGE',
    ],
  };

  const genderText = gender === 'boy' ? '男の子' : '女の子';
  
  // スタイル別のプロンプト構築
  const stylePrompt = style === 'anime'
    ? `高品質な日本のアニメ風（Anime Style）イラスト。セルシェーディング、鮮やかな色彩、表情豊かでかわいらしい`
    : `レトロゲーム風のドット絵（Pixel Art）。16ビット風、ピクセルパーフェクト、ノスタルジックでかわいらしい`;
  
  const finalPrompt = `${stylePrompt}${genderText}のキャラクターアイコン（PFP / プロフィール画像）を1枚生成してください。正面または斜め向きの顔アップ構図。背景はシンプルな単色にしてください。テーマ: ${prompt}`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: finalPrompt,
        },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      config: config,
      contents,
    });

    if (!response.candidates || !response.candidates[0].content || !response.candidates[0].content.parts) {
      throw new Error('AIからの応答に画像データが含まれていませんでした。');
    }

    const part = response.candidates[0].content.parts[0];

    if (part.inlineData) {
      const inlineData = part.inlineData;
      return `data:${inlineData.mimeType};base64,${inlineData.data}`;
    } else {
      // テキストのみが返ってきた場合のフォールバック（通常は起こらない設定）
      console.warn('Expected image but got text:', response.text);
      throw new Error('画像が生成されませんでした。プロンプトを見直してください。');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    if (error instanceof Error && error.message.includes('model not found')) {
      throw new Error(`モデル ${targetModel} が見つかりませんでした。APIキーが画像生成に対応しているか確認してください。`);
    }
    throw new Error('AI画像の生成に失敗しました。APIキーまたはネットワークを確認してください。');
  }
}

/** 画像から Base64 と MIME を取得（Gemini 用） */
function fileToBase64(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error('画像の読み込みに失敗しました。'));
        return;
      }
      resolve({ mimeType: match[1], data: match[2] });
    };
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    reader.readAsDataURL(file);
  });
}

export interface MinecraftDataResult {
  title: string;
  description: string;
}

const MINECRAFT_ANALYZE_PROMPT = `この画像は、小学生が作った Minecraft（マインクラフト）の作品のスクリーンショットです。
画像の内容を分析し、次の 2 つを日本語で出力してください。小学生が読んでワクワクする、やさしくて短い表現にしてください。

1. **title**: 作品のタイトル（10文字程度まで。カタカナ・ひらがな中心で、かっこいい・かわいい名前）
2. **description**: 作品の説明（1文、または簡潔な2文まで。ブロックの色・形・スケールなど、見た目のポイントをほめるような文）

出力は必ず次の JSON 形式のみにしてください。他の説明や改行は入れないでください。
{"title":"ここにタイトル","description":"ここに説明文"}`;

/**
 * Minecraft のスクリーンショット画像を分析し、作品名と説明文を生成する。
 * 小学生向けの平易な日本語で、1〜2文の簡潔な説明を返す。
 */
export async function generateMinecraftData(
  imageFile: File,
  apiKey: string
): Promise<MinecraftDataResult> {
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-1.5-flash';

  const { mimeType, data } = await fileToBase64(imageFile);

  const contents = [
    {
      role: 'user' as const,
      parts: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        {
          text: MINECRAFT_ANALYZE_PROMPT,
        },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const rawText = part && 'text' in part ? (part as { text: string }).text : undefined;
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('AIからの応答にテキストが含まれていませんでした。');
    }

    const trimmed = rawText.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
    const parsed = JSON.parse(jsonStr) as { title?: string; description?: string };

    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';

    if (!title) {
      throw new Error('AIがタイトルを生成できませんでした。');
    }

    return {
      title: title || 'Minecraft作品',
      description: description || 'ブロックでつくった作品です。',
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('AIの応答の解析に失敗しました。もう一度お試しください。');
    }
    if (error instanceof Error) {
      if (error.message.includes('model not found') || error.message.includes('404')) {
        throw new Error('指定のAIモデルが見つかりませんでした。APIキーを確認してください。');
      }
      throw error;
    }
    throw new Error('画像の分析に失敗しました。APIキーまたはネットワークを確認してください。');
  }
}
