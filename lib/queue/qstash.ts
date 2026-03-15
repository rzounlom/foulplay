/**
 * QStash helper for durable delayed jobs.
 * Uses QSTASH_TOKEN; optionally QSTASH_URL if needed.
 */

import { Client } from "@upstash/qstash";

function getClient(): Client {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN environment variable must be set");
  }
  return new Client({
    token,
    baseUrl: process.env.QSTASH_URL,
  });
}

export interface EnqueueOptions {
  url: string;
  body: Record<string, unknown>;
  /** Delay string (e.g. "30s", "1m"). Must match QStash Duration format. */
  delay?: string;
}

/**
 * Enqueue a delayed job to be delivered to the given URL.
 * @param options.url - Full URL for the callback (e.g. `${APP_URL}/api/qstash/auto-accept`)
 * @param options.body - JSON-serializable payload
 * @param options.delay - Delay string (e.g. "30s", "1m")
 */
export async function enqueue(options: EnqueueOptions): Promise<void> {
  const client = getClient();
  await client.publishJSON({
    url: options.url,
    body: options.body,
    // QStash expects Duration (e.g. "30s"); our string is valid at runtime
    delay: (options.delay ?? "0s") as `${bigint}s` | `${bigint}m` | `${bigint}h` | `${bigint}d`,
  });
}
