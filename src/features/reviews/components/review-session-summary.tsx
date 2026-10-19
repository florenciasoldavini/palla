import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Clock, ImageOff } from "lucide-react-native";
import { AppHeading, AppText, SkeletonBlock } from "@/components/atoms";
import { atomPalette as c, atomRadii } from "@/components/atoms/theme";
import type { ReviewContext } from "../domain";
import { reviewSessionDate, reviewSessionTime } from "../format";

// Generic illustrative artwork until sessions support uploaded photos.
const courtArtwork = require("../../../../assets/images/sessions/court-artwork.jpg");

export function ReviewSessionSummary({ context }: { context: ReviewContext }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.3 || width < 350;
  return (
    <View style={[styles.summary, stacked && styles.stacked]}>
      <View
        style={styles.thumbnail}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {failed ? (
          <ImageOff size={24} color={c.textSubtle} />
        ) : (
          <Image
            source={courtArtwork}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        )}
        {loading && <SkeletonBlock width={132} height={76} />}
      </View>
      <View style={styles.details}>
        <AppHeading variant="card">{context.session_title}</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          {context.host_name} · {reviewSessionDate(context)}
        </AppText>
        <View style={styles.time}>
          <Clock size={16} color={c.textSubtle} />
          <AppText variant="bodySm" tone="subtle" style={{ flex: 1 }}>
            {reviewSessionTime(context)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.borderSubtle
  },
  stacked: { flexDirection: "column", alignItems: "flex-start" },
  thumbnail: {
    width: 132,
    height: 76,
    borderRadius: atomRadii.md,
    overflow: "hidden",
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  details: { flex: 1, gap: 4, alignSelf: "stretch", justifyContent: "center" },
  time: { flexDirection: "row", alignItems: "center", gap: 6 }
});
