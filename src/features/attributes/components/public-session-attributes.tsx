import { View } from "react-native";
import { AppHeading } from "@/components/atoms";
import { AttributeChips } from "./attribute-chips";
import type { SessionAttribute, VenueAttribute } from "../domain";
export function PublicSessionAttributes({
  sessionCodes,
  venueCodes
}: {
  sessionCodes: SessionAttribute[];
  venueCodes: VenueAttribute[];
}) {
  return (
    <View style={{ gap: 24 }}>
      {sessionCodes.length > 0 && (
        <View style={{ gap: 14 }}>
          <AppHeading variant="section">What’s included</AppHeading>
          <AttributeChips codes={sessionCodes} />
        </View>
      )}
      {venueCodes.length > 0 && (
        <View style={{ gap: 14 }}>
          <AppHeading variant="section">At the venue</AppHeading>
          <AttributeChips codes={venueCodes} />
        </View>
      )}
    </View>
  );
}
