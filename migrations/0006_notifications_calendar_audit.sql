-- Calendar events, notifications, activity feed, and audit logs
create table if not exists calendar_events (
  id text primary key,
  project_id text references projects (id) on delete cascade,
  title text not null,
  event_date text not null,
  start_time text not null default '',
  place text not null default '',
  kind text not null default 'standup' check (kind in ('review', 'standup', 'deadline', 'lab')),
  created_by text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_date_idx on calendar_events (event_date);

create table if not exists notifications (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  kind text not null default 'system' check (kind in ('alert', 'review', 'mention', 'system')),
  title text not null,
  body text not null default '',
  href text not null default '/',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx on notifications (user_id, read_at);

create table if not exists activity (
  id text primary key,
  actor_id text not null references "user" ("id") on delete cascade,
  kind text not null check (kind in ('approve', 'commit', 'report', 'blocker', 'comment', 'ping', 'upload')),
  text text not null,
  detail text,
  project_id text references projects (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists activity_created_idx on activity (created_at desc);

create table if not exists audit_logs (
  id text primary key,
  actor_id text not null references "user" ("id") on delete cascade,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);
create index if not exists audit_logs_action_idx on audit_logs (action);
