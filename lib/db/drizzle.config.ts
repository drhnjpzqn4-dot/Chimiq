import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // `__migrations` is managed by our explicit SQL migration runner
  // (`migrations/run.mjs`), not by drizzle's introspected schema. Without
  // this filter, every `drizzle-kit push` detects the table as "extra" and
  // prompts to drop it — which would wipe our migration history and break
  // post-merge setup (stdin is closed, so the prompt fails outright).
  tablesFilter: ["!__migrations"],
});
