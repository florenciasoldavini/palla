import * as SecureStore from 'expo-secure-store';

const chunkSize = 1800;

function manifestKey(key: string) {
  return `${key}.__chunks`;
}

function chunkKey(key: string, index: number) {
  return `${key}.__chunk.${index}`;
}

export const supabaseStorage = {
  async getItem(key: string) {
    const storedChunkCount = await SecureStore.getItemAsync(manifestKey(key));

    if (!storedChunkCount) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number(storedChunkCount);
    if (!Number.isInteger(chunkCount) || chunkCount < 1) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );

    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  async removeItem(key: string) {
    const storedChunkCount = await SecureStore.getItemAsync(manifestKey(key));
    const chunkCount = Number(storedChunkCount ?? 0);

    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(manifestKey(key)),
      ...Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    ]);
  },

  async setItem(key: string, value: string) {
    const previousChunkCount = Number((await SecureStore.getItemAsync(manifestKey(key))) ?? 0);
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) ?? [''];

    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
    );
    await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
    await SecureStore.deleteItemAsync(key);

    await Promise.all(
      Array.from({ length: Math.max(0, previousChunkCount - chunks.length) }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index)),
      ),
    );
  },
};
