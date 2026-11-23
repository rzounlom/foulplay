import { NextRequest, NextResponse } from "next/server";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";

export async function GET(request: NextRequest) {
  const denied = assertE2eHttpAllowed(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, env: "test" });
}
