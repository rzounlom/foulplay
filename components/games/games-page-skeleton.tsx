export function GamesPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl min-h-screen bg-background">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
        {/* Title */}
        <div className="h-7 md:h-8 w-32 mb-4 md:mb-6 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="h-9 w-16 rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
          <div className="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
          <div className="h-9 w-16 rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
          <div className="h-9 w-20 rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        </div>
        {/* Game cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 min-h-[72px] bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
              aria-hidden
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                    <div className="h-5 w-12 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                    <div className="h-5 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  </div>
                  <div className="h-4 w-32 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                </div>
                <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
        {/* Create/Join links */}
        <div className="mt-6 md:mt-8 flex flex-wrap gap-3">
          <div className="h-10 w-28 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
          <div className="h-10 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  );
}
