export interface User {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar: string | null;
  email: string;
  phone_number: string | null;
  role: "admin" | "user";
  welcome_email_sent_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}
