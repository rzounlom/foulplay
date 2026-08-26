import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromRequest } from "@/lib/admin/is-admin";
import {
  getAdminMetrics,
  parseMetricsRange,
} from "@/lib/admin/metrics";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUserFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const range = parseMetricsRange(
      request.nextUrl.searchParams.get("range"),
    );
    const metrics = await getAdminMetrics(range);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("admin metrics error:", error);
    return NextResponse.json(
      { error: "Failed to load metrics" },
      { status: 500 },
    );
  }
}
