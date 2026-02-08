# Applying the Message migration when there is drift

Your DB has **drift** (migrations were modified after apply, or schema was changed outside migrations). You can add the `Message` table without resetting the DB.

## Option A – Apply only the Message migration (no data loss)

### 1. Run the migration SQL

**Using Prisma:**
```bash
npx prisma db execute --file prisma/migrations/20260213000000_add_messages/migration.sql
```

**Or run the SQL yourself** in Neon’s SQL Editor (or any Postgres client). Copy the contents of `prisma/migrations/20260213000000_add_messages/migration.sql` and run it.

### 2. Mark the migration as applied

```bash
npx prisma migrate resolve --applied 20260213000000_add_messages
```

After this, the `Message` table exists and Prisma’s migration history is updated. Chat will work. The older drift (modified migrations / `lastGameEndResult`) remains but does not block you.

---

## Option B – Full reset (all data lost)

Only if you are okay losing all data in the DB:

```bash
npx prisma migrate reset
```

This drops the database, reapplies all migrations from scratch, and runs seed if configured.

---

## Fixing the underlying drift later (optional)

The error mentioned:

- Migrations `20260205120000_support_multiple_cards_per_submission` and `20260206000000_support_per_card_voting` were **modified after they were applied**.
- The DB has a `lastGameEndResult` column on `Room` that may have been added by a migration that isn’t in sync.

To fix that later you can:

1. Restore those two migration files to the exact content that was originally applied (e.g. from git history), then run `prisma migrate dev` again, or  
2. Leave things as-is if the current DB schema matches what the app expects and you’ve applied new migrations manually as in Option A.
