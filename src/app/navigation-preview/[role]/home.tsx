import { NavigationPlaceholder } from "@/components/navigation/navigation-placeholder";
import { RoleModeContext } from "@/components/navigation/chrome-context";
import DiscoveryPreview from "@/features/discovery/discovery-preview";
import { useContext } from "react";
export default function PreviewScreen() {
  const mode = useContext(RoleModeContext);
  if (mode === "player") return <DiscoveryPreview />;
  return (
    <NavigationPlaceholder
      title={mode === "organizer" ? "Overview" : "Discover"}
      description="Navigation preview"
    />
  );
}
