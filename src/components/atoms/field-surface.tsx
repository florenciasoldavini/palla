import { createContext, useContext, type ReactNode } from "react";
import { designTokens } from "@/theme/tokens";
export type FieldContainerSurface = "white" | "tinted";
const FieldSurfaceContext = createContext<FieldContainerSurface>("tinted");
export function FieldSurface({
  surface,
  children
}: {
  surface: FieldContainerSurface;
  children: ReactNode;
}) {
  return (
    <FieldSurfaceContext.Provider value={surface}>
      {children}
    </FieldSurfaceContext.Provider>
  );
}
export function useFieldBackground() {
  const surface = useContext(FieldSurfaceContext);
  return surface === "white"
    ? designTokens.controls.fields.onWhite
    : designTokens.controls.fields.onTinted;
}
