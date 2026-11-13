export interface HealthcareFacility {
  id: string;
  name: string;
  type: "hospital" | "clinic" | "emergency";
  lat: number;
  lon: number;
  address?: string;
  distanceKm?: number;
  phone?: string;
  emergency?: boolean;
  isFallback?: boolean;
}
