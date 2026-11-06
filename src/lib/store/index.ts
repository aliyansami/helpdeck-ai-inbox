import { buildSeed } from "../seed";
import { MemoryStore } from "./memory";
import type { Store } from "./types";

export type { Store } from "./types";

const g = globalThis as unknown as { __helpdeckStore?: Promise<Store> };

/**
 * One store per server process. Demo mode (no DATABASE_URL) gets a seeded in-memory store;
 * kept on globalThis so dev hot reloads don't reset it.
 */
export function getStore(): Promise<Store> {
  g.__helpdeckStore ??= (async () => {
    if (process.env.DATABASE_URL) {
      const { PostgresStore, createDb } = await import("./postgres");
      return new PostgresStore(createDb(process.env.DATABASE_URL));
    }
    const store = new MemoryStore(buildSeed(new Date()));
    const { bootstrap } = await import("../service");
    await bootstrap(store);
    return store;
  })();
  return g.__helpdeckStore;
}
