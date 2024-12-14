import { SessionData, FakeProfile } from '../srcCommon/types'

export interface API {
  ['/diel-internal/auth/check-auth-header']: (body: {
    authHeader: string
  }) => {
    authenticatedUser: {
      userId: string
      isMasterUser: boolean
    }
    fakeProfile?: any
    extraSessionData?: any
  }

  ['/diel-internal/auth/check-user-password']: (body: {
    userId: string
    password: string
  }) => {
    session: SessionData
  }

  ['/diel-internal/auth/generate-jwt-token']: (body: {
    user: string
    fakeProfile?: any
  }) => {
    token: string
  }

  ['/diel-internal/auth/get-user-session']: (body: {
    authHeader: string
  }) => {
    session: SessionData
    extraSessionData: any
    realUserSession?: SessionData
  }

  ['/diel-internal/auth/impersonate']: (body: {
    authHeader: string
    fakeProfile: FakeProfile
  }) => {
    fakeProfileSession: SessionData
  }

  ['/diel-internal/auth/craft-token']: (body: {
    authHeader: string
    userId: string
  }) => {
    userSession: SessionData
  }
}
