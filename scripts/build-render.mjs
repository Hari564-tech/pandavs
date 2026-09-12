#!/usr/bin/env node
import { execSync } from "node:child_process";

process.env.NITRO_PRESET = "node-server";

console.log("[build:render] Building for standalone Node.js server (Render)...");
try {
  execSync("node scripts/with-app-env.mjs npx vite build", {
    stdio: "inherit",
    env: { ...process.env, NITRO_PRESET: "node-server" },
  });
  console.log("[build:render] Standalone server build completed successfully!");
} catch (err) {
  console.error("[build:render] Build failed:", err);
  process.exit(1);
}

// Safely apply migrations if DATABASE_URL is present and reachable
if (process.env.DATABASE_URL) {
  try {
    console.log("[build:render] Checking database migrations...");
    execSync("npm run db:migrate", { stdio: "inherit", env: process.env });
  } catch (err) {
    console.warn("[build:render] Migration note (non-blocking for container build):", err?.message || err);
  }
}

