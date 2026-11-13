"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const DynamicHospitalMap = dynamic(
  () => import("@/components/map/hospital-map").then((mod) => mod.HospitalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-5xl mx-auto space-y-4 animate-in fade-in-50 duration-180">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border border-border-subtle bg-surface">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 rounded-xl min-h-[420px] lg:min-h-[520px]" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    ),
  }
)

export function MapShell() {
  return <DynamicHospitalMap />
}
