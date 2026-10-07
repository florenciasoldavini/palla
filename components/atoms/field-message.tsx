import { AppText } from "@/components/atoms/text";
import type { ReactNode } from "react";

type MessageTone = "default" | "error" | "success";

export function FieldMessage({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: MessageTone;
}) {
  const textTone =
    tone === "error" ? "danger" : tone === "success" ? "success" : "subtle";

  return (
    <AppText tone={textTone} variant="caption">
      {children}
    </AppText>
  );
}
