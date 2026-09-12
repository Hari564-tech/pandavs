# Backend Architecture Document: TeamHub Operations Portal

## 1. Architectural Philosophy
TeamHub is engineered as a high-performance, modular monolith deployed to **Vercel Hobby** with a **Supabase PostgreSQL** database, **Supabase Storage**, **Supabase Realtime**, and **Resend** for transactional communications. For local development and CI, a zero-configuration embedded **PGLite (Postgres in WASM)** instance ensures identical behavioral fidelity without requiring local Docker or running external database containers.

### Core Architectural Principles
- **Monolith Over Microservices**: Given the 20–30 user active cohort scale, all domain capabilities reside within a single TypeScript codebase running on TanStack Start server functions and server routes.
- **Server as the Exclusive Security Boundary**: Frontend components never make authoritative decisions regarding roles, permissions, or data visibility. The authenticated server session (`requireUserId`, `getAuthContext`) is the sole ground truth.
- **Database-First State**: All business state (projects, tasks, reports, reviews, documents, chat, notifications) is persisted in relational PostgreSQL tables with strict constraints, foreign keys, and indexes. Client-side state (Zustand) is strictly limited to ephemeral UI concerns (theme, drawer toggles, active modals).
- **Transactional & Idempotent Workflows**: Multi-step business operations (such as daily report submissions and report reviews) execute within ACID transactions with idempotency constraints.

---

## 2. Directory Structure & Domain Layering

```
src/
├── server/
│   ├── db/
│   │   ├── types.ts          # Strongly typed Kysely table definitions
│   │   └── kysely.ts         # Dual-mode Kysely instance (Neon / PGLite)
│   ├── errors/
│   │   └── index.ts          # Structured HTTP errors (AppError, Unauthorized, Forbidden, etc.)
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas for all inputs and models
│   ├── policies/
│   │   └── rbac.ts           # Server-side RBAC and entity authorization guards
│   ├── repositories/         # Direct Kysely SQL data access layer
│   │   ├── user.repo.ts
│   │   ├── project.repo.ts
│   │   ├── task.repo.ts
│   │   ├── report.repo.ts
│   │   ├── document.repo.ts
│   │   ├── chat.repo.ts
│   │   ├── calendar.repo.ts
│   │   ├── notification.repo.ts
│   │   ├── activity.repo.ts
│   │   ├── audit.repo.ts
│   │   └── analytics.repo.ts
│   ├── services/             # Domain logic, transactions, audits, notifications
│   │   ├── user.service.ts
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   ├── report.service.ts
│   │   ├── document.service.ts
│   │   ├── chat.service.ts
│   │   ├── calendar.service.ts
│   │   ├── notification.service.ts
│   │   ├── analytics.service.ts
│   │   └── admin.service.ts
│   ├── storage/
│   │   └── supabase-storage.ts  # Signed private upload & download URL service
│   ├── realtime/
│   │   └── supabase-realtime.ts # Event broadcast bus (Local + Supabase)
│   ├── email/
│   │   └── resend.ts         # Transactional email notification service
│   └── seed/
│       └── seed-runner.ts    # Complete development & test data population
├── routes/
│   ├── api/
│   │   ├── auth/$.ts         # Better Auth HTTP endpoint
│   │   └── v1/               # Reusable JSON API endpoints
│   └── ...                   # Application views
└── lib/
    ├── auth/                 # Better Auth client, middleware, session hooks
    └── db.ts                 # Dual-mode connection pool & PGLite auto-migrator
```

---

## 3. Data Flow & Request Lifecycle

```
[Browser Request / TanStack Query Hook]
                 │
                 ▼
[TanStack Start Server Function / API Route]
                 │
                 ▼
[authMiddleware / getAuthContext]  ───> Authenticate Session (Better Auth Cookie/Bearer)
                 │
                 ▼
[Zod Input Validation]             ───> Rejects invalid inputs (400)
                 │
                 ▼
[RBAC Policy Check]                ───> Enforces Role & Project Access (403)
                 │
                 ▼
[Domain Service]                   ───> Coordinates Business Logic & Multi-table Writes
        │        │
        │        ├───> [AuditRepository.log]
        │        ├───> [ActivityRepository.create]
        │        ├───> [NotificationRepository.create]
        │        └───> [EmailService / RealtimeService]
        ▼
[Kysely Repository]
        │
        ▼
[PostgreSQL / PGLite Database]
```

---

## 4. Idempotency & Concurrency
- **Daily Reports**: The database enforces a `UNIQUE (author_id, project_id, report_date)` constraint. Repeated submissions for the same date perform an in-place upsert, guaranteeing no duplicate records.
- **Transactions**: Atomic updates ensure that if a notification or audit write fails during a report review, the entire transaction rolls back cleanly.
- **Fail-Safe Communications**: Email and Realtime failures are caught and logged without aborting primary database transactions.
