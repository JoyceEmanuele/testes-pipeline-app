import sqldb from '../../db'
import { AlertParams } from '../../types';
import jsonTryParse from '../jsonTryParse';
import { logger } from '../logger';
import { parseNotificationFilter } from '../notifications';

export type AllUsersNotifs = {
  [devId: string]: {
    'DUT_T T<>T'?: AlertParams[]
    'DUT_T T>T'?: AlertParams[]
    'DUT_CO2 >'?: AlertParams[]
    'DUT_CO2 D>'?: AlertParams[]

    'NUM_DEPS >'?: AlertParams[]
    'NUM_DEPS <='?: AlertParams[]
    'COMP_DUR >'?: AlertParams[]
    'COMP_DUR <'?: AlertParams[]
    'COMP_TIME <'?: AlertParams[]
    'COMP_TIME >'?: AlertParams[]

    beforeTime?: Date
    beforeTime_notifId?: number
    afterTime?: Date
    afterTime_notifId?: number
  }
}

export async function loadUserNotifs (filter?: { condVars?: string[], condOps?: string[] }) {
  const newUNotifs: AllUsersNotifs = {};
  const uNotifsList = await sqldb.NOTIFSCFG.getList1(filter || {});
  for (const notifCfg of uNotifsList) {
    const devsFilter = parseNotificationFilter(notifCfg.FILT_DEVS, notifCfg.CLIENT_ID);
    // TODO: Verificar se em algum lugar dá para colocar filtro por unidade
    if (!devsFilter) continue;

    let value: any;
    switch (notifCfg.COND_VAR) {
      case 'NUM_DEPS':
        value = Number(notifCfg.COND_VAL) || null;
        break;
      case 'COMP_DUR':
        value = (Number(notifCfg.COND_VAL) * 60 * 60 * 1000) || null;
        break;
      case 'COMP_TIME':
        value = notifCfg.COND_VAL;
        break;
      case 'HEALTH_IDX':
      case 'DUT_T':
        value = (notifCfg.COND_VAL == null) ? null : Number(notifCfg.COND_VAL);
        break;
      case 'DUT_CO2':
        value = null;
        break;
      case 'WATER':
        value = null;
        break;
      case 'VRF_COOLAUT':
        value = null;
        break;
      case 'ENERGY':
        value = null;
        break;
      default:
        logger.error('Unknown COND_VAR: ' + String(notifCfg.COND_VAR));
        continue;
    }

    const alertType = notifCfg.COND_PARS === 'endofday'
      ? `${notifCfg.COND_VAR} D${notifCfg.COND_OP}`
      : `${notifCfg.COND_VAR} ${notifCfg.COND_OP}`;

    switch (alertType) {
      case 'NUM_DEPS >':
      case 'NUM_DEPS <=':
      case 'COMP_DUR >':
      case 'COMP_DUR <':
      case 'COMP_TIME <':
      case 'COMP_TIME >':
        {
          const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dac' });
          devsList.forEach((dac) => {
            if (!newUNotifs[dac.DEV_ID]) newUNotifs[dac.DEV_ID] = {};
            if (!newUNotifs[dac.DEV_ID][alertType]) newUNotifs[dac.DEV_ID][alertType] = [];
            newUNotifs[dac.DEV_ID][alertType].push({ NOTIF_ID: notifCfg.NOTIF_ID, COND_VAL: notifCfg.COND_VAL, COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL, value })
          })
          break;
        }

      case 'DUT_T T<>T':
        {
          const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dut' });
          devsList.forEach((dut) => {
            if (!newUNotifs[dut.DEV_ID]) newUNotifs[dut.DEV_ID] = {};
            if (!newUNotifs[dut.DEV_ID][alertType]) newUNotifs[dut.DEV_ID][alertType] = [];
            newUNotifs[dut.DEV_ID][alertType].push({ NOTIF_ID: notifCfg.NOTIF_ID, COND_VAL: notifCfg.COND_VAL,COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL, value })
          })
          break;
        }
      
      case 'DUT_T T>T':
        {
        const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dut' });
          devsList.forEach((dut) => {
            if (!newUNotifs[dut.DEV_ID]) newUNotifs[dut.DEV_ID] = {};
            if (!newUNotifs[dut.DEV_ID][alertType]) newUNotifs[dut.DEV_ID][alertType] = [];
            newUNotifs[dut.DEV_ID][alertType].push({ NOTIF_ID: notifCfg.NOTIF_ID, COND_VAL: notifCfg.COND_VAL,COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL, value })
          })
          break;
        }

      case 'COMP_TIME D<':
      case 'COMP_TIME D>':
      case 'HEALTH_IDX D<=R':
      case 'HEALTH_IDX D<=O':
      case 'HEALTH_IDX D!=G':
      case 'HEALTH_IDX D<<<':
      case 'HEALTH_IDX D^':
      case 'DUT_T DUT<>DUT':
      case 'ENERGY ECPH':
      case 'VRF_COOLAUT -':
      case 'WATER -':
      case 'WATER D-':
      case 'HEALTH_IDX <=R':
      case 'HEALTH_IDX <=O':
      case 'HEALTH_IDX !=G':
      case 'HEALTH_IDX <<<':
      case 'HEALTH_IDX ^':
        {
          // These alerts don't need real-time info
          break;
        }

      case 'DUT_CO2 >':
      case 'DUT_CO2 D>':
        {
          const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dut' });
          devsList.forEach((dut) => {
            if (!newUNotifs[dut.DEV_ID]) newUNotifs[dut.DEV_ID] = {};
            if (!newUNotifs[dut.DEV_ID][alertType]) newUNotifs[dut.DEV_ID][alertType] = [];
            newUNotifs[dut.DEV_ID][alertType].push({ NOTIF_ID: notifCfg.NOTIF_ID, COND_VAL: notifCfg.COND_VAL,COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL, value })
          })
          break;
        }
      
      default:
        logger.error('Unknown alertType: ' + alertType);
        continue;
    }
  }

  return newUNotifs;
}

