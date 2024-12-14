import configfile from '../../configfile'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { logger } from '../../srcCommon/helpers/logger';
import { sendOtaCommand } from '../../srcCommon/iotMessages/devsCommands'
import sqldb from '../../srcCommon/db';
import { parseFirmwareVersion, compareVersions } from '../../srcCommon/helpers/fwVersion';
import { getVersionslist } from '../../srcCommon/helpers//fetchFirmwareS3';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import { API_Internal } from '../api-internal';

const enviosPendentes = new Set<string>();
const reenviosPendentes = new Set<string>();

export async function addDeviceToOtaQueue(reqParams: { devId: string }) {
  enviosPendentes.add(reqParams.devId);
  return {};
}

type LastMessagesTimes = Awaited<ReturnType<typeof devsLastComm.loadLastMessagesTimes>>;

export function startService() {
  recurrentTasks.runLoop({
    taskName: "OTA-QUEUE",
    initialDelay_ms: 5 * 1000,
    iterationPause_ms: 5 * 1000,
    hideIterationsLog: true,
    data: {
      esperaParaEnviarComandos: Date.now() + 5 * 60 * 1000,
      esperaParaVerificarStatus: Date.now() + 2.5 * 60 * 1000,
      esperaParaBuscarStatusOnline: Date.now(),
      jaProcessouStatus: false,
      lastMessagesTimes: null as LastMessagesTimes,
    },
  }, async (opts) => {
    // Função que envia os firmwares que estão na lista
    try {
      if (Date.now() > opts.data.esperaParaEnviarComandos) {
        if (enviosPendentes.size > 0 || reenviosPendentes.size > 0) {
          opts.logBackgroundTask("Enviando comandos na fila");
          if (opts.data.esperaParaBuscarStatusOnline <= Date.now()) {
            opts.data.lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({});
            opts.data.esperaParaBuscarStatusOnline = Date.now() + 5 * 60 * 1000; // 5 min for the next check
          }
          await sendNextNeededCommands(opts.data.lastMessagesTimes);
          await new Promise(r => setTimeout(r, 2 * 60 * 1000));
        }
      }
    } catch (err) { logger.error("ERR-OTA-36"); logger.error(err); }

    // Função que verifica no banco de dados se tem que voltar dispositivos para a lista
    try {
      if (Date.now() > opts.data.esperaParaVerificarStatus) {
        opts.data.esperaParaVerificarStatus = Date.now() + 5 * 60 * 1000; // 5 min for the next check
        opts.logBackgroundTask("Iniciando verificação de status");

        // Alguns logs só serão exibidos na primeira iteração
        const primeiraIteracao = !opts.data.jaProcessouStatus;
        opts.data.jaProcessouStatus = true;

        const allowedPaths = [] as string[];
        {
          let { list: s3FWfiles } = await getVersionslist(); // Firmware files in AWS S3
          const fwsMeta = await sqldb.FIRMWARES.getList({});
          for (const { path } of s3FWfiles) {
            const existeMeta = fwsMeta.some((fw) => fw.S3_PATH === path);
            if (existeMeta) {
              allowedPaths.push(path);
            }
          }
        }
        const rows = await sqldb.DEVFWVERS.getList();
        if (opts.data.esperaParaBuscarStatusOnline <= Date.now()) {
          opts.data.lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({});
          opts.data.esperaParaBuscarStatusOnline = Date.now() + 5 * 60 * 1000; // 5 min for the next check
        }
        for (const row of rows) {
          const [situacaoProc, situacaoVers] = avaliarEstadoOta(row, allowedPaths, primeiraIteracao, opts.data.lastMessagesTimes);
          if ((row.OTAPROCSTATUS !== situacaoProc) || row.FWVERSSTATUS !== situacaoVers) {
            logger.info(`OTA: ${row.DEV_ID} = ${situacaoVers} ${situacaoProc}`);
            await sqldb.DEVFWVERS.w_update({
              DEV_ID: row.DEV_ID,
              OTAPROCSTATUS: situacaoProc,
              FWVERSSTATUS: situacaoVers,
            }, null);
          }
        }
        opts.logBackgroundTask("Verificação de status concluída");
      }
    } catch (err) { logger.error("ERR-OTA-57"); logger.error(err); }
  });
}

