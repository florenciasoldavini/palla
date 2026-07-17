const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const supabaseStorage = {
  getItem(key: string) {
    return canUseStorage ? window.localStorage.getItem(key) : null;
  },
  removeItem(key: string) {
    if (canUseStorage) window.localStorage.removeItem(key);
  },
  setItem(key: string, value: string) {
    if (canUseStorage) window.localStorage.setItem(key, value);
  },
};
