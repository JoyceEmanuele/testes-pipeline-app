import sqldb from '../srcCommon/db'
import jsonTryParse from '../srcCommon/helpers/jsonTryParse'

interface DataToFront {
  topage: string
}

export async function checkTokenRedirectToDash (rdtoken: string) {
  if (!rdtoken) throw Error('Invalid parameters, rdtoken is required').Details(500, { errorCode: '9' });

  const now = Date.now();
  const minDate = new Date(now - (3 * 60 * 60 * 1000) - (10 * 60 * 1000)).toISOString().substring(0, 19) + '-0300';
  const maxDate = new Date(now - (3 * 60 * 60 * 1000)).toISOString().substring(0, 19) + '-0300';
  await sqldb.USERSTOKENS.w_deleteOldTokens({ TKTYPE: 'RDTODASH', minDate, maxDate }, '[SYSTEM]');

  const tokenInfo = await sqldb.USERSTOKENS.getTokenData({
    TOKEN: rdtoken,
    TKTYPE: 'RDTODASH',
    minDate,
    maxDate,
  });
  await sqldb.USERSTOKENS.w_deleteUsedToken({ TOKEN: rdtoken }, '[SYSTEM]');
  if (!tokenInfo) {
    throw Error('Invalid token').Details(400, { errorCode: '25' });
  }
  const dataToFront = jsonTryParse<DataToFront>(tokenInfo.EXTRADATA);

  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: tokenInfo.EMAIL });
  if (!userInfo) throw Error('Could not find informed user').Details(401, { errorCode: '30' , debugInfo: tokenInfo });

  const authenticatedUser = {
    userId: userInfo.EMAIL,
    isMasterUser: false,
  };
  return { authenticatedUser, extraSessionData: { dataToFront } };
}

export async function checkStaticUserToken (sutoken: string) {
  if (!sutoken) throw Error('Invalid parameters, sutoken is required').Details(500, { errorCode: '40' });

  const tokenInfo = await sqldb.USERSTOKENS.getTokenData({
    TOKEN: sutoken,
    TKTYPE: 'SUTK',
  });
  if (!tokenInfo) {
    throw Error('Invalid token').Details(400, { errorCode: '48' });
  }

  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: tokenInfo.EMAIL });
  if (!userInfo) throw Error('Could not find informed user').Details(401, { errorCode: '52', debugInfo: tokenInfo });

  const authenticatedUser = {
    userId: userInfo.EMAIL,
    isMasterUser: false,
  };
  return { authenticatedUser };
}
