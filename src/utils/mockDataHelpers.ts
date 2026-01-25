import { reactive } from 'vue';
import type { Student, TypingRecord, MinecraftProject } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import { mockStudents as initialStudents, mockCards as initialCards } from '@/data/mockData';

const STORAGE_KEY_STUDENTS = 'campusclub_students_v1';
const STORAGE_KEY_CARDS = 'campusclub_cards_v1';

// Internal State (Reactive)
const students = reactive<Student[]>([]);
const cards = reactive<CardData[]>([]);

// Initialize Data
const initData = () => {
  try {
    const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
    const savedCards = localStorage.getItem(STORAGE_KEY_CARDS);

    let finalStudents: Student[];
    if (savedStudents) {
      finalStudents = JSON.parse(savedStudents);
    } else {
      finalStudents = JSON.parse(JSON.stringify(initialStudents));
    }
    students.splice(0, students.length, ...finalStudents);

    let finalCards: CardData[];
    if (savedCards) {
      finalCards = JSON.parse(savedCards);
    } else {
      finalCards = JSON.parse(JSON.stringify(initialCards));
    }
    cards.splice(0, cards.length, ...finalCards);

    if (!savedStudents || !savedCards) {
      saveStudents();
      saveCards();
    }
  } catch (e) {
    console.error('Failed to load data from localStorage', e);
    students.splice(0, students.length, ...JSON.parse(JSON.stringify(initialStudents)));
    cards.splice(0, cards.length, ...JSON.parse(JSON.stringify(initialCards)));
  }
};

const saveStudents = () => {
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
};

const saveCards = () => {
  localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
};

// Initialize on load
initData();

/**
 * データ操作ユーティリティ関数
 * LocalStorageのデータを操作する
 */

/**
 * 生徒IDから生徒データを取得
 */
export function getStudentById(id: string): Student | undefined {
  return students.find((student) => student.id === id);
}

/**
 * 生徒IDからその生徒のカード一覧を取得
 */
export function getCardsByStudentId(studentId: string): CardData[] {
  return cards.filter((card) => card.studentId === studentId);
}

/**
 * 生徒IDから未開封のカード一覧を取得
 */
export function getUnopenedCardsByStudentId(studentId: string): CardData[] {
  return cards.filter(
    (card) => card.studentId === studentId && !card.isOpened
  );
}

/**
 * 生徒IDから開封済みのカード一覧を取得
 */
export function getOpenedCardsByStudentId(studentId: string): CardData[] {
  return cards.filter(
    (card) => card.studentId === studentId && card.isOpened
  );
}

/**
 * レアリティからカード一覧を取得
 */
export function getCardsByRarity(rarity: Rarity): CardData[] {
  return cards.filter((card) => card.rarity === rarity);
}

/**
 * 生徒IDからタイピング履歴を取得
 */
export function getTypingHistoryByStudentId(
  studentId: string
): TypingRecord[] {
  const student = getStudentById(studentId);
  return student?.typingHistory ?? [];
}

/**
 * 生徒IDからMinecraft成果物一覧を取得
 */
export function getMinecraftProjectsByStudentId(
  studentId: string
): MinecraftProject[] {
  const student = getStudentById(studentId);
  return student?.projects ?? [];
}

/**
 * すべての生徒データを取得
 */
export function getAllStudents(): Student[] {
  return students;
}

/**
 * すべてのカードデータを取得
 */
export function getAllCards(): CardData[] {
  return cards;
}

/**
 * カードIDからカードデータを取得
 */
export function getCardById(cardId: string): CardData | undefined {
  return cards.find((card) => card.id === cardId);
}

/**
 * タイピング記録を追加
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
  saveStudents();
}

/**
 * Minecraft成果物を追加
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
  saveStudents();
}

/**
 * カードを生成
 */
export function createCard(cardData: Omit<CardData, 'id'>): CardData {
  const newCard: CardData = {
    ...cardData,
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  cards.push(newCard);
  saveCards();
  return newCard;
}

/**
 * 生徒情報を更新
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
  saveStudents();
}

/**
 * カードを開封済みにする (New helper for Gacha)
 */
export function openCard(cardId: string): void {
  const card = getCardById(cardId);
  if (card) {
    card.isOpened = true;
    saveCards();
  }
}
