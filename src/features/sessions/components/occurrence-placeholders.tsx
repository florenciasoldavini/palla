import { Pressable, StyleSheet } from "react-native";

export function PlaceholderAction({
  label,
  onPress,
  children
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Coming soon`}
      onPress={onPress}
      style={styles.icon}
    >
      {children}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  icon: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12
  }
});
