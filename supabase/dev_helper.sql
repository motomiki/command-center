-- ============================================================
-- 放課後キャンパスクラブ: 開発用ヘルパー
-- ============================================================
--
-- !! 警告 !!
-- このスクリプトは開発・テスト用です。
-- 本番環境では絶対に実行しないでください。
--
-- 目的:
--   認証（Auth UI）が未実装の段階でも、管理画面からの
--   データ保存（INSERT / UPDATE）をテストできるようにします。
--
--   schema.sql の RLS ポリシーは「教師ロールのユーザーのみ書き込み可能」
--   ですが、認証なし（anon キー）で管理画面を使うと RLS に拒否されます。
--   このスクリプトで一時的に「誰でも書き込み可能」なポリシーを追加します。
--
-- 使い方:
--   1. 「A. RLS を緩和する」セクションを SQL Editor で実行
--   2. 管理画面からデータ保存をテスト
--   3. テスト完了後、「B. RLS を元に戻す」セクションを必ず実行
--
-- ============================================================

-- ============================================================
-- A. RLS を緩和する（開発用 — 一時的に anon でも書き込み可能にする）
-- ============================================================

-- profiles: anon でも INSERT / UPDATE 可能にする
drop policy if exists "Dev: allow all profile writes" on profiles;
create policy "Dev: allow all profile writes"
  on profiles for all
  using ( true )
  with check ( true );

-- cards: anon でも INSERT / UPDATE / DELETE 可能にする
drop policy if exists "Dev: allow all card writes" on cards;
create policy "Dev: allow all card writes"
  on cards for all
  using ( true )
  with check ( true );

-- minecraft_works: anon でも INSERT / UPDATE / DELETE 可能にする
drop policy if exists "Dev: allow all work writes" on minecraft_works;
create policy "Dev: allow all work writes"
  on minecraft_works for all
  using ( true )
  with check ( true );

-- storage.objects: anon でもアップロード / 削除可能にする
drop policy if exists "Dev: allow all storage writes" on storage.objects;
create policy "Dev: allow all storage writes"
  on storage.objects for all
  using ( bucket_id = 'assets' )
  with check ( bucket_id = 'assets' );

-- ============================================================
-- 確認
-- ============================================================
-- 上記を実行後、管理画面から保存操作をテストしてください。
-- テストが完了したら、必ず以下の「B. RLS を元に戻す」を実行してください。


-- ============================================================
-- B. RLS を元に戻す（テスト完了後に実行）
-- ============================================================
-- 以下のコメントを外して実行すると、開発用ポリシーが削除されます。
-- 本番のポリシー（schema.sql で定義済み）はそのまま残ります。

-- drop policy if exists "Dev: allow all profile writes" on profiles;
-- drop policy if exists "Dev: allow all card writes" on cards;
-- drop policy if exists "Dev: allow all work writes" on minecraft_works;
-- drop policy if exists "Dev: allow all storage writes" on storage.objects;

-- ============================================================
-- 元に戻した後の確認:
--   管理画面から保存 → RLS エラーが発生する = 正常に制限が戻っている
-- ============================================================
