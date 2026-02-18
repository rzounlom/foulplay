import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// Use direct connection for migrations to avoid Neon pooler advisory lock timeout (P1002).
// DIRECT_DATABASE_URL = same as DATABASE_URL but with -pooler removed from host.
const migrateUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  datasource: {
    url: migrateUrl,
  },
});
