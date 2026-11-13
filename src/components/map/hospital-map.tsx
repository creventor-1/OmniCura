"use client";

import * as React from "react";
import {
  MapPin,
  PhoneCall,
  Navigation,
  Compass,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { HealthcareFacility } from "@/types/hospital";
import { DEFAULT_FALLBACK_COORDINATES } from "@/services/hospitals/fallback-data";
import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

export function HospitalMap() {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  const markersLayerRef = React.useRef<LeafletLayerGroup | null>(null);

  const [facilities, setFacilities] = React.useState<HealthcareFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = React.useState<HealthcareFacility | null>(null);
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lon: number }>(
    DEFAULT_FALLBACK_COORDINATES
  );
  const [isLocating, setIsLocating] = React.useState(true);
  const [isLoadingFacilities, setIsLoadingFacilities] = React.useState(true);
  const [locationName, setLocationName] = React.useState<string>(
    DEFAULT_FALLBACK_COORDINATES.cityName
  );

  // 1. Geolocation Auto-Detection with Lagos Fallback
  React.useEffect(() => {
    let active = true;

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (active) {
            setUserCoords({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
            setLocationName("Current GPS Location");
            setIsLocating(false);
          }
        },
        (err) => {
          console.warn("[GEOLOCATION_WARN] Defaulting to Lagos:", err.message);
          if (active) {
            setIsLocating(false);
          }
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      const timer = setTimeout(() => {
        if (active) setIsLocating(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch facilities from /api/hospitals
  React.useEffect(() => {
    let active = true;

    async function fetchHospitals() {
      setIsLoadingFacilities(true);
      try {
        const res = await fetch(
          `/api/hospitals?lat=${userCoords.lat}&lon=${userCoords.lon}`
        );
        const data = await res.json();
        if (active && data.success && data.facilities) {
          setFacilities(data.facilities);
          if (data.facilities.length > 0) {
            setSelectedFacility(data.facilities[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load facilities:", err);
      } finally {
        if (active) setIsLoadingFacilities(false);
      }
    }

    fetchHospitals();

    return () => {
      active = false;
    };
  }, [userCoords]);

  // 3. Initialize & Update Leaflet Map instance
  React.useEffect(() => {
    let active = true;

    async function initMap() {
      if (!mapContainerRef.current || typeof window === "undefined") return;

      const L = (await import("leaflet")).default;

      // Clean up previous map instance if re-initializing
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView(
        [userCoords.lat, userCoords.lon],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // User location marker (blue pulse)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37,99,235,0.7);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([userCoords.lat, userCoords.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup("<b>Your Location</b><br/>Search center")
        .openPopup();

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Hospital markers
      facilities.forEach((f) => {
        const hospitalIcon = L.divIcon({
          className: "custom-hospital-marker",
          html: `<div style="background-color: ${f.emergency ? "#dc2626" : "#059669"}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">+</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([f.lat, f.lon], { icon: hospitalIcon });

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`;
        const phoneHtml = f.phone
          ? `<br/><a href="tel:${f.phone}" style="color: #059669; font-weight: bold;">📞 ${f.phone}</a>`
          : "";

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px;">
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

        marker.addTo(markersGroup);
      });
    }

    initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userCoords, facilities]);

  const focusFacilityOnMap = (f: HealthcareFacility) => {
    setSelectedFacility(f);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([f.lat, f.lon], 15, { animate: true });
    }
  };

  const handleManualResetToLagos = () => {
    setUserCoords({
      lat: DEFAULT_FALLBACK_COORDINATES.lat,
      lon: DEFAULT_FALLBACK_COORDINATES.lon,
    });
    setLocationName("Lagos, Nigeria (Default)");
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            Nearby Healthcare Facilities
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" />
            <span>Location: <strong>{locationName}</strong></span>
            {isLocating && <Spinner size="sm" />}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualResetToLagos}
            className="text-xs h-8 gap-1"
            title="Reset map view to Lagos"
          >
            <RotateCcw className="size-3" />
            Reset to Lagos
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
                <span>Locating nearby hospitals...</span>
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
            {facilities.map((facility) => {
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
