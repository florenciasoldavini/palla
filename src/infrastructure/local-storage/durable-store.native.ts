import { openDatabaseAsync } from "expo-sqlite";
import type { DurableStore } from "./durable-store";
let opening: ReturnType<typeof openDatabaseAsync> | undefined;
function database() {
  opening ??= openDatabaseAsync("palla-local.db")
    .then(async (db) => {
      await db.execAsync(
        "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS local_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);"
      );
      return db;
    })
    .catch((error) => {
      opening = undefined;
      throw error;
    });
  return opening;
}
export const durableStore: DurableStore = {
  async get(key) {
    return (
      (
        await (
          await database()
        ).getFirstAsync<{ value: string }>(
          "SELECT value FROM local_data WHERE key = ?",
          key
        )
      )?.value ?? null
    );
  },
  async set(key, value) {
    await (
      await database()
    ).runAsync(
      "INSERT INTO local_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value
    );
  },
  async remove(key) {
    await (
      await database()
    ).runAsync("DELETE FROM local_data WHERE key = ?", key);
  }
};
