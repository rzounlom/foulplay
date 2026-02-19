import { headers } from "next/headers";
import { getDomainType } from "@/lib/host";

export async function DomainAwareFooter() {
  const headersList = await headers();
  const host = headersList.get("host");
  const domainType = getDomainType(host);

  if (domainType !== "app") {
    return null;
  }

  return (
    <footer className="shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-sm py-3">
      <div className="container mx-auto px-4 text-center text-neutral-500 text-xs">
        <p>© {new Date().getFullYear()} FoulPlay. All rights reserved.</p>
      </div>
    </footer>
  );
}
