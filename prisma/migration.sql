-- Execute este SQL diretamente no SQL Editor do Supabase
-- caso prefira não rodar `prisma migrate dev` (ex: Supabase gerenciado).

create extension if not exists "pgcrypto";

create type video_status as enum ('processing', 'completed', 'failed');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  original_video_url text not null,
  status video_status not null default 'processing',
  created_at timestamptz not null default now()
);

create table if not exists translations (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  target_language text not null, -- en, es, de, fr, zh
  translated_video_url text,
  created_at timestamptz not null default now()
);

-- Bucket público de storage chamado 'videos' (crie também pelo painel do Supabase Storage)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;
