import { getCachedStudents } from '@/services/LocalCache';

/** RFC 4122 UUID 形式（小文字）の正規表現 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 文字列が UUID 形式かどうかを判定する。
 */
function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * 生徒識別子（login_id または profiles.id の UUID）を、Supabase の profiles.id（UUID）に解決する。
 * カード・作品保存時に UI が渡す login_id（例: student-1）を DB 用 UUID に変換するために使用する。
 *
 * @param idOrLoginId - 生徒の UUID または login_id（例: student-1）
 * @returns profiles.id に相当する UUID
 * @throws キャッシュに存在せず、かつ UUID 形式でもない場合
 */
export async function resolveStudentIdToUuid(
  idOrLoginId: string,
): Promise<string> {
  const students = await getCachedStudents();
  const student = students.find(
    (s) => s.id === idOrLoginId || s.loginId === idOrLoginId,
  );

  if (student) {
    return student.id;
  }

  if (isUuid(idOrLoginId)) {
    return idOrLoginId;
  }

  throw new Error(`生徒が見つかりません: ${idOrLoginId}`);
}
