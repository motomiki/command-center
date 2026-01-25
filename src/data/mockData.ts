import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import { placeholders } from '@/utils/placeholder';

/**
 * モックデータセット
 * テストと開発に使用する充実したデータ
 */

// 学生データ
export const mockStudents: Student[] = [
  {
    id: 'student-1',
    name: '田中 太郎',
    avatarUrl: placeholders.avatar('田中 太郎', '#667eea'),
    typingHistory: [
      { date: '2024-01-15', score: 850, wpm: 45, diffFromLast: 5 },
      { date: '2024-01-18', score: 900, wpm: 47, diffFromLast: 2 },
      { date: '2024-01-22', score: 950, wpm: 50, diffFromLast: 3 },
      { date: '2024-01-25', score: 1100, wpm: 55, diffFromLast: 5 },
      { date: '2024-01-28', score: 1200, wpm: 58, diffFromLast: 3 },
      { date: '2024-02-01', score: 1250, wpm: 60, diffFromLast: 2 },
      { date: '2024-02-05', score: 1300, wpm: 62, diffFromLast: 2 },
    ],
    projects: [
      {
        id: 'project-1-1',
        title: '未来都市プロジェクト',
        description: '高層ビルと公園が調和する未来都市を建設しました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 1', '#00CED1'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-20',
      },
      {
        id: 'project-1-2',
        title: '海底基地',
        description: 'ガラスドームで覆われた海底研究施設を作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 2', '#FF8C00'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-25',
      },
      {
        id: 'project-1-3',
        title: '空中庭園',
        description: '雲の上に浮かぶ幻想的な庭園を建設しました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 3', '#0066FF'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-02-01',
      },
    ],
  },
  {
    id: 'student-2',
    name: '佐藤 花子',
    avatarUrl: placeholders.avatar('佐藤 花子', '#ec4899'),
    typingHistory: [
      { date: '2024-01-16', score: 720, wpm: 38, diffFromLast: 2 },
      { date: '2024-01-19', score: 750, wpm: 40, diffFromLast: 2 },
      { date: '2024-01-23', score: 800, wpm: 42, diffFromLast: 2 },
      { date: '2024-01-26', score: 850, wpm: 44, diffFromLast: 2 },
      { date: '2024-01-29', score: 900, wpm: 45, diffFromLast: 1 },
      { date: '2024-02-02', score: 950, wpm: 47, diffFromLast: 2 },
      { date: '2024-02-06', score: 980, wpm: 48, diffFromLast: 1 },
    ],
    projects: [
      {
        id: 'project-2-1',
        title: 'お城プロジェクト',
        description: '中世ヨーロッパ風の壮大な城を建設しました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 4', '#DC143C'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-22',
      },
      {
        id: 'project-2-2',
        title: '桜の森',
        description: '満開の桜に囲まれた日本庭園を作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 5', '#FF69B4'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-28',
      },
    ],
  },
  {
    id: 'student-3',
    name: '鈴木 一郎',
    avatarUrl: placeholders.avatar('鈴木 一郎', '#10b981'),
    typingHistory: [
      { date: '2024-01-17', score: 650, wpm: 35, diffFromLast: 0 },
      { date: '2024-01-20', score: 680, wpm: 36, diffFromLast: 1 },
      { date: '2024-01-24', score: 700, wpm: 37, diffFromLast: 1 },
      { date: '2024-01-27', score: 720, wpm: 38, diffFromLast: 1 },
      { date: '2024-01-30', score: 750, wpm: 39, diffFromLast: 1 },
      { date: '2024-02-03', score: 780, wpm: 40, diffFromLast: 1 },
      { date: '2024-02-07', score: 800, wpm: 41, diffFromLast: 1 },
    ],
    projects: [
      {
        id: 'project-3-1',
        title: '火山の島',
        description: '活火山と溶岩の流れる危険な島を作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 6', '#FF4500'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-26',
      },
      {
        id: 'project-3-2',
        title: '砂漠のオアシス',
        description: '広大な砂漠の中に緑豊かなオアシスを建設しました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 7', '#FBBF24'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-02-03',
      },
      {
        id: 'project-3-3',
        title: '地下都市',
        description: '岩盤の下に広がる巨大な地下都市を作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 8', '#1F2937'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-02-05',
      },
    ],
  },
  {
    id: 'student-4',
    name: '高橋 美咲',
    avatarUrl: placeholders.avatar('高橋 美咲', '#f472b6'),
    typingHistory: [
      { date: '2024-01-18', score: 950, wpm: 50, diffFromLast: 5 },
      { date: '2024-01-21', score: 1000, wpm: 52, diffFromLast: 2 },
      { date: '2024-01-24', score: 1050, wpm: 54, diffFromLast: 2 },
      { date: '2024-01-27', score: 1150, wpm: 56, diffFromLast: 2 },
      { date: '2024-01-31', score: 1200, wpm: 58, diffFromLast: 2 },
      { date: '2024-02-04', score: 1250, wpm: 60, diffFromLast: 2 },
      { date: '2024-02-08', score: 1300, wpm: 62, diffFromLast: 2 },
    ],
    projects: [
      {
        id: 'project-4-1',
        title: '魔法学校',
        description: '魔法使いが学ぶ不思議な学校を建設しました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 9', '#9370DB'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-24',
      },
      {
        id: 'project-4-2',
        title: '宇宙ステーション',
        description: '地球の軌道上に浮かぶ宇宙ステーションを作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 10', '#8B5CF6'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-30',
      },
    ],
  },
  {
    id: 'student-5',
    name: 'ゆうき',
    avatarUrl: placeholders.avatar('ゆうき', '#3b82f6'),
    typingHistory: [
      { date: '2024-01-19', score: 580, wpm: 32, diffFromLast: -2 },
      { date: '2024-01-22', score: 600, wpm: 33, diffFromLast: 1 },
      { date: '2024-01-25', score: 620, wpm: 34, diffFromLast: 1 },
      { date: '2024-01-28', score: 650, wpm: 35, diffFromLast: 1 },
      { date: '2024-02-01', score: 680, wpm: 36, diffFromLast: 1 },
      { date: '2024-02-05', score: 700, wpm: 37, diffFromLast: 1 },
      { date: '2024-02-09', score: 720, wpm: 38, diffFromLast: 1 },
    ],
    projects: [
      {
        id: 'project-5-1',
        title: '遊園地',
        description: 'ジェットコースターや観覧車がある楽しい遊園地を作りました。',
        modelUrl: '/building-2.glb',
        screenshotUrl: placeholders.minecraftScreenshot('Minecraft 11', '#3B82F6'),
        makeCodeUrl: 'https://minecraft.makecode.com/?lang=ja#',
        createdAt: '2024-01-27',
      },
    ],
  },
];

