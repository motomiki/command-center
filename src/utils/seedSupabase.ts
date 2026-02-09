import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Json } from '@/types/supabase';
import { mockStudents, mockCards } from '@/data/mockData';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';

// ---------------------------------------------------------------------------
// 定数 / 型
// ---------------------------------------------------------------------------

/**
 * Mock の student-{n} ID を Supabase で使う決定論的 UUID にマッピングする。
 * SQL Editor / API 両方で同じ UUID を使うことで参照整合性を維持する。
 *
 * ※ 本番運用時は Supabase Auth のユーザー登録で自動生成される UUID を使う。
 *   ここでは開発・テスト用のシーディング専用。
 */
const SEED_UUID_MAP: Record<string, string> = {
  'student-1': '00000000-0000-4000-a000-000000000001',
  'student-2': '00000000-0000-4000-a000-000000000002',
  'student-3': '00000000-0000-4000-a000-000000000003',
  'student-4': '00000000-0000-4000-a000-000000000004',
  'student-5': '00000000-0000-4000-a000-000000000005',
};

/** teacher 用のシード UUID */
const TEACHER_UUID = '00000000-0000-4000-a000-000000000099';
const TEACHER_EMAIL = 'teacher@example.com';
const TEACHER_PASSWORD = 'teacher-dev-password-2026';

