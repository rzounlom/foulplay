import { NextRequest, NextResponse } from "next/server";
import { isE2EAppEnv, isProductionDeploy, isVercelHosted } from "@/lib/e2e/env";

export function isE2eHttpAuthorized(request: {
  headers: { get(name: string): string | null };
}): boolean {
  if (isProductionDeploy() || isVercelHosted() || !isE2EAppEnv()) {
    return false;
  }

  const expected = process.env.E2E_TEST_TOKEN;
  if (!expected || expected.length < 16) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerToken = request.headers.get("x-e2e-test-token") ?? "";
  return token === expected || headerToken === expected;
}

/**
 * Guard for HTTP test helpers. Never succeeds in production.
 */
export function assertE2eHttpAllowed(
  request: NextRequest,
): NextResponse | null {
  if (!isE2eHttpAuthorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
