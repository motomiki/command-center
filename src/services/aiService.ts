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
