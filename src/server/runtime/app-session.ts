import { createPrototypeBackend } from './prototype-backend'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createRuntimeMutationAdapter, type AppMutationAdapter } from '../mutations/mutation-adapter'
import { ANONYMOUS, isSignedIn, type Viewer } from '../auth/resolve-viewer'

/**
 * An in-memory app runtime bound to a viewer. Used by tests and local harnesses;
 * the production server runtime resolves the viewer per request from the session
 * cookie (see `resolveRequestViewer`) and reads/writes through D1. See ADR
 * 0008 / 0010.
 */
export interface AppRuntime {
  backend: AsyncAppBackend
  mutations: AppMutationAdapter
  viewer: Viewer
}

/**
 * Composes a fresh backend instance with the given viewer (anonymous by
 * default). One runtime should be created per app mount — never cached at
 * module scope.
 */
export function createAppRuntime(viewer: Viewer = ANONYMOUS): AppRuntime {
  const backend = createInMemoryAsyncBackend(createPrototypeBackend())
  const viewerId = isSignedIn(viewer) ? viewer.id : undefined
  const mutations = createRuntimeMutationAdapter({
    backend,
    viewerId,
    moderatorId: viewerId,
  })
  return { backend, mutations, viewer }
}
