export function JoinRoomCardSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto my-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none w-full min-w-0">
        {/* Title */}
        <div className="h-7 md:h-8 w-40 mb-3 md:mb-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        {/* Description */}
        <div className="h-4 md:h-5 w-full max-w-md mb-4 md:mb-6 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        {/* Form skeleton */}
        <div className="space-y-4">
          {/* Room Code label */}
          <div>
            <div className="h-4 w-24 mb-2 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
            {/* Room Code input */}
            <div className="h-12 w-full rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
          </div>
          {/* Nickname label */}
          <div>
            <div className="h-4 w-20 mb-2 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
            {/* Nickname input */}
            <div className="h-12 w-full rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
            {/* Caption */}
            <div className="h-3 w-48 mt-2 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" aria-hidden />
          </div>
          {/* Button */}
          <div className="h-12 w-full rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  );
}
