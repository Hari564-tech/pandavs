-- Daily work reports, report-task linking, and report reviews
create table if not exists daily_reports (
  id text primary key,
  author_id text not null references "user" ("id") on delete cascade,
  project_id text not null references projects (id) on delete cascade,
  report_date text not null,
  hours numeric(4, 1) not null default 0,
  completed text not null default '',
  next_steps text not null default '',
  blockers text not null default '',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'revision')),
  pr_url text,
  attachment text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reports_author_project_date_uq unique (author_id, project_id, report_date)
);

create index if not exists daily_reports_author_idx on daily_reports (author_id);
create index if not exists daily_reports_project_idx on daily_reports (project_id);
create index if not exists daily_reports_date_idx on daily_reports (report_date);
create index if not exists daily_reports_status_idx on daily_reports (status);

create table if not exists report_tasks (
  report_id text not null references daily_reports (id) on delete cascade,
  task_id text not null references tasks (id) on delete cascade,
  primary key (report_id, task_id)
);

create index if not exists report_tasks_task_idx on report_tasks (task_id);

create table if not exists report_reviews (
  id text primary key,
  report_id text not null references daily_reports (id) on delete cascade,
  reviewer_id text not null references "user" ("id") on delete cascade,
  status text not null check (status in ('approved', 'revision')),
  feedback text not null default '',
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists report_reviews_report_idx on report_reviews (report_id);
create index if not exists report_reviews_reviewer_idx on report_reviews (reviewer_id);
