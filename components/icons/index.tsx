import {
  ArrowRight,
  AtSign,
  Bell,
  Camera,
  CheckCircle2,
  CircleUserRound,
  Eye,
  EyeOff,
  House,
  Link2,
  Lock,
  LogOut,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
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
export const CameraIcon = createIcon(Camera);
export const CheckCircleIcon = createIcon(CheckCircle2);
export const ClosedEyeIcon = createIcon(EyeOff);
export const HomeIcon = createIcon(House);
export const LinkIcon = createIcon(Link2);
export const LockIcon = createIcon(Lock);
export const LogoutIcon = createIcon(LogOut);
export const MailIcon = createIcon(Mail);
export const OpenEyeIcon = createIcon(Eye);
export const PlusIcon = createIcon(Plus);
export const ProfileIcon = createIcon(CircleUserRound);
export const TrashIcon = createIcon(Trash2);
export const UserIcon = createIcon(UserRound);
export const PhoneIcon = createIcon(Phone);
