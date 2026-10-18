import {
  Bell,
  CreditCard,
  HelpCircle,
  Info,
  LockKeyhole,
  Shield
} from "lucide-react-native";
export const profileMenu = [
  {
    id: "notifications",
    title: "Notifications",
    description: "Messages and session updates",
    icon: Bell
  },
  {
    id: "security",
    title: "Account & security",
    description: "Password and sign-in methods",
    icon: LockKeyhole
  },
  {
    id: "privacy",
    title: "Privacy & blocked users",
    description: "Manage privacy and blocked people",
    icon: Shield
  },
  {
    id: "payments",
    title: "Payment methods",
    description: "Coming soon",
    icon: CreditCard
  },
  {
    id: "support",
    title: "Help & support",
    description: "Get help and read community rules",
    icon: HelpCircle
  },
  {
    id: "about",
    title: "About Palla",
    description: "Terms, privacy policy and app version",
    icon: Info
  }
] as const;
export type ProfileMenuId = (typeof profileMenu)[number]["id"];
