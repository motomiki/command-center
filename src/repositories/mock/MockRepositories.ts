import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import type {
  IStudentRepository,
  ICardRepository,
  IMinecraftWorkRepository,
  MinecraftWork,
} from '../interfaces';
import {
  getAllStudents,
  getStudentById,
  addStudent,
  updateStudent,
  getAllCards,
  getCardsByStudentId,
  createCard,
  openCard,
  getMinecraftProjectsByStudentId,
  addMinecraftProject,
  ensureDataReady,
} from '@/utils/mockDataHelpers';

/**
 * mockDataHelpers をラップした IStudentRepository 実装。
 * Supabase が未設定の場合や開発時にフォールバックとして使用される。
 */
export class MockStudentRepository implements IStudentRepository {
  async getAll(): Promise<Student[]> {
    await ensureDataReady();
    return getAllStudents();
  }

  async getById(id: string): Promise<Student | null> {
    await ensureDataReady();
    return getStudentById(id) ?? null;
  }

  async save(student: Student): Promise<void> {
    await ensureDataReady();
    const existing = getStudentById(student.id);
    if (existing) {
      await updateStudent(student.id, {
        name: student.name,
        avatarUrl: student.avatarUrl,
        typingHistory: student.typingHistory,
        projects: student.projects,
      });
    } else {
      await addStudent({ name: student.name, avatarUrl: student.avatarUrl });
    }
  }
}

/**
 * mockDataHelpers をラップした ICardRepository 実装。
 */
export class MockCardRepository implements ICardRepository {
  async getAll(): Promise<CardData[]> {
    await ensureDataReady();
    return getAllCards();
  }

  async getByStudentId(studentId: string): Promise<CardData[]> {
    await ensureDataReady();
    return getCardsByStudentId(studentId);
  }

  async save(card: CardData): Promise<void> {
    await ensureDataReady();
    // createCard は id を自動生成するので既存カードとの重複は起きにくいが、
    // 既に存在するカードの更新は mockDataHelpers には未実装。
    // ここでは新規作成のみサポートする。
    const { id: _id, ...rest } = card;
    await createCard(rest);
  }

  async markAsOpened(cardId: string): Promise<void> {
    await ensureDataReady();
    await openCard(cardId);
  }
}

/**
 * mockDataHelpers をラップした IMinecraftWorkRepository 実装。
 */
export class MockMinecraftWorkRepository implements IMinecraftWorkRepository {
  async getByStudentId(studentId: string): Promise<MinecraftWork[]> {
    await ensureDataReady();
    const projects = getMinecraftProjectsByStudentId(studentId);
    return projects.map((p) => ({ ...p, studentId }));
  }

  async save(work: MinecraftWork): Promise<void> {
    await ensureDataReady();
    const { studentId, ...project } = work;
    await addMinecraftProject(studentId, project);
  }
}
