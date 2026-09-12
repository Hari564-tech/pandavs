-- Documents, versioning, chat channels, messages, and read receipts
create table if not exists documents (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  name text not null,
  kind text not null default 'other' check (kind in ('prd', 'trd', 'arch', 'spec', 'other')),
  current_version_id text,
  created_by text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_project_idx on documents (project_id);
create index if not exists documents_kind_idx on documents (kind);

create table if not exists document_versions (
  id text primary key,
  document_id text not null references documents (id) on delete cascade,
  version text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  uploaded_by text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists document_versions_doc_idx on document_versions (document_id);

create table if not exists channels (
  id text primary key,
  project_id text references projects (id) on delete cascade,
  name text not null unique,
  topic text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  channel_id text not null references channels (id) on delete cascade,
  author_id text not null references "user" ("id") on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists messages_channel_created_idx on messages (channel_id, created_at desc);

create table if not exists message_reads (
  channel_id text not null references channels (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);
