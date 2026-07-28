import type { User } from '../../types'
import { DEMO_MODERATOR_USER, DEMO_VIEWER_USER } from './demo-identity'

const DEMO_MOCK_USER: User = { name: DEMO_VIEWER_USER.displayName, email: 'aishath.ali@gmail.com' }
export const DEMO_MODERATOR_ID = DEMO_MODERATOR_USER.id

export interface DemoSession {
  viewerId: string
  mockUser: User
  moderatorId?: string
}

export function createDemoSession(): DemoSession {
  return {
    viewerId: DEMO_VIEWER_USER.id,
    mockUser: DEMO_MOCK_USER,
    moderatorId: DEMO_MODERATOR_ID,
  }
}
