# Fixing Prisma Migration P1002 Advisory Lock Timeout

When `npx prisma migrate deploy` fails with:

```
Error: P1002 - Timed out trying to acquire a postgres advisory lock
```

## Steps to fix

### 1. Stop all database connections

**Close these before running migrations:**

- **Prisma Studio** – Stop `npx prisma studio` (Ctrl+C)
- **Dev server** – Stop `npm run dev` (Ctrl+C)
- Any other processes using the database

### 2. (Optional) Kill idle connections holding the lock

If you still see the error after closing everything, run this in Neon’s SQL Editor:

```sql
SELECT pg_terminate_backend(PSA.pid)
FROM pg_locks AS PL
    INNER JOIN pg_stat_activity AS PSA ON PSA.pid = PL.pid
WHERE PSA.state LIKE 'idle'
    AND PL.objid IN (72707369);
```

### 3. Run the migration

```bash
npx prisma migrate deploy
```

### 4. If still failing: apply migration directly

If the lock persists, use the bypass script to apply the hand-size migration without Prisma's advisory lock:

```bash
npm run db:migrate-hand-size
```

This runs the migration SQL directly and records it in `_prisma_migrations`. Only use for the `20260217000000_hand_size_default_six` migration.

## Configuration

`prisma.config.ts` uses `DIRECT_DATABASE_URL` (when set) for migrations to avoid Neon’s pooler advisory lock issues. The direct URL is the same as `DATABASE_URL` but with `-pooler` removed from the host.

Example:
- Pooled: `ep-xxx-pooler.c-3.us-east-1.aws.neon.tech`
- Direct: `ep-xxx.c-3.us-east-1.aws.neon.tech`
