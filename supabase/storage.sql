-- ============================================================
-- 放課後キャンパスクラブ: Storage ポリシー設定
-- ============================================================
-- 前提:
--   1. supabase/schema.sql を実行済みであること
--   2. "assets" バケットをダッシュボードで作成済みであること
--      （Storage → New bucket → Name: assets, Public: オン）
--
-- このスクリプトは storage.objects に対する RLS ポリシーのみ設定します。
-- バケット自体は Supabase の仕様上、ダッシュボードまたは API で作成してください。
-- ============================================================

-- ============================================================
-- Storage ポリシー
-- ============================================================

-- ----- 読み取り: 全員がアクセス可能 -----
drop policy if exists "Assets are publicly readable" on storage.objects;
create policy "Assets are publicly readable"
  on storage.objects for select
  using ( bucket_id = 'assets' );

-- ----- アップロード: 教師のみ -----
drop policy if exists "Teachers can upload assets" on storage.objects;
create policy "Teachers can upload assets"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

-- ----- 更新: 教師のみ -----
drop policy if exists "Teachers can update assets" on storage.objects;
create policy "Teachers can update assets"
  on storage.objects for update
  using (
    bucket_id = 'assets'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

-- ----- 削除: 教師のみ -----
drop policy if exists "Teachers can delete assets" on storage.objects;
create policy "Teachers can delete assets"
  on storage.objects for delete
  using (
    bucket_id = 'assets'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

-- ============================================================
-- 完了
-- "assets" バケットに対するポリシーが適用されました:
--   - SELECT: 全員（Public バケットと合わせて公開）
--   - INSERT / UPDATE / DELETE: 教師のみ
-- ============================================================
