# Database Specification & Migration Guide: TeamHub

## 1. Overview
TeamHub utilizes **PostgreSQL** in production (via **Supabase Free Tier**) and embedded **PGLite (Postgres compiled to WebAssembly)** during development and live testing.

- **Query Builder**: [Kysely](https://kysely.dev) — Type-safe, explicit SQL query builder with zero code-generation overhead.
- **Migration Engine**: Pure SQL migrations in `migrations/*.sql`, tracked via `_migrations` table.

---

## 2. Migration Manifest

| Migration File | Domain Area | Key Tables Created |
|---|---|---|
| `0001_auth.sql` | Identity & Sessions | `user`, `session`, `account`, `verification` |
| `0002_core.sql` | Profiles & Settings | `profiles`, `user_settings` |
| `0003_projects_tasks.sql` | Project Management | `projects`, `project_members`, `milestones`, `tasks`, `subtasks` |
| `0004_reports_reviews.sql` | Daily Standup Reports | `daily_reports`, `report_tasks`, `report_reviews` |
| `0005_documents_chat.sql` | Docs & Realtime Chat | `documents`, `document_versions`, `channels`, `messages`, `message_reads` |
| `0006_notifications_calendar_audit.sql` | Operations & Governance | `calendar_events`, `notifications`, `activity`, `audit_logs` |

---

## 3. Detailed Table Reference

### `profiles`
Represents an engineering cohort contributor, faculty member, lead, or administrator.
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE)
- `name` (TEXT NOT NULL)
- `short` (TEXT NOT NULL)
- `email` (TEXT NOT NULL)
- `role` (TEXT NOT NULL CHECK in `super_admin`, `faculty`, `lead`, `member`)
- `title` (TEXT NOT NULL)
- `dept` (TEXT NOT NULL)
- `year` (TEXT NULL)
- `registration_no` (TEXT NULL)
- `presence` (TEXT NOT NULL CHECK in `active`, `review`, `offline`)
- `avatar_url` (TEXT NULL)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `projects`
Strategic engineering units.
- `id` (TEXT PRIMARY KEY)
- `code` (TEXT NOT NULL UNIQUE, e.g., `PROJ-001`)
- `name` (TEXT NOT NULL)
- `subtitle` (TEXT NOT NULL)
- `status` (TEXT NOT NULL CHECK in `healthy`, `at_risk`, `delayed`, `planning`)
- `progress` (INTEGER NOT NULL CHECK between 0 and 100)
- `lead_id` (TEXT NOT NULL)
- `faculty_id` (TEXT NOT NULL)
- `target_date` (TEXT NOT NULL)
- `target_note` (TEXT NOT NULL)
- `abstract` (TEXT NOT NULL)
- `repo_url` (TEXT NOT NULL)
- `preview_url` (TEXT NULL)
- `cycle` (TEXT NOT NULL)
- `stack_json` (JSONB NOT NULL DEFAULT '[]')
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `tasks` & `subtasks`
Granular work items allocated to contributors.
- `tasks`: `id`, `code` (UNIQUE), `title`, `project_id`, `assignee_id`, `assigner_id`, `priority` (`high`|`medium`|`low`), `status` (`todo`|`in_progress`|`blocked`|`review`|`done`), `progress`, `due_at`, `due_label`, `branch`, `blocker`, `pages`, `created_at`, `updated_at`.
- `subtasks`: `id`, `task_id` (CASCADE), `title`, `done` (BOOLEAN), `position` (INT), `created_at`, `updated_at`.

### `daily_reports` & `report_reviews`
Authoritative daily record of engineering accomplishments.
- `daily_reports`:
  - `id` (TEXT PRIMARY KEY)
  - `author_id` (TEXT NOT NULL REFERENCES "user"(id))
  - `project_id` (TEXT NOT NULL REFERENCES projects(id))
  - `report_date` (TEXT NOT NULL)
  - `hours` (NUMERIC(4,1) NOT NULL)
  - `completed` (TEXT NOT NULL)
  - `next_steps` (TEXT NOT NULL)
  - `blockers` (TEXT NOT NULL)
  - `progress` (INTEGER NOT NULL)
  - `status` (TEXT NOT NULL CHECK in `draft`, `submitted`, `approved`, `revision`)
  - `pr_url` (TEXT NULL)
  - `attachment` (TEXT NULL)
  - `submitted_at` (TIMESTAMPTZ NULL)
  - **Constraint**: `UNIQUE (author_id, project_id, report_date)` for idempotent submission.
- `report_reviews`:
  - `id` (TEXT PRIMARY KEY)
  - `report_id` (TEXT NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE)
  - `reviewer_id` (TEXT NOT NULL REFERENCES "user"(id))
  - `status` (`approved` | `revision`)
  - `feedback` (TEXT NOT NULL)
  - `reviewed_at` (TIMESTAMPTZ NOT NULL)

### `documents` & `document_versions`
Private specifications, PRDs, TRDs, and architecture diagram packages.
- `documents`: `id`, `project_id`, `name`, `kind` (`prd`|`trd`|`arch`|`spec`|`other`), `current_version_id`, `created_by`, `created_at`, `updated_at`.
- `document_versions`: `id`, `document_id`, `version`, `storage_path`, `size_bytes`, `mime_type`, `uploaded_by`, `created_at`.

### `audit_logs`
Cryptographic, append-only administrative and security trail.
- `id` (TEXT PRIMARY KEY)
- `actor_id` (TEXT NOT NULL)
- `action` (TEXT NOT NULL)
- `target_type` (TEXT NOT NULL)
- `target_id` (TEXT NOT NULL)
- `metadata_json` (JSONB NOT NULL)
- `ip_hash` (TEXT NOT NULL)
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
