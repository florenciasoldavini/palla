import { AppButton } from "@/components/atoms";
import { useState } from "react";
import { View } from "react-native";
import type { Attendee } from "../domain";
import type { Waitlist, WaitlistEntry } from "../waitlist-domain";
import { WaitlistCard } from "./organizer-waitlist";

// Development fixture only: no account or registration writes.
export function WaitlistPreview({
  attendees,
  onRosterChange,
  initialRoster,
  published,
  sessionId
}: {
  attendees: Attendee[];
  initialRoster: Attendee[];
  onRosterChange: (rows: Attendee[]) => void;
  published: boolean;
  sessionId: string;
}) {
  const initialQueue = (): WaitlistEntry[] =>
    [
      { first: "Sofía", last: "T.", category: 6 },
      { first: "David", last: "K.", category: 7 }
    ].map((person, index) => ({
      ...initialRoster[0],
      id: `44444444-4444-4444-8444-44444444444${index}`,
      player_id: `55555555-5555-4555-8555-55555555555${index}`,
      joined_at: new Date(
        Date.now() - (index === 0 ? 120 : 30) * 60000
      ).toISOString(),
      status: "waitlisted",
      waitlist_sequence: String(index + 1),
      confirmed_at: null,
      player: {
        first_name: person.first,
        last_name: person.last,
        playing_category: person.category,
        avatar_url: null
      },
      category_eligible: true
    }));
  const [entries, setEntries] = useState(initialQueue);
  const [promotionMode, setPromotionMode] = useState<"manual" | "automatic">(
    "manual"
  );
  const [state, setState] = useState<
    "normal" | "deadline" | "disabled" | "error"
  >("normal");
  const [busy, setBusy] = useState(false);
  const promotedRow = (row: WaitlistEntry): Attendee => {
    const { category_eligible: _eligible, ...record } = row;
    return {
      ...record,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };
  const autoFill = (roster: Attendee[]) => {
    const promote = entries.slice(0, Math.max(0, 4 - roster.length));
    setEntries(entries.filter((row) => !promote.some((p) => p.id === row.id)));
    onRosterChange([...roster, ...promote.map(promotedRow)]);
  };
  const data: Waitlist = {
    session_id: sessionId,
    session_version: new Date().toISOString(),
    enabled: state !== "disabled",
    promotion_mode: promotionMode,
    capacity: 4,
    waitlist_capacity: null,
    confirmed_count: attendees.length,
    blocked_reason: !published
      ? "session_unavailable"
      : state === "deadline"
        ? "deadline"
        : state === "disabled"
          ? "disabled"
          : attendees.length >= 4
            ? "full"
            : null,
    entries
  };
  const simulate = async (callback: () => void) => {
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      callback();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <AppButton
          size="sm"
          fullWidth={false}
          variant="ghost"
          accessibilityLabel="Reset waitlist preview"
          onPress={() => {
            setEntries(initialQueue());
            onRosterChange(initialRoster);
            setPromotionMode("manual");
            setState("normal");
          }}
        >
          Reset waitlist
        </AppButton>
        <AppButton
          size="sm"
          fullWidth={false}
          variant="ghost"
          accessibilityLabel="Open a place in preview"
          onPress={() => {
            const next = attendees.slice(0, -1);
            if (promotionMode === "automatic" && state === "normal")
              autoFill(next);
            else onRosterChange(next);
          }}
        >
          Open a place
        </AppButton>
        {(["deadline", "disabled", "error"] as const).map((value) => (
          <AppButton
            key={value}
            size="sm"
            fullWidth={false}
            variant="ghost"
            accessibilityLabel={`Preview waitlist ${value}`}
            onPress={() => setState(value)}
          >
            {value}
          </AppButton>
        ))}
      </View>
      <WaitlistCard
        data={data}
        published={published}
        busy={busy}
        error={
          state === "error"
            ? "We couldn’t save this change. Reload the waitlist and try again."
            : null
        }
        onRetry={() => setState("normal")}
        onAction={(row, action) =>
          simulate(() => {
            if (action === "promote")
              onRosterChange([...attendees, promotedRow(row)]);
            setEntries((rows) => rows.filter((r) => r.id !== row.id));
          })
        }
        onMode={(value) =>
          simulate(() => {
            setPromotionMode(value);
            if (value === "automatic" && !data.blocked_reason)
              autoFill(attendees);
          })
        }
      />
    </>
  );
}
