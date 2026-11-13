import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyFacilities } from "@/services/hospitals/overpass";
import { DEFAULT_FALLBACK_COORDINATES } from "@/services/hospitals/fallback-data";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    const lat = latParam ? parseFloat(latParam) : DEFAULT_FALLBACK_COORDINATES.lat;
    const lon = lonParam ? parseFloat(lonParam) : DEFAULT_FALLBACK_COORDINATES.lon;

    const validatedLat = isNaN(lat) ? DEFAULT_FALLBACK_COORDINATES.lat : lat;
    const validatedLon = isNaN(lon) ? DEFAULT_FALLBACK_COORDINATES.lon : lon;

    const facilities = await fetchNearbyFacilities(validatedLat, validatedLon);

    return NextResponse.json({
      success: true,
      center: { lat: validatedLat, lon: validatedLon },
      facilities,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }

    console.error("[API_HOSPITALS_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve nearby healthcare facilities.",
      },
      { status: 500 }
    );
  }
}
