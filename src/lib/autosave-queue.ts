export function createAutosaveQueue<T>(save: (value: T) => Promise<unknown>) {
  const pending = new Map<string, T>();
  let running: Promise<void> | null = null;
  return {
    put(key: string, value: T) { pending.set(key, value); },
    hasPending() { return pending.size > 0 || running !== null; },
    flush(): Promise<void> {
      if (running) return running;
      running = (async () => {
        while (pending.size) {
          const entry = pending.entries().next().value;
          if (!entry) break;
          const [key, value] = entry;
          pending.delete(key);
          try { await save(value); }
          catch (error) {
            if (!pending.has(key)) pending.set(key, value);
            throw error;
          }
        }
      })().finally(() => { running = null; });
      return running;
    },
  };
}