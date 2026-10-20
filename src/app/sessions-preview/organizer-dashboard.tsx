import { useLocalSearchParams } from "expo-router";
import { DashboardPreview } from "@/features/organizer/dashboard/components/dashboard-preview";
export default function DashboardPreviewRoute() {
  const { run, state } = useLocalSearchParams<{
    run?: string;
    state?: string;
  }>();
  return <DashboardPreview key={`${run}-${state}`} />;
}
