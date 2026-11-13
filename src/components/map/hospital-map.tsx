"use client";

import * as React from "react";
import {
  MapPin,
  PhoneCall,
  Navigation,
  RotateCcw,
  LocateFixed,
  WifiOff,
  Siren,
  Building2,
  Clock3,
  Info,
  Loader2,
  Route,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacilityRouteModal } from "./facility-route-modal";
import { HealthcareFacility } from "@/types/hospital";
import { DEFAULT_FALLBACK_COORDINATES } from "@/services/hospitals/fallback-data";
import type {
  Map as LeafletMap,
  LayerGroup as LeafletLayerGroup,
  Marker as LeafletMarker,
} from "leaflet";
import "leaflet/dist/leaflet.css";

type FacilityFilter = "all" | "emergency" | "phone";

/** Same heuristic as the route preview: ~25 km/h urban emergency transit. */
function etaMinutes(distanceKm?: number) {
  return Math.max(3, Math.round(((distanceKm ?? 0) / 25) * 60));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function pinHtml(kind: "emergency" | "clinic", selected: boolean) {
  const color = kind === "emergency" ? "var(--danger-strong)" : "var(--brand)";
  const size = selected ? 38 : 30;
  const glyph =
    kind === "emergency"
      ? '<path d="M12 6v12M6 12h12" stroke="white" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M12 7.5v9M7.5 12h9" stroke="white" stroke-width="2.5" stroke-linecap="round"/>';
  return `<div class="omni-marker" style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);background:${color};border:2.5px solid white;box-shadow:0 6px 14px -4px rgb(14 23 38 / 0.45);display:flex;align-items:center;justify-content:center;${selected ? "outline:4px solid color-mix(in oklab," + color + " 30%, transparent);" : ""}"><svg width="${size * 0.62}" height="${size * 0.62}" viewBox="0 0 24 24" style="transform:rotate(45deg)">${glyph}</svg></div>`;
}

export function HospitalMap({ compact = false }: { compact?: boolean } = {}) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  const markersLayerRef = React.useRef<LeafletLayerGroup | null>(null);
  const userMarkerRef = React.useRef<LeafletMarker | null>(null);
  const lastFetchedCoordsRef = React.useRef<{ lat: number; lon: number } | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const markersByIdRef = React.useRef<Map<string, LeafletMarker>>(new Map());
  const selectedIdRef = React.useRef<string | null>(null);

  const [facilities, setFacilities] = React.useState<HealthcareFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = React.useState<HealthcareFacility | null>(null);
  const [routeFacility, setRouteFacility] = React.useState<HealthcareFacility | null>(null);
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);
  const [filter, setFilter] = React.useState<FacilityFilter>("all");

  // Single source of truth for active map coordinates: defaults strictly to Enugu, Nigeria
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lon: number }>(
    DEFAULT_FALLBACK_COORDINATES
  );

  const [locationName, setLocationName] = React.useState<string>(
    DEFAULT_FALLBACK_COORDINATES.cityName
  );
  const [isLocating, setIsLocating] = React.useState(false);
  const [isLoadingFacilities, setIsLoadingFacilities] = React.useState(true);
  const [geoStatus, setGeoStatus] = React.useState<"idle" | "granted" | "denied" | "unavailable">("idle");

  // 1. Geolocation detection function
  const detectUserLocation = React.useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = Number(pos.coords.latitude.toFixed(5));
        const detectedLon = Number(pos.coords.longitude.toFixed(5));

        setUserCoords({
          lat: detectedLat,
          lon: detectedLon,
        });
        setLocationName(`Your location (${detectedLat}, ${detectedLon})`);
        setGeoStatus("granted");
        setIsLocating(false);
      },
      (err) => {
        console.warn("[GEOLOCATION_NOTICE] Access unavailable/denied:", err.message);
        setGeoStatus("denied");
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, []);

  // Auto-request location once on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      detectUserLocation();
    }, 100);
    return () => clearTimeout(timer);
  }, [detectUserLocation]);

  // 2. Fetch facilities whenever coordinates change (with debounce & deduplication)
  React.useEffect(() => {
    let active = true;

    if (lastFetchedCoordsRef.current) {
      const latDiff = Math.abs(userCoords.lat - lastFetchedCoordsRef.current.lat);
      const lonDiff = Math.abs(userCoords.lon - lastFetchedCoordsRef.current.lon);
      if (latDiff < 0.001 && lonDiff < 0.001 && facilities.length > 0) {
        return;
      }
    }

    async function fetchHospitals() {
      setIsLoadingFacilities(true);
      try {
        const res = await fetch(
          `/api/hospitals?lat=${userCoords.lat}&lon=${userCoords.lon}`
        );
        const data = await res.json();
        if (active && data.success && Array.isArray(data.facilities)) {
          lastFetchedCoordsRef.current = { lat: userCoords.lat, lon: userCoords.lon };
          setFacilities(data.facilities);
          setIsOfflineMode(false);
          if (data.facilities.length > 0) {
            setSelectedFacility(data.facilities[0]);
          } else {
            setSelectedFacility(null);
          }

          // Persist verified facilities and coordinates for emergency offline availability
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("omnicura_cached_hospitals", JSON.stringify(data.facilities));
              localStorage.setItem("omnicura_cached_coords", JSON.stringify(userCoords));
            }
          } catch {
            // ignore localStorage quota errors
          }
        }
      } catch (err) {
        console.warn("[HOSPITAL_FETCH_ERROR] Loading local device fallback cache:", err);
        try {
          if (typeof window !== "undefined") {
            const cached = localStorage.getItem("omnicura_cached_hospitals");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFacilities(parsed);
                setSelectedFacility(parsed[0]);
                setIsOfflineMode(true);
              }
            }
          }
        } catch {
          // ignore parsing error
        }
      } finally {
        if (active) setIsLoadingFacilities(false);
      }
    }

    fetchHospitals();

    return () => {
      active = false;
    };
  }, [userCoords, facilities.length]);

  // 3. Initialize Leaflet Map instance (runs once)
  React.useEffect(() => {
    let active = true;

    async function initMap() {
      if (!mapContainerRef.current || typeof window === "undefined" || mapInstanceRef.current) {
        return;
      }

      const L = (await import("leaflet")).default;
      if (!active || !mapContainerRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, { zoomControl: false, scrollWheelZoom: !compact }).setView(
        [DEFAULT_FALLBACK_COORDINATES.lat, DEFAULT_FALLBACK_COORDINATES.lon],
        13
      );
      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // "You are here" — info-blue dot with a soft halo (map convention)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="position:relative;width:20px;height:20px"><div style="position:absolute;inset:-10px;border-radius:50%;background:color-mix(in oklab,var(--info) 22%,transparent)"></div><div style="position:absolute;inset:0;border-radius:50%;background:var(--info);border:3px solid white;box-shadow:0 2px 8px rgb(14 23 38 / 0.35)"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const userMarker = L.marker(
        [DEFAULT_FALLBACK_COORDINATES.lat, DEFAULT_FALLBACK_COORDINATES.lon],
        { icon: userIcon, zIndexOffset: 1000 }
      )
        .addTo(map)
        .bindPopup("<b>Search center</b>");

      userMarkerRef.current = userMarker;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [compact]);

  // 4. Update map view & user marker when coordinates change
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView([userCoords.lat, userCoords.lon], 13, {
      animate: true,
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lon]);
      userMarkerRef.current.bindPopup(
        `<div style="font-size:13px;line-height:1.45">
          <div style="font-weight:600;font-size:14px">${geoStatus === "granted" ? "Your current location" : "Default location (Enugu)"}</div>
          <div style="color:var(--text-tertiary);margin-top:2px">${userCoords.lat}, ${userCoords.lon}</div>
        </div>`
      );
    }
  }, [userCoords, geoStatus]);

  const filteredFacilities = React.useMemo(() => {
    if (filter === "emergency") return facilities.filter((f) => f.emergency);
    if (filter === "phone") return facilities.filter((f) => !!f.phone);
    return facilities;
  }, [facilities, filter]);

  // 5. Rebuild hospital markers whenever the facility list or filter changes
  React.useEffect(() => {
    let active = true;

    async function updateMarkers() {
      if (!markersLayerRef.current || !mapInstanceRef.current || typeof window === "undefined") {
        return;
      }

      const L = (await import("leaflet")).default;
      if (!active || !markersLayerRef.current) return;

      markersLayerRef.current.clearLayers();
      markersByIdRef.current.clear();

      filteredFacilities.forEach((f) => {
        const isSelected = selectedIdRef.current === f.id;
        const size = isSelected ? 38 : 30;
        const hospitalIcon = L.divIcon({
          className: "custom-hospital-marker",
          html: pinHtml(f.emergency ? "emergency" : "clinic", isSelected),
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        });

        const marker = L.marker([f.lat, f.lon], { icon: hospitalIcon, zIndexOffset: isSelected ? 500 : 0 });
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`;
        const name = escapeHtml(f.name);
        const phoneHtml = f.phone
          ? `<a href="tel:${escapeHtml(f.phone)}" style="color:var(--accent-text);font-weight:600;text-decoration:none;font-size:12px">Call ${escapeHtml(f.phone)}</a>`
          : "";

        marker.bindPopup(`
          <div role="region" aria-label="Hospital details for ${name}" style="font-size:13px;max-width:240px;line-height:1.45">
            <div style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;${
              f.emergency
                ? "background:var(--danger-muted);color:var(--danger)"
                : "background:var(--brand-muted);color:var(--accent-text)"
            }">${f.emergency ? "Emergency 24/7" : "Clinic / Hospital"}</div>
            <div style="font-size:14px;font-weight:600;margin-bottom:2px">${name}</div>
            <div style="color:var(--text-tertiary);font-size:12px">${f.distanceKm} km · ~${etaMinutes(f.distanceKm)} min</div>
            ${f.address ? `<div style="font-size:12px;margin-top:4px;color:var(--text-secondary)">${escapeHtml(f.address)}</div>` : ""}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px">
              ${phoneHtml}
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" aria-label="Get driving directions to ${name} on Google Maps" style="margin-left:auto;display:inline-flex;align-items:center;background:var(--brand);color:var(--brand-fg);padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600">Directions</a>
            </div>
          </div>
        `);

        marker.on("click", () => {
          if (active) setSelectedFacility(f);
        });

        if (markersLayerRef.current) {
          marker.addTo(markersLayerRef.current);
          markersByIdRef.current.set(f.id, marker);
        }
      });
    }

    updateMarkers();

    return () => {
      active = false;
    };
  }, [filteredFacilities]);

  // 6. Selection only swaps pin icons (keeps any open popup intact)
  React.useEffect(() => {
    const prevId = selectedIdRef.current;
    const nextId = selectedFacility?.id ?? null;
    selectedIdRef.current = nextId;
    const L = leafletRef.current;
    if (!L) return;
    const facilityById = new Map(facilities.map((f) => [f.id, f]));
    for (const id of [prevId, nextId]) {
      if (!id) continue;
      const marker = markersByIdRef.current.get(id);
      const f = facilityById.get(id);
      if (!marker || !f) continue;
      const isSelected = id === nextId;
      const size = isSelected ? 38 : 30;
      marker.setIcon(
        L.divIcon({
          className: "custom-hospital-marker",
          html: pinHtml(f.emergency ? "emergency" : "clinic", isSelected),
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        })
      );
      marker.setZIndexOffset(isSelected ? 500 : 0);
    }
  }, [selectedFacility, facilities]);

  // Keep the selected card visible in the list
  React.useEffect(() => {
    if (!selectedFacility || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-facility-id="${CSS.escape(selectedFacility.id)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedFacility]);

  const focusFacilityOnMap = (f: HealthcareFacility) => {
    setSelectedFacility(f);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([f.lat, f.lon], 15, { animate: true });
    }
  };

  const handleManualResetToEnugu = () => {
    setUserCoords({
      lat: DEFAULT_FALLBACK_COORDINATES.lat,
      lon: DEFAULT_FALLBACK_COORDINATES.lon,
    });
    setLocationName("Enugu, Nigeria (Default)");
    setGeoStatus("idle");
  };

  const nearest = facilities[0];
  const emergencyCount = facilities.filter((f) => f.emergency).length;
  const mapHeight = compact ? "h-[380px] lg:h-[440px]" : "h-[420px] lg:h-[620px]";

  const filters: { id: FacilityFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: facilities.length },
    { id: "emergency", label: "Emergency", count: emergencyCount },
    { id: "phone", label: "Has phone", count: facilities.filter((f) => !!f.phone).length },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Notices */}
      {geoStatus !== "granted" && !compact && (
        <div className="flex flex-col gap-3 rounded-2xl border border-info/20 bg-info-muted p-3.5 pl-4 text-[13px] text-foreground sm:flex-row sm:items-center sm:justify-between animate-rise">
          <div className="flex items-center gap-2.5">
            <Info className="size-4 shrink-0 text-info" aria-hidden="true" />
            <span>
              Showing facilities near an approximate location.{" "}
              <span className="text-text-secondary">Enable location for accurate distances.</span>
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={detectUserLocation} isLoading={isLocating} className="shrink-0">
            <LocateFixed />
            Enable location
          </Button>
        </div>
      )}

      {isOfflineMode && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-border-subtle bg-surface p-3.5 text-[13px] text-text-secondary animate-rise">
          <WifiOff className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          You&apos;re offline — showing facilities saved on this device.
        </div>
      )}

      {/* Summary metrics */}
      {!compact && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Facilities nearby", value: isLoadingFacilities && !facilities.length ? null : String(facilities.length), sub: "Within search radius", icon: Building2 },
            { label: "Nearest facility", value: nearest ? `${nearest.distanceKm} km` : isLoadingFacilities ? null : "—", sub: nearest?.name ?? "No results", icon: MapPin },
            { label: "Emergency departments", value: isLoadingFacilities && !facilities.length ? null : String(emergencyCount), sub: "Open 24/7", icon: Siren },
            { label: "Est. travel to nearest", value: nearest ? `~${etaMinutes(nearest.distanceKm)} min` : isLoadingFacilities ? null : "—", sub: "Urban driving estimate", icon: Clock3 },
          ].map((m) => (
            <div key={m.label} className="rounded-[18px] border border-border-subtle bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-secondary">{m.label}</span>
                <m.icon className="size-4 text-text-tertiary" aria-hidden="true" />
              </div>
              <div className="mt-2.5 font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground">
                {m.value ?? <Skeleton className="h-7 w-16 rounded-md" />}
              </div>
              <div className="mt-1 truncate text-xs text-text-tertiary">{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-2.5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2.5 px-1.5" role="status" aria-live="polite">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", geoStatus === "granted" ? "bg-info-muted text-info" : "bg-muted text-text-secondary")}>
            {isLocating ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-foreground">{locationName}</div>
            <div className="text-xs text-text-tertiary">
              {isLocating ? "Detecting GPS position…" : geoStatus === "granted" ? "GPS location" : "Approximate search center"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-w-full items-center overflow-x-auto rounded-xl bg-muted p-1" role="group" aria-label="Filter facilities">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-lg px-3 text-[13px] transition-all cursor-pointer",
                  filter === f.id ? "bg-surface font-semibold text-foreground shadow-sm" : "font-medium text-text-secondary hover:text-foreground"
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs tabular-nums text-text-tertiary">{f.count}</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" disabled={isLocating} onClick={detectUserLocation} title="Detect your current GPS coordinates">
            <LocateFixed className="text-accent" />
            <span className="hidden sm:inline">My location</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleManualResetToEnugu} title="Reset to default location (Enugu)">
            <RotateCcw />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Map + list */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className={cn("relative overflow-hidden rounded-[20px] border border-border-subtle bg-subtle shadow-xs lg:col-span-8", mapHeight)}>
          {isLoadingFacilities && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface/50 backdrop-blur-[2px] animate-fade">
              <div role="status" aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-[13px] font-medium text-foreground shadow-md">
                <Loader2 className="size-4 animate-spin text-accent" />
                Finding nearby facilities…
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="h-full w-full z-10" />

          {/* Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-xl border border-border-subtle bg-surface/95 px-3 py-2 text-[11px] font-medium text-text-secondary shadow-md backdrop-blur">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-info ring-2 ring-white" />You</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-danger-strong ring-2 ring-white" />Emergency</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand ring-2 ring-white" />Clinic</span>
          </div>
        </div>

        <div className={cn("flex min-h-0 flex-col lg:col-span-4", compact ? "lg:h-[440px]" : "lg:h-[620px]")}>
          <div className="mb-3 flex items-center justify-between px-1">
            <span role="status" aria-live="polite" className="text-[13px] font-semibold text-foreground">
              {filteredFacilities.length} {filteredFacilities.length === 1 ? "facility" : "facilities"}
              <span className="font-normal text-text-tertiary"> · sorted by distance</span>
            </span>
          </div>

          <div ref={listRef} className="max-h-[520px] min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 lg:max-h-none">
            {isLoadingFacilities && facilities.length === 0 ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-4/5" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))
            ) : filteredFacilities.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong/70 bg-surface p-8 text-center">
                <MapPin className="size-6 text-text-tertiary" />
                <p className="text-[13px] text-text-secondary">
                  {facilities.length === 0
                    ? "No healthcare facilities found within 30 km of these coordinates."
                    : "No facilities match this filter."}
                </p>
                {facilities.length === 0 ? (
                  <Button variant="outline" size="sm" onClick={handleManualResetToEnugu}>
                    Reset to Enugu
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                    Show all facilities
                  </Button>
                )}
              </div>
            ) : (
              filteredFacilities.map((facility, index) => {
                const isSelected = selectedFacility?.id === facility.id;
                return (
                  <div
                    key={facility.id}
                    data-facility-id={facility.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => focusFacilityOnMap(facility)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        focusFacilityOnMap(facility);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={cn(
                      "group rounded-2xl border p-4 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                      isSelected
                        ? "border-brand/40 bg-surface shadow-md ring-2 ring-brand/15"
                        : "border-border-subtle bg-surface hover:border-border-strong hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                          facility.emergency ? "bg-danger-muted text-danger" : "bg-brand-muted text-accent-text"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold leading-snug text-foreground">{facility.name}</h4>
                          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                            {facility.distanceKm} km
                          </span>
                        </div>
                        {facility.address && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">{facility.address}</p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5 text-text-tertiary" aria-hidden="true" />~{etaMinutes(facility.distanceKm)} min
                          </span>
                          {facility.emergency && (
                            <span className="inline-flex items-center gap-1 font-semibold text-danger">
                              <Siren className="size-3.5" aria-hidden="true" />
                              Emergency 24/7
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
                      {facility.phone && (
                        <a
                          href={`tel:${facility.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-subtle"
                          title={`Call ${facility.phone}`}
                          aria-label={`Call ${facility.name} at ${facility.phone}`}
                        >
                          <PhoneCall className="size-3.5 text-text-tertiary" />
                          Call
                        </a>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRouteFacility(facility);
                        }}
                        aria-label={`Directions to ${facility.name}`}
                      >
                        <Navigation />
                        Directions
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {compact && (
        <p className="flex items-center gap-2 text-xs text-text-tertiary">
          <Route className="size-3.5" aria-hidden="true" />
          Distances and travel times are estimates. In an emergency, call your local emergency number.
        </p>
      )}

      <FacilityRouteModal
        isOpen={!!routeFacility}
        onClose={() => setRouteFacility(null)}
        facility={routeFacility}
        userCoords={userCoords}
        userLocationName={locationName}
      />
    </div>
  );
}
