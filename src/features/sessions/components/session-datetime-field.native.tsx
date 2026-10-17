import type { ReactNode } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppButton } from "@/components/atoms";
import { FormField } from "@/components/molecules";
import { FieldTrigger } from "@/components/atoms/field-trigger";
import { Calendar, Clock } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { useState } from "react";
import { Keyboard, Modal, Platform, View } from "react-native";
export function SessionDateTimeField({
  label,
  mode,
  value,
  onChange,
  errorText,
  appearance,
  renderTrigger
}: {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
  appearance?: "default" | "soft";
  renderTrigger?: (onPress: () => void, expanded: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const parsedInstant = new Date(
    mode === "date" ? `${value}T12:00:00-03:00` : `2026-01-01T${value}:00-03:00`
  );
  const instant = Number.isNaN(parsedInstant.getTime())
    ? new Date()
    : parsedInstant;
  const formatValue = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    return mode === "date"
      ? `${get("year")}-${get("month")}-${get("day")}`
      : `${get("hour")}:${get("minute")}`;
  };
  return (
    <FormField required label={label} errorText={errorText}>
      {renderTrigger ? (
        renderTrigger(() => {
          Keyboard.dismiss();
          setOpen((v) => !v);
        }, open)
      ) : (
        <FieldTrigger
          appearance={appearance}
          label={label}
          expanded={open}
          invalid={Boolean(errorText)}
          icon={mode === "date" ? Calendar : Clock}
          onPress={() => {
            Keyboard.dismiss();
            setOpen((v) => !v);
          }}
          value={
            mode === "date"
              ? instant.toLocaleDateString("en-GB", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })
              : value
          }
        />
      )}
      {open &&
        (Platform.OS === "ios" ? (
          <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => setOpen(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.25)",
                justifyContent: "flex-end"
              }}
            >
              <SafeAreaView
                edges={["bottom"]}
                style={{
                  backgroundColor: atomPalette.surface,
                  padding: atomSpacing[4]
                }}
              >
                <DateTimePicker
                  accessibilityLabel={`Choose ${label.toLowerCase()}`}
                  value={instant}
                  mode={mode}
                  display="spinner"
                  themeVariant="light"
                  timeZoneName="America/Argentina/Buenos_Aires"
                  is24Hour
                  onChange={(event, date) => {
                    if (event.type === "set" && date)
                      onChange(formatValue(date));
                  }}
                />
                <AppButton onPress={() => setOpen(false)}>Done</AppButton>
              </SafeAreaView>
            </View>
          </Modal>
        ) : (
          open && (
            <DateTimePicker
              value={instant}
              mode={mode}
              display="default"
              themeVariant="light"
              timeZoneName="America/Argentina/Buenos_Aires"
              is24Hour
              onChange={(event, date) => {
                setOpen(false);
                if (event.type === "set" && date) onChange(formatValue(date));
              }}
            />
          )
        ))}
    </FormField>
  );
}
