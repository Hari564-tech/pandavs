-- Project management, milestones, tasks, and subtasks
create table if not exists projects (
  id text primary key,
  code text not null unique,
  name text not null,
  subtitle text not null default '',
  status text not null default 'planning' check (status in ('healthy', 'at_risk', 'delayed', 'planning')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  lead_id text not null,
  faculty_id text not null,
  target_date text not null default '',
  target_note text not null default '',
  abstract text not null default '',
  repo_url text not null default '',
  preview_url text,
  cycle text not null default 'Sprint 01',
  stack_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_lead_idx on projects (lead_id);
create index if not exists projects_faculty_idx on projects (faculty_id);
create index if not exists projects_status_idx on projects (status);

create table if not exists project_members (
  project_id text not null references projects (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  member_role text not null default 'member' check (member_role in ('lead', 'faculty', 'member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on project_members (user_id);

create table if not exists milestones (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  title text not null,
  detail text not null default '',
  status text not null default 'planned' check (status in ('done', 'active', 'planned')),
  date text not null default '',
  score text,
  meta text not null default '',
  blocker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists milestones_project_idx on milestones (project_id);

create table if not exists tasks (
  id text primary key,
  code text not null unique,
  title text not null,
  project_id text not null references projects (id) on delete cascade,
  assignee_id text not null references "user" ("id") on delete cascade,
  assigner_id text not null references "user" ("id") on delete cascade,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  due_at text not null default '',
  due_label text not null default '',
  branch text,
  blocker text,
  pages text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on tasks (project_id);
create index if not exists tasks_assignee_idx on tasks (assignee_id);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_priority_idx on tasks (priority);

create table if not exists subtasks (
  id text primary key,
  task_id text not null references tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subtasks_task_idx on subtasks (task_id);
