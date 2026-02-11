import type { Student } from '@/types/student';
import type { Json } from '@/types/supabase';
import type { IStudentRepository } from '../interfaces';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getCachedStudents, setCachedStudents } from '@/services/LocalCache';
import { withTimeout } from '@/utils/timeout';

const SAVE_TIMEOUT_MS = 30000;

/**
 * Supabase / LocalCache を使った IStudentRepository 実装。
 *
 * - Read: LocalCache (IndexedDB) から即座に返す（SyncService による事前同期前提）
 * - Write: Supabase に送信 → ローカルキャッシュを更新
 */
export class SupabaseStudentRepository implements IStudentRepository {
  async getAll(): Promise<Student[]> {
    return getCachedStudents();
  }

  async getById(id: string): Promise<Student | null> {
    const students = await getCachedStudents();
    return (
      students.find((s) => s.id === id || s.loginId === id) ?? null
    );
  }

  async save(student: Student): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase が未設定です。.env を確認してください。',
      );
    }

    const upsertPromise = supabase.from('profiles').upsert({
      id: student.id,
      display_name: student.name,
      avatar_url: student.avatarUrl ?? null,
      typing_history: student.typingHistory as unknown as Json,
      role: 'student' as const,
      login_id: student.loginId ?? null,
      updated_at: new Date().toISOString(),
    });

    const { error } = await withTimeout(
      upsertPromise,
      SAVE_TIMEOUT_MS,
      '保存がタイムアウトしました。ネットワークを確認してもう一度お試しください。',
    );

    if (error) {
      throw new Error(`生徒の保存に失敗しました: ${error.message}`);
    }

    // ローカルキャッシュも更新
    const students = await getCachedStudents();
    const index = students.findIndex((s) => s.id === student.id);
    if (index >= 0) {
      students[index] = student;
    } else {
      students.push(student);
    }
    await setCachedStudents(students);
  }
}
