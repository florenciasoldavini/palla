import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  View
} from "react-native";
import { Check, LocateFixed, MapPin, Search } from "lucide-react-native";
import { AppButton, AppIconTile, AppText, TextField } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import { cityContext, type DiscoveryCity } from "../cities";
import { useCitySearch } from "../hooks/use-city-search";
import { detectDiscoveryCity } from "../services/city.service";
export function DiscoveryLocationSheet({
  onChange,
  onClose
}: {
  onChange: (city: DiscoveryCity) => Promise<void> | void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<DiscoveryCity | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const search = useCitySearch(draft, !selected && !locating);
  useEffect(
    () => () => {
      version.current++;
    },
    []
  );
  async function detect() {
    const request = ++version.current;
    Keyboard.dismiss();
    setError("");
    setLocating(true);
    setSelected(null);
    try {
      const city = await detectDiscoveryCity();
      if (request === version.current) {
        setSelected(city);
        setDraft(city.name);
      }
    } catch (e) {
      if (request === version.current)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn’t detect your city. Search for it instead."
        );
    } finally {
      if (request === version.current) setLocating(false);
    }
  }
  async function apply() {
    if (!selected) return;
    setSaving(true);
    setError("");
    Keyboard.dismiss();
    try {
      await onChange(selected);
      onClose();
    } catch {
      setError("Couldn’t save your city. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  const searching = !selected && !locating && draft.trim().length >= 2;
  return (
    <AppBottomSheet
      title="Where do you want to play?"
      description="Use your location or choose a city."
      busy={saving}
      onClose={onClose}
      footer={
        <AppButton
          isDisabled={!selected || locating}
          loading={saving}
          onPress={() => {
            void apply();
          }}
        >
          Use this city
        </AppButton>
      }
    >
      <View style={{ gap: 16 }}>
        <AppButton
          variant="bordered"
          icon={LocateFixed}
          loading={locating}
          isDisabled={saving}
          accessibilityLabel="Use my location"
          onPress={() => {
            void detect();
          }}
        >
          {locating ? "Finding your city…" : "Use my location"}
        </AppButton>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{ flex: 1, height: 1, backgroundColor: c.borderSubtle }}
          />
          <AppText variant="bodySm" tone="muted">
            or choose manually
          </AppText>
          <View
            style={{ flex: 1, height: 1, backgroundColor: c.borderSubtle }}
          />
        </View>
        <TextField
          required
          label="Search city"
          accessibilityLabel="Search city"
          placeholder="City name"
          leftIcon={Search}
          value={draft}
          maxLength={100}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          editable={!saving}
          onChangeText={(text) => {
            version.current++;
            setLocating(false);
            setDraft(text);
            setSelected(null);
            setError("");
          }}
          onSubmitEditing={Keyboard.dismiss}
        />
        {!!error && (
          <AppText tone="danger" accessibilityRole="alert">
            {error}
          </AppText>
        )}
        {selected ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: c.surfaceLow,
                borderRadius: 16,
                padding: 16
              }}
            >
              <AppIconTile icon={MapPin} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText style={{ fontWeight: "700" }}>{selected.name}</AppText>
                <AppText variant="bodySm" tone="muted">
                  {cityContext(selected)}
                </AppText>
              </View>
              <Check size={22} color={c.accent} />
            </View>
          </View>
        ) : searching ? (
          search.waiting || search.isFetching ? (
            <View style={{ padding: 16, gap: 8, alignItems: "center" }}>
              <ActivityIndicator color={c.accent} />
              <AppText variant="bodySm" accessibilityLiveRegion="polite">
                Finding cities…
              </AppText>
            </View>
          ) : search.isError || search.isPaused || search.offline ? (
            <View style={{ gap: 8 }}>
              <AppText tone="danger" accessibilityRole="alert">
                {search.isPaused || search.offline
                  ? "You’re offline. Connect to search for cities."
                  : "Couldn’t load cities. Check your connection and try again."}
              </AppText>
              <AppButton
                variant="ghost"
                color="accent"
                onPress={() => {
                  void search.refetch();
                }}
              >
                Try again
              </AppButton>
            </View>
          ) : search.data?.length ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: c.borderSubtle,
                borderRadius: 16,
                overflow: "hidden"
              }}
            >
              {search.data.map((city, index) => (
                <Pressable
                  cssInterop={false}
                  key={city.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${city.name}, ${cityContext(city)}`}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelected(city);
                    setError("");
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    minHeight: 64,
                    borderTopWidth: index ? 1 : 0,
                    borderColor: c.borderSubtle,
                    backgroundColor: pressed ? c.surfaceLow : c.surface
                  })}
                >
                  <MapPin size={20} color={c.accent} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={{ fontWeight: "600" }}>{city.name}</AppText>
                    <AppText variant="bodySm" tone="muted">
                      {cityContext(city)}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <AppText accessibilityLiveRegion="polite">
              No cities found. Try another spelling or a nearby city.
            </AppText>
          )
        ) : null}
        <AppButton
          variant="ghost"
          color="accent"
          size="sm"
          fullWidth={false}
          onPress={() => {
            void Linking.openURL("https://www.geonames.org/");
          }}
        >
          City data: GeoNames · CC BY 4.0
        </AppButton>
      </View>
    </AppBottomSheet>
  );
}