export interface EnergyCards {
  condOper: string,
  limiarInput: string,
  allDays: boolean,
  selectedDays: {
    mon: boolean,
    tue: boolean,
    wed: boolean,
    thu: boolean,
    fri: boolean,
    sat: boolean,
    sun: boolean
  },
  schedulesList: {
    start: string,
    end: string,
    lastMessages?: {
      [devId: string]: number
    }
  }[],
  allHours: boolean,
  instant: boolean,
  endOfDay: boolean,
  detected?: {
    [devId: string]: {
      name: string
      time: string,
      cons: string,
      unitName: string,
      unitId: number,
    }
  }
}

export interface NotifCfg {
  NOTIF_ID: number;
  NAME: string;
  DAT_CREATE: string;
  CLIENT_ID: number;
  FILT_DEVS: string;
  COND_VAR: string;
  COND_OP: string;
  COND_VAL: string;
  COND_SECONDARY_VAL: string;
  COND_PARS: string;
  CREATED_BY: string;
  NOTIF_MSG: string;
  NOTIF_DATA: string;
  CLIENT_NAME: string;
}

export type EnergyAlertCondPars = { energyCards: EnergyCards[] };
export async function loadEnergyNotifs() {
  const notifsByDev: {
    [devId: string]: AlertParams[]
  } = {};
  const energyCardsByNotif: Map<number, EnergyAlertCondPars> = new Map();

  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['ENERGY'], condOps: ['ECPH'] });
  for (const notif of notifsList) {
    const condPars = jsonTryParse<EnergyAlertCondPars>(notif.COND_PARS);
    if (!condPars?.energyCards) continue;
    energyCardsByNotif.set(notif.NOTIF_ID, condPars);

    const devsFilter = parseNotificationFilter(notif.FILT_DEVS, notif.CLIENT_ID);
    if (!devsFilter) continue;

    const devsList = await sqldb.DEVICES.getListNotifs(devsFilter, { devType: 'dme' });
    devsList.forEach((dri) => {
      if (!notifsByDev[dri.DEV_ID]) notifsByDev[dri.DEV_ID] = [];
      notifsByDev[dri.DEV_ID].push({
        NOTIF_ID: notif.NOTIF_ID,
        COND_VAL: notif.COND_VAL,
        COND_SECONDARY_VAL: notif.COND_SECONDARY_VAL,
        value: null,
      })
    });
  }

  return { notifsByDev, energyCardsByNotif };
}

