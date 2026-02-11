/**
 * 指定時間で Promise を打ち切り、タイムアウト時は reject する。
 * ネットワーク待ちで UI が固まらないようにするために使用する。
 *
 * @param promise 元の Promise
 * @param ms タイムアウト（ミリ秒）
 * @param message タイムアウト時のエラーメッセージ
 * @returns 元の Promise が ms 以内に解決すればその結果、そうでなければ reject
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = '操作がタイムアウトしました。',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}
