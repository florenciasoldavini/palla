import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { atomPalette as c } from "@/components/atoms/theme";
export function ReviewStars({
  value,
  onChange,
  disabled = false,
  size = 22
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 4,
        alignSelf: onChange ? "stretch" : "flex-start"
      }}
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
          <View key={score} style={{ width: size, height: size }}>
            <Star size={size} color={c.borderStrong} />
            <View
              style={{
                position: "absolute",
                overflow: "hidden",
                width: size * Math.min(1, Math.max(0, value - score + 1)),
                height: size
              }}
            >
              <Star size={size} color="#ff9500" fill="#ff9500" />
            </View>
          </View>
        )
      )}
    </View>
  );
}
