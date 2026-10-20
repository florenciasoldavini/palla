import { useRouter } from "expo-router";
import { PublicReviewsList } from "@/features/sessions/public/components/public-reviews-list";
import { publicReviewsPreview } from "@/features/sessions/public/reviews-preview-fixture";
import { useState } from "react";

export default function PublicReviewsPreview() {
  const router = useRouter();
  const [count, setCount] = useState(3);
  return (
    <PublicReviewsList
      preview
      title="Friday Social Padel"
      summary={publicReviewsPreview}
      items={publicReviewsPreview.items.slice(0, count)}
      loading={false}
      error={false}
      refreshing={false}
      loadingMore={false}
      hasMore={count < 18}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/sessions-preview/public-session")
      }
      onRefresh={() => setCount(3)}
      onMore={() => setCount(Math.min(18, count + 5))}
    />
  );
}
