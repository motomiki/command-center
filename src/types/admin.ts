/**
 * 管理画面用の型定義
 */

/**
 * フォームバリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * フォーム送信状態
 */
export type FormSubmitState = 'idle' | 'submitting' | 'success' | 'error';

