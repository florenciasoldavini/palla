export const reviewDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });

export {
  sessionDate as reviewSessionDate,
  sessionTime as reviewSessionTime
} from "@/utils/session-format";
