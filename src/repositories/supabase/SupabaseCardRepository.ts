import type { CardData } from '@/types/card';
import type { Json } from '@/types/supabase';
import type { ICardRepository } from '../interfaces';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getCachedCards, setCachedCards } from '@/services/LocalCache';
import { resolveStudentIdToUuid } from '@/utils/studentId';

/** カード保存のタイムアウト（ミリ秒） */
const SAVE_TIMEOUT_MS = 20_000;

/**
 * 指定ミリ秒後に reject する Promise を返す。
 * Promise.race で本処理と組み合わせてタイムアウトを実現する。
 */
function createTimeoutPromise(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Supabase / LocalCache を使った ICardRepository 実装。
 *
 * - Read: LocalCache (IndexedDB) から即座に返す
 * - Write: Supabase に送信 → ローカルキャッシュを更新
 */
export class SupabaseCardRepository implements ICardRepository {
  async getAll(): Promise<CardData[]> {
    return getCachedCards();
  }

  async getByStudentId(studentId: string): Promise<CardData[]> {
    const cards = await getCachedCards();
    return cards.filter((c) => c.studentId === studentId);
  }

  async save(card: CardData): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase が未設定です。.env を確認してください。',
      );
    }

    const saveWork = async (): Promise<void> => {
      // metadata に CardData 固有のフィールドをまとめる
      const metadata = {
        type: card.type,
        score: card.score ?? null,
        wpm: card.wpm ?? null,
        diffScore: card.diffScore ?? null,
        projectId: card.projectId ?? null,
        issueNumber: card.issueNumber ?? null,
        typingStats: card.typingStats ?? null,
        minecraftData: card.minecraftData ?? null,
      } as unknown as Json;

      const studentUuid = await resolveStudentIdToUuid(card.studentId);

      const { error } = await supabase.from('cards').upsert({
        id: card.id,
        student_id: studentUuid,
        title: card.title,
        description: card.description,
        image_path: card.imageUrl ?? '',
        rarity: card.rarity ?? 'C',
        is_opened: card.isOpened ?? false,
        metadata,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[Supabase] カード保存エラー:', error);
        throw new Error(`カードの保存に失敗しました: ${error.message}`);
      }

      // ローカルキャッシュも更新（studentId を UUID に正規化して一覧の照合と一致させる）
      const cardToCache: CardData = { ...card, studentId: studentUuid };
      const cards = await getCachedCards();
      const index = cards.findIndex((c) => c.id === card.id);
      if (index >= 0) {
        cards[index] = cardToCache;
      } else {
        cards.push(cardToCache);
      }
      await setCachedCards(cards);
    };

    await Promise.race([
      saveWork(),
      createTimeoutPromise(
        SAVE_TIMEOUT_MS,
        '送信がタイムアウトしました。ネットワークを確認してください。',
      ),
    ]);
  }

  async markAsOpened(cardId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase が未設定です。.env を確認してください。',
      );
    }

    const { data, error } = await supabase
      .from('cards')
      .update({
        is_opened: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .select('id');

    if (error) {
      throw new Error(`カードの開封に失敗しました: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        'カードの開封に保存できませんでした。しばらくしてからもう一度お試しください。',
      );
    }

    // Supabase に反映されたときだけローカルキャッシュを更新
    const cards = await getCachedCards();
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      card.isOpened = true;
      await setCachedCards(cards);
    }
  }
}
