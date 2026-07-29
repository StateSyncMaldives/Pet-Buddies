/**
 * Node 25 exposes a built-in `globalThis.localStorage` (Web Storage) that is
 * inert unless the process was started with a valid `--localstorage-file`.
 * Because vitest's happy-dom environment aliases `window` to `globalThis`, that
 * inert object shadows happy-dom's own `Storage` and every
 * `window.localStorage.setItem(...)` call in the suite throws
 * "setItem is not a function".
 *
 * This setup file installs a spec-shaped in-memory Storage whenever the ambient
 * one is unusable, so the harness behaves the same on Node <25 and Node >=25.
 * It is test-only — nothing in `src/` depends on it.
 */

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return entries.size
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null
    },
    getItem(key: string) {
      return entries.has(String(key)) ? entries.get(String(key))! : null
    },
    setItem(key: string, value: string) {
      entries.set(String(key), String(value))
    },
    removeItem(key: string) {
      entries.delete(String(key))
    },
    clear() {
      entries.clear()
    },
  }

  return storage
}

function isUsable(candidate: unknown): boolean {
  return typeof (candidate as Storage | undefined)?.setItem === 'function'
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (isUsable((globalThis as unknown as Record<string, unknown>)[name])) continue
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: createMemoryStorage(),
  })
}
