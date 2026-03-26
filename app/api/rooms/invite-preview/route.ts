import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

/**
 * Public preview for invite links: host display name only (no auth).
 * Used on /join to personalize copy.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const code = raw.toUpperCase();
  if (code.length !== 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code },
      select: { hostId: true },
    });

    if (!room) {
      return NextResponse.json({ hostName: null }, { status: 200 });
    }

    const host = await prisma.user.findUnique({
      where: { id: room.hostId },
      select: { name: true },
    });

    const hostName = host?.name?.trim() || null;
    return NextResponse.json({ hostName });
  } catch (error) {
    console.error("invite-preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
