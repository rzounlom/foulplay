/**
 * Apply the hand size default migration directly, bypassing Prisma's advisory lock.
 * Run with: npx tsx scripts/apply-hand-size-migration.ts
 *
 * Use when `npx prisma migrate deploy` fails with P1002 advisory lock timeout.
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { createHash, randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

config();

const MIGRATION_NAME = "20260217000000_hand_size_default_six";

async function main() {
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL or DIRECT_DATABASE_URL must be set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    // 1. Run the migration SQL
    console.log("Applying migration: ALTER TABLE Room handSize DEFAULT 6...");
    await pool.query(
      'ALTER TABLE "Room" ALTER COLUMN "handSize" SET DEFAULT 6;'
    );
    console.log("Migration SQL applied successfully.");

    // 2. Check if migration is already recorded
    const check = await pool.query(
      `SELECT id FROM _prisma_migrations WHERE migration_name = $1`,
      [MIGRATION_NAME]
    );

    if (check.rows.length > 0) {
      console.log("Migration already recorded in _prisma_migrations. Done.");
      return;
    }

    // 3. Compute checksum (SHA256 of migration.sql content)
    const migrationPath = join(
      process.cwd(),
      "prisma",
      "migrations",
      MIGRATION_NAME,
      "migration.sql"
    );
    const migrationContent = readFileSync(migrationPath, "utf-8");
    const checksum = createHash("sha256").update(migrationContent).digest("hex");

    // 4. Insert into _prisma_migrations
    const id = randomUUID();
    await pool.query(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [id, checksum, MIGRATION_NAME]
    );
    console.log("Migration recorded in _prisma_migrations. Done.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
