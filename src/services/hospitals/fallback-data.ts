import { HealthcareFacility } from "@/types/hospital";

/**
 * Default fallback coordinates: Enugu State, Nigeria
 * Latitude: 6.4584, Longitude: 7.5464
 */
export const DEFAULT_FALLBACK_COORDINATES = {
  lat: 6.4584,
  lon: 7.5464,
  cityName: "Enugu, Nigeria",
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

/**
 * Curated Healthcare Facilities in Enugu State (Default Fallback Region)
 */
export const CURATED_ENUGU_HOSPITALS: HealthcareFacility[] = [
  {
    id: "hosp-unth-enugu",
    name: "University of Nigeria Teaching Hospital (UNTH)",
    type: "hospital",
    lat: 6.4253,
    lon: 7.5085,
    address: "Ituku-Ozalla, PMB 01129, Enugu",
    phone: "+234 42 252 111",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-esut-parklane",
    name: "Enugu State University Teaching Hospital (ESUT Parklane)",
    type: "hospital",
    lat: 6.4447,
    lon: 7.5029,
    address: "Parklane, GRA, Enugu",
    phone: "+234 42 254 391",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-orthopaedic-enugu",
    name: "National Orthopaedic Hospital Enugu",
    type: "hospital",
    lat: 6.4674,
    lon: 7.5192,
    address: "Abakaliki Rd, Trans-Ekulu, Enugu",
    phone: "+234 42 255 107",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-neuro-enugu",
    name: "Federal Neuropsychiatric Hospital Enugu",
    type: "hospital",
    lat: 6.4478,
    lon: 7.5255,
    address: "Chime Avenue, New Haven, Enugu",
    phone: "+234 42 258 004",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-mother-of-christ",
    name: "Mother of Christ Specialist Hospital",
    type: "hospital",
    lat: 6.4395,
    lon: 7.5078,
    address: "Ogui Road, Asata, Enugu",
    phone: "+234 42 255 771",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-annunciation-enugu",
    name: "Annunciation Specialist Hospital",
    type: "hospital",
    lat: 6.4712,
    lon: 7.5753,
    address: "Emene, Enugu East, Enugu",
    phone: "+234 42 550 123",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-colliery-enugu",
    name: "Colliery Hospital",
    type: "hospital",
    lat: 6.4493,
    lon: 7.4773,
    address: "Enugu-Onitsha Old Road, Ngwo, Enugu",
    phone: "+234 42 253 209",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-niger-foundation",
    name: "Niger Foundation Hospital",
    type: "hospital",
    lat: 6.4328,
    lon: 7.5284,
    address: "5 Club Road, Independence Layout, Enugu",
    phone: "+234 42 458 722",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-hanssa-clinic",
    name: "Hanssa Clinic & Maternity",
    type: "clinic",
    lat: 6.4461,
    lon: 7.5312,
    address: "New Haven, Enugu",
    phone: "+234 42 254 001",
    emergency: false,
    isFallback: true,
  },
];

/**
 * Curated Facilities across other major Nigerian cities (Abuja, Port Harcourt, Ibadan, Kano, etc.)
 * Used as dynamic regional fallbacks when external OSM endpoints are unreachable.
 */
export const CURATED_NATIONWIDE_HOSPITALS: HealthcareFacility[] = [
  ...CURATED_ENUGU_HOSPITALS,
  // Abuja (FCT)
  {
    id: "hosp-national-abuja",
    name: "National Hospital Abuja",
    type: "hospital",
    lat: 9.0436,
    lon: 7.4665,
    address: "Plot 132 Central District (Phase II), Garki, Abuja",
    phone: "+234 9 234 4022",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-fmc-jabi",
    name: "Federal Medical Centre Jabi, Abuja",
    type: "hospital",
    lat: 9.0765,
    lon: 7.4243,
    address: "Jabi District, Abuja",
    phone: "+234 9 876 5432",
    emergency: true,
    isFallback: true,
  },
  // Port Harcourt (Rivers State)
  {
    id: "hosp-upth-ph",
    name: "University of Port Harcourt Teaching Hospital (UPTH)",
    type: "hospital",
    lat: 4.8986,
    lon: 6.9248,
    address: "East-West Rd, Port Harcourt, Rivers State",
    phone: "+234 84 461 555",
    emergency: true,
    isFallback: true,
  },
  {
    id: "hosp-bmh-ph",
    name: "Braithwaite Memorial Specialist Hospital (BMSH)",
    type: "hospital",
    lat: 4.7731,
    lon: 7.0142,
    address: "Old GRA, Port Harcourt, Rivers State",
    phone: "+234 84 231 112",
    emergency: true,
    isFallback: true,
  },
  // Ibadan (Oyo State)
  {
    id: "hosp-uch-ibadan",
    name: "University College Hospital (UCH) Ibadan",
    type: "hospital",
    lat: 7.4042,
    lon: 3.9015,
    address: "Queen Elizabeth II Rd, Agodi, Ibadan",
    phone: "+234 2 241 0088",
    emergency: true,
    isFallback: true,
  },
  // Kano
  {
    id: "hosp-akth-kano",
    name: "Aminu Kano Teaching Hospital (AKTH)",
    type: "hospital",
    lat: 11.9678,
    lon: 8.5273,
    address: "Zaria Rd, Kano",
    phone: "+234 64 669 400",
    emergency: true,
    isFallback: true,
  },
];
