-- Esquema do banco "Minhas Receitas" para rodar no SQL Editor do Supabase.
-- Cole este arquivo inteiro lá e clique em "Run" uma única vez.

-- Extensão para gerar UUIDs (já vem habilitada na maioria dos projetos Supabase).
create extension if not exists "pgcrypto";

-- ---------- Receitas ----------
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('salgada', 'doce', 'bebida-quente', 'bebida-fria')),
  ingredients jsonb not null default '[]',
  steps text not null default '',
  notes text default '',
  tags jsonb not null default '[]',
  photo text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table recipes enable row level security;

create policy "Usuários veem só as próprias receitas"
  on recipes for select
  using (auth.uid() = user_id);

create policy "Usuários criam receitas para si mesmos"
  on recipes for insert
  with check (auth.uid() = user_id);

create policy "Usuários editam só as próprias receitas"
  on recipes for update
  using (auth.uid() = user_id);

create policy "Usuários excluem só as próprias receitas"
  on recipes for delete
  using (auth.uid() = user_id);

-- ---------- Preferências de ingredientes (um registro por usuário) ----------
-- custom_food/custom_drink: [{name, group}]. custom_food_groups/custom_drink_groups:
-- categorias extras criadas pelo usuário, além das já embutidas no app.
create table if not exists ingredient_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  custom_food jsonb not null default '[]',
  custom_drink jsonb not null default '[]',
  hidden_food jsonb not null default '[]',
  hidden_drink jsonb not null default '[]',
  custom_food_groups jsonb not null default '[]',
  custom_drink_groups jsonb not null default '[]'
);

alter table ingredient_prefs enable row level security;

create policy "Usuários veem só as próprias preferências"
  on ingredient_prefs for select
  using (auth.uid() = user_id);

create policy "Usuários criam as próprias preferências"
  on ingredient_prefs for insert
  with check (auth.uid() = user_id);

create policy "Usuários editam as próprias preferências"
  on ingredient_prefs for update
  using (auth.uid() = user_id);

-- ---------- Storage: fotos das receitas ----------
-- recipes.photo passa a guardar a URL pública do arquivo aqui, em vez do
-- base64 embutido direto na linha (mais leve pro banco).
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

create policy "Fotos de receitas são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

create policy "Usuários autenticados podem enviar fotos"
  on storage.objects for insert
  with check (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');

create policy "Usuários autenticados podem apagar fotos"
  on storage.objects for delete
  using (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');
