import * as httpRouter from './apiServer/httpRouter'
import sqldb from '../srcCommon/db'

httpRouter.privateRoutes['/clients/get-baseline-templates'] = async function (_reqParams, _session) {
  // No special permission required

  const baselineTemplates = await sqldb.BASELINE_TEMPLATES.getAllBaselineTemplates();
  const result = baselineTemplates.map((template) => {
    return {
      value: template.BASELINE_TEMPLATE_ID,
      name: template.BASELINE_TEMPLATE_DESCRIPTION,
      tag: template.BASELINE_TEMPLATE_TAG
    }
  })
  
  return { baselineTemplates: result };
}
  