export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  accountExpiresAt?: string | Date; // Dates might be strings from JSON
  freeTrialEndsAt?: string | Date; // Corrected property name
  photoURL?: string;
  // username?: string; // Optional: if distinct from name/email
  // points?: number;   // Optional: if used in frontend
}