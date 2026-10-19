import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { atomPalette as c } from "@/components/atoms/theme";
export function ReviewStars({
  value,
  onChange,
  disabled = false
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}
      accessibilityRole={onChange ? "radiogroup" : undefined}
      accessibilityLabel={
        onChange ? "Session rating" : `${value} out of 5 stars`
      }
      accessible={!onChange}
    >
      {[1, 2, 3, 4, 5].map((score) =>
        onChange ? (
          <Pressable
            key={score}
            accessibilityRole="radio"
            accessibilityLabel={`${score} ${score === 1 ? "star" : "stars"}`}
            accessibilityState={{ checked: score === value, disabled }}
            disabled={disabled}
            onPress={() => onChange(score)}
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Star
              size={32}
              strokeWidth={1.8}
              color={score <= value ? "#ff9500" : c.borderStrong}
              fill={score <= value ? "#ff9500" : "none"}
            />
          </Pressable>
        ) : (
          <Star
            key={score}
            size={22}
            color={score <= value ? "#ff9500" : c.borderStrong}
            fill={score <= value ? "#ff9500" : "none"}
          />
        )
      )}
    </View>
  );
}
