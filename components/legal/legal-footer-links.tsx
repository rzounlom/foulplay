import Link from "next/link";

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      <Link href="/privacy" className="underline hover:text-neutral-300">
        Privacy
      </Link>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <Link href="/terms" className="underline hover:text-neutral-300">
        Terms
      </Link>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <span>21+ for drinking modes</span>
    </p>
  );
}