export async function loadWaterNotifs(endofday: boolean) {
  const notifsByClient: {
    [devId: string]: AlertParams[]
  } = {};

  let clientIdsFilter: number[] = []
  let unitIdsFilter: number[] = []
  let notifsInfo: NotifCfg [] = []

  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['WATER'], condOps: ['-'] });
  for (const notifCfg of notifsList) {
    if (endofday && (notifCfg.COND_PARS !== 'endofday')) continue;
    if ((!endofday) && (notifCfg.COND_PARS === 'endofday')) continue;

    const devsFilter = parseNotificationFilter(notifCfg.FILT_DEVS, notifCfg.CLIENT_ID);
    if (!devsFilter) continue;
    
    if(devsFilter.clientIds) clientIdsFilter.push(...devsFilter.clientIds);
    if(devsFilter.unitIds) unitIdsFilter.push(...devsFilter.unitIds);
    notifsInfo.push(notifCfg);

    const { clientIds } = devsFilter;
    clientIds?.forEach((clientId) => {
      const clientString = `CLIENT${clientId}`;
      if (!notifsByClient[clientString]) notifsByClient[clientString] = [];
      notifsByClient[clientString].push({
        NOTIF_ID: notifCfg.NOTIF_ID,
        COND_VAL: notifCfg.COND_VAL,
        COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL,
        value: null,
        UNIT_IDS: devsFilter.unitIds,
      });
    });
  }

  if (clientIdsFilter.length === 0) clientIdsFilter = null
  if (unitIdsFilter.length === 0) unitIdsFilter = null

  return { notifsByClient, clientIdsFilter, unitIdsFilter, notifsInfo};
}

export async function loadCoolAutNotifs() {
  const notifsByClient: {
    [devId: string]: AlertParams[]
  } = {};

  const notifsList = await sqldb.NOTIFSCFG.getList1({ condVars: ['VRF_COOLAUT'], condOps: ['-'] });
  for (const notifCfg of notifsList) {
    const devsFilter = parseNotificationFilter(notifCfg.FILT_DEVS, notifCfg.CLIENT_ID);
    if (!devsFilter) continue;

    for (const clientId of (devsFilter.clientIds || [])) {
      const clientString = `CLIENT${clientId}`;
      if (!notifsByClient[clientString]) notifsByClient[clientString] = [];
      notifsByClient[clientString].push({
        NOTIF_ID: notifCfg.NOTIF_ID,
        COND_VAL: notifCfg.COND_VAL,
        COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL,
        value: null,
      });
    }
  }

  return notifsByClient;
}

