import {
  Accessibility,
  Coffee,
  GlassWater,
  GraduationCap,
  HandCoins,
  LockKeyhole,
  Sandwich,
  Shirt,
  ShoppingBag,
  ShowerHead,
  SquareParking,
  CupSoda
} from "lucide-react-native";
import {
  PadelBallIcon,
  PadelRacketIcon,
  type AppIconComponent
} from "@/components/icons";
import { type AttributeCode } from "./domain";
export const attributeCatalog: Record<
  AttributeCode,
  { label: string; icon: AppIconComponent }
> = {
  balls_provided: { label: "Balls provided", icon: PadelBallIcon },
  new_balls: { label: "New balls", icon: PadelBallIcon },
  spare_rackets: { label: "Spare rackets available", icon: PadelRacketIcon },
  coaching: { label: "Coaching", icon: GraduationCap },
  snacks: { label: "Snacks included", icon: Sandwich },
  drinks: { label: "Drinks included", icon: CupSoda },
  free_parking: { label: "Free parking", icon: SquareParking },
  paid_parking: { label: "Paid parking", icon: SquareParking },
  showers: { label: "Showers", icon: ShowerHead },
  changing_rooms: { label: "Changing rooms", icon: Shirt },
  lockers: { label: "Lockers", icon: LockKeyhole },
  water_dispenser: { label: "Water dispenser", icon: GlassWater },
  accessible: { label: "Accessible facilities", icon: Accessibility },
  racket_rental: { label: "Racket rental", icon: HandCoins },
  shop: { label: "Equipment shop", icon: ShoppingBag },
  cafe: { label: "Café / bar", icon: Coffee }
};
export { orderedAttributes } from "./domain";
