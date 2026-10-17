import { AppText } from "@/components/atoms/text";
import type { ReactNode } from "react";

type MessageTone = "default" | "error" | "success";

export function FieldMessage({
  nativeID,
  children,
  tone = "default"
}: {
  nativeID?: string;
  children: ReactNode;
  tone?: MessageTone;
}) {
  const textTone =
    tone === "error" ? "danger" : tone === "success" ? "success" : "subtle";

  return (
    <AppText
      nativeID={nativeID}
      accessibilityLiveRegion={tone === "error" ? "polite" : "none"}
      tone={textTone}
      variant="caption"
    >
      {children}
    </AppText>
  );
}
