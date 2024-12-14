import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'

httpRouter.privateRoutes['/clients/get-distributors'] = async function (_reqParams, session) {
  // No special permissions needed

  const distributors = await sqldb.DISTRIBUTORS.getAllDistributors();
  const result = distributors.map((ds) => {
    return {
      id: ds.DISTRIBUTOR_ID,
      label: ds.DISTRIBUTOR_LABEL,
      tag: ds.DISTRIBUTOR_TAG
    }
  })

  return { distributors: result };
}
