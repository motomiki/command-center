-- ============================================================
-- 放課後キャンパスクラブ: データベーススキーマ
-- ============================================================
-- このファイルは Supabase SQL Editor で実行してください。
-- 冪等（何度実行しても安全）に設計されています。
-- ============================================================

-- 必要な拡張機能を有効化
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES Table (Teachers & Students)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text check (role in ('teacher', 'student')) not null default 'student',
  display_name text,
  avatar_url text,
  typing_history jsonb default '[]'::jsonb, -- タイピング練習の履歴 [{date, score, wpm, diffFromLast}]
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 既存の profiles に typing_history がない場合に追加（過去に作成したテーブル用）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typing_history jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. CARDS Table (Achievements & Gacha Results)
-- ============================================================
create table if not exists cards (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_path text not null,       -- Path in Supabase Storage
  rarity text not null,           -- 'C', 'U', 'R', 'SR', 'SSR'
  is_opened boolean default false,
  metadata jsonb default '{}'::jsonb,  -- Stores typing stats, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. MINECRAFT_WORKS Table (Projects)
-- ============================================================
create table if not exists minecraft_works (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  model_path text,                -- Path to .glb in Storage
  screenshot_path text,           -- Path to .png in Storage
  make_code_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 4. Row Level Security (RLS) の有効化
-- ============================================================
alter table profiles enable row level security;
alter table cards enable row level security;
alter table minecraft_works enable row level security;

-- ============================================================
-- 5. RLS ポリシー
--    方針: 全員が読み取り可能 / 書き込みは認証ユーザーのみ
--    ※ 冪等にするため DROP IF EXISTS → CREATE の順序で定義
-- ============================================================

-- ----- PROFILES -----
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- ----- CARDS -----
drop policy if exists "Cards are viewable by everyone" on cards;
create policy "Cards are viewable by everyone"
  on cards for select
  using ( true );

drop policy if exists "Teachers can insert/update cards" on cards;
create policy "Teachers can insert/update cards"
  on cards for all
  using ( exists ( select 1 from profiles where id = auth.uid() and role = 'teacher' ) );

-- ----- MINECRAFT_WORKS -----
drop policy if exists "Works are viewable by everyone" on minecraft_works;
create policy "Works are viewable by everyone"
  on minecraft_works for select
  using ( true );

drop policy if exists "Teachers can insert/update works" on minecraft_works;
create policy "Teachers can insert/update works"
  on minecraft_works for all
  using ( exists ( select 1 from profiles where id = auth.uid() and role = 'teacher' ) );

-- ============================================================
-- 完了
-- 次のステップ:
--   1. supabase/storage.sql  を実行（Storage バケット + ポリシー）
--   2. supabase/seeds.sql    を実行（開発用テストデータ）
--   3. .env に VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定
-- ============================================================