/** シーディング結果 */
export interface SeedResult {
  success: boolean;
  profilesInserted: number;
  worksInserted: number;
  cardsInserted: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** Mock ID → シード用 UUID に変換。マッピングがなければ元の値を返す。 */
function toSeedUuid(mockId: string): string {
  return SEED_UUID_MAP[mockId] ?? mockId;
}

/** SQL 文字列リテラルのエスケープ（シングルクォートのみ） */
function esc(value: string): string {
  return value.replace(/'/g, "''");
}

/** JSON → SQL リテラル */
function jsonLiteral(value: unknown): string {
  return `'${esc(JSON.stringify(value))}'::jsonb`;
}

// ---------------------------------------------------------------------------
// 1. SQL 生成（SQL Editor で実行する方式）
// ---------------------------------------------------------------------------

/**
 * Supabase SQL Editor に貼り付けて実行可能な INSERT 文を生成する。
 *
 * 流れ:
 * 1. auth.users にテスト用ユーザーを作成（教師 1 名 + 生徒 5 名）
 * 2. profiles にプロフィールを挿入
 * 3. minecraft_works に作品を挿入
 * 4. cards にカードを挿入（mockCards が空なら省略）
 *
 * @returns 実行可能な SQL 文字列
 */
export function generateSeedSQL(): string {
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- 開発用シードデータ');
  lines.push(`-- 生成日時: ${new Date().toISOString()}`);
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // ----- auth.users (テスト用ユーザー) -----
  lines.push('-- 1. テスト用ユーザーの作成（auth.users）');
  lines.push('-- ※ profiles の FK 制約 (references auth.users) を満たすために必要');
  lines.push('');

  // Teacher
  lines.push(
    `INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)` +
    ` VALUES ('${TEACHER_UUID}', '00000000-0000-0000-0000-000000000000', '${TEACHER_EMAIL}',` +
    ` crypt('${esc(TEACHER_PASSWORD)}', gen_salt('bf')),` +
    ` now(), 'authenticated', 'authenticated', now(), now())` +
    ` ON CONFLICT (id) DO NOTHING;`,
  );
  lines.push('');

  // Students
  for (const student of mockStudents) {
    const uuid = toSeedUuid(student.id);
    const email = `${student.id}@example.com`;
    lines.push(
      `INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)` +
      ` VALUES ('${uuid}', '00000000-0000-0000-0000-000000000000', '${esc(email)}',` +
      ` crypt('student-dev-password', gen_salt('bf')),` +
      ` now(), 'authenticated', 'authenticated', now(), now())` +
      ` ON CONFLICT (id) DO NOTHING;`,
    );
  }
  lines.push('');

  // ----- profiles -----
  lines.push('-- 2. プロフィール');
  lines.push('');

  // Teacher profile（login_id は先生では NULL）
  lines.push(
    `INSERT INTO profiles (id, role, display_name, typing_history, login_id)` +
    ` VALUES ('${TEACHER_UUID}', 'teacher', '先生', '[]'::jsonb, NULL)` +
    ` ON CONFLICT (id) DO NOTHING;`,
  );

  // Student profiles（login_id に student-1 等を設定して URL で利用）
  for (const student of mockStudents) {
    const uuid = toSeedUuid(student.id);
    const history = jsonLiteral(student.typingHistory);
    lines.push(
      `INSERT INTO profiles (id, role, display_name, avatar_url, typing_history, login_id)` +
      ` VALUES ('${uuid}', 'student', '${esc(student.name)}', ${student.avatarUrl ? `'${esc(student.avatarUrl)}'` : 'NULL'}, ${history}, '${esc(student.id)}')` +
      ` ON CONFLICT (id) DO NOTHING;`,
    );
  }
  lines.push('');

  // ----- minecraft_works -----
  lines.push('-- 3. Minecraft 作品');
  lines.push('');

  for (const student of mockStudents) {
    const studentUuid = toSeedUuid(student.id);
    for (const project of student.projects) {
      lines.push(
        `INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)` +
        ` VALUES (uuid_generate_v4(), '${studentUuid}', '${esc(project.title)}', '${esc(project.description)}',` +
        ` ${project.modelUrl ? `'${esc(project.modelUrl)}'` : 'NULL'},` +
        ` ${project.screenshotUrl ? `'${esc(project.screenshotUrl)}'` : 'NULL'},` +
        ` ${project.makeCodeUrl ? `'${esc(project.makeCodeUrl)}'` : 'NULL'},` +
        ` '${project.createdAt}');`,
      );
    }
  }
  lines.push('');

  // ----- cards -----
  if (mockCards.length > 0) {
    lines.push('-- 4. カード');
    lines.push('');
    for (const card of mockCards) {
      const studentUuid = toSeedUuid(card.studentId);
      const metadata = jsonLiteral({
        type: card.type,
        score: card.score ?? null,
        wpm: card.wpm ?? null,
        diffScore: card.diffScore ?? null,
        projectId: card.projectId ?? null,
        issueNumber: card.issueNumber ?? null,
        typingStats: card.typingStats ?? null,
        minecraftData: card.minecraftData ?? null,
      });
      lines.push(
        `INSERT INTO cards (id, student_id, title, description, image_path, rarity, is_opened, metadata)` +
        ` VALUES (uuid_generate_v4(), '${studentUuid}', '${esc(card.title)}', '${esc(card.description)}',` +
        ` '${esc(card.imageUrl ?? '')}', '${esc(card.rarity ?? 'C')}',` +
        ` ${card.isOpened ?? false}, ${metadata});`,
      );
    }
    lines.push('');
  } else {
    lines.push('-- 4. カード（mockCards が空のためスキップ）');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- シード完了！');
  lines.push('-- 次のステップ:');
  lines.push('--   1. Supabase ダッシュボード > Storage で "assets" バケットを作成');
  lines.push('--   2. バケットを Public に設定');
  lines.push('--   3. .env に VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. API ベースのシーディング（ブラウザコンソール / 管理画面から実行）
// ---------------------------------------------------------------------------

/**
 * Supabase API を使ってモックデータをシードする。
 *
 * 前提条件:
 * - Supabase が設定済み（isSupabaseConfigured === true）
 * - RLS ポリシーを一時的に無効化するか、service_role キーを使用
 *   （anon キーでは teacher ロール確認で INSERT が拒否される場合がある）
 * - auth.users に対応するユーザーが既に存在すること
 *   （generateSeedSQL() の auth.users INSERT を先に SQL Editor で実行しておく）
 *
 * @param options.dryRun true の場合、実際には書き込まずに結果のみ返す
 * @returns シーディング結果
 */
export async function seedViaApi(
  options: { dryRun?: boolean } = {},
): Promise<SeedResult> {
  const errors: string[] = [];
  let profilesInserted = 0;
  let worksInserted = 0;
  let cardsInserted = 0;

  if (!isSupabaseConfigured) {
    return {
      success: false,
      profilesInserted: 0,
      worksInserted: 0,
      cardsInserted: 0,
      errors: ['Supabase が未設定です。.env を確認してください。'],
    };
  }

  if (options.dryRun) {
    console.log('[Seed] ドライラン: 実際の書き込みは行いません。');
  }

  // -------------------------------------------------------
  // 1. 既存データのチェック（重複防止）
  // -------------------------------------------------------
  const { data: existingProfiles, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .limit(1);

  if (checkError) {
    errors.push(`既存データのチェックに失敗: ${checkError.message}`);
    return { success: false, profilesInserted, worksInserted, cardsInserted, errors };
  }

  if (existingProfiles && existingProfiles.length > 0) {
    errors.push(
      '既にプロフィールデータが存在します。二重シードを防ぐためスキップしました。' +
      ' 再シードするには、先に既存データを削除してください。',
    );
    return { success: false, profilesInserted, worksInserted, cardsInserted, errors };
  }

  if (options.dryRun) {
    return {
      success: true,
      profilesInserted: mockStudents.length,
      worksInserted: mockStudents.reduce((sum, s) => sum + s.projects.length, 0),
      cardsInserted: mockCards.length,
      errors: [],
    };
  }

  // -------------------------------------------------------
  // 2. Profiles を INSERT
  // -------------------------------------------------------
  console.log('[Seed] プロフィールを挿入中…');

  const profileRows = mockStudents.map((s: Student) => ({
    id: toSeedUuid(s.id),
    role: 'student' as const,
    display_name: s.name,
    avatar_url: s.avatarUrl ?? null,
    typing_history: s.typingHistory as unknown as Json,
    login_id: s.loginId ?? s.id,
    updated_at: new Date().toISOString(),
  }));

  const { error: profileError } = await supabase
    .from('profiles')
    .insert(profileRows);

  if (profileError) {
    errors.push(`profiles の挿入に失敗: ${profileError.message}`);
  } else {
    profilesInserted = profileRows.length;
    console.log(`[Seed] ${profilesInserted} 件のプロフィールを挿入しました。`);
  }

  // -------------------------------------------------------
  // 3. Minecraft Works を INSERT
  // -------------------------------------------------------
  console.log('[Seed] Minecraft 作品を挿入中…');

  const workRows: Array<{
    student_id: string;
    title: string;
    description: string;
    model_path: string | null;
    screenshot_path: string | null;
    make_code_url: string | null;
    created_at: string;
  }> = [];

  for (const student of mockStudents) {
    const studentUuid = toSeedUuid(student.id);
    for (const project of student.projects) {
      workRows.push({
        student_id: studentUuid,
        title: project.title,
        description: project.description,
        model_path: project.modelUrl ?? null,
        screenshot_path: project.screenshotUrl ?? null,
        make_code_url: project.makeCodeUrl ?? null,
        created_at: new Date(project.createdAt).toISOString(),
      });
    }
  }

  if (workRows.length > 0) {
    const { error: worksError } = await supabase
      .from('minecraft_works')
      .insert(workRows);

    if (worksError) {
      errors.push(`minecraft_works の挿入に失敗: ${worksError.message}`);
    } else {
      worksInserted = workRows.length;
      console.log(`[Seed] ${worksInserted} 件の作品を挿入しました。`);
    }
  }

  // -------------------------------------------------------
  // 4. Cards を INSERT（mockCards が空でない場合のみ）
  // -------------------------------------------------------
  if (mockCards.length > 0) {
    console.log('[Seed] カードを挿入中…');

    const cardRows = mockCards.map((card: CardData) => ({
      student_id: toSeedUuid(card.studentId),
      title: card.title,
      description: card.description,
      image_path: card.imageUrl ?? '',
      rarity: card.rarity ?? 'C',
      is_opened: card.isOpened ?? false,
      metadata: {
        type: card.type,
        score: card.score ?? null,
        wpm: card.wpm ?? null,
        diffScore: card.diffScore ?? null,
        projectId: card.projectId ?? null,
        issueNumber: card.issueNumber ?? null,
        typingStats: card.typingStats ?? null,
        minecraftData: card.minecraftData ?? null,
      } as unknown as Json,
      created_at: new Date(card.date).toISOString(),
    }));

    const { error: cardsError } = await supabase
      .from('cards')
      .insert(cardRows);

    if (cardsError) {
      errors.push(`cards の挿入に失敗: ${cardsError.message}`);
    } else {
      cardsInserted = cardRows.length;
      console.log(`[Seed] ${cardsInserted} 件のカードを挿入しました。`);
    }
  } else {
    console.log('[Seed] mockCards が空のため、カードの挿入をスキップしました。');
  }

  // -------------------------------------------------------
  // 結果
  // -------------------------------------------------------
  const success = errors.length === 0;
  console.log(
    success
      ? '[Seed] シーディング完了！'
      : `[Seed] シーディング完了（エラーあり: ${errors.length} 件）`,
  );

  return { success, profilesInserted, worksInserted, cardsInserted, errors };
}

// ---------------------------------------------------------------------------
// 3. コンソール用ヘルパー
// ---------------------------------------------------------------------------

/**
 * ブラウザのデベロッパーコンソールから手軽に呼び出すためのヘルパー。
 *
 * 使い方（コンソールで実行）:
 * ```
 * import('/src/utils/seedSupabase.ts').then(m => m.printSeedSQL())
 * ```
 */
export function printSeedSQL(): void {
  const sql = generateSeedSQL();
  console.log(sql);
  console.log('\n上記の SQL を Supabase SQL Editor に貼り付けて実行してください。');
}
