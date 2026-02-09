-- ============================================================
-- 既存 DB 用: 生徒が自分あてのカードを開封済みにできる RLS ポリシー追加
-- ============================================================
-- 実行方法: Supabase Dashboard > SQL Editor で実行するか、
-- ローカル開発時は supabase db push 等で適用してください。
-- ============================================================

-- Students: 自分あてのカードの開封のみ更新可能（ガチャ開封で is_opened を true にするため）
drop policy if exists "Students can update own cards as opened" on cards;
create policy "Students can update own cards as opened"
  on cards for update
  using ( student_id = auth.uid() )
  with check ( student_id = auth.uid() );
