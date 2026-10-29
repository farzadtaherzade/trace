/**
 * Web fallback for the SQLite driver.
 *
 * expo-sqlite's web implementation needs a wasm worker that Metro does not emit
 * for this project, so the browser build uses a no-op driver instead. Reads
 * return empty results and writes are ignored, which lets every screen render
 * its empty state instead of crashing. Native platforms use real SQLite.
 */
export function openDatabase(_name: string) {
  return Promise.resolve({
    execAsync: async () => {},
    runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    getEachAsync: async function* () {},
    getAllAsync: async () => [] as Record<string, unknown>[],
    getFirstAsync: async () => null as Record<string, unknown> | null,
    withTransactionAsync: async (task: () => Promise<void>) => task(),
    withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) =>
      task(undefined),
    closeAsync: async () => {},
  });
}
