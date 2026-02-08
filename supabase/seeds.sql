-- ============================================================
-- 放課後キャンパスクラブ: 開発用シードデータ
-- ============================================================
-- 前提: supabase/schema.sql を先に実行済みであること。
--
-- このスクリプトは以下を挿入します:
--   - auth.users: テスト用ユーザー（教師 1 名 + 生徒 5 名）
--   - profiles:   プロフィール
--   - minecraft_works: Minecraft 作品
--
-- ※ mockCards は空のため cards テーブルへの INSERT はありません。
--   カードは管理画面から発行してください。
--
-- 冪等: ON CONFLICT (id) DO NOTHING を使用しているため、
--        同じデータが既に存在する場合はスキップされます。
-- ============================================================

BEGIN;

-- ============================================================
-- 1. テスト用ユーザーの作成（auth.users）
--    profiles の FK 制約 (references auth.users) を満たすために必要
-- ============================================================

-- 教師アカウント
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'teacher@example.com',
  crypt('teacher-dev-password-2026', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 生徒アカウント: student-1 (田中 太郎)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'student-1@example.com',
  crypt('student-dev-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 生徒アカウント: student-2 (佐藤 花子)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'student-2@example.com',
  crypt('student-dev-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 生徒アカウント: student-3 (鈴木 一郎)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'student-3@example.com',
  crypt('student-dev-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 生徒アカウント: student-4 (高橋 美咲)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'student-4@example.com',
  crypt('student-dev-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 生徒アカウント: student-5 (ゆうき)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at
) VALUES (
  '00000000-0000-4000-a000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'student-5@example.com',
  crypt('student-dev-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. プロフィール
-- ============================================================

-- 教師プロフィール
INSERT INTO profiles (id, role, display_name, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'teacher',
  '先生',
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- student-1: 田中 太郎
INSERT INTO profiles (id, role, display_name, avatar_url, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'student',
  '田中 太郎',
  NULL,
  '[{"date":"2024-01-15","score":850,"wpm":45,"diffFromLast":5},{"date":"2024-01-18","score":900,"wpm":47,"diffFromLast":2},{"date":"2024-01-22","score":950,"wpm":50,"diffFromLast":3},{"date":"2024-01-25","score":1100,"wpm":55,"diffFromLast":5},{"date":"2024-01-28","score":1200,"wpm":58,"diffFromLast":3},{"date":"2024-02-01","score":1250,"wpm":60,"diffFromLast":2},{"date":"2024-02-05","score":1300,"wpm":62,"diffFromLast":2}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- student-2: 佐藤 花子
INSERT INTO profiles (id, role, display_name, avatar_url, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000002',
  'student',
  '佐藤 花子',
  NULL,
  '[{"date":"2024-01-16","score":720,"wpm":38,"diffFromLast":2},{"date":"2024-01-19","score":750,"wpm":40,"diffFromLast":2},{"date":"2024-01-23","score":800,"wpm":42,"diffFromLast":2},{"date":"2024-01-26","score":850,"wpm":44,"diffFromLast":2},{"date":"2024-01-29","score":900,"wpm":45,"diffFromLast":1},{"date":"2024-02-02","score":950,"wpm":47,"diffFromLast":2},{"date":"2024-02-06","score":980,"wpm":48,"diffFromLast":1}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- student-3: 鈴木 一郎
INSERT INTO profiles (id, role, display_name, avatar_url, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000003',
  'student',
  '鈴木 一郎',
  NULL,
  '[{"date":"2024-01-17","score":650,"wpm":35,"diffFromLast":0},{"date":"2024-01-20","score":680,"wpm":36,"diffFromLast":1},{"date":"2024-01-24","score":700,"wpm":37,"diffFromLast":1},{"date":"2024-01-27","score":720,"wpm":38,"diffFromLast":1},{"date":"2024-01-30","score":750,"wpm":39,"diffFromLast":1},{"date":"2024-02-03","score":780,"wpm":40,"diffFromLast":1},{"date":"2024-02-07","score":800,"wpm":41,"diffFromLast":1}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- student-4: 高橋 美咲
INSERT INTO profiles (id, role, display_name, avatar_url, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000004',
  'student',
  '高橋 美咲',
  NULL,
  '[{"date":"2024-01-18","score":950,"wpm":50,"diffFromLast":5},{"date":"2024-01-21","score":1000,"wpm":52,"diffFromLast":2},{"date":"2024-01-24","score":1050,"wpm":54,"diffFromLast":2},{"date":"2024-01-27","score":1150,"wpm":56,"diffFromLast":2},{"date":"2024-01-31","score":1200,"wpm":58,"diffFromLast":2},{"date":"2024-02-04","score":1250,"wpm":60,"diffFromLast":2},{"date":"2024-02-08","score":1300,"wpm":62,"diffFromLast":2}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- student-5: ゆうき
INSERT INTO profiles (id, role, display_name, avatar_url, typing_history)
VALUES (
  '00000000-0000-4000-a000-000000000005',
  'student',
  'ゆうき',
  NULL,
  '[{"date":"2024-01-19","score":580,"wpm":32,"diffFromLast":-2},{"date":"2024-01-22","score":600,"wpm":33,"diffFromLast":1},{"date":"2024-01-25","score":620,"wpm":34,"diffFromLast":1},{"date":"2024-01-28","score":650,"wpm":35,"diffFromLast":1},{"date":"2024-02-01","score":680,"wpm":36,"diffFromLast":1},{"date":"2024-02-05","score":700,"wpm":37,"diffFromLast":1},{"date":"2024-02-09","score":720,"wpm":38,"diffFromLast":1}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Minecraft 作品
-- ============================================================

-- student-1: 未来都市プロジェクト
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000001',
  '未来都市プロジェクト',
  '高層ビルと公園が調和する未来都市を建設しました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-20'
);

-- student-1: 海底基地
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000001',
  '海底基地',
  'ガラスドームで覆われた海底研究施設を作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-25'
);

-- student-1: 空中庭園
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000001',
  '空中庭園',
  '雲の上に浮かぶ幻想的な庭園を建設しました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-02-01'
);

-- student-2: お城プロジェクト
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000002',
  'お城プロジェクト',
  '中世ヨーロッパ風の壮大な城を建設しました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-22'
);

-- student-2: 桜の森
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000002',
  '桜の森',
  '満開の桜に囲まれた日本庭園を作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-28'
);

-- student-3: 火山の島
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000003',
  '火山の島',
  '活火山と溶岩の流れる危険な島を作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-26'
);

-- student-3: 砂漠のオアシス
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000003',
  '砂漠のオアシス',
  '広大な砂漠の中に緑豊かなオアシスを建設しました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-02-03'
);

-- student-3: 地下都市
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000003',
  '地下都市',
  '岩盤の下に広がる巨大な地下都市を作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-02-05'
);

-- student-4: 魔法学校
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000004',
  '魔法学校',
  '魔法使いが学ぶ不思議な学校を建設しました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-24'
);

-- student-4: 宇宙ステーション
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000004',
  '宇宙ステーション',
  '地球の軌道上に浮かぶ宇宙ステーションを作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-30'
);

-- student-5: 遊園地
INSERT INTO minecraft_works (id, student_id, title, description, model_path, screenshot_path, make_code_url, created_at)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-4000-a000-000000000005',
  '遊園地',
  'ジェットコースターや観覧車がある楽しい遊園地を作りました。',
  '/building-2.glb',
  NULL,
  'https://minecraft.makecode.com/?lang=ja#',
  '2024-01-27'
);

-- ============================================================
-- 4. カード（mockCards は空のためスキップ）
--    カードは管理画面の「カード発行」機能から作成してください。
-- ============================================================

COMMIT;

-- ============================================================
-- シード完了!
--
-- テスト用アカウント情報:
--   教師: teacher@example.com / teacher-dev-password-2026
--   生徒: student-1@example.com ~ student-5@example.com / student-dev-password
--
-- ※ これらは開発用のダミーアカウントです。
--   本番環境では使用しないでください。
-- ============================================================
