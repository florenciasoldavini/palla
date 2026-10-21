import { useLocalSearchParams } from "expo-router";
import { CancellationPreview } from "@/features/cancellations/components/cancellation-preview";
export default function CancellationPreviewRoute() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  return <CancellationPreview key={run} />;
}
