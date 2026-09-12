# Deploying RVIT TeamHub to Render (render.com)

This guide provides step-by-step instructions to deploy the RVIT TeamHub full-stack application to **Render**.

---

## Architecture Overview

- **Framework**: TanStack Start (React 19 + Vite + Nitro Engine)
- **Database**: PostgreSQL (Supabase / Neon / Render Postgres)
- **Object Storage**: Supabase Storage (avatars, documents, specs)
- **Authentication**: Better Auth (session cookies + email/password authentication)
- **Email Service**: Resend API
- **Build Mode**: Standalone Node.js server (`.output/server/index.mjs`) listening on `0.0.0.0:$PORT`

---

## Method 1: Instant Deployment with Render Blueprint (Recommended)

The repository includes a [`render.yaml`](./render.yaml) blueprint file that configures the build command, start command, health check, and environment variables automatically.

### Steps:
1. Push your latest code to GitHub:
   ```bash
   git push origin main
   ```
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **"New +"** in the top navigation bar and select **"Blueprint"**.
4. Connect your GitHub repository: `Hari564-tech/KOVRAVAS`.
5. Render will detect `render.yaml` and display the `rvit-teamhub` web service.
6. Fill in the secret environment variables (or verify the pre-configured ones):
   - `DATABASE_URL`: Your Supabase PostgreSQL transaction/session pooler connection string.
   - `SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase secret service role key.
   - `RESEND_API_KEY`: Your Resend API key (`re_...`).
   - `BETTER_AUTH_SECRET`: Render will auto-generate this securely (or provide a 32+ character random string).
7. Click **"Apply"**.
8. Render will build and deploy your app. Once deployed, copy your Render URL (e.g., `https://rvit-teamhub.onrender.com`) and ensure `BETTER_AUTH_URL` is set to this URL.

---

## Method 2: Manual Web Service Setup (Node.js Runtime)

If you prefer to configure the service manually through Render's web interface:

1. In Render Dashboard, click **"New +"** -> **"Web Service"**.
2. Connect `https://github.com/Hari564-tech/KOVRAVAS.git`.
3. Configure the settings:
   - **Name**: `rvit-teamhub`
   - **Region**: Oregon (US West) or Frankfurt / Singapore (choose nearest to your database)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:render
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: Free or Starter

4. Add **Environment Variables** under the "Environment" tab:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_VERSION` | `22.12.0` | Node.js runtime version |
   | `NITRO_PRESET` | `node-server` | Builds standalone Node.js server |
   | `DATABASE_URL` | `postgresql://postgres:password@host:5432/postgres` | Supabase Postgres URL |
   | `SUPABASE_URL` | `https://zvcebipompkisahakzpw.supabase.co` | Supabase project endpoint |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Supabase Service Role Key |
   | `RESEND_API_KEY` | `re_...` | Resend API key for notification emails |
   | `BETTER_AUTH_SECRET` | `generate-a-random-32-char-string` | Used for cookie session encryption |
   | `BETTER_AUTH_URL` | `https://<your-render-subdomain>.onrender.com` | Production URL of your app |

5. Click **"Create Web Service"**.

---

## Method 3: Container Deployment with Docker

The repository includes a production multi-stage [`Dockerfile`](./Dockerfile) using lightweight Node 22 Alpine:

1. In Render Dashboard, click **"New +"** -> **"Web Service"**.
2. Connect `https://github.com/Hari564-tech/KOVRAVAS.git`.
3. Select **"Docker"** as the Environment / Runtime.
4. Render will automatically detect the `Dockerfile` at the repository root.
5. Add the environment variables listed in Method 2.
6. Click **"Create Web Service"**.

---

## Post-Deployment Checklist

1. **Verify Login**:
   - Access `https://<your-render-subdomain>.onrender.com/login`.
   - Log in using your admin credentials (e.g. `superadmin@rvit.edu.in` or `admin@rvit.edu.in`).
2. **Verify User Management**:
   - Open **Admin Portal** (`/admin/users`).
   - Create a new Intern or Supervisor user to verify database insertion and authentication.
3. **Verify File & Spec Uploads**:
   - Navigate to **Documents** (`/documents`).
   - Upload a test PDF, spec, or image file to verify Supabase Storage bucket integration.
4. **Custom Domain (Optional)**:
   - In Render Web Service settings, go to **Custom Domains** to attach your institutional domain (e.g., `portal.rvit.edu.in`).
   - Update `BETTER_AUTH_URL` to match your custom domain.
