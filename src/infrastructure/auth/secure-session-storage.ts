interface Store {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
interface Manifest {
  generation: string;
  chunks: number;
  deleted?: boolean;
}
const installationKey = "palla-auth-installation-v1";
const parseManifest = (raw: string): Manifest => {
  const value = JSON.parse(raw) as Manifest;
  if (
    !value ||
    typeof value.generation !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(value.generation) ||
    !Number.isInteger(value.chunks) ||
    value.chunks < 0 ||
    value.chunks > 256 ||
    (value.deleted !== undefined && typeof value.deleted !== "boolean")
  )
    throw Error("Invalid secure session metadata");
  return value;
};

/** All token bytes live in SecureStore, with atomic manifests for large sessions. */
export function createSecureSessionStorage(
  secure: Store,
  legacy: Store,
  randomId: () => string
): Store {
  let writes: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => {
    const next = writes.then(work);
    writes = next.catch(() => undefined);
    return next;
  };
  const rootFor = async (key: string) => {
    if (!/^[a-zA-Z0-9._-]+$/.test(key))
      throw Error("Invalid session storage key");
    // Keychain may survive an iOS reinstall. A non-secret installation marker
    // prevents credentials from the previous installation being restored.
    let installation = await legacy.getItem(installationKey);
    if (!installation) {
      installation = randomId();
      await legacy.setItem(installationKey, installation);
    }
    return `palla.auth.${installation}.${key}`;
  };
  const cleanup = async (root: string, manifest: Manifest | null) => {
    if (manifest)
      await Promise.allSettled(
        Array.from({ length: manifest.chunks }, (_, i) =>
          secure.removeItem(`${root}.${manifest.generation}.${i}`)
        )
      );
  };
  const save = async (root: string, key: string, value: string) => {
    const raw = await secure.getItem(root);
    const previous = raw ? parseManifest(raw) : null;
    const generation = randomId();
    // 400 Unicode code points occupy at most 1,600 UTF-8 bytes, below SDK 54's 2 KB limit.
    const points = Array.from(value);
    const chunks = Math.ceil(points.length / 400);
    if (chunks > 256) throw Error("Session exceeds secure storage capacity");
    let written = 0;
    try {
      for (let i = 0; i < chunks; i++) {
        await secure.setItem(
          `${root}.${generation}.${i}`,
          points.slice(i * 400, (i + 1) * 400).join("")
        );
        written++;
      }
      await secure.setItem(root, JSON.stringify({ generation, chunks }));
    } catch (error) {
      await cleanup(root, { generation, chunks: written });
      throw error;
    }
    await legacy.removeItem(key);
    await cleanup(root, previous);
  };
  return {
    getItem: (key) =>
      serial(async () => {
        const root = await rootFor(key);
        const raw = await secure.getItem(root);
        if (raw !== null) {
          const manifest = parseManifest(raw);
          await legacy.removeItem(key);
          if (manifest.deleted) return null;
          const parts: string[] = [];
          for (let i = 0; i < manifest.chunks; i++) {
            const part = await secure.getItem(
              `${root}.${manifest.generation}.${i}`
            );
            if (part === null) throw Error("Secure session is incomplete");
            parts.push(part);
          }
          return parts.join("");
        }
        const value = await legacy.getItem(key);
        if (value !== null) await save(root, key, value);
        return value;
      }),
    setItem: (key, value) =>
      serial(async () => save(await rootFor(key), key, value)),
    removeItem: (key) =>
      serial(async () => {
        const root = await rootFor(key);
        const raw = await secure.getItem(root);
        const previous = raw ? parseManifest(raw) : null;
        // A tombstone prevents a failed legacy deletion from resurrecting a login.
        await secure.setItem(
          root,
          JSON.stringify({ generation: randomId(), chunks: 0, deleted: true })
        );
        await legacy.removeItem(key);
        await cleanup(root, previous);
      })
  };
}
