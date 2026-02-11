-- ============================================================
-- 教師が生徒の profiles を更新できる RLS ポリシー追加
-- ============================================================
-- 原因: 「Users can update own profile」は auth.uid() = id のみ許可するため、
--       教師が生徒の typing_history 等を保存すると RLS で拒否されていた。
-- 対応: 教師ロールのユーザーが role = 'student' の行を UPDATE できるようにする。
-- 実行方法: Supabase Dashboard > SQL Editor で実行するか、
--           ローカル開発時は supabase db push 等で適用してください。
-- ============================================================

drop policy if exists "Teachers can update student profiles" on profiles;
create policy "Teachers can update student profiles"
  on profiles for update
  using (
    role = 'student'
    and exists ( select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher' )
  );
