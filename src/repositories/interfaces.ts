import type { Student, MinecraftProject } from '@/types/student';
import type { CardData } from '@/types/card';

/**
 * Repository Interfaces
 *
 * These interfaces define the contract for data access.
 * Implementations can be:
 * - MockRepository (for testing/dev with mockDataHelpers)
 * - SupabaseRepository (for remote master data + LocalCache)
 */

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** MinecraftProject に student_id を付与したキャッシュ/リポジトリ用型 */
export interface MinecraftWork extends MinecraftProject {
  studentId: string;
}

// ---------------------------------------------------------------------------
// Student Repository
// ---------------------------------------------------------------------------

export interface IStudentRepository {
  getAll(): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  save(student: Student): Promise<void>;
}

// ---------------------------------------------------------------------------
// Card Repository
// ---------------------------------------------------------------------------

export interface ICardRepository {
  getAll(): Promise<CardData[]>;
  getByStudentId(studentId: string): Promise<CardData[]>;
  save(card: CardData): Promise<void>;
  markAsOpened(cardId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Minecraft Work Repository
// ---------------------------------------------------------------------------

export interface IMinecraftWorkRepository {
  getByStudentId(studentId: string): Promise<MinecraftWork[]>;
  save(work: MinecraftWork): Promise<void>;
}