// カードデータ（タイムライン用）
export const mockCards: CardData[] = [
  // student-1 のカード
  {
    id: 'card-1-1',
    studentId: 'student-1',
    date: '2024-02-05',
    title: 'タイピング新記録達成！',
    description: '今日のタイピング練習で1300点を達成しました！',
    type: 'typing',
    score: 1300,
    wpm: 62,
    diffScore: 2,
  },
  {
    id: 'card-1-2',
    studentId: 'student-1',
    date: '2024-02-01',
    title: '空中庭園完成',
    description: '雲の上に浮かぶ幻想的な庭園を建設しました。',
    type: 'minecraft',
    projectId: 'project-1-3',
  },
  {
    id: 'card-1-3',
    studentId: 'student-1',
    date: '2024-01-28',
    title: 'タイピングスコア向上',
    description: 'WPMが58に到達しました！',
    type: 'typing',
    score: 1200,
    wpm: 58,
    diffScore: 3,
  },
  {
    id: 'card-1-4',
    studentId: 'student-1',
    date: '2024-01-25',
    title: '海底基地完成',
    description: 'ガラスドームで覆われた海底研究施設を作りました。',
    type: 'minecraft',
    projectId: 'project-1-2',
  },
  {
    id: 'card-1-5',
    studentId: 'student-1',
    date: '2024-01-20',
    title: '未来都市プロジェクト完成',
    description: '高層ビルと公園が調和する未来都市を建設しました。',
    type: 'minecraft',
    projectId: 'project-1-1',
  },

  // student-2 のカード
  {
    id: 'card-2-1',
    studentId: 'student-2',
    date: '2024-02-06',
    title: 'タイピング練習頑張りました',
    description: '今日のスコアは980点でした。',
    type: 'typing',
    score: 980,
    wpm: 48,
    diffScore: 1,
  },
  {
    id: 'card-2-2',
    studentId: 'student-2',
    date: '2024-01-28',
    title: '桜の森完成',
    description: '満開の桜に囲まれた日本庭園を作りました。',
    type: 'minecraft',
    projectId: 'project-2-2',
  },
  {
    id: 'card-2-3',
    studentId: 'student-2',
    date: '2024-01-22',
    title: 'お城プロジェクト完成',
    description: '中世ヨーロッパ風の壮大な城を建設しました。',
    type: 'minecraft',
    projectId: 'project-2-1',
  },

  // student-3 のカード
  {
    id: 'card-3-1',
    studentId: 'student-3',
    date: '2024-02-07',
    title: 'タイピング継続中',
    description: '毎日コツコツ練習しています。800点達成！',
    type: 'typing',
    score: 800,
    wpm: 41,
    diffScore: 1,
  },
  {
    id: 'card-3-2',
    studentId: 'student-3',
    date: '2024-02-05',
    title: '地下都市完成',
    description: '岩盤の下に広がる巨大な地下都市を作りました。',
    type: 'minecraft',
    projectId: 'project-3-3',
  },
  {
    id: 'card-3-3',
    studentId: 'student-3',
    date: '2024-02-03',
    title: '砂漠のオアシス完成',
    description: '広大な砂漠の中に緑豊かなオアシスを建設しました。',
    type: 'minecraft',
    projectId: 'project-3-2',
  },
  {
    id: 'card-3-4',
    studentId: 'student-3',
    date: '2024-01-26',
    title: '火山の島完成',
    description: '活火山と溶岩の流れる危険な島を作りました。',
    type: 'minecraft',
    projectId: 'project-3-1',
  },

  // student-4 のカード
  {
    id: 'card-4-1',
    studentId: 'student-4',
    date: '2024-02-08',
    title: 'タイピング最高記録更新！',
    description: '1300点達成！WPMも62に到達しました。',
    type: 'typing',
    score: 1300,
    wpm: 62,
    diffScore: 2,
  },
  {
    id: 'card-4-2',
    studentId: 'student-4',
    date: '2024-01-30',
    title: '宇宙ステーション完成',
    description: '地球の軌道上に浮かぶ宇宙ステーションを作りました。',
    type: 'minecraft',
    projectId: 'project-4-2',
  },
  {
    id: 'card-4-3',
    studentId: 'student-4',
    date: '2024-01-24',
    title: '魔法学校完成',
    description: '魔法使いが学ぶ不思議な学校を建設しました。',
    type: 'minecraft',
    projectId: 'project-4-1',
  },

  // student-5 のカード
  {
    id: 'card-5-1',
    studentId: 'student-5',
    date: '2024-02-09',
    title: 'タイピング少しずつ上達',
    description: '720点になりました。これからも頑張ります！',
    type: 'typing',
    score: 720,
    wpm: 38,
    diffScore: 1,
  },
  {
    id: 'card-5-2',
    studentId: 'student-5',
    date: '2024-01-27',
    title: '遊園地完成',
    description: 'ジェットコースターや観覧車がある楽しい遊園地を作りました。',
    type: 'minecraft',
    projectId: 'project-5-1',
  },
];

/**
 * モックデータを取得する関数
 * 実際のAPIコールをシミュレート
 */
export function getMockData() {
  return {
    students: mockStudents,
    cards: mockCards,
  };
}
