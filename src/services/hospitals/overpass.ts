import { HealthcareFacility } from "@/types/hospital";
import {
  CURATED_LAGOS_HOSPITALS,
  calculateHaversineDistance,
} from "./fallback-data";

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    emergency?: string;
    phone?: string;
    "contact:phone"?: string;
    "addr:street"?: string;
    "addr:city"?: string;
    "addr:postcode"?: string;
  };
}

export async function fetchNearbyFacilities(
  userLat: number,
  userLon: number,
  radiusMeters = 15000
): Promise<HealthcareFacility[]> {
  const query = `[out:json][timeout:8];
    (
      node["amenity"~"hospital|clinic"](around:${radiusMeters},${userLat},${userLon});
      way["amenity"~"hospital|clinic"](around:${radiusMeters},${userLat},${userLon});
    );
    out center 25;`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TriageAI-Healthcare-Assistant/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const elements: OverpassElement[] = data.elements || [];

      const parsed: HealthcareFacility[] = elements
        .filter((el) => el.tags && (el.tags.name || el.tags.amenity))
        .map((el) => {
          const lat = el.lat || el.center?.lat || 0;
          const lon = el.lon || el.center?.lon || 0;
          const name = el.tags?.name || `${el.tags?.amenity === "hospital" ? "Hospital" : "Clinic"}`;
          const type: "hospital" | "clinic" | "emergency" =
            el.tags?.emergency === "yes"
              ? "emergency"
              : el.tags?.amenity === "hospital"
              ? "hospital"
              : "clinic";
          const address = [
            el.tags?.["addr:street"],
            el.tags?.["addr:city"],
            el.tags?.["addr:postcode"],
          ]
            .filter(Boolean)
            .join(", ") || undefined;

          return {
            id: `osm-${el.id}`,
            name,
            type,
            lat,
            lon,
            address,
            phone: el.tags?.phone || el.tags?.["contact:phone"],
            emergency: el.tags?.emergency === "yes" || type === "hospital",
            distanceKm: calculateHaversineDistance(userLat, userLon, lat, lon),
          };
        })
        .filter((f) => f.lat !== 0 && f.lon !== 0);

      if (parsed.length >= 3) {
        return parsed.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
    }
  } catch (err) {
    console.warn("[OVERPASS_SEARCH_WARN] Using curated regional facility fallback:", err);
  }

  // Fallback to curated Lagos facilities, calculating distances relative to user
  const fallbackWithDistance = CURATED_LAGOS_HOSPITALS.map((h) => ({
    ...h,
    distanceKm: calculateHaversineDistance(userLat, userLon, h.lat, h.lon),
  }));

  return fallbackWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}
