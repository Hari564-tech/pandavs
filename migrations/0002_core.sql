-- Core domain identity & settings tables
create table if not exists profiles (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  name text not null,
  short text not null,
  email text not null,
  role text not null default 'member' check (role in ('super_admin', 'faculty', 'lead', 'member')),
  title text not null default '',
  dept text not null default '',
  year text,
  registration_no text,
  presence text not null default 'offline' check (presence in ('active', 'review', 'offline')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_user_id_idx on profiles (user_id);
create index if not exists profiles_role_idx on profiles (role);
create index if not exists profiles_presence_idx on profiles (presence);

create table if not exists user_settings (
  user_id text primary key references "user" ("id") on delete cascade,
  dark_mode boolean not null default false,
  sidebar_collapsed boolean not null default false,
  email_notifications boolean not null default true,
  in_app_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
