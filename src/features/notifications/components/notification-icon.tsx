import {
  CalendarX,
  Megaphone,
  MessageSquare,
  Star,
  UserMinus,
  UserPlus
} from "lucide-react-native";
import { AppIconTile } from "@/components/atoms/icon-tile";
import type { AppIconComponent } from "@/components/icons";
import type { NotificationKind } from "../inbox-domain";

const icons = {
  chat_messages: MessageSquare,
  review_reminders: Star,
  new_reviews: Star,
  session_announcements: Megaphone,
  session_cancellations: CalendarX,
  new_registrations: UserPlus,
  player_cancellations: UserMinus
} satisfies Record<NotificationKind, AppIconComponent>;

export function NotificationIcon({ type }: { type: NotificationKind }) {
  return <AppIconTile icon={icons[type]} />;
}
