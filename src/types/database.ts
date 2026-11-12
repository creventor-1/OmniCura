export interface HealthProfile {
  id?: string;
  user_id?: string;
  age?: number;
  sex?: string;
  allergies: string[];
  chronic_conditions: string[];
  medications: string[];
  blood_group?: string;
  height?: number;
  weight?: number;
  allow_ai_use: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoredAssessment {
  id: string;
  user_id?: string;
  created_at: string;
  symptoms: string;
  severity: "non-urgent" | "urgent" | "emergency";
  assessment_result: Record<string, unknown>;
  disclaimer: string;
}

export interface EmergencyContact {
  id: string;
  user_id?: string;
  created_at?: string;
  name: string;
  relationship?: string;
  phone_number: string;
}
