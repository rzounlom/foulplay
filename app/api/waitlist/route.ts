import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    await prisma.waitlistSignup.upsert({
      where: { email: email.toLowerCase().trim() },
      create: { email: email.toLowerCase().trim() },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid email" },
        { status: 400 }
      );
    }
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
