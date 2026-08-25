import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Avoid pg v8 SSL alias deprecation warnings (require/prefer/verify-ca → verify-full). */
function normalizePgConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
    if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Non-URL connection strings are passed through unchanged.
  }
  return connectionString;
}

// Prisma 7 requires adapter or accelerateUrl
const connectionString = normalizePgConnectionString(
  process.env.DATABASE_URL ?? "",
);

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create pg Pool and Prisma adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
