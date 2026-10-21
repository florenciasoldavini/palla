import { AppButton, AppHeading, AppText, Screen } from "@/components/atoms";
import { SessionForm } from "@/features/sessions/components/session-form";
import {
  initialSessionForm,
  type SessionFormValues
} from "@/features/sessions/validation/session-form";
import { Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
// Native QA fixture exercises the real form and confirmations without account writes.
export default function SessionsPreview() {
  const [formStep, setFormStep] = useState(0);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [result, setResult] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const example: SessionFormValues = {
    ...initialSessionForm(),
    title: "Tuesday social padel",
    venueName: "Palermo Padel",
    venueAddress: "Av. Córdoba 1234, Buenos Aires",
    categoryMode: "range",
    price: "12000"
  };
  if (!__DEV__) return <Redirect href="/sign-in" />;
  return (
    <Screen
      keyboardSafe
      scrollable={false}
      contentStyle={{ flex: 1, paddingHorizontal: 0 }}
      contentContainerStyle={{ flex: 1, paddingTop: 0, paddingBottom: 0 }}
      scrollResetKey={`${mode}-${generation}-${formStep}-${result}`}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <AppText tone="muted">Development only · no account changes</AppText>
        <AppButton
          fullWidth={false}
          size="sm"
          variant="ghost"
          onPress={() => {
            setMode(mode === "create" ? "edit" : "create");
            setFormStep(0);
            setResult(null);
          }}
        >
          {mode === "create" ? "Test editing" : "Test creation"}
        </AppButton>
        {result ? (
          <>
            <AppHeading variant="section">{result}</AppHeading>
            <AppButton
              onPress={() => {
                setResult(null);
                setGeneration(generation + 1);
                setFormStep(0);
              }}
            >
              Start again
            </AppButton>
          </>
        ) : (
          <>
            <SessionForm
              key={`${mode}-${generation}`}
              initialValues={example}
              editing={mode === "edit"}
              onStepChange={setFormStep}
              venues={[]}
              onSave={async (input, publish) =>
                setResult(
                  publish
                    ? `Saved ${input.title}`
                    : `Draft saved: ${input.title}`
                )
              }
            />
          </>
        )}
      </View>
    </Screen>
  );
}