export async function loadHealthNotifsForDev(pars: {
  devId: string,
  clientId: number,
  unitId: number,
  machineId: number,
}) {
  const deviceNotifs: {
    'HEALTH_IDX <=R'?: AlertParams[]
    'HEALTH_IDX <=O'?: AlertParams[]
    'HEALTH_IDX !=G'?: AlertParams[]
    'HEALTH_IDX <<<'?: AlertParams[]
    'HEALTH_IDX ^'?: AlertParams[]
  } = {};

  if (!pars.clientId) return deviceNotifs;

  const uNotifsList = await sqldb.NOTIFSCFG.getList1({
    clientIds: [pars.clientId],
    condVars: ['HEALTH_IDX']
  });
  for (const notifCfg of uNotifsList) {
    const devsFilter = parseNotificationFilter(notifCfg.FILT_DEVS, notifCfg.CLIENT_ID);
    if (!devsFilter) continue;
    if (devsFilter.devIds && !devsFilter.devIds.includes(pars.devId)) continue;
    if (devsFilter.unitIds && !devsFilter.unitIds.includes(pars.unitId)) continue;
    if (devsFilter.machineIds && !devsFilter.machineIds.includes(pars.machineId)) continue;

    const alertType = notifCfg.COND_PARS === 'endofday'
      ? `${notifCfg.COND_VAR} D${notifCfg.COND_OP}`
      : `${notifCfg.COND_VAR} ${notifCfg.COND_OP}`;

    switch (alertType) {
      case 'HEALTH_IDX <=R':
      case 'HEALTH_IDX <=O':
      case 'HEALTH_IDX !=G':
      case 'HEALTH_IDX <<<':
      case 'HEALTH_IDX ^':
        {
          if (!deviceNotifs[alertType]) deviceNotifs[alertType] = [];
          deviceNotifs[alertType].push({
            NOTIF_ID: notifCfg.NOTIF_ID,
            COND_VAL: notifCfg.COND_VAL,
            COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL,
            value: (notifCfg.COND_VAL == null) ? null : Number(notifCfg.COND_VAL),
          })
          break;
        }

      case 'HEALTH_IDX D<=R':
      case 'HEALTH_IDX D<=O':
      case 'HEALTH_IDX D!=G':
      case 'HEALTH_IDX D<<<':
      case 'HEALTH_IDX D^':
        {
          // These alerts don't need real-time info
          break;
        }

      default:
        logger.error('Unknown alertType: ' + alertType);
        continue;
    }
  }

  return deviceNotifs;
}

export async function loadDayStatsNotifsForDev(pars: {
  devId: string,
  clientId: number,
  unitId: number,
  machineId: number,
}) {
  const deviceNotifs: {
    'NUM_DEPS >'?: AlertParams[]
    'NUM_DEPS <='?: AlertParams[]
    'COMP_DUR >'?: AlertParams[]
    'COMP_DUR <'?: AlertParams[]
  } = {};

  if (!pars.clientId) return deviceNotifs;

  const uNotifsList = await sqldb.NOTIFSCFG.getList1({
    clientIds: [pars.clientId],
    condVars: ['NUM_DEPS', 'COMP_DUR']
  });
  for (const notifCfg of uNotifsList) {
    const devsFilter = parseNotificationFilter(notifCfg.FILT_DEVS, notifCfg.CLIENT_ID);
    if (!devsFilter) continue;
    if (devsFilter.devIds && !devsFilter.devIds.includes(pars.devId)) continue;
    if (devsFilter.unitIds && !devsFilter.unitIds.includes(pars.unitId)) continue;
    if (devsFilter.machineIds && !devsFilter.machineIds.includes(pars.machineId)) continue;

    let value: number;
    switch (notifCfg.COND_VAR) {
      case 'NUM_DEPS':
        value = Number(notifCfg.COND_VAL) || null;
        break;
      case 'COMP_DUR':
        value = (Number(notifCfg.COND_VAL) * 60 * 60 * 1000) || null;
        break;
      default:
        logger.error('Unknown COND_VAR: ' + String(notifCfg.COND_VAR));
        continue;
    }

    const alertType = notifCfg.COND_PARS === 'endofday'
      ? `${notifCfg.COND_VAR} D${notifCfg.COND_OP}`
      : `${notifCfg.COND_VAR} ${notifCfg.COND_OP}`;

    switch (alertType) {
      case 'NUM_DEPS >':
      case 'NUM_DEPS <=':
      case 'COMP_DUR >':
      case 'COMP_DUR <':
        {
          if (!deviceNotifs[alertType]) deviceNotifs[alertType] = [];
          deviceNotifs[alertType].push({ NOTIF_ID: notifCfg.NOTIF_ID, COND_VAL: notifCfg.COND_VAL, COND_SECONDARY_VAL: notifCfg.COND_SECONDARY_VAL, value })
          break;
        }
      default:
        logger.error('Unknown alertType: ' + alertType);
        continue;
    }
  }

  return deviceNotifs;
}
