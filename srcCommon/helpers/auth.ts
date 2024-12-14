import * as dielServices from '../dielServices'
import { SessionData } from '../types'

export const verifyClient_classicLogin = async (queryData: { token?: string, user?: string, password?: string }) => {
  let session: SessionData;
  if ((queryData.token) && (!queryData.user) && (!queryData.password)) {
    const authInfo = await dielServices.authInternalApi('/diel-internal/auth/get-user-session', { authHeader: `JWT ${queryData.token}` });
    session = authInfo.session;
  } else {
    const authInfo = await dielServices.authInternalApi('/diel-internal/auth/check-user-password', { userId: queryData.user, password: queryData.password });
    session = authInfo.session;
  }
  if (!session) throw Error('Could not check credentials!').HttpStatus(500).DebugInfo({queryData})
  return session;
}
