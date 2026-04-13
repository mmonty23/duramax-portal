-- ═══════════════════════════════════════════════════════════════
-- DURAMAX FILE PORTAL — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PROFILES TABLE ───────────────────────────────────────────
-- Extends Supabase auth.users with role + client linkage
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'client' check (role in ('admin', 'client')),
  client_id   text,                        -- matches clients.id for client users
  full_name   text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Admin sees all profiles; users see only their own
create policy "Admin full access to profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Auto-create profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. CLIENTS TABLE ────────────────────────────────────────────
create table if not exists public.clients (
  id            text primary key,           -- slug e.g. "meridian-logistics"
  name          text not null,
  email         text not null,
  project_name  text default 'General',
  storage_path  text,                       -- e.g. "clients/meridian-logistics/"
  active        boolean default true,
  created_at    timestamptz default now(),
  created_by    uuid references auth.users(id)
);

alter table public.clients enable row level security;

-- Admin: full access
create policy "Admin full access to clients"
  on public.clients for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Client: read only their own record
create policy "Client reads own record"
  on public.clients for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.client_id = clients.id
    )
  );


-- ── 3. FILES TABLE ──────────────────────────────────────────────
-- Metadata mirror of Storage objects (for easy querying)
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  client_id     text not null references public.clients(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null,              -- full path in Storage bucket
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid references auth.users(id),
  created_at    timestamptz default now()
);

alter table public.files enable row level security;

-- Admin: full access
create policy "Admin full access to files"
  on public.files for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Client: read + insert only their own client's files
create policy "Client reads own files"
  on public.files for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.client_id = files.client_id
    )
  );

create policy "Client inserts own files"
  on public.files for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.client_id = files.client_id
    )
  );


-- ── 4. STORAGE BUCKET ───────────────────────────────────────────
-- Creates the "client-files" bucket (private)
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 524288000)  -- 500MB max per file
on conflict (id) do nothing;

-- Storage RLS: Admin can do everything
create policy "Admin full storage access"
  on storage.objects for all
  using (
    bucket_id = 'client-files' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Storage RLS: Client can upload + read only their own folder
create policy "Client upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'client-files' and
    (storage.foldername(name))[1] = 'clients' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.client_id = (storage.foldername(name))[2]
    )
  );

create policy "Client read own folder"
  on storage.objects for select
  using (
    bucket_id = 'client-files' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.client_id = (storage.foldername(name))[2]
    )
  );


-- ── 5. HELPER FUNCTION ──────────────────────────────────────────
-- Returns the calling user's role (used by the app)
create or replace function public.get_my_role()
returns text language sql security definer as $$
  select role from public.profiles where id = auth.uid();
$$;
