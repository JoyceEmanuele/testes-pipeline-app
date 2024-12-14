import * as fs from 'fs';
import { typedWarn } from '../../srcCommon/helpers/eventWarn';
import { logger } from '../../srcCommon/helpers/logger';
import configfile from '../../configfile';
import { createTable, listTables } from '../../srcCommon/db/connectDynamoDb';
import { API_Internal } from '../api-internal';
import detailedError from '../../srcCommon/helpers/detailedError';
import { ipIsLAN } from '../../srcCommon/helpers/network/ipTools';
import { checkDevIdWithDevType } from '../../srcCommon/helpers/devInfo';

export interface Report_BrokerDielV1 {
  origin: "broker-diel-v1"
  interval: number
  est_conn: number
  brokers_stats: {
    conn_arr: number
    conn_closed: number
    tls_err: number
    subscr: number
  }[]
}

export interface Report_Broker2DynamoV1 {
  origin: "broker2dynamo-v1"
  loadavg: {
    one: number
    five: number
    fifteen: number
  }
  mem_info: {
    avail: number
    buffers: number
    cached: number
    free: number
    swap_free: number
    swap_total: number
    total: number
  }
  disk_info: {
    free: number
    total: number
  }
  interval: number
  stats?: {
    unknown_table: { [devId: string]: string }
    unknown_topic: number
    dev_id_missing: number
    dynamodb_error: number
  }
}

const lastServersStats = {
  brokersGateway: {} as {
    [clientIP: string]: {
      payload_ts: Date
      apiPort: number,
      hostname: string
    }
  },
  broker2dynamo: {} as {
    [clientIP: string]: {
      payload_ts: Date
      apiPort: number,
      hostname: string
    }
  },
  iotrelay: {} as {
    [clientIP: string]: {
      payload_ts: Date
      apiPort: number,
      hostname: string
    }
  },
}

const broker2dynamoVars = {
  nextCreateCommandAllowed: null as null|number,
};
async function processBroker2DynamoV1(lastReport: Report_Broker2DynamoV1) {
  // Função para conferir as informações enviadas pelo(s) servidore(s) broker2dynamo.
  // O relatório contém as informações necessárias para identificar se é necessário
  // criar novas tabelas no DynamoDB para armazenar as telemetrias de algum dispositivo.
  if (Date.now() < broker2dynamoVars.nextCreateCommandAllowed) return;
  if (!configfile.isProductionServer) return;
  if (lastReport.stats && lastReport.stats.unknown_table) { /* OK */ }
  else return;
  let existingTables: string[] = null;
  // O broker2dynamo usa o 'unknown_table' para informar que recebeu uma telemetria
  // do {devId} no tópico {topic} e não soube em qual tabela deveria salvar ela.
  for (const [devId, topic] of Object.entries(lastReport.stats.unknown_table)) {
    if (!topic.startsWith('data/')) continue;
    const devType = topic.split('/')[1].toUpperCase();
    const isValid = checkDevIdWithDevType(devId, devType);
    if (!isValid) continue;

    if (!existingTables) existingTables = (await listTables()) || [];

    const prefix = devId.substring(0, 8);
    const proposedTableName = `${prefix}XXXX_RAW`;
    if (existingTables.includes(proposedTableName)) continue;
    
    // Este 'for' vai enviar todos os comandos de create necessários,
    // depois o 'nextCreateCommandAllowed' faz aguardar 30 minutos para conferir novamente.
    broker2dynamoVars.nextCreateCommandAllowed = Date.now() + 30 * 60 * 1000;

    const tableEntry = {
      topic: `data/${devType.toLocaleLowerCase()}/#`,
      prop: 'dev_id',
      prefix,
      table: proposedTableName,
    };
    fs.appendFileSync('autoCreatedDynamoDbTables.txt', `\n${JSON.stringify(tableEntry)}`)

    await createTable(proposedTableName)
      .catch((err) => {
        typedWarn('DYNAMODB_TABLE_CREATION', `ERRO ao tentar criar ${proposedTableName} no DynamodDB:\n${err}`);
        throw err;
      });
    typedWarn('DYNAMODB_TABLE_CREATION', `Tabela do DynamoDB criada com sucesso: ${proposedTableName}`);

    // Tem que passar para o broker2dynamo a tabela criada para ele poder começar a salvar os dados nela
  }
}