function avaliarEstadoOta(row: {
  DEV_ID: string
  TARGFW_REQVERS: string
  TARGFW_RCVDATE: string
  TARGFW_REQDATE: string
  TARGFW_SENDDATE: string
  TARGFW_SENDPATH: string
  CURRFW_DATE: string
  CURRFW_VERS: string
}, allowedPaths: string[], primeiraIteracao: boolean, lastMessagesTimes: LastMessagesTimes): [string, string] {
  const v1 = parseFirmwareVersion(row.CURRFW_VERS);
  const v2 = parseFirmwareVersion(row.TARGFW_REQVERS);
  const versoesIguais = v1 && v2 && (compareVersions(v1, v2, true) === 0);

  let situacaoVers: string;
  if (versoesIguais) {
    situacaoVers = `OK`;
  } else if(row.CURRFW_VERS && !row.TARGFW_REQVERS) {
    situacaoVers = `NO-REQ`;
  } else if((v1 && v1.vExtra) || (v2 && v2.vExtra)) {
    situacaoVers = `DIRTY`;
  } else if(allowedPaths.includes(row.TARGFW_REQVERS)) {
    situacaoVers = `DIFF`;
  } else {
    situacaoVers = `ERR`;
  }

  // Verificar se já teve alguma requisição de OTA
  if (!row.TARGFW_REQDATE) { // TARGFW_REQDATE = data e horário em que o usuário do DAP mandou atualizar o firmware;
    // continue;
    return ["0 - Nenhuma requisição de OTA registrada.", situacaoVers];
  }
  if (!row.TARGFW_REQVERS) { // TARGFW_REQVERS = arquivo de firmware que o usuário do DAP mandou para o dispositivo;
    logger.error(`ERR-OTA-59 ${row.DEV_ID}`);
    // continue;
    return ["ERRO - Existe requisição de OTA mas sem firmware informado.", situacaoVers];
  }

  const devIsOnline = lastMessagesTimes.connectionStatus(row.DEV_ID) === 'ONLINE';
  const motivoBloqueioReenvio = (!devIsOnline) ? 'O dispositivo não está online' : ((situacaoVers === 'DIFF') || (situacaoVers === 'OK')) ? null : 'Versão de firmware inválida';

  // Verifica se o dispositivo recebeu o último comando de OTA
  if ((!row.TARGFW_RCVDATE) || (row.TARGFW_RCVDATE < row.TARGFW_REQDATE)) { // TARGFW_RCVDATE = dispositivo está ciente que é para baixar firmware;
    if (enviosPendentes.has(row.DEV_ID) || reenviosPendentes.has(row.DEV_ID)) {
      // Já está na fila
      // continue;
      return ["1 - Tem requisição pendente mas não temos confirmação que o dispositivo recebeu a mensagem. O dispositivo já está na fila do DAP para enviar o comando de OTA.", situacaoVers];
    }
    if (!motivoBloqueioReenvio) {
      // logger.info(`OTA: ${row.DEV_ID} - Não temos uma confirmação de que o dispositivo recebeu o comando de OTA, será feita uma nova tentativa.`);
      reenviosPendentes.add(row.DEV_ID);
      return ["1 - Tem requisição pendente mas não temos confirmação que o dispositivo recebeu a mensagem. O dispositivo foi novamente adicionado na fila do DAP para enviar o comando de OTA.", situacaoVers];
    } else {
      if (primeiraIteracao) {
        // logger.info(`OTA: ${row.DEV_ID} - Não temos uma confirmação de que o dispositivo recebeu o comando de OTA, mas ele não está online agora.`);
      }
      return [`1 - Tem requisição pendente mas não temos confirmação que o dispositivo recebeu a mensagem. ${motivoBloqueioReenvio} para entrar na fila do DAP para enviar o comando de OTA.`, situacaoVers];
    }
    // continue;
  }

  // Verifica se o dispositivo já tentou baixar o arquivo de firmware
  if ((!row.TARGFW_SENDDATE) || (row.TARGFW_SENDDATE < row.TARGFW_REQDATE)) { // TARGFW_SENDDATE = data e horário em que o dispositivo solicitou o arquivo de firmware;
    if (enviosPendentes.has(row.DEV_ID) || reenviosPendentes.has(row.DEV_ID)) {
      // Já está na fila
      return ["2 - O dispositivo recebeu o comando de OTA mas ainda não fez o download. Ele já está na fila do DAP para enviar o comando de OTA.", situacaoVers];
      // continue;
    }
    if (!motivoBloqueioReenvio) {
      // logger.info(`OTA: ${row.DEV_ID} - O dispositivo recebeu o comando de OTA mas ainda não solicitou o arquivo de firmware, será feita uma nova tentativa.`);
      reenviosPendentes.add(row.DEV_ID);
      return ["2 - O dispositivo recebeu o comando de OTA mas ainda não fez o download. Ele foi novamente adicionado na fila do DAP para enviar o comando de OTA.", situacaoVers];
    } else {
      if (primeiraIteracao) {
        // logger.info(`OTA: ${row.DEV_ID} - O dispositivo recebeu o comando de OTA mas ainda não solicitou o arquivo de firmware, mas ele não está online agora.`);
      }
      return [`2 - O dispositivo recebeu o comando de OTA mas ainda não fez o download. ${motivoBloqueioReenvio} para entrar na fila do DAP para enviar o comando de OTA.`, situacaoVers];
    }
    // continue;
  }

  // Confirma se o dispositivo tentou baixar o arquivo de firmware correto
  if (row.TARGFW_SENDPATH !== row.TARGFW_REQVERS) {
    if (enviosPendentes.has(row.DEV_ID) || reenviosPendentes.has(row.DEV_ID)) {
      // Já está na fila
      return ["2b - O dispositivo recebeu o comando de OTA mas ainda não fez o download do firmware correto. Ele já está na fila do DAP para enviar o comando de OTA.", situacaoVers];
      // continue;
    }
    if (!motivoBloqueioReenvio) {
      // logger.info(`OTA: ${row.DEV_ID} - O dispositivo recebeu o comando de OTA mas ainda não baixou o arquivo de firmware correto, será feita uma nova tentativa.`);
      reenviosPendentes.add(row.DEV_ID);
      return ["2b - O dispositivo recebeu o comando de OTA mas ainda não fez o download do firmware correto. Ele foi novamente adicionado na fila do DAP para enviar o comando de OTA.", situacaoVers];
    } else {
      if (primeiraIteracao) {
        // logger.info(`OTA: ${row.DEV_ID} - O dispositivo recebeu o comando de OTA mas ainda não baixou o arquivo de firmware correto, mas ele não está online agora.`);
      }
      return [`2b - O dispositivo recebeu o comando de OTA mas ainda não fez o download do firmware correto. ${motivoBloqueioReenvio} para entrar na fila do DAP para enviar o comando de OTA.`, situacaoVers];
    }
    // continue;
  }

  // Verifica se o dispositivo já está com a versão correta
  const tempoDesdeDownload = row.CURRFW_DATE && (new Date(row.CURRFW_DATE).getTime() - new Date(row.TARGFW_SENDDATE).getTime());
  if ((!versoesIguais) || !(tempoDesdeDownload > 0)) {
    if (enviosPendentes.has(row.DEV_ID) || reenviosPendentes.has(row.DEV_ID)) {
      // Já está na fila
      return [`3 - O dispositivo parece não estar na versão correta. Ele está na fila do DAP para enviar o comando de OTA.`, situacaoVers];
      // continue;
    }
    if (primeiraIteracao) {
      // logger.info(`OTA: ${row.DEV_ID} - O dispositivo solicitou o download do firmware mas aparentemente não está com a versão correta. Não será feita nova tentativa automática.`);
    }
    return [`3 - O dispositivo parece não estar na versão correta. Não será feita nova tentativa automática.`, situacaoVers];
    // continue;
  }

  return [`4 - OK`, situacaoVers];
  // logger.info(`OTA: ${row.DEV_ID} - Status de firmware OK.`);
}

