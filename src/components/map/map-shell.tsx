"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const DynamicHospitalMap = dynamic(
  () => import("@/components/map/hospital-map").then((mod) => mod.HospitalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-[420px] rounded-[20px] lg:col-span-8 lg:h-[620px]" />
          <div className="space-y-2.5 lg:col-span-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
)

export function MapShell() {
  return <DynamicHospitalMap />
}
