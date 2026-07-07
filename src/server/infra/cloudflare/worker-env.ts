import type { PetBuddiesCloudflareBindings } from './bindings'

// Kept in a variable so neither vite nor vitest resolves the workerd-only
// module statically. `new Function` is NOT an option here: the Workers
// runtime forbids code generation from strings, so it would throw in
// production and silently disable the R2 bindings.
const WORKERD_MODULE = 'cloudflare:workers'

/**
 * Reads the Worker bindings via `cloudflare:workers`. Outside the Worker
 * (vitest, plain dev without workerd) this returns null and callers fall
 * back to demo in-memory behaviour.
 */
export async function getWorkerEnv(): Promise<Partial<PetBuddiesCloudflareBindings> | null> {
  try {
    const workers = (await import(/* @vite-ignore */ WORKERD_MODULE)) as {
      env?: Partial<PetBuddiesCloudflareBindings>
    }
    return workers.env ?? null
  } catch {
    return null
  }
}
