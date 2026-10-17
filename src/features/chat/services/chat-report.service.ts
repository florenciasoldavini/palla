import {
  chatReportInputSchema,
  chatReportResultSchema,
  type ChatReportInput
} from "../report-domain";
import { writeChatReport } from "../repositories/chat-report.repository";
import { refreshOnlineTopics } from "../repositories/chat-presence.repository";
export async function submitChatReport(input: ChatReportInput) {
  const result = chatReportResultSchema.parse(
    await writeChatReport(chatReportInputSchema.parse(input))
  );
  if (result.blocked) refreshOnlineTopics();
  return result;
}
