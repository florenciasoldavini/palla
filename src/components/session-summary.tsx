import { Image } from "expo-image";
import { View, useWindowDimensions } from "react-native";
import { AppHeading, AppText } from "@/components/atoms";
import { sessionDate, sessionTime } from "@/utils/session-format";
export function SessionSummary({
  context
}: {
  context: {
    session_title: string;
    starts_at: string;
    ends_at: string;
    timezone: string;
  };
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={{
        flexDirection: fontScale > 1.4 ? "column" : "row",
        alignItems: fontScale > 1.4 ? "flex-start" : "center",
        gap: 12
      }}
    >
      <Image
        source={require("../../assets/images/sessions/court-artwork.jpg")}
        style={{ width: 80, height: 56, borderRadius: 12 }}
        contentFit="cover"
        accessible={false}
      />
      <View
        style={{
          flex: 1,
          gap: 4,
          alignSelf: "stretch",
          justifyContent: "center"
        }}
      >
        <AppHeading variant="card">{context.session_title}</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          {sessionDate(context)} · {sessionTime(context)}
        </AppText>
      </View>
    </View>
  );
}
