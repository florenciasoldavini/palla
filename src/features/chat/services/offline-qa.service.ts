// Development-only transport ledger: exercises real SQLite/outbox recovery without contacting Supabase.
import { durableStore } from "@/infrastructure/local-storage/durable-store";
import type { OutboxEntry } from "../repositories/chat-local.repository";
import { chatLocalStore } from "./chat-offline.service";
import { OutboxRunner } from "./outbox-runner";
export const offlineQaAccounts = [
  "92000000-0000-4000-8000-000000000001",
  "92000000-0000-4000-8000-000000000002"
];
export const offlineQaConversation = "92000000-0000-4000-8000-000000000003";
const ledgerKey = (actor: string) => `qa-offline-ledger:${actor}`;
export async function loadOfflineQaLedger(
  actor: string
): Promise<OutboxEntry[]> {
  const raw = await durableStore.get(ledgerKey(actor));
  return raw ? JSON.parse(raw) : [];
}
export function createOfflineQaRunner(onSaved: () => void) {
  return new OutboxRunner(chatLocalStore, async (actor, row) => {
    const rows = await loadOfflineQaLedger(actor);
    if (!rows.some((r) => r.id === row.id))
      await durableStore.set(ledgerKey(actor), JSON.stringify([...rows, row]));
    onSaved();
  });
}
