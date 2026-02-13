/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Cloud Functions（Vertex AI）の HTTP トリガー URL。未設定時は「AIで文生成」は非表示。 */
  readonly VITE_VERTEX_AI_FUNCTION_URL: string;
}

