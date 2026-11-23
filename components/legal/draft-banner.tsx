export function LegalDraftBanner() {
  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p className="font-semibold">Draft — owner / legal review required</p>
      <p className="mt-1">
        This page describes how FoulPlay currently works. It is not legal advice
        and has not been approved by counsel. Do not treat it as a final policy
        until the owner reviews and publishes it.
      </p>
    </div>
  );
}
