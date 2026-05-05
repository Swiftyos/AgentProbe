import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/providers/persistence/drizzle/postgres-schema.ts",
  out: "./drizzle/postgres",
});
