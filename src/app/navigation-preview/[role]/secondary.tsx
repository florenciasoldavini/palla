import { NavigationPlaceholder } from "@/components/navigation/navigation-placeholder";
import { RoleModeContext } from "@/components/navigation/chrome-context";
import { useContext } from "react";
export default function PreviewScreen() {
  const mode = useContext(RoleModeContext);
  return (
    <NavigationPlaceholder
      title={mode === "organizer" ? "Sessions" : "My games"}
      description="Navigation preview"
    />
  );
}
