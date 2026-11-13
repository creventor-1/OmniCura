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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [geoNotice, setGeoNotice] = React.useState<string | null>(null);

  // 1. Geolocation detection function
  const detectUserLocation = React.useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      setGeoNotice(
        "Geolocation is not supported by your browser. Nearby hospitals are being shown for the default location (Enugu State, Nigeria)."
      );
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

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
        setGeoNotice(null);
        setIsLocating(false);
      },
      (err) => {
        console.warn("[GEOLOCATION_NOTICE] Access unavailable/denied:", err.message);
        setGeoStatus("denied");
        setGeoNotice(
          "Location access is unavailable or was denied. Showing nearby hospitals for the default location (Enugu State, Nigeria)."
        );
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
          if (data.facilities.length > 0) {
            setSelectedFacility(data.facilities[0]);
          } else {
            setSelectedFacility(null);
          }
        }
      } catch (err) {
        console.warn("[HOSPITAL_FETCH_ERROR]", err);
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

      // User location marker (blue pulse)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37,99,235,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
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
        `<b>${geoStatus === "granted" ? "Your Current Location" : "Default Location (Enugu)"}</b><br/>(${userCoords.lat}, ${userCoords.lon})`
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
            f.emergency ? "#dc2626" : "#059669"
          }; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">+</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([f.lat, f.lon], { icon: hospitalIcon });
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`;
        const phoneHtml = f.phone
          ? `<br/><a href="tel:${f.phone}" style="color: #059669; font-weight: bold;">📞 ${f.phone}</a>`
          : "";

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; max-width: 220px;">
            <b style="font-size: 14px; color: #111827;">${f.name}</b>
            <div style="color: #6b7280; font-size: 11px; margin-top: 2px;">${f.distanceKm} km away • ${f.emergency ? "Emergency Department" : "Clinic"}</div>
            ${f.address ? `<div style="font-size: 11px; margin-top: 2px; color: #4b5563;">${f.address}</div>` : ""}
            ${phoneHtml}
            <div style="margin-top: 8px;">
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: white; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: bold;">Get Directions ➔</a>
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
    setGeoNotice(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Geolocation Denied / Unavailable Informational Notice */}
      {geoNotice && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in-50">
          <Info className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">Location Notice: </span>
            <span>{geoNotice}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={detectUserLocation}
            className="text-xs h-7 px-2 font-medium hover:bg-amber-500/20"
          >
            Retry GPS
          </Button>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            Nearby Healthcare Facilities
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <MapPin className="size-3.5 text-primary" />
            <span>Search Center: <strong>{locationName}</strong></span>
            {isLocating && (
              <span className="inline-flex items-center gap-1 text-primary">
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
            className="text-xs h-8 gap-1.5"
            title="Detect user current GPS coordinates"
          >
            <LocateFixed className="size-3.5 text-primary" />
            <span>Use My Location</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualResetToEnugu}
            className="text-xs h-8 gap-1.5 text-muted-foreground"
            title="Reset map view to default location (Enugu State)"
          >
            <RotateCcw className="size-3" />
            <span>Reset to Enugu</span>
          </Button>
        </div>
      </div>

      {/* Map & Facility List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Map Box */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border bg-muted min-h-[420px] lg:min-h-[520px] relative shadow-sm">
          {isLoadingFacilities && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border shadow-md text-xs font-medium">
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
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {facilities.length} Facilities Found
            </span>
          </div>

          <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
            {isLoadingFacilities && facilities.length === 0 ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                    <div className="flex justify-between items-center pt-1">
                      <Skeleton className="h-4 w-20 rounded-md" />
                      <Skeleton className="h-7 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : facilities.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed bg-card space-y-2">
                <MapPin className="size-6 mx-auto text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  No healthcare facilities found within 30km of these coordinates.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualResetToEnugu}
                  className="text-xs h-8"
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
                    className={`p-3.5 cursor-pointer transition-all border hover:border-primary/50 ${
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card"
                    }`}
                  >
                    <CardContent className="p-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-snug">
                          {facility.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold shrink-0 bg-primary/10 text-primary border-primary/20"
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                            <AlertTriangle className="size-3" />
                            Emergency 24/7
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          {facility.phone && (
                            <a
                              href={`tel:${facility.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center size-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                              title={`Call ${facility.phone}`}
                            >
                              <PhoneCall className="size-3.5" />
                            </a>
                          )}

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            <Navigation className="size-3" />
                            Directions
                          </a>
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
    </div>
  );
}
