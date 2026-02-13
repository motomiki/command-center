import type { IMinecraftWorkRepository, MinecraftWork } from '../interfaces';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getCachedMinecraftWorks,
  setCachedMinecraftWorks,
} from '@/services/LocalCache';
import { resolveStudentIdToUuid } from '@/utils/studentId';
import { withTimeout } from '@/utils/timeout';

const SAVE_TIMEOUT_MS = 20_000;

/**
 * Supabase / LocalCache を使った IMinecraftWorkRepository 実装。
 *
 * - Read: LocalCache (IndexedDB) から即座に返す
 * - Write: Supabase に送信 → ローカルキャッシュを更新
 */
export class SupabaseMinecraftWorkRepository
  implements IMinecraftWorkRepository
{
  async getByStudentId(studentId: string): Promise<MinecraftWork[]> {
    const works = await getCachedMinecraftWorks();
    return works.filter((w) => w.studentId === studentId);
  }

  async save(work: MinecraftWork): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase が未設定です。.env を確認してください。',
      );
    }

    const saveWork = async (): Promise<void> => {
      const studentUuid = await resolveStudentIdToUuid(work.studentId);

      const { error } = await supabase.from('minecraft_works').upsert({
        id: work.id,
        student_id: studentUuid,
        title: work.title,
        description: work.description,
        model_path: work.modelUrl ?? null,
        screenshot_path: work.screenshotUrl ?? null,
        make_code_url: work.makeCodeUrl ?? null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`作品の保存に失敗しました: ${error.message}`);
      }

      // ローカルキャッシュも更新
      const works = await getCachedMinecraftWorks();
      const index = works.findIndex((w) => w.id === work.id);
      if (index >= 0) {
        works[index] = work;
      } else {
        works.push(work);
      }
      await setCachedMinecraftWorks(works);
    };

    await withTimeout(
      saveWork(),
      SAVE_TIMEOUT_MS,
      '送信がタイムアウトしました。ネットワークを確認してください。',
    );
  }
}
