import { AppText, TextField } from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { ActivityIndicator, Keyboard, Pressable, View } from "react-native";
import { useRef, useState } from "react";
import { useAddressSearch } from "../hooks/use-address-search";
import {
  addressSearchError,
  resolveAddress
} from "../services/address-search.service";
import type { AddressSuggestion } from "../repositories/address-search.repository";
export function AddressField({
  value,
  onChange,
  errorText
}: {
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
}) {
  const [active, setActive] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const revision = useRef(0);
  const search = useAddressSearch(value, active);
  async function choose(suggestion: AddressSuggestion) {
    const current = ++revision.current;
    setResolving(true);
    setSelectionError(null);
    Keyboard.dismiss();
    try {
      const address = await resolveAddress(suggestion.id, search.token);
      if (revision.current !== current) return;
      onChange(address);
      setActive(false);
      search.resetToken();
    } catch (error) {
      if (revision.current === current)
        setSelectionError(addressSearchError(error));
    } finally {
      if (revision.current === current) setResolving(false);
    }
  }
  return (
    <View style={{ gap: atomSpacing[2] }}>
      <TextField
        required
        label="Club address"
        value={value}
        placeholder="Street and number, Buenos Aires"
        errorText={errorText}
        onChangeText={(text) => {
          revision.current++;
          setResolving(false);
          onChange(text);
          setActive(true);
          setSelectionError(null);
        }}
        onFocus={() => setActive(true)}
        helperText="Search your club’s street address. Palla does not reserve courts."
      />
      {(search.searching || resolving) && (
        <View style={{ flexDirection: "row", gap: atomSpacing[2] }}>
          <ActivityIndicator color={atomPalette.accent} />
          <AppText variant="bodySm">
            {resolving ? "Choosing address…" : "Searching addresses…"}
          </AppText>
        </View>
      )}
      {active &&
        value.trim().length >= 3 &&
        !search.searching &&
        !resolving &&
        search.data && (
          <View
            style={{
              borderWidth: 1,
              borderColor: atomPalette.borderSubtle,
              borderRadius: 12,
              backgroundColor: atomPalette.surface,
              padding: atomSpacing[3]
            }}
          >
            {search.data.length === 0 ? (
              <AppText variant="bodySm">
                No addresses found. Try a street and number, or enter the full
                address.
              </AppText>
            ) : (
              search.data.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  onPress={() => void choose(s)}
                  style={{ paddingVertical: atomSpacing[3], minHeight: 48 }}
                >
                  <AppText variant="body">{s.label}</AppText>
                </Pressable>
              ))
            )}
            <AppText
              variant="bodySm"
              style={{
                color: "#5E5E5E",
                fontSize: 12,
                letterSpacing: 0,
                fontWeight: "400"
              }}
            >
              Google Maps
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                revision.current++;
                setResolving(false);
                setActive(false);
                search.resetToken();
              }}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <AppText variant="bodySm" tone="accent">
                Use the address I entered
              </AppText>
            </Pressable>
          </View>
        )}
      {(selectionError || (active && search.error)) && (
        <AppText variant="bodySm" tone="muted">
          {selectionError ?? addressSearchError(search.error)}
        </AppText>
      )}
    </View>
  );
}
