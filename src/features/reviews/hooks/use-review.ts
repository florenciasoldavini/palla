import { useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  loadReviewContext,
  submitReview,
  removeReview,
  reportReview
} from "../services/reviews.service";
import type { ReviewInput, ReportInput } from "../domain";
export function useReview(registration: string | null) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const key = ["review-context", user?.id, registration] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: () => loadReviewContext(registration!),
    enabled: !!user && !!registration,
    staleTime: 0
  });
  const invalidate = () => {
    void client.invalidateQueries({
      queryKey: ["notification-inbox", user?.id]
    });
    void client.invalidateQueries({
      queryKey: ["notification-count", user?.id]
    });
  };
  const save = useMutation({
    networkMode: "always",
    mutationFn: (input: ReviewInput) =>
      submitReview(
        registration!,
        input,
        query.data?.review?.updated_at ?? null
      ),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      invalidate();
    }
  });
  const remove = useMutation({
    networkMode: "always",
    mutationFn: (id: string) => removeReview(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
      invalidate();
    }
  });
  const report = useMutation({
    networkMode: "always",
    mutationFn: ({ id, input }: { id: string; input: ReportInput }) =>
      reportReview(id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
    }
  });
  return { query, save, remove, report };
}
