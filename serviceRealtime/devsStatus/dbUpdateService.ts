import { logger } from '../../srcCommon/helpers/logger';
import * as devInfo from '../../srcCommon/helpers/devInfo';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import sqldb from '../../srcCommon/db';
import * as lastMessages from '../ramCaches/lastMessages';
import { countEvent } from '../../srcCommon/helpers/monitoring/statistics';

// O serviço do realtime usa este mecanismo para saber quando um dispositivo muda de status ONLINE/OFFLINE para poder
// avisar o front através do websocket.
let listenerForStatusChange: (devId: string, currState: "ONLINE" | "OFFLINE" | "LATE") => void = null;
export function setListenerForStatusChange(listener: typeof listenerForStatusChange) {
  listenerForStatusChange = listener;
}

interface IDeviceStatus {
  CONN: 'ONLINE'|'OFFLINE'|'LATE'|null, // Status atual do dispositivo
  STATE: string|null,
  TEMP: number|null,
  TEMP1: number|null,
}

// RAM-CACHE
let deviceStatus: {
  [devId: string]: IDeviceStatus
} = {};
export async function startServiceCheckAlive() {
  // Antes de iniciar os serviços é necessário carregar o status atual registrado no banco de dados.
  await carregarEstadoAtualNoBanco();

  // Serviço que atualiza o banco de dados com o status online/offline dos dispositivos
  recurrentTasks.runLoop({
    taskName: 'checkAlive',
    initialDelay_ms: 5127,
    iterationPause_ms: 5127,
    hideIterationsLog: true,
  }, checkAlive);

  // Serviço que atualiza o banco de dados com o status manual/automático e os valores atuais de temperatura dos dispositivos
  // recurrentTasks.runLoop({
  //   taskName: 'checkInfoDevice',
  //   initialDelay_ms: 60000,
  //   iterationPause_ms: 60000,
  //   hideIterationsLog: true,
  // }, checkDeviceInfo);
}

async function carregarEstadoAtualNoBanco() {
  // O "while" é para tentar até conseguir (em caso de erro)
  while(true) {
    await new Promise((r) => setTimeout(r, 30000));
    try {
      // await sqldb.CURRENT_DEVICE_STATE.w_deleteUnused({});
    } catch(err) {
      logger.error(err);
    }
    try {
      const rows = await sqldb.CURRENT_DEVICE_STATE.getList({});
      for (const row of rows) {
        deviceStatus[row.DEVICE_CODE] = {
          CONN: row.STATE_CONN,
          STATE: row.STATE,
          TEMP: row.TEMPERATURE,
          TEMP1: row.TEMPERATURE1,
        }
      }
      break;
    } catch(err) {
      logger.error(err);
      logger.error("Erro na task de checkAlive ao buscar status atual no banco de dados");
    }
  }
}

/** Função que verifica se houve mudança no status online dos dispositivos e, caso tenha tido, salva no banco de dados e avisa o front pelo websocket */
async function checkAlive() {
  await lastMessages.iterateLastTs_async(async (devId, lastMessageTS) => {
    let devStatus = deviceStatus[devId];
    const prevState = devStatus?.CONN || 'OFFLINE';
    const currState = devInfo.calculateStatus(lastMessageTS) || 'OFFLINE';

    const isOffline = currState === 'OFFLINE';

    if (currState && (prevState !== currState)) {
      try {
        if (!devStatus) {
          devStatus = deviceStatus[devId] = { CONN: null, STATE: null, TEMP: null, TEMP1: null };
        }

        countEvent('dev-onl-state');
        await sqldb.CURRENT_DEVICE_STATE.w_insertUpdate({
          DEVICE_CODE: devId,
          STATE_CONN: currState,
          STATE: isOffline ? 'Disabled' : undefined,
          TEMPERATURE: isOffline ? null : undefined,
          TEMPERATURE1: isOffline ? null : undefined,
        });

        if (!devStatus) {
          devStatus = deviceStatus[devId] = { CONN: null, STATE: null, TEMP: null, TEMP1: null };
        }

        devStatus.CONN = currState;
        // Notifica o front através do websocket
        listenerForStatusChange?.(devId, currState);
      } catch(err) {
        logger.error(err);
        logger.error("Erro na task de checkAlive ao atualizar banco de dados");
      }
    }
  });
}

function getDeviceStatus(devId: string): IDeviceStatus {
  return deviceStatus[devId];
}

function hasSignificantTempChange(prevTemp: number | null, currTemp: number | null, tickTemp: number) {
  return prevTemp !== currTemp && Math.abs(currTemp - prevTemp) > tickTemp;
}

