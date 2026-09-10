import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";
import { isPaywallTrigger } from "@/lib/billing/hosting-limits";

const CLIENT_EVENTS = ["paywall_viewed", "checkout_canceled"] as const;

const bodySchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  props: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Allowlisted client analytics (paywall UI). Server-side billing events
 * are emitted directly from API routes / webhooks.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const props = parsed.data.props ?? {};
    if (props.trigger != null && !isPaywallTrigger(props.trigger)) {
      delete props.trigger;
    }

    trackEventFireAndForget({
      name: parsed.data.name,
      userId: user.id,
      props,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("analytics track POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
