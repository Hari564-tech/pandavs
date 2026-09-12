# RVIT TeamHub — Operations & Project Execution Portal

A production-grade, database-backed team management and project execution portal for academic engineering capstones, research cohorts, and internships. Built with **React 19**, **TanStack Start**, **TypeScript**, **PostgreSQL**, **Kysely**, **Better Auth**, **Supabase Storage**, and **Resend**.

---

## 🚀 Key Features

- **Enterprise RBAC**: Four distinct server-enforced roles (`super_admin`, `faculty`, `lead`, `member`).
- **Projects & Milestones**: Track progress, cycles, repositories, deliverables, and team memberships.
- **Task Management**: Drag-and-drop Kanban and list views with subtask checklists and blockers.
- **Daily Work Reports**: Transactional, idempotent daily report submission with PR links and task tags.
- **Faculty & Lead Reviews**: Approval workflows with feedback loops and revision tracking.
- **Private Document Management**: Versioned document storage with Supabase Storage signed URLs.
- **Persistent Chat & Presence**: Channel messaging backed by PostgreSQL and Supabase Realtime broadcast.
- **Executive Analytics**: Server-side aggregate metrics for workload, velocity, and compliance.
- **Audit Logs**: Append-only security logging for user administration and state modifications.
- **Zero-Conf Local Development**: Auto-migrating and auto-seeding embedded PGLite (WASM Postgres) with instant transition to Supabase/Neon PostgreSQL in production.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | TanStack Start (SSR + Server Functions) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4 (Navy Theme & Modern Surface Tokens) |
| **Authentication** | Better Auth (Email/Password + Session Cookies + Gate Tokens) |
| **Database** | PostgreSQL (Production) / PGLite WASM (Local Dev) |
| **Query Builder** | Kysely (Strict Type-Safe Parameterized Queries) |
| **Client State** | TanStack Query v5 (Server State) + Zustand (UI State only) |
| **Storage** | Supabase Storage (Private Buckets + Signed Upload/Download URLs) |
| **Realtime** | Supabase Realtime (Channels & Broadcast) |
| **Transactional Email** | Resend (Transactional notifications for reports and reviews) |
| **Hosting Target** | Vercel Hobby (Serverless Edge/Node Runtime) |

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 22+ (tested on Node 22 & Node 24)
- npm or pnpm

### 2. Installation
```bash
git clone <repository-url>
cd app-builder-workspace
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
For local development, **no external credentials are required**. The portal automatically initializes embedded PGLite, applies migrations, and seeds demonstration accounts.

For production deployment with Supabase and Resend, set:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
BETTER_AUTH_SECRET=your-secure-random-secret
BETTER_AUTH_URL=https://your-domain.vercel.app
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=TeamHub <notifications@yourdomain.com>
APP_URL=https://your-domain.vercel.app
```

### 4. Running the Development Server
```bash
npm run dev
```
Open `http://localhost:8080/` in your browser.

---

## 👥 Seed Test Personas

When running in local dev mode, the portal seeds realistic personas with pre-configured passwords:

| Name | Role | Email | Password |
|---|---|---|---|
| **Dr. Rajesh Sharma** | Super Admin | `r.sharma@rvit.ac.in` | `TeamHub@2026!` |
| **Prof. Malini Roy** | Faculty Reviewer | `m.roy@rvit.ac.in` | `TeamHub@2026!` |
| **Rahul Mukhopadhyay** | Tech Lead | `rahul.m@rvit.ac.in` | `TeamHub@2026!` |
| **Kavya Gopalan** | Member / Intern | `kavya.g@rvit.ac.in` | `TeamHub@2026!` |

---

## 🧪 Testing & Quality Gates

Run the test suite (includes 69 RBAC, security negative tests, and schema validations):
```bash
npm test
```

Run strict TypeScript typecheck:
```bash
npm run typecheck
```

Build production bundle for Vercel deployment:
```bash
npm run build
```

---

## 📂 Architecture Documentation

Detailed documentation is available in the repository:
- [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) — Monolith architecture, services, repositories, and workflows.
- [`DATABASE.md`](./DATABASE.md) — Complete database schema, relationships, indexes, and migrations.
- [`API.md`](./API.md) — Server functions, REST contracts, and validation specifications.
- [`SECURITY.md`](./SECURITY.md) — Threat model, RBAC policies, file security, and negative test results.
- [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) — Completed milestones and verification status.
