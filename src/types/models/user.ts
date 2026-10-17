import type { CategoryStatus } from "@/features/profile/playing-category";
export interface User {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar: string | null;
  bio: string | null;
  email: string;
  phone_number: string | null;
  playing_category: number | null;
  category_status: CategoryStatus;
  preferred_mode: "player" | "organizer";
  organizer_status: "active" | "suspended" | null;
  onboarding_completed_at: Date | null;
  role: "admin" | "user";
  welcome_email_sent_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}
