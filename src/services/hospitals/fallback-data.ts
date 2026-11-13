import { HealthcareFacility } from "@/types/hospital";

export const DEFAULT_FALLBACK_COORDINATES = {
  lat: 6.5244,
  lon: 3.3792,
  cityName: "Lagos, Nigeria",
};

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

export const CURATED_LAGOS_HOSPITALS: HealthcareFacility[] = [
  {
    id: "hosp-luth",
    name: "Lagos University Teaching Hospital (LUTH)",
    type: "hospital",
    lat: 6.5186,
    lon: 3.3594,
    address: "Ishaga Rd, Idi-Araba, Surulere, Lagos",
    phone: "+234 1 877 7845",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-lasuth",
    name: "Lagos State University Teaching Hospital (LASUTH)",
    type: "hospital",
    lat: 6.5947,
    lon: 3.3444,
    address: "1-5 Oba Akinjobi Way, Ikeja, Lagos",
    phone: "+234 1 295 7268",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-reddington",
    name: "Reddington Multi-Specialist Hospital",
    type: "hospital",
    lat: 6.4343,
    lon: 3.4241,
    address: "12 Idowu Martins St, Victoria Island, Lagos",
    phone: "+234 1 271 5340",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-evercare",
    name: "Evercare Hospital Lekki",
    type: "hospital",
    lat: 6.4474,
    lon: 3.4862,
    address: "1 Admiralty Way, Bisola Durosinmi Etti Dr, Lekki Phase 1, Lagos",
    phone: "+234 1 700 8700",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-first-cardio",
    name: "First Cardiology Consultants",
    type: "emergency",
    lat: 6.4533,
    lon: 3.4358,
    address: "20A St. Saviour's School Rd, Ikoyi, Lagos",
    phone: "+234 1 454 4458",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-st-nicholas",
    name: "St. Nicholas Hospital",
    type: "hospital",
    lat: 6.4497,
    lon: 3.3986,
    address: "57 Campbell St, Lagos Island, Lagos",
    phone: "+234 1 877 7322",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-fmc-ebute-metta",
    name: "Federal Medical Centre Ebute Metta",
    type: "hospital",
    lat: 6.4883,
    lon: 3.3789,
    address: "Railway Compound, Ebute Metta, Lagos",
    phone: "+234 1 291 7511",
    emergency: true,
    isFallback: true,
  },
];
