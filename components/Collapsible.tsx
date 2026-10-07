import { PropsWithChildren, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { getSansFontStyle } from "@/theme/fonts";

export function Collapsible({
  children,
  title
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ gap: atomSpacing[2] }}>
      <Pressable
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={atomPalette.textSubtle}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />

        <AppText style={getSansFontStyle("600")} variant="bodySm">
          {title}
        </AppText>
      </Pressable>
      {isOpen ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  content: {
    marginLeft: 24
  }
});
