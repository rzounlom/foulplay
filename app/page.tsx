import { headers } from "next/headers";
import { getDomainType } from "@/lib/host";
import { MarketingLanding } from "@/components/marketing/marketing-landing";
import { AppHome } from "@/components/marketing/app-home";
import { WaitlistPage } from "@/components/marketing/waitlist-page";

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host");
  const domainType = getDomainType(host);

  if (domainType === "marketing") {
    return <MarketingLanding />;
  }
  if (domainType === "waitlist") {
    return <WaitlistPage />;
  }
  return <AppHome />;
}
