import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8" aria-busy="true" aria-label="Loading workspace">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-8 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-[360px] rounded-[20px] lg:col-span-8" />
        <Skeleton className="h-[360px] rounded-[20px] lg:col-span-4" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[148px] rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
