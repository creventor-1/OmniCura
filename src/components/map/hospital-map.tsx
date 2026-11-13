"use client";

import * as React from "react";
import {
  MapPin,
  PhoneCall,
  Navigation,
  Compass,
  AlertTriangle,
  RotateCcw,
  LocateFixed,
  Info,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
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

export function HospitalMap() {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  const markersLayerRef = React.useRef<LeafletLayerGroup | null>(null);
  const userMarkerRef = React.useRef<LeafletMarker | null>(null);
  const lastFetchedCoordsRef = React.useRef<{ lat: number; lon: number } | null>(null);

  const [facilities, setFacilities] = React.useState<HealthcareFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = React.useState<HealthcareFacility | null>(null);
  const [routeFacility, setRouteFacility] = React.useState<HealthcareFacility | null>(null);
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);

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
        setLocationName(`Detected Coordinates (${detectedLat}, ${detectedLon})`);
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

    // Check if coordinates meaningfully moved (at least ~100m) to avoid redundant network queries
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
        // Fallback to offline cached hospitals if network unavailable
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

      const map = L.map(mapContainerRef.current).setView(
        [DEFAULT_FALLBACK_COORDINATES.lat, DEFAULT_FALLBACK_COORDINATES.lon],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // User location marker (Distinct accent dot per spec)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="background-color: #14A3B3; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(20,163,179,0.9);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const userMarker = L.marker(
        [DEFAULT_FALLBACK_COORDINATES.lat, DEFAULT_FALLBACK_COORDINATES.lon],
        { icon: userIcon }
      )
        .addTo(map)
        .bindPopup("<b>Active Search Location</b><br/>Hospital search center");

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
  }, []); // Run once on mount

  // 4. Update map view & user marker when coordinates change
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView([userCoords.lat, userCoords.lon], 13, {
      animate: true,
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lon]);
      userMarkerRef.current.bindPopup(
        `<div style="font-family: inherit; font-size: 13px; padding: 2px;">
          <b style="font-size: 14px; color: #0f172a;">${geoStatus === "granted" ? "Your Current Location" : "Default Location (Enugu)"}</b>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">Coordinates: (${userCoords.lat}, ${userCoords.lon})</div>
        </div>`
      );
    }
  }, [userCoords, geoStatus]);

  // 5. Update hospital markers on map whenever facilities list changes
  React.useEffect(() => {
    let active = true;

    async function updateMarkers() {
      if (!markersLayerRef.current || !mapInstanceRef.current || typeof window === "undefined") {
        return;
      }

      const L = (await import("leaflet")).default;
      if (!active || !markersLayerRef.current) return;

      markersLayerRef.current.clearLayers();

      facilities.forEach((f) => {
        const hospitalIcon = L.divIcon({
          className: "custom-hospital-marker",
          html: `<div style="background-color: ${
            f.emergency ? "#C0392B" : "#1F9D63"
          }; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(11,27,51,0.25);">+</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([f.lat, f.lon], { icon: hospitalIcon });
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`;
        const phoneHtml = f.phone
          ? `<div style="margin-top: 6px;"><a href="tel:${f.phone}" style="color: #0B7A87; font-weight: 600; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">Phone: ${f.phone}</a></div>`
          : "";

        marker.bindPopup(`
          <div role="region" aria-label="Hospital details for ${f.name}" style="font-family: inherit; font-size: 13px; max-width: 250px; line-height: 1.4; color: #0b1b33; padding: 2px;">
            <div style="font-size: 14px; font-weight: 600; color: #0b1b33; margin-bottom: 4px;">${f.name}</div>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; ${
              f.emergency
                ? "background-color: #FCEBE9; color: #C0392B; border: 1px solid rgba(192,57,43,0.3);"
                : "background-color: #E8F6EF; color: #1F9D63; border: 1px solid rgba(31,157,99,0.3);"
            }">
              ${f.emergency ? "Emergency Dept" : "Clinic / Hospital"}
            </div>
            <div style="color: #51607a; font-size: 12px; font-weight: 500;">${f.distanceKm} km away</div>
            ${f.address ? `<div style="font-size: 12px; margin-top: 3px; color: #51607a;">${f.address}</div>` : ""}
            ${phoneHtml}
            <div style="margin-top: 10px;">
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" aria-label="Get driving directions to ${f.name} on Google Maps" style="display: inline-flex; align-items: center; justify-content: center; width: 100%; background: #12305A; color: #ffffff; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600;">
                Get Directions
              </a>
            </div>
          </div>
        `);

        marker.on("click", () => {
          if (active) setSelectedFacility(f);
        });

        if (markersLayerRef.current) {
          marker.addTo(markersLayerRef.current);
        }
      });
    }

    updateMarkers();

    return () => {
      active = false;
    };
  }, [facilities]);

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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Persistent Location Fallback Notice */}
      {geoStatus !== "granted" && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-xl border border-warning/30 bg-warning-muted text-warning-text text-xs animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            <span>Showing facilities near an approximate location. Enable location for accurate results.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectUserLocation}
            className="text-xs h-7 px-2.5 font-medium border-warning/40 text-warning-text hover:bg-warning/10 shrink-0"
          >
            Enable Location
          </Button>
        </div>
      )}

      {/* Offline Mode Informational Banner */}
      {isOfflineMode && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border-subtle bg-surface text-text-secondary text-xs animate-in fade-in-50">
          <WifiOff className="size-4 shrink-0 text-text-tertiary" />
          <div className="flex-1">
            <span>You&apos;re offline. Showing saved facilities.</span>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border border-border bg-card shadow-none">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Compass className="size-4.5 text-accent" />
            Nearby Healthcare Facilities
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap"
          >
            <MapPin className="size-3.5 text-accent" />
            <span>Search Center: <strong className="text-foreground">{locationName}</strong></span>
            {isLocating && (
              <span className="inline-flex items-center gap-1 text-accent font-medium">
                <Spinner size="sm" />
                <span>Detecting GPS location...</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={isLocating}
            onClick={detectUserLocation}
            className="text-xs h-8 px-3 rounded-lg gap-1.5"
            title="Detect user current GPS coordinates"
          >
            <LocateFixed className="size-3.5 text-accent" />
            <span>Use My Location</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualResetToEnugu}
            className="text-xs h-8 px-3 rounded-lg gap-1.5 text-muted-foreground"
            title="Reset map view to default location (Enugu State)"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset to Enugu</span>
          </Button>
        </div>
      </div>

      {/* Map & Facility List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Map Box */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border bg-muted min-h-[420px] lg:min-h-[520px] relative shadow-none">
          {isLoadingFacilities && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs">
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card border border-border shadow-sm text-xs font-medium"
              >
                <Spinner size="sm" />
                <span>Locating nearby hospitals for active coordinates...</span>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px] lg:min-h-[520px] z-10" />
        </div>

        {/* Scrollable Facilities Sidebar */}
        <div className="space-y-3 flex flex-col max-h-[520px]">
          <div className="flex items-center justify-between px-1">
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular-nums"
            >
              {facilities.length} Facilities Found
            </span>
          </div>

          <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
            {isLoadingFacilities && facilities.length === 0 ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <div className="flex justify-between items-center pt-1">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-7 w-20 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : facilities.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card space-y-2">
                <MapPin className="size-6 mx-auto text-muted-foreground" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  No healthcare facilities found within 30km of these coordinates.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualResetToEnugu}
                  className="text-xs h-8 rounded-lg"
                >
                  Reset to Enugu
                </Button>
              </div>
            ) : (
              facilities.map((facility) => {
                const isSelected = selectedFacility?.id === facility.id;

                return (
                  <Card
                    key={facility.id}
                    onClick={() => focusFacilityOnMap(facility)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-colors border shadow-none ${
                      isSelected ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "bg-card border-border hover:border-accent/40"
                    }`}
                  >
                    <CardContent className="p-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground leading-snug">
                          {facility.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold shrink-0 bg-muted text-muted-foreground border-border rounded-full px-2 tabular-nums"
                        >
                          {facility.distanceKm} km
                        </Badge>
                      </div>

                      {facility.address && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {facility.address}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-xs">
                        {facility.emergency && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                            <AlertTriangle className="size-3" />
                            Emergency 24/7
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          {facility.phone && (
                            <a
                              href={`tel:${facility.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center size-7 rounded-lg bg-muted text-foreground hover:bg-accent hover:text-accent-foreground border border-border transition-colors"
                              title={`Call ${facility.phone}`}
                              aria-label={`Call ${facility.name} at ${facility.phone}`}
                            >
                              <PhoneCall className="size-3.5" />
                            </a>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteFacility(facility);
                            }}
                            aria-label={`Directions to ${facility.name}`}
                            className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1"
                          >
                            <Navigation className="size-3" />
                            <span>Directions</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* In-App Turn-by-Turn Route Preview Sheet / Modal */}
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
