import { useState } from "react";
import { Keyboard, View } from "react-native";
import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { AttributeChips } from "./attribute-chips";
import {
  sessionAttributeCodes,
  venueAttributeCodes,
  toggleSessionAttribute,
  type SessionAttribute,
  type VenueAttribute
} from "../domain";

export function SessionAttributeFields({
  sessionCodes,
  venueCodes,
  venueName,
  onSessionChange,
  onVenueChange,
  disabled
}: {
  sessionCodes: SessionAttribute[];
  venueCodes: VenueAttribute[];
  venueName: string;
  onSessionChange: (codes: SessionAttribute[]) => void;
  onVenueChange: (codes: VenueAttribute[]) => void;
  disabled: boolean;
}) {
  const [amenities, setAmenities] = useState<VenueAttribute[] | null>(null);
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <AppHeading variant="card">Venue amenities</AppHeading>
          <AppButton
            variant="ghost"
            color="essential"
            size="sm"
            fullWidth={false}
            isDisabled={disabled}
            onPress={() => {
              Keyboard.dismiss();
              setAmenities([...venueCodes]);
            }}
          >
            Edit amenities
          </AppButton>
        </View>
        {venueCodes.length ? (
          <AttributeChips codes={venueCodes} compact />
        ) : (
          <AppText variant="bodySm" tone="subtle">
            No amenities added yet.
          </AppText>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8
          }}
        >
          <AppHeading variant="card">What’s included</AppHeading>
          <AppText variant="caption" tone="muted">
            Optional
          </AppText>
        </View>
        <AppText variant="bodySm" tone="muted">
          Select what you’ll provide for this session.
        </AppText>
        <AttributeChips
          codes={sessionAttributeCodes}
          selected={sessionCodes}
          disabled={disabled}
          onToggle={(code) =>
            onSessionChange(
              toggleSessionAttribute(sessionCodes, code as SessionAttribute)
            )
          }
        />
      </View>
      {amenities !== null && (
        <AppBottomSheet
          title="Venue amenities"
          busy={false}
          onClose={() => setAmenities(null)}
          footer={
            <AppButton
              color="essential"
              onPress={() => {
                onVenueChange(amenities);
                setAmenities(null);
              }}
            >
              Apply amenities
            </AppButton>
          }
        >
          <View style={{ gap: 18 }}>
            <AppHeading variant="card">{venueName || "Your venue"}</AppHeading>
            <AppText variant="bodySm" tone="muted">
              Select the facilities and services available here.
            </AppText>
            <AttributeChips
              codes={venueAttributeCodes}
              selected={amenities}
              onToggle={(code) =>
                setAmenities((current) =>
                  current!.includes(code as VenueAttribute)
                    ? current!.filter((c) => c !== code)
                    : [...current!, code as VenueAttribute]
                )
              }
            />
            <AppText variant="caption" tone="subtle">
              Saved when you publish or update this session. These amenities
              will be reused for your sessions at this venue. Closing without
              applying keeps your previous selection.
            </AppText>
          </View>
        </AppBottomSheet>
      )}
    </View>
  );
}
