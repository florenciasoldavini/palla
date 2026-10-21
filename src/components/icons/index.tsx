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
  createLucideIcon,
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

// Original Palla vectors, using the same rendering and props as Lucide icons.
export const PadelBallIcon = createIcon(
  createLucideIcon("PadelBall", [
    ["circle", { cx: "12", cy: "12", r: "9", key: "outline" }],
    [
      "path",
      {
        d: "M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8",
        key: "seams"
      }
    ]
  ])
);

const racketOutline = [
  [
    "path",
    {
      d: "M10.25 14.5C7.125 13.25 5.5 10.875 5.5 7.75c0-3.75 2.875-6.75 6.5-6.75s6.5 3 6.5 6.75c0 3.125-1.625 5.5-4.75 6.75L12 16Z",
      transform: "rotate(38 12 12)",
      key: "head"
    }
  ],
  ["path", { d: "M12 16v5.75", transform: "rotate(38 12 12)", key: "handle" }]
] satisfies Parameters<typeof createLucideIcon>[1];

export const PadelRacketIcon = createIcon(
  createLucideIcon("PadelRacket", racketOutline)
);

export const PadelRacketBallIcon = createIcon(
  createLucideIcon("PadelRacketBall", [
    ...racketOutline.map(
      ([element, attributes]) =>
        [
          element,
          {
            ...attributes,
            transform: "translate(-0.8 -0.5) rotate(38 12 12)"
          }
        ] satisfies (typeof racketOutline)[number]
    ),
    ["circle", { cx: "19.3", cy: "19.5", r: "3.1", key: "ball" }]
  ])
);
