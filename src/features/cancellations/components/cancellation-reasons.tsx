import { Pressable, View } from "react-native";
import {
  CloudRain,
  Wrench,
  HeartPulse,
  UserMinus,
  Ellipsis
} from "lucide-react-native";
import { AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { designTokens } from "@/theme/tokens";
import {
  cancellationReasonCodes,
  cancellationReasons,
  type CancellationInput
} from "../domain";
const icons = {
  weather: CloudRain,
  venue_issue: Wrench,
  host_emergency: HeartPulse,
  insufficient_players: UserMinus,
  other: Ellipsis
};
export function CancellationReasons({
  value,
  disabled,
  onChange
}: {
  value?: CancellationInput["reason_code"];
  disabled: boolean;
  onChange: (code: CancellationInput["reason_code"]) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Reason for cancellation"
      style={{ gap: 10 }}
    >
      {cancellationReasonCodes.map((code) => {
        const selected = value === code,
          Icon = icons[code];
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={cancellationReasons[code]}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(code)}
            style={{
              minHeight: 76,
              padding: selected ? 14 : 15,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? c.accent : c.borderSubtle,
              backgroundColor: selected
                ? designTokens.colors.primitive.volt[50]
                : c.surface,
              borderRadius: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 13
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: selected ? c.surface : c.surfaceLow,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icon size={22} color={selected ? c.accent : c.textSubtle} />
            </View>
            <AppText variant="label" style={{ flex: 1 }}>
              {cancellationReasons[code]}
            </AppText>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: selected ? 7 : 1.5,
                borderColor: selected ? c.accent : c.borderStrong,
                backgroundColor: c.surface
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
