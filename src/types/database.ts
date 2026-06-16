/** Fila de la tabla profiles. */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ayni_score: number;
  bio: string | null;
  skills: string[];
  location: string | null;
  created_at: string;
}

/** Fila de la tabla waitlist. */
export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}
