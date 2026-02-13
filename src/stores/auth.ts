import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { withTimeout } from '@/utils/timeout';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** ユーザーの役割 */
export type UserRole = 'teacher' | 'student';

/**
 * profiles テーブルから取得するプロフィール情報。
 * Database['public']['Tables']['profiles']['Row'] と互換だが、
 * Pinia ref のアンラップで TS2589 を避けるために独立定義する。
 */
export interface AuthProfile {
  id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  typing_history: unknown;
  /** URL・ログイン用の管理しやすいID（例: student-1）。生徒のみ設定、先生は null。 */
  login_id: string | null;
  updated_at: string;
  created_at: string;
}

/** 認証エラー情報 */
export interface AuthError {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// ユーザー向けエラーメッセージ変換
// ---------------------------------------------------------------------------

function toFriendlyError(error: { message: string }): AuthError {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return {
      code: 'invalid_credentials',
      message: 'メールアドレスかパスワードがちがいます。もういちどたしかめてね。',
    };
  }
  if (msg.includes('email not confirmed')) {
    return {
      code: 'email_not_confirmed',
      message: 'メールアドレスがまだかくにんされていません。',
    };
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return {
      code: 'network_error',
      message: 'インターネットにつながっていないみたい。せつぞくをたしかめてね。',
    };
  }

  return {
    code: 'unknown',
    message: `ログインにしっぱいしました: ${error.message}`,
  };
}

// ---------------------------------------------------------------------------
// Store 定義
// ---------------------------------------------------------------------------

export const useAuthStore = defineStore('auth', () => {
  // ---- State ----
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const profile = ref<AuthProfile | null>(null);
  const loading = ref(true);
  const error = ref<AuthError | null>(null);
  /** 初期セッション復元が完了したかどうか */
  const initialized = ref(false);

  // ---- Getters ----
  const isAuthenticated = computed(() => !!session.value);
  const isTeacher = computed(() => profile.value?.role === 'teacher');
  const isStudent = computed(() => profile.value?.role === 'student');
  const displayName = computed(() => profile.value?.display_name ?? '');
  const userRole = computed<UserRole | null>(() => profile.value?.role ?? null);

  // ---- Internal Helpers ----

  /**
   * auth.users に紐づく profiles 行を取得し、state に格納する。
   * profiles が存在しない場合は null のまま（ログアウト同等の扱い）。
   */
  async function fetchProfile(userId: string): Promise<AuthProfile | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchErr) {
      console.error('[Auth] プロフィール取得エラー:', fetchErr.message);
      return null;
    }

    return data as unknown as AuthProfile;
  }

  // ---- Actions ----

  /**
   * アプリ起動時に呼び出し、既存セッションを復元する。
   * onAuthStateChange リスナーも登録する。
   */
  async function initialize(): Promise<void> {
    if (!isSupabaseConfigured) {
      loading.value = false;
      initialized.value = true;
      return;
    }

    try {
      // 既存セッションの復元
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        session.value = data.session;
        user.value = data.session.user;
        profile.value = await fetchProfile(data.session.user.id);
      }
    } catch (err) {
      console.error('[Auth] セッション復元エラー:', err);
    } finally {
      loading.value = false;
      initialized.value = true;
    }

    // セッション変更リスナー
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;

      if (newSession?.user) {
        profile.value = await fetchProfile(newSession.user.id);
      } else {
        profile.value = null;
      }

      // トークンリフレッシュ時のログ
      if (event === 'TOKEN_REFRESHED') {
        console.info('[Auth] セッショントークンが更新されました。');
      }
    });
  }

  /**
   * 先生用ログイン（メール + パスワード）
   */
  async function signInTeacher(
    email: string,
    password: string,
  ): Promise<boolean> {
    error.value = null;
    loading.value = true;

    try {
      if (!isSupabaseConfigured) {
        error.value = {
          code: 'not_configured',
          message: 'Supabase が設定されていません。.env を確認してください。',
        };
        return false;
      }

      const { data, error: signInErr } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInErr) {
        error.value = toFriendlyError(signInErr);
        return false;
      }

      session.value = data.session;
      user.value = data.user;
      profile.value = await fetchProfile(data.user.id);

      // 先生ロールかを検証
      if (profile.value?.role !== 'teacher') {
        error.value = {
          code: 'role_mismatch',
          message: 'このアカウントは先生用ではありません。',
        };
        await supabase.auth.signOut();
        session.value = null;
        user.value = null;
        profile.value = null;
        return false;
      }

      return true;
    } catch (err) {
      error.value = {
        code: 'unexpected',
        message: 'よそうがいのエラーがおきました。もういちどためしてね。',
      };
      console.error('[Auth] signInTeacher エラー:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 生徒用ログイン（生徒ID + パスワード）
   * 生徒IDは内部で `{studentId}@example.com` に変換する。
   */
  async function signInStudent(
    studentId: string,
    password: string,
  ): Promise<boolean> {
    error.value = null;
    loading.value = true;

    try {
      if (!isSupabaseConfigured) {
        error.value = {
          code: 'not_configured',
          message: 'Supabase が設定されていません。.env を確認してください。',
        };
        return false;
      }

      // 生徒IDからメールアドレスを構築
      const email = studentId.includes('@')
        ? studentId
        : `${studentId}@example.com`;

      const { data, error: signInErr } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInErr) {
        error.value = toFriendlyError(signInErr);
        return false;
      }

      session.value = data.session;
      user.value = data.user;
      profile.value = await fetchProfile(data.user.id);

      // 生徒ロールかを検証
      if (profile.value?.role !== 'student') {
        error.value = {
          code: 'role_mismatch',
          message: 'このアカウントは生徒用ではありません。',
        };
        await supabase.auth.signOut();
        session.value = null;
        user.value = null;
        profile.value = null;
        return false;
      }

      return true;
    } catch (err) {
      error.value = {
        code: 'unexpected',
        message: 'よそうがいのエラーがおきました。もういちどためしてね。',
      };
      console.error('[Auth] signInStudent エラー:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /** ログアウトのタイムアウト（ミリ秒） */
  const SIGNOUT_TIMEOUT_MS = 15_000;

  /**
   * ログアウト
   */
  async function signOut(): Promise<void> {
    loading.value = true;

    try {
      if (isSupabaseConfigured) {
        await withTimeout(
          supabase.auth.signOut(),
          SIGNOUT_TIMEOUT_MS,
          'ログアウトがタイムアウトしました。ネットワークを確認してください。',
        );
      }
    } catch (err) {
      console.error('[Auth] signOut エラー:', err);
    } finally {
      session.value = null;
      user.value = null;
      profile.value = null;
      error.value = null;
      loading.value = false;
    }
  }

  /**
   * エラー状態をクリアする
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    user,
    session,
    profile,
    loading,
    error,
    initialized,

    // Getters
    isAuthenticated,
    isTeacher,
    isStudent,
    displayName,
    userRole,

    // Actions
    initialize,
    signInTeacher,
    signInStudent,
    signOut,
    clearError,
  };
});
