import { get, set } from 'idb-keyval';
import { reactive } from 'vue';
import type { Student, TypingRecord, MinecraftProject } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import { mockStudents as initialStudents, mockCards as initialCards } from '@/data/mockData';

const STORAGE_KEY_STUDENTS = 'campusclub_students_v1';
const STORAGE_KEY_CARDS = 'campusclub_cards_v1';
const STORAGE_KEY_GLOBAL_SETTINGS = 'campusclub_global_settings_v1';

// Legacy localStorage keys (for one-time migration)
const LEGACY_KEY_STUDENTS = 'campusclub_students_v1';
const LEGACY_KEY_CARDS = 'campusclub_cards_v1';

/** グローバル設定の型定義 */
interface GlobalSettings {
  /** 教師が発行したカードの通し番号カウンター（全生徒横断） */
  totalCardsIssued: number;
}

// Internal State (Reactive)
const students = reactive<Student[]>([]);
const cards = reactive<CardData[]>([]);
const globalSettings = reactive<GlobalSettings>({ totalCardsIssued: 0 });

let initPromise: Promise<void> | null = null;

/**
 * Save students to IndexedDB.
 */
const saveStudents = async (): Promise<void> => {
  await set(STORAGE_KEY_STUDENTS, JSON.parse(JSON.stringify(students)));
};

/**
 * Save cards to IndexedDB.
 */
const saveCards = async (): Promise<void> => {
  await set(STORAGE_KEY_CARDS, JSON.parse(JSON.stringify(cards)));
};

/**
 * Save global settings to IndexedDB.
 */
const saveGlobalSettings = async (): Promise<void> => {
  await set(STORAGE_KEY_GLOBAL_SETTINGS, JSON.parse(JSON.stringify(globalSettings)));
};

/**
 * Initialize data from IndexedDB, with one-time migration from localStorage if needed.
 */
const initData = async (): Promise<void> => {
  try {
    const savedStudents = await get<Student[]>(STORAGE_KEY_STUDENTS);
    const savedCards = await get<CardData[]>(STORAGE_KEY_CARDS);

    let finalStudents: Student[];
    if (savedStudents != null && Array.isArray(savedStudents) && savedStudents.length >= 0) {
      finalStudents = savedStudents;
    } else {
      const fromLs = localStorage.getItem(LEGACY_KEY_STUDENTS);
      if (fromLs) {
        try {
          finalStudents = JSON.parse(fromLs);
          await set(STORAGE_KEY_STUDENTS, finalStudents);
        } catch {
          finalStudents = JSON.parse(JSON.stringify(initialStudents));
        }
      } else {
        finalStudents = JSON.parse(JSON.stringify(initialStudents));
      }
    }

    let finalCards: CardData[];
    if (savedCards != null && Array.isArray(savedCards) && savedCards.length >= 0) {
      finalCards = savedCards;
    } else {
      const fromLs = localStorage.getItem(LEGACY_KEY_CARDS);
      if (fromLs) {
        try {
          finalCards = JSON.parse(fromLs);
          await set(STORAGE_KEY_CARDS, finalCards);
        } catch {
          finalCards = JSON.parse(JSON.stringify(initialCards));
        }
      } else {
        finalCards = JSON.parse(JSON.stringify(initialCards));
      }
    }

    students.splice(0, students.length, ...finalStudents);
    cards.splice(0, cards.length, ...finalCards);

    // --- グローバル設定（通し番号カウンター）の読み込み ---
    const savedSettings = await get<GlobalSettings>(STORAGE_KEY_GLOBAL_SETTINGS);
    if (savedSettings != null && typeof savedSettings.totalCardsIssued === 'number') {
      globalSettings.totalCardsIssued = savedSettings.totalCardsIssued;
    } else {
      // 初回起動: 既存カードの issueNumber の最大値からカウンターを導出する。
      // issueNumber が付与されていないカードしかない場合は、カードの総数をカウンターとする。
      const maxExisting = finalCards.reduce((max, c) => {
        return (c.issueNumber != null && c.issueNumber > max) ? c.issueNumber : max;
      }, 0);
      globalSettings.totalCardsIssued = maxExisting > 0 ? maxExisting : finalCards.length;
      await saveGlobalSettings();
    }
  } catch (e) {
    console.error('Failed to load data from IndexedDB', e);
    students.splice(0, students.length, ...JSON.parse(JSON.stringify(initialStudents)));
    cards.splice(0, cards.length, ...JSON.parse(JSON.stringify(initialCards)));
    globalSettings.totalCardsIssued = 0;
  }
};

/**
 * Ensures data is loaded. Call before relying on students/cards if needed early.
 */
export function ensureDataReady(): Promise<void> {
  if (!initPromise) {
    initPromise = initData();
  }
  return initPromise;
}

// Initialize on load (async; reactive arrays populate when done)
initPromise = initData();

/**
 * データ操作ユーティリティ関数
 * IndexedDB（idb-keyval）のデータを操作する
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
export async function addTypingRecord(
  studentId: string,
  record: TypingRecord
): Promise<void> {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  student.typingHistory.push(record);
  await saveStudents();
}

/**
 * Minecraft成果物を追加
 */
export async function addMinecraftProject(
  studentId: string,
  project: MinecraftProject
): Promise<void> {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  student.projects.push(project);
  await saveStudents();
}

/**
 * カードを生成（通し番号を自動付与）
 */
export async function createCard(cardData: Omit<CardData, 'id'>): Promise<CardData> {
  // 通し番号をインクリメントして付与
  const nextIssueNumber = globalSettings.totalCardsIssued + 1;

  const newCard: CardData = {
    ...cardData,
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    issueNumber: nextIssueNumber,
  };
  cards.push(newCard);

  const previousCount = globalSettings.totalCardsIssued;
  globalSettings.totalCardsIssued = nextIssueNumber;

  try {
    await saveCards();
    await saveGlobalSettings();
    return newCard;
  } catch (e) {
    // ロールバック
    cards.pop();
    globalSettings.totalCardsIssued = previousCount;
    throw e;
  }
}

/**
 * 生徒を追加
 */
export async function addStudent(
  studentData: Omit<Student, 'id' | 'typingHistory' | 'projects'>
): Promise<Student> {
  const newStudent: Student = {
    ...studentData,
    id: `student-${Date.now()}`,
    typingHistory: [],
    projects: [],
  };
  students.push(newStudent);
  try {
    await saveStudents();
    return newStudent;
  } catch (e) {
    students.pop();
    throw e;
  }
}

/**
 * 生徒情報を更新
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<Omit<Student, 'id'>>
): Promise<void> {
  const student = getStudentById(studentId);
  if (!student) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  const backup = JSON.parse(JSON.stringify(student));
  Object.assign(student, updates);
  try {
    await saveStudents();
  } catch (e) {
    Object.assign(student, backup);
    throw e;
  }
}

/**
 * カードを開封済みにする (New helper for Gacha)
 */
export async function openCard(cardId: string): Promise<void> {
  const card = getCardById(cardId);
  if (card) {
    const wasOpened = card.isOpened;
    card.isOpened = true;
    try {
      await saveCards();
    } catch (e) {
      card.isOpened = wasOpened;
      throw e;
    }
  }
}

/**
 * 教師が発行したカードの通し番号の現在値を取得
 */
export function getTotalCardsIssued(): number {
  return globalSettings.totalCardsIssued;
}
