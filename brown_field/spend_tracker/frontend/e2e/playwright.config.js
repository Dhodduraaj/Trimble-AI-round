import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `${process.platform === "win32" ? ".venv\\Scripts\\python" : ".venv/bin/python"} -m uvicorn app.main:app --port 8000`,
      cwd: "../../backend",
      url: "http://localhost:8000/docs",
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        SPEND_TRACKER_DB: process.platform === "win32" ? "spend_tracker_e2e.db" : "/tmp/spend_tracker_e2e.db",
      },
    },
    {
      command: "npm run dev",
      cwd: "..",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
