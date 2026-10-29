const memory = new Map<string, string>();

export default {
  async getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memory.set(key, value);

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage unavailable (private mode) — keep the in-memory value.
    }
  },
};
