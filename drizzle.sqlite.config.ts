import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/providers/persistence/drizzle/sqlite-schema.ts",
  out: "./drizzle/sqlite",
});
