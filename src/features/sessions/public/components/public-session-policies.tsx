import { AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { CalendarClock, CalendarX2, Info, Wallet } from "lucide-react-native";
import { View } from "react-native";

export function PublicSessionPolicies({
  registrationCloses,
  registrationOpens,
  cancellationDeadline,
  arrivalInstructions,
  paymentInstructions,
  timezone
}: {
  registrationCloses: string | null;
  registrationOpens: string | null;
  cancellationDeadline: string | null;
  arrivalInstructions: string | null;
  paymentInstructions: string | null;
  timezone: string;
}) {
  return (
    <View
      style={{
        gap: 18,
        borderTopWidth: 1,
        borderColor: c.borderSubtle,
        paddingTop: 20
      }}
    >
      <AppHeading variant="section">Before you join</AppHeading>
      {registrationOpens ? (
        <PolicyRow
          icon={CalendarClock}
          title="Registration opens"
          description={registrationOpens}
        />
      ) : null}
      <PolicyRow
        icon={CalendarClock}
        title="Registration closes"
        description={registrationCloses ?? "When the session starts."}
      />
      <PolicyRow
        icon={CalendarX2}
        title="Player cancellation deadline"
        description={
          cancellationDeadline
            ? `Cancel your place by ${cancellationDeadline}.`
            : "No advance player cancellation cutoff."
        }
      />
      {arrivalInstructions ? (
        <PolicyRow
          icon={Info}
          title="Arrival instructions"
          description={arrivalInstructions}
        />
      ) : null}
      <PolicyRow
        icon={Wallet}
        title="Payment"
        description={
          paymentInstructions ??
          "Court bookings and payments are handled directly with the club."
        }
      />
      <AppText variant="caption" tone="subtle">
        All times are in {timezone.replaceAll("_", " ")}.
      </AppText>
    </View>
  );
}

function PolicyRow({
  icon: Icon,
  title,
  description
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 11, alignItems: "flex-start" }}>
      <Icon
        size={20}
        color={c.accent}
        style={{ marginTop: 2 }}
        accessible={false}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="bodySm" tone="muted">
          {description}
        </AppText>
      </View>
    </View>
  );
}
