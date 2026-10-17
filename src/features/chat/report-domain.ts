import { z } from "zod";
import { entityIdSchema } from "@/types/domain-schema";
export const reportReasons = [
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam or scam" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" }
] as const;
export const chatReportFieldsSchema = z.object({
  reason: z.enum(
    ["harassment", "spam", "inappropriate_content", "impersonation", "other"],
    { error: "Choose a reason for this report." }
  ),
  details: z
    .string()
    .trim()
    .max(2000, "Please keep your description under 2,000 characters."),
  block: z.boolean()
});
export const chatReportInputSchema = chatReportFieldsSchema.extend({
  id: entityIdSchema,
  conversation_id: entityIdSchema
});
export const chatReportResultSchema = z.object({
  id: entityIdSchema,
  blocked: z.boolean()
});
export type ChatReportFields = z.infer<typeof chatReportFieldsSchema>;
export type ChatReportInput = z.infer<typeof chatReportInputSchema>;
export type ChatReportResult = z.infer<typeof chatReportResultSchema>;
export function reportErrorMessage(error: unknown) {
  return error instanceof Error && error.message === "rate_limit"
    ? "You’ve reached today’s report limit. Please try again later."
    : error instanceof Error && error.message === "sign_in"
      ? "Please sign in again to submit your report."
      : "Couldn’t submit your report. Check your connection and try again.";
}