function hasStateChanged(prevState: string | null, currState: string | null) {
  return prevState !== currState;
}
async function updateDeviceStatus(devId: string, currState: string | null, temp: number | null, temp1: number | null) {
  try {
    await sqldb.CURRENT_DEVICE_STATE.w_insertUpdate({
      DEVICE_CODE: devId,
      STATE: currState,
      TEMPERATURE: temp,
      TEMPERATURE1: temp1,
    });
    if (!deviceStatus[devId]) {
      deviceStatus[devId] = { CONN: null, STATE: null, TEMP: null, TEMP1: null };
    }

    const devStat = deviceStatus[devId];
    devStat.STATE = currState;
    devStat.TEMP = temp;
    devStat.TEMP1 = temp1;
  } catch (err) {
    logger.error(err);
    logger.error("Erro na task de checkInfoDev ao atualizar banco de dados");
  }
}

async function checkDeviceInfo() {
  await lastMessages.iterateLastTelemetry_async(async (devId, telemetry) => {
    if (!telemetry || !devId) return;
    const tickTemp = 0.6;
    const prevStatus = getDeviceStatus(devId);
    const prevTemp = prevStatus?.TEMP ?? null;
    const prevTemp1 = prevStatus?.TEMP1 ?? null;
    const prevState = prevStatus?.STATE ?? null;
    let currTemp = telemetry?.Temperature ?? null;
    let currTemp1 = telemetry?.Temperature_1 ?? null;
    let currState = telemetry?.State || null;

    // Handle DAC device
    if (devId.startsWith('DAC')) {
      const stateDac = telemetry?.Lcmp ?? null;
      if (stateDac !== null) {
        currState = stateDac ? 'Enabled' : 'Disabled';
      }
    }

    if (devId.startsWith('DAM')) {
      currState = handleDamDevice(telemetry?.State) || null;
    }

    // Handle DRI device
    if (devId.startsWith('DRI')) {
      currState = handleDriDevice(telemetry) || null;
      currTemp = telemetry?.values?.[0] ?? currTemp;
    }

    if (Array.isArray(currTemp)) {
      currTemp = currTemp[currTemp.length - 1] ?? null;
    }
    if (Array.isArray(currTemp1)) {
      currTemp1 = currTemp1[currTemp1.length - 1] ?? null;
    }
    if (typeof currTemp === 'string') {
      currTemp = Number(currTemp);
    }
    if (typeof currTemp1 === 'string') {
      currTemp1 = Number(currTemp1);
    }
    currState = currState && currState.toString();
    const tempChanged = hasSignificantTempChange(prevTemp, currTemp, tickTemp) ||
                        hasSignificantTempChange(prevTemp1, currTemp1, tickTemp);
    const stateChanged = hasStateChanged(prevState, currState);

    if (tempChanged || stateChanged) {
      countEvent('dev-aut-state');
      await updateDeviceStatus(devId, currState, currTemp, currTemp1);
    }
  })
}

function handleDriDevice(telemetry: any): string | null {
  if (telemetry.type === 'CCN') {
    return getCcnState(telemetry);
  } else if (isVavOrFancoil(telemetry.application, telemetry.type)) {
    return telemetry['fan-status'] === 0 ? 'Disabled' : modesDriOperation[telemetry.mode] || null;
  } else if (isChiller(telemetry.type)) {
    return telemetry.STATUS || null;
  }
  return null;
}

function handleDamDevice(state: string | null): string | null {
  if (state) {
    return modesDamOperation[state] || state;
  }
  return null;
}

function getCcnState(telemetry: any): string | null {
  const statusDri = telemetry?.values?.[1] || 0;
  const modeValue = telemetry?.values?.[2];

  if (statusDri === 0) {
    if (modeValue === 0 || modeValue === 1) return 'Condenser 1';
    if (modeValue === 3) return 'Ventilation';
  }
  return 'Disabled';
}

function isVavOrFancoil(application: string | null, type: string): boolean {
  return application?.startsWith('vav') || application?.startsWith('fancoil') || type.startsWith('VAV') || type.startsWith('FANCOIL');
}

function isChiller(type: string): boolean {
  return ['CHILLER-CARRIER-30HXE', 'CHILLER-CARRIER-30GXE', 'CHILLER-CARRIER-30HXF'].includes(type) || type?.startsWith('CHILLER-CARRIER-30XA');
}

type ModesDriOperation = {
  [key: number]: string;
};

type ModesDamOperation = {
  [key: string]: string;
};

const modesDriOperation: ModesDriOperation = {
  0: 'Condenser 1',
  1: 'Heat',
  2: 'Ventilation',
}

const modesDamOperation: ModesDamOperation = {
  Enabled: 'Condenser 1',
  Enabling: 'Condenser 1',
  'Condenser 1': 'Condenser 1',
  'Condenser 2': 'Condenser 2',
  Disabled: 'Forbid',
  Disabling: 'Forbid',
  Ventilation: 'Ventilation',
  THERMOSTAT: 'THERMOSTAT',
}
