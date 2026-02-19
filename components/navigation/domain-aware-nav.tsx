import { headers } from "next/headers";
import { getDomainType } from "@/lib/host";
import { MainNav } from "./main-nav";

export async function DomainAwareNav() {
  const headersList = await headers();
  const host = headersList.get("host");
  const domainType = getDomainType(host);

  if (domainType !== "app") {
    return null;
  }
  return <MainNav />;
}
