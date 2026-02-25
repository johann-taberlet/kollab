function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      {/* Labels placeholder */}
      <div className="mb-2 flex gap-1">
        <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      {/* Title placeholder */}
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-muted" />
      {/* Footer placeholder */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
        <div className="ml-auto size-6 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  )
}

function SkeletonColumn({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="size-5 animate-pulse rounded-full bg-muted" />
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 px-2 pb-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-4 p-6">
      <SkeletonColumn cardCount={4} />
      <SkeletonColumn cardCount={3} />
      <SkeletonColumn cardCount={3} />
    </div>
  )
}
