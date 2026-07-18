import {
  ArrowRight,
  AtSign,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  House,
  Link2,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  type LucideIcon,
  type LucideProps
} from "lucide-react-native";
import type { ComponentType } from "react";

export type AppIconSize = "xs" | "sm" | "md" | "lg";

export const appIconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24
} as const satisfies Record<AppIconSize, number>;

export type AppIconProps = {
  color: NonNullable<LucideProps["color"]>;
  size?: AppIconSize | number;
  strokeWidth?: LucideProps["strokeWidth"];
};

export type AppIconComponent = ComponentType<AppIconProps>;

function createIcon(Icon: LucideIcon): AppIconComponent {
  return function AppIcon({
    color,
    size = "md",
    strokeWidth = 1.8
  }: AppIconProps) {
    const resolvedSize = typeof size === "number" ? size : appIconSizes[size];

    return <Icon color={color} size={resolvedSize} strokeWidth={strokeWidth} />;
  };
}

export const ArrowRightIcon = createIcon(ArrowRight);
export const AtSignIcon = createIcon(AtSign);
export const BellIcon = createIcon(Bell);
export const CalendarIcon = createIcon(CalendarDays);
export const CameraIcon = createIcon(Camera);
export const CheckCircleIcon = createIcon(CheckCircle2);
export const ChevronRightIcon = createIcon(ChevronRight);
export const ClockIcon = createIcon(Clock3);
export const ClosedEyeIcon = createIcon(EyeOff);
export const HomeIcon = createIcon(House);
export const LevelIcon = createIcon(Gauge);
export const LinkIcon = createIcon(Link2);
export const LockIcon = createIcon(Lock);
export const ListIcon = createIcon(ListChecks);
export const LogoutIcon = createIcon(LogOut);
export const MailIcon = createIcon(Mail);
export const MapPinIcon = createIcon(MapPin);
export const OpenEyeIcon = createIcon(Eye);
export const PlusIcon = createIcon(Plus);
export const ProfileIcon = createIcon(CircleUserRound);
export const TrashIcon = createIcon(Trash2);
export const SearchIcon = createIcon(Search);
export const SlidersIcon = createIcon(SlidersHorizontal);
export const SparklesIcon = createIcon(Sparkles);
export const UserIcon = createIcon(UserRound);
export const UsersIcon = createIcon(UsersRound);
export const PhoneIcon = createIcon(Phone);
