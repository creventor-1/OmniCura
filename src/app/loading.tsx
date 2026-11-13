import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in-50 duration-180">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-10 w-96 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* KPI Cards Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="size-7 rounded-md" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Primary Work Area Skeleton */}
      <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 space-y-4">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
