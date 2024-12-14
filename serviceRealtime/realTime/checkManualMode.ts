import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks'
import * as lastMessages from '../ramCaches/lastMessages'
import rusthistApi from '../../srcCommon/dielServices/rusthistApi';
import { parseCompressedChartDataS } from '../../srcCommon/helpers/chartDataFormats';
import { sendDalCommand_oper, sendDamCommand_oper } from '../../srcCommon/iotMessages/devsCommands';

// O limite de tempo que o DAM pode ficar em modo Manual é 2 horas. Depois disso volta para modo Auto.
const ALLOWED_DAM_MANUAL_TIME_S = 2 * 60 * 60; // 

// O limite de tempo que um relé do DAL pode ficar em modo MANUAL é 12 horas. Depois disso volta para modo AUTO.
const ALLOWED_DAL_MANUAL_TIME_S = 12 * 60 * 60;

// RAM-CACHE
const lastDamAuto: { [devId: string] : number } = {};
const lastDalAuto: { [devId: string] : number[] } = {};

// De 10 em 10 minutos verifica quais DAMs, DACs, DUTs e DALs estão no modo manual e busca no histórico há quanto tempo ele está assim.
export function startService () {
  recurrentTasks.runLoop({
    taskName: "MANUAL>AUTO",
    initialDelay_ms: 4 * 60 * 1000,
    iterationPause_ms: 10 * 60 * 1000, // 10 minutes wait
  }, checkAutoManualDevices);
}

async function checkAutoManualDams() {
  // Criar lista de todos os DAMs que estão em modo Manual
  const list = lastMessages.getListModeManual();

  const tsLimit = Date.now() - (ALLOWED_DAM_MANUAL_TIME_S * 1000);

  for (const devId of list) {
    if (lastMessages.getStatus(devId) !== 'ONLINE') continue;
    if (lastDamAuto[devId] > tsLimit) continue;

    let intervalLength_s = 3 * 60 * 60; // Pegar as últimas 3 horas
    const tsBegin = new Date(Date.now() - 3 * 60 * 60 * 1000 - (intervalLength_s * 1000)).toISOString().substring(0, 19);
    const hist = await rusthistApi['/comp-dam']({
      dev_id: devId,
      ts_ini: tsBegin,
      interval_length_s: intervalLength_s + 60,
      open_end: true,
    }, "MANUAL>AUTO");

    const mode = parseCompressedChartDataS(hist.Mode);
    let sum = 0;
    for (let i = 0; i < mode.v.length; i++) {
      if (mode.v[i] === 'Auto') sum = 0;
      else if (mode.v[i] === 'Manual') sum += mode.c[i];
    }

    // Se ficou mais de 2 horas no modo Manual, passa para o modo Auto
    if (sum >= ALLOWED_DAM_MANUAL_TIME_S) {
      sendDamCommand_oper(devId, { mode: 'Auto' }, '[SYSTEM]');
    }
  }
}

function sendDalAutoCommands(dalCode: string, expiredManualPorts: number[], hist: { Mode?: string[] }) {
  for (const instance of expiredManualPorts) {
    const instanceMode = hist.Mode?.[instance];
    if (!instanceMode) continue;
    const mode = parseCompressedChartDataS(instanceMode);
    let sum = 0;
    for (let i = 0; i < mode.v.length; i++) {
      if (mode.v[i] === 'AUTO') sum = 0;
      else if (mode.v[i] === 'MANUAL') sum += mode.c[i];
    }

    // Se ficou mais de 12 horas no modo MANUAL, passa para o modo AUTO
    if (sum >= ALLOWED_DAL_MANUAL_TIME_S) {
      sendDalCommand_oper(dalCode, {
        msgtype:"set-operation-mode",
        relays: instance,
        mode: "AUTO"
      }, '[SYSTEM]');
    }
  }
}

async function checkAutoManualDals() {
  // Criar lista de todos os DALs que tem algum relé em modo MANUAL
  const dalsList = lastMessages.getDalListModeManual();
  const dalTsLimit = Date.now() - (ALLOWED_DAL_MANUAL_TIME_S * 1000);

  for (const dalCode of dalsList) {
    const status = lastMessages.getStatus(dalCode);
    if (status !== 'ONLINE') continue;
    const portsLastAuto = lastDalAuto[dalCode];
    if (!portsLastAuto) continue;
    const expiredManualPorts = [] as number[];
    for (let index = 0; index < portsLastAuto.length; index++) {
      const portLastAuto = portsLastAuto[index];
      if (portLastAuto && (portLastAuto < dalTsLimit)) expiredManualPorts.push(index);
    }
    if (!expiredManualPorts.length) continue;

    let intervalLength_s = ALLOWED_DAL_MANUAL_TIME_S; // Pegar as últimas 12 horas
    const tsBegin = new Date(Date.now() - 3 * 60 * 60 * 1000 - (intervalLength_s * 1000)).toISOString().substring(0, 19);
    const hist = await rusthistApi['/comp-dal']({
      dev_id: dalCode,
      ts_ini: tsBegin,
      interval_length_s: intervalLength_s + 60,
      open_end: true,
    }, "MANUAL>AUTO");
    
    sendDalAutoCommands(dalCode, expiredManualPorts, hist);
  }
}

async function checkAutoManualDevices() {
  await checkAutoManualDams();
  await checkAutoManualDals();
}

export function onDamModeTelemetry(telemetry: { dev_id: string, Mode?: string }, telemetryTsZ: number) {
  if (telemetry.Mode === 'Auto') lastDamAuto[telemetry.dev_id] = telemetryTsZ;
}

export function onDalModeTelemetry(telemetry: { dev_id: string, Mode?: string[] }, telemetryTsZ: number) {
  let vec = lastDalAuto[telemetry.dev_id];
  if (!vec) {
    vec = lastDalAuto[telemetry.dev_id] = [];
  }
  for (let i = 0; i < telemetry.Mode.length; i++) {
    if (telemetry.Mode[i] === 'AUTO') vec[i] = telemetryTsZ;
  }
}
