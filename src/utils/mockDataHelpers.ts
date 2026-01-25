import type { Student, TypingRecord, MinecraftProject } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import { mockStudents, mockCards } from '@/data/mockData';

/**
 * データ操作ユーティリティ関数
 * モックデータから必要なデータを取得するためのヘルパー関数
 */

/**
 * 生徒IDから生徒データを取得
 * @param id 生徒ID
 * @returns 生徒データ、見つからない場合はundefined
 */
export function getStudentById(id: string): Student | undefined {
  return mockStudents.find((student) => student.id === id);
}

/**
 * 生徒IDからその生徒のカード一覧を取得
 * @param studentId 生徒ID
 * @returns カードデータの配列
 */
export function getCardsByStudentId(studentId: string): CardData[] {
  return mockCards.filter((card) => card.studentId === studentId);
}

/**
 * 生徒IDから未開封のカード一覧を取得
 * @param studentId 生徒ID
 * @returns 未開封カードデータの配列
 */
export function getUnopenedCardsByStudentId(studentId: string): CardData[] {
  return mockCards.filter(
    (card) => card.studentId === studentId && !card.isOpened
  );
}

/**
 * 生徒IDから開封済みのカード一覧を取得
 * @param studentId 生徒ID
 * @returns 開封済みカードデータの配列
 */
export function getOpenedCardsByStudentId(studentId: string): CardData[] {
  return mockCards.filter(
    (card) => card.studentId === studentId && card.isOpened
  );
}

/**
 * レアリティからカード一覧を取得
 * @param rarity レアリティ
 * @returns 該当レアリティのカードデータの配列
 */
export function getCardsByRarity(rarity: Rarity): CardData[] {
  return mockCards.filter((card) => card.rarity === rarity);
}

/**
 * 生徒IDからタイピング履歴を取得
 * @param studentId 生徒ID
 * @returns タイピング記録の配列
 */
export function getTypingHistoryByStudentId(
  studentId: string
): TypingRecord[] {
  const student = getStudentById(studentId);
  return student?.typingHistory ?? [];
}

/**
 * 生徒IDからMinecraft成果物一覧を取得
 * @param studentId 生徒ID
 * @returns Minecraft成果物データの配列
 */
export function getMinecraftProjectsByStudentId(
  studentId: string
): MinecraftProject[] {
  const student = getStudentById(studentId);
  return student?.projects ?? [];
}

/**
 * すべての生徒データを取得
 * @returns 生徒データの配列
 */
export function getAllStudents(): Student[] {
  return mockStudents;
}

/**
 * すべてのカードデータを取得
 * @returns カードデータの配列
 */
export function getAllCards(): CardData[] {
  return mockCards;
}

/**
 * カードIDからカードデータを取得
 * @param cardId カードID
 * @returns カードデータ、見つからない場合はundefined
 */
export function getCardById(cardId: string): CardData | undefined {
  return mockCards.find((card) => card.id === cardId);
}

/**
 * タイピング記録を追加
 * @param studentId 生徒ID
 * @param record タイピング記録
 */
export function addTypingRecord(
  studentId: string,
  record: TypingRecord
): void {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  student.typingHistory.push(record);
}

/**
 * Minecraft成果物を追加
 * @param studentId 生徒ID
 * @param project Minecraft成果物データ
 */
export function addMinecraftProject(
  studentId: string,
  project: MinecraftProject
): void {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  student.projects.push(project);
}

/**
 * カードを生成
 * @param cardData カードデータ
 * @returns 生成されたカードデータ
 */
export function createCard(cardData: Omit<CardData, 'id'>): CardData {
  const newCard: CardData = {
    ...cardData,
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  mockCards.push(newCard);
  return newCard;
}

/**
 * 生徒情報を更新
 * @param studentId 生徒ID
 * @param updates 更新する情報
 */
export function updateStudent(
  studentId: string,
  updates: Partial<Omit<Student, 'id'>>
): void {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  Object.assign(student, updates);
}