export const setServerStatus_brokersGateway: API_Internal['/diel-internal/realtime/setServerStatus_brokersGateway'] = async function (reqParams, session) {
  // Endpoint para receber as estatísticas dos servidores e manter uma lista de servidores ativos
  if (!session.clientIP) {
    throw detailedError("Requisição inválida, sem IP de origem", 500);
  }
  if (reqParams.report?.origin !== 'broker-diel-v1') {
    throw detailedError("Estatísticas faltando ou inválida", 400);
  }

  lastServersStats.brokersGateway[session.clientIP] = {
    payload_ts: new Date(),
    apiPort: reqParams.apiPort,
    hostname: reqParams.hostname,
  };

  return {};
}

export const setServerStatus_iotRelay: API_Internal['/diel-internal/realtime/setServerStatus_iotRelay'] = async function (reqParams, session) {
  // Endpoint para receber as estatísticas dos servidores e manter uma lista de servidores ativos
  if (!session.clientIP) {
    throw detailedError("Requisição inválida, sem IP de origem", 500);
  }
  if (reqParams.report?.origin !== 'iotrelay-v1') {
    throw detailedError("Estatísticas faltando ou inválida", 400);
  }

  lastServersStats.iotrelay[session.clientIP] = {
    payload_ts: new Date(),
    apiPort: reqParams.apiPort,
    hostname: reqParams.hostname,
  };

  return {};
}

export const setServerStatus_broker2dynamo: API_Internal['/diel-internal/realtime/setServerStatus_broker2dynamo'] = async function (reqParams, session) {
  // Endpoint para receber as estatísticas dos servidores e manter uma lista de servidores ativos
  if (!session.clientIP) {
    throw detailedError("Requisição inválida, sem IP de origem", 500);
  }
  if (reqParams.report?.origin !== 'broker2dynamo-v1') {
    throw detailedError("Estatísticas faltando ou inválida", 400);
  }

  lastServersStats.broker2dynamo[session.clientIP] = {
    payload_ts: new Date(),
    apiPort: reqParams.apiPort,
    hostname: reqParams.hostname,
  };

  if (reqParams.report.stats?.unknown_table) {
    await processBroker2DynamoV1(reqParams.report)
      .catch((err) => {
        logger.error(err);
        typedWarn('MONIT_BROKERS', `Não foi possível verificar o broker2dynamo`);
      });
  }

  let autoCreatedDynamoDbTables: string;
  if (reqParams.respondWithDynamoTables) {
    autoCreatedDynamoDbTables = '';
    if (fs.existsSync('autoCreatedDynamoDbTables.txt')) {
      autoCreatedDynamoDbTables = fs.readFileSync('autoCreatedDynamoDbTables.txt', 'utf-8');
    }
  }

  return { autoCreatedDynamoDbTables };
}

export const getServersList: API_Internal['/diel-internal/realtime/getServersList'] = async function (reqParams, session) {
  // Responder a lista de clientes que estiveram ativos recentemente organizados por tipo de serviço.

  const broker2dynamo: {
    ip: string,
    apiPort: number,
    hostname: string,
  }[] = [];
  for (const [ip, { hostname, apiPort }] of Object.entries(lastServersStats.broker2dynamo)) {
    if (!ipIsLAN(ip)) continue;
    broker2dynamo.push({ ip, hostname, apiPort });
  }

  const brokersGateway: {
    ip: string,
    apiPort: number,
    hostname: string,
  }[] = [];
  for (const [ip, { hostname, apiPort }] of Object.entries(lastServersStats.brokersGateway)) {
    if (!ipIsLAN(ip)) continue;
    brokersGateway.push({ ip, hostname, apiPort });
  }

  const iotrelay: {
    ip: string,
    apiPort: number,
    hostname: string,
  }[] = [];
  for (const [ip, { hostname, apiPort }] of Object.entries(lastServersStats.iotrelay)) {
    if (!ipIsLAN(ip)) continue;
    iotrelay.push({ ip, hostname, apiPort });
  }

  return { broker2dynamo, brokersGateway, iotrelay };
}
