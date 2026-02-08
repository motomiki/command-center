import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ---------------------------------------------------------------------------
// 環境変数の読み取り
// ---------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ---------------------------------------------------------------------------
// バリデーション
// ---------------------------------------------------------------------------

/** URL の基本形式チェック（https://*.supabase.co） */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

/** Anon Key の基本形式チェック（JWT 形式: header.payload.signature） */
function isValidAnonKey(key: string): boolean {
  return key.split('.').length === 3 && key.length > 100;
}

/**
 * 環境変数が設定され、かつ形式が正しいかどうか。
 * 未設定時は Mock リポジトリにフォールバックする制御に利用。
 */
export const isSupabaseConfigured: boolean = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase] VITE_SUPABASE_URL または VITE_SUPABASE_ANON_KEY が未設定です。Mock モードで動作します。\n' +
      '  → .env.example を参考に .env ファイルを作成してください。',
    );
    return false;
  }

  if (!isValidSupabaseUrl(supabaseUrl)) {
    console.error(
      `[Supabase] VITE_SUPABASE_URL の形式が不正です: "${supabaseUrl}"\n` +
      '  → https://<project-ref>.supabase.co の形式で設定してください。',
    );
    return false;
  }

  if (!isValidAnonKey(supabaseAnonKey)) {
    console.error(
      '[Supabase] VITE_SUPABASE_ANON_KEY の形式が不正です。\n' +
      '  → Supabase ダッシュボード > Settings > API からコピーしてください。',
    );
    return false;
  }

  return true;
})();

// ---------------------------------------------------------------------------
// シングルトンクライアント
// ---------------------------------------------------------------------------

/**
 * 型安全な Supabase クライアント（シングルトン）。
 *
 * 未設定時もクライアントは生成されるが、API 呼び出しは失敗する。
 * 必ず `isSupabaseConfigured` でガードしてから使用すること。
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);

// ---------------------------------------------------------------------------
// 診断ヘルパー
// ---------------------------------------------------------------------------

/** 現在の Supabase 接続設定の診断情報を返す（デバッグ用） */
export function getSupabaseDiagnostics(): {
  configured: boolean;
  urlSet: boolean;
  keySet: boolean;
  urlValid: boolean;
  keyValid: boolean;
} {
  return {
    configured: isSupabaseConfigured,
    urlSet: Boolean(supabaseUrl),
    keySet: Boolean(supabaseAnonKey),
    urlValid: isValidSupabaseUrl(supabaseUrl),
    keyValid: isValidAnonKey(supabaseAnonKey),
  };
}
