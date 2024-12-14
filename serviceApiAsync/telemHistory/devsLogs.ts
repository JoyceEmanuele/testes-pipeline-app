import * as dynamoDbHelper from '../../srcCommon/db/connectDynamoDb'
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import * as httpRouter from '../apiServer/httpRouter'

httpRouter.privateRoutes['/log/query-dev-log'] = async function (reqParams, session) {
  // # Verifica permissão
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllDevsLogs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (!reqParams.devId) throw Error('Invalid parameters! Missing devId').HttpStatus(400)
  if (!reqParams.dynamoTable) throw Error('Invalid parameters! Missing dynamoTable').HttpStatus(400)
  if (!reqParams.periodIni) throw Error('Invalid parameters! Missing periodIni').HttpStatus(400)
  if (!reqParams.periodFin) throw Error('Invalid parameters! Missing periodFin').HttpStatus(400)
  if (!(reqParams.periodFin > reqParams.periodIni)) throw Error('Invalid parameters! periodFin tem que ser maior que periodIni').HttpStatus(400)
  if (!['log_dev_cmd', 'log_dev_ctrl'].includes(reqParams.dynamoTable)) {
    throw Error('Invalid parameters! Invalid dynamoTable').HttpStatus(400)
  }

  const dynamoFetcher = dynamoDbHelper.prepareQuery({
    tableName: reqParams.dynamoTable,
    selectedPropsList: null, // ['devId', 'ts', 'topic', 'payload'],
    partKeyName: 'devId',
    sortKeyName: 'ts',
    partKeyValue: reqParams.devId,
    ...dynamoDbHelper.sortCompar_betweenInc({
      date_begin: reqParams.periodIni,
      date_end: reqParams.periodFin,
    })
  });
  const resultsPage = await dynamoFetcher.getPage();

  for (const item of resultsPage.Items) {
    if (item.topic === 'sync' || item.topic.startsWith('commands/sync/')) {
      // don't parse payload
    } else if (typeof(item.payload) === 'string') {
      item.payload = JSON.parse(item.payload);
    }
  }

  return {
    data: {
      list: resultsPage.Items as any,
      continuesAfter: resultsPage.LastEvaluatedKey && resultsPage.LastEvaluatedKey.ts,
      pars: reqParams,
    }
  }
}

httpRouter.privateRoutes['/log/query-ddb-table'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!session.permissions.isAdminSistema) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  if (!reqParams.dynamoTable) throw Error('Invalid parameters! Missing dynamoTable').HttpStatus(400)
  if (!reqParams.partName) throw Error('Invalid parameters! Missing partName').HttpStatus(400)
  if (!reqParams.partValue) throw Error('Invalid parameters! Missing partValue').HttpStatus(400)
  if (!reqParams.sortName) throw Error('Invalid parameters! Missing sortName').HttpStatus(400)
  if (!reqParams.periodIni) throw Error('Invalid parameters! Missing periodIni').HttpStatus(400)
  if (!reqParams.periodFin) throw Error('Invalid parameters! Missing periodFin').HttpStatus(400)
  if (!(reqParams.periodFin > reqParams.periodIni)) throw Error('Invalid parameters! periodFin tem que ser maior que periodIni').HttpStatus(400)

  const dynamoFetcher = dynamoDbHelper.prepareQuery({
    tableName: reqParams.dynamoTable,
    selectedPropsList: null, // ['devId', 'ts', 'topic', 'payload'],
    partKeyName: reqParams.partName,
    sortKeyName: reqParams.sortName,
    partKeyValue: reqParams.partValue,
    ...dynamoDbHelper.sortCompar_betweenInc({
      date_begin: reqParams.periodIni,
      date_end: reqParams.periodFin,
    })
  });
  const resultsPage = await dynamoFetcher.getPage();

  for (const item of resultsPage.Items) {
    if (item.topic === 'sync' || item.topic.startsWith('commands/sync/')) {
      // don't parse payload
    } else if (typeof(item.payload) === 'string') {
      item.payload = JSON.parse(item.payload);
    }
  }

  return {
    list: resultsPage.Items as any,
    continuesAfter: resultsPage.LastEvaluatedKey && resultsPage.LastEvaluatedKey.ts,
    pars: reqParams,
  }
}
