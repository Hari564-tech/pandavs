# API Specification: TeamHub Operations Portal

## 1. Overview
TeamHub employs TanStack Start server functions (`createServerFn`) for same-application RPC calls and exposes structured JSON endpoints under `/api/v1/*` for REST-like integrations.

---

## 2. Authentication & Current User

### `GET /api/v1/me`
Retrieves the currently authenticated user profile, assigned role, and preferences.
- **Headers**: Cookie / Authorization Bearer
- **Response**:
```json
{
  "user": {
    "id": "sharma",
    "name": "Dr. R. Sharma",
    "email": "r.sharma@rvit.ac.in",
    "role": "super_admin",
    "title": "Admin Lead · Faculty PM",
    "dept": "CSE Faculty",
    "presence": "active"
  },
  "settings": {
    "dark_mode": false,
    "sidebar_collapsed": false
  }
}
```

---

## 3. Projects API

### `GET /api/v1/projects`
Lists all accessible engineering projects with progress and lead metadata.

### `POST /api/v1/projects`
Creates a new project.
- **Authorization**: `super_admin`, `faculty`, `lead`
- **Body**:
```json
{
  "code": "PROJ-007",
  "name": "Quantum Crypto Engine",
  "subtitle": "Post-quantum lattice key exchange",
  "leadId": "rahul",
  "facultyId": "sharma",
  "targetDate": "15 Nov",
  "targetNote": "Phase 1 PoC"
}
```

### `GET /api/v1/projects/:id`
Retrieves project details, milestones, members, and documents.

---

## 4. Tasks API

### `GET /api/v1/tasks`
Query parameters: `projectId`, `assigneeId`, `status`, `priority`, `search`.

### `POST /api/v1/tasks`
Creates a new task.
- **Authorization**: `super_admin`, `faculty`, `lead`
- **Body**:
```json
{
  "code": "RVIT-450",
  "title": "Integrate Lattice Hash Verification",
  "projectId": "PROJ-007",
  "assigneeId": "kavya",
  "priority": "high",
  "dueAt": "2026-09-18",
  "dueLabel": "Sep 18, 5:00 PM",
  "subtasks": [{ "title": "Implement Kyber512 wrapper" }]
}
```

### `PATCH /api/v1/tasks/:id/status`
Updates task execution status.
- **Authorization**: Assignee or Project Supervisor.
- **Body**:
```json
{
  "status": "blocked",
  "progress": 50,
  "blocker": "Waiting on hardware RNG module"
}
```

---

## 5. Daily Reports & Reviews API

### `POST /api/v1/reports`
Idempotently submits or updates a daily work report for the author/project/date.
- **Body**:
```json
{
  "projectId": "team-portal",
  "date": "2026-09-11",
  "hours": 6.5,
  "completed": "Finished JWT rotation middleware and RBAC policy tests.",
  "next": "Writing integration tests.",
  "blockers": "",
  "progress": 80,
  "prUrl": "https://github.com/rvit-tech/team-portal/pull/42",
  "taskCodes": ["RVIT-412"]
}
```

### `POST /api/v1/reports/:id/review`
Submits faculty/lead review on a report.
- **Authorization**: Project Supervisor (Author forbidden from self-review).
- **Body**:
```json
{
  "status": "approved",
  "feedback": "Verified 8 commits and test coverage."
}
```

---

## 6. Documents & Storage API

### `POST /api/v1/files/presign`
Requests upload authorization and a signed storage URL.
- **Body**:
```json
{
  "projectId": "team-portal",
  "name": "Architecture_v3.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 2048500
}
```

### `POST /api/v1/documents/complete`
Registers the completed file upload as an active document version.

---

## 7. Chat, Calendar, Notifications, Admin

- `GET /api/v1/channels/:id/messages`
- `POST /api/v1/channels/:id/messages`
- `GET /api/v1/events`
- `POST /api/v1/events`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/ping`
- `GET /api/v1/analytics/overview`
- `GET /api/v1/admin/audit`
- `PATCH /api/v1/users/:id/role`
