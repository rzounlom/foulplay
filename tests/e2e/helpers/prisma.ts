import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { assertSafeE2eEnvironment } from "./safety";

function normalizePgConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
    if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    /* pass through */
  }
  return connectionString;
}

export function createE2ePrisma(): PrismaClient {
  const connectionString = normalizePgConnectionString(assertSafeE2eEnvironment());
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: ["error"] });
}
