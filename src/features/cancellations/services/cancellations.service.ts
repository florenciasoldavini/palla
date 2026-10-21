import {
  cancellationContextSchema,
  cancelOccurrenceSchema,
  type CancelOccurrence
} from "../domain";
import {
  fetchCancellation,
  cancelOccurrenceRecord
} from "../repositories/cancellations.repository";
export async function loadCancellation(id: string, single = false) {
  return cancellationContextSchema.parse(await fetchCancellation(id, single));
}
export async function cancelOccurrence(input: CancelOccurrence) {
  return cancellationContextSchema.parse(
    await cancelOccurrenceRecord(cancelOccurrenceSchema.parse(input))
  );
}
