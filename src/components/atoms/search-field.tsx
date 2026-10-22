import { useState } from "react";
import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { AppButton } from "./button";
import { atomPalette as c, atomControlRadius } from "./theme";
import { getSansFontStyle } from "@/theme/fonts";
/** Search action stays a separate native accessibility target from the input. */
export function SearchField({
  value,
  onChangeText,
  onSearch,
  placeholder = "Search",
  accessibilityLabel = placeholder
}: {
  value: string;
  onChangeText: (s: string) => void;
  onSearch: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: focused ? c.accent : c.borderSubtle,
        borderRadius: atomControlRadius,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 5
      }}
    >
      <Search size={20} color={c.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={c.textSubtle}
        maxLength={120}
        returnKeyType="search"
        onSubmitEditing={onSearch}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          paddingVertical: 8,
          fontSize: 16,
          color: c.text,
          ...getSansFontStyle("400")
        }}
      />
      <AppButton
        color="essential"
        size="sm"
        fullWidth={false}
        onPress={onSearch}
      >
        Search
      </AppButton>
    </View>
  );
}
