import { HealthcareFacility } from "@/types/hospital";
import {
  CURATED_NATIONWIDE_HOSPITALS,
  calculateHaversineDistance,
} from "./fallback-data";

interface NominatimElement {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  extratags?: {
    emergency?: string;
    phone?: string;
    "contact:phone"?: string;
  };
}

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

/**
 * Normalizes a name string for deduplication comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Tier 1: Query OpenStreetMap Nominatim for hospitals and clinics near active coordinates.
 */
async function fetchFromNominatim(
  userLat: number,
  userLon: number
): Promise<HealthcareFacility[]> {
  const delta = 0.28; // ~30km bounding box
  const minLon = userLon - delta;
  const maxLon = userLon + delta;
  const minLat = userLat - delta;
  const maxLat = userLat + delta;

  const url = `https://nominatim.openstreetmap.org/search?q=hospital&format=json&bounded=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&limit=25&extratags=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Omnicura-Healthcare-Platform/2.0 (https://omnicura.health; contact@omnicura.health)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data: NominatimElement[] = await res.json();
    if (!Array.isArray(data)) return [];

    const mapped: (HealthcareFacility | null)[] = data.map((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) return null;

      const rawName = item.name || item.display_name.split(",")[0].trim();
      const address = item.display_name;
      const phone = item.extratags?.phone || item.extratags?.["contact:phone"];
      const isEmergency = item.extratags?.emergency === "yes" || true;

      const facility: HealthcareFacility = {
        id: `nom-${item.place_id}`,
        name: rawName,
        type: "hospital",
        lat,
        lon,
        address,
        phone,
        emergency: isEmergency,
        distanceKm: calculateHaversineDistance(userLat, userLon, lat, lon),
      };
      return facility;
    });

    return mapped.filter((f): f is HealthcareFacility => f !== null);
  } catch (err) {
    console.warn("[NOMINATIM_LOOKUP_WARN]:", (err as Error).message);
    return [];
  }
}

/**
 * Tier 2: Query Overpass API with multiple mirrors if needed.
 */
async function fetchFromOverpass(
  userLat: number,
  userLon: number,
  radiusMeters = 25000
): Promise<HealthcareFacility[]> {
  const query = `[out:json][timeout:5];
    (
      node["amenity"~"hospital|clinic"](around:${radiusMeters},${userLat},${userLon});
      way["amenity"~"hospital|clinic"](around:${radiusMeters},${userLat},${userLon});
    );
    out center 25;`;

  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const mirror of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Omnicura-Healthcare-Platform/2.0",
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

        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Try next mirror
    }
  }

  return [];
}

/**
 * Public search function: Resolves nearby hospitals based entirely on the provided latitude and longitude.
 * Merges real-time OpenStreetMap / Nominatim results with dynamic proximity-calculated regional data,
 * deduplicates entries, and returns sorted by distance.
 */
export async function fetchNearbyFacilities(
  userLat: number,
  userLon: number
): Promise<HealthcareFacility[]> {
  const facilityMap = new Map<string, HealthcareFacility>();

  // 1. Fetch live facilities from OpenStreetMap Nominatim
  const nominatimResults = await fetchFromNominatim(userLat, userLon);
  for (const fac of nominatimResults) {
    const key = normalizeName(fac.name);
    if (!facilityMap.has(key)) {
      facilityMap.set(key, fac);
    }
  }

  // 2. If fewer than 5 facilities found, supplement with Overpass
  if (facilityMap.size < 5) {
    const overpassResults = await fetchFromOverpass(userLat, userLon);
    for (const fac of overpassResults) {
      const key = normalizeName(fac.name);
      if (!facilityMap.has(key)) {
        facilityMap.set(key, fac);
      }
    }
  }

  // 3. Dynamic Proximity Check: Check curated nationwide database
  // Calculate distance from user coords to all curated regional facilities
  const curatedWithDistance = CURATED_NATIONWIDE_HOSPITALS.map((h) => ({
    ...h,
    distanceKm: calculateHaversineDistance(userLat, userLon, h.lat, h.lon),
  }));

  // Find facilities within reasonable proximity (e.g. <= 40km of active coordinates)
  const nearbyCurated = curatedWithDistance.filter((h) => (h.distanceKm || 0) <= 40);

  for (const fac of nearbyCurated) {
    const key = normalizeName(fac.name);
    if (!facilityMap.has(key)) {
      facilityMap.set(key, fac);
    }
  }

  // 4. Fallback safeguard: If external APIs returned zero results (e.g. offline/isolated region),
  // return the closest 6 curated facilities relative to the active user coordinates.
  if (facilityMap.size === 0) {
    const sortedCurated = curatedWithDistance
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      .slice(0, 8);

    for (const fac of sortedCurated) {
      facilityMap.set(normalizeName(fac.name), fac);
    }
  }

  // Convert map to array and sort strictly by distance from active coordinates
  return Array.from(facilityMap.values()).sort(
    (a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)
  );
}