async function sendNextNeededCommands(lastMessagesTimes: LastMessagesTimes): Promise<void> {
  let enviados = 0;
  // Prioriza os dispositivos que estiverem online
  for (const etapa of ['online', 'todos']) {
    for (const devId of enviosPendentes) {
      if (enviados >= 6) break;
      if (etapa === 'online' && lastMessagesTimes.connectionStatus(devId) !== 'ONLINE') {
        continue;
      }

      enviosPendentes.delete(devId);

      sendOtaCommand(devId, {
        ['new-version']: {
          host: configfile.otaConfig.host,
          port: configfile.otaConfig.port,
          path: `/ota-for-dev/${devId}` // ?token=${configfile.otaConfig.token}
        }
      }, '[SYSTEM]');
      enviados += 1;

      await new Promise((r) => { setTimeout(r, 1000); });
    }
  }
  // reenvios
  for (const etapa of ['online', 'todos']) {
    // Observação: esta estratégia depende de que a iteração aconteça na ordem em que os elementos foram inseridos, que é o comportamento do Set.
    for (const devId of reenviosPendentes) {
      if (enviados >= 6) break;
      if (etapa === 'online' && lastMessagesTimes.connectionStatus(devId) !== 'ONLINE') {
        continue;
      }

      reenviosPendentes.delete(devId);

      sendOtaCommand(devId, {
        ['new-version']: {
          host: configfile.otaConfig.host,
          port: configfile.otaConfig.port,
          path: `/ota-for-dev/${devId}` // ?token=${configfile.otaConfig.token}
        }
      }, '[SYSTEM]');
      enviados += 1;

      await new Promise((r) => { setTimeout(r, 1000); });
    }
  }
}

export const checkOtaQueue: API_Internal['/diel-internal/bgtasks/checkOtaQueue'] = async function (reqParams) {
  return {
    enviosPendentes: Array.from(enviosPendentes),
    reenviosPendentes: Array.from(reenviosPendentes),
  };
}
