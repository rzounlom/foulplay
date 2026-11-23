import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";

export async function GET(request: NextRequest) {
  const denied = assertE2eHttpAllowed(request);
  if (denied) return denied;

  const code = request.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      version: true,
      isPublicChaos: true,
      _count: { select: { players: true, submissions: true } },
    },
  });
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(room);
}
