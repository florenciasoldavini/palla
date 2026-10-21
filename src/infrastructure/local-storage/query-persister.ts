import { durableStore } from "./durable-store";
import type {
  PersistedClient,
  Persister
} from "@tanstack/react-query-persist-client";
let writes: Promise<unknown> = Promise.resolve();
function serial(work: () => Promise<void>) {
  const next = writes.then(work);
  writes = next.catch(() => undefined);
  return next;
}
export const queryPersister: Persister = {
  persistClient: (client: PersistedClient) => {
    const json = JSON.stringify(client);
    return serial(() => durableStore.set("query-cache-v1", json));
  },
  restoreClient: async () => {
    const value = await durableStore.get("query-cache-v1");
    try {
      return value ? (JSON.parse(value) as PersistedClient) : undefined;
    } catch {
      await durableStore.remove("query-cache-v1");
      return undefined;
    }
  },
  removeClient: () => serial(() => durableStore.remove("query-cache-v1"))
};
