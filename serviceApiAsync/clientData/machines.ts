import * as httpRouter from '../apiServer/httpRouter'
import * as eventHooks from '../realTime/eventHooks'
import * as assets from './assets'
import * as dacInfo from '../dacInfo'
import * as devInfo from '../devInfo'
import * as associations from './associations'
import sqldb from '../../srcCommon/db'
import configfile from '../../configfile'
import { admLogger, logger } from '../../srcCommon/helpers/logger';
import { getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl'
import { SessionData } from '../../srcCommon/types'
import { machinesDeleteImage } from '../devsPictures';
import { controlEcoLocalParameters } from '../damInfo';
import { resendDutAutConfig, resendDutIrCodes } from '../../srcCommon/dutAutomation'
import { FullProg_v4 } from '../../srcCommon/helpers/scheduleData';
import { adjustSchedule_v2, sendDevSchedule } from '../../srcCommon/helpers/automationControl'
import { requestDevSchedule } from '../../srcCommon/iotMessages/devsCommands'
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { getDutsUsedAsRefByDam, loadAutomationRefs } from '../../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'
import { Asset, AssetWithStatus } from '../../srcCommon/types/api-private'
import { AssetWithStatus as AssetWithStatusDeprecated } from '../../srcCommon/types/api-deprecated'
import { sendCommandToDeviceWithConfigTimezone } from '../../srcCommon/helpers/timezones'
import { checkDevId } from '../../srcCommon/helpers/devInfo'
//TODO: se um DAC3 tiver DAM ativado, forçar o DAC e o DAM a ficarem no mesmo grupo

httpRouter.privateRoutes['/clients/get-groups-list'] = async function (reqParams, session) {
  if ((reqParams as any).CLIENT_IDS) reqParams.clientIds = (reqParams as any).CLIENT_IDS;
  if ((reqParams as any).CLIENT_ID) reqParams.clientIds = [(reqParams as any).CLIENT_ID];
  if ((reqParams as any).UNIT_ID) reqParams.unitIds = [(reqParams as any).UNIT_ID];

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(clientId => allowedClients.includes(clientId));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const list = await sqldb.MACHINES.getMachinesList({ UNIT_IDS: reqParams.unitIds, CLIENT_IDS: reqParams.clientIds });

  const listWithDamId = [];

  for (const item of list) {
    listWithDamId.push({ ...item, DAM_ID: (item.DEV_AUT?.startsWith('DAM') || item.DEV_AUT?.startsWith('DAC')) && item.DEV_AUT || null,  GROUP_ID: item.MACHINE_ID, GROUP_NAME: item.MACHINE_NAME })
  }

  return listWithDamId;
}

httpRouter.privateRoutes['/get-machines-automation-info'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const machinesList = await sqldb.MACHINES.getMachinesAutInfo({ CLIENT_IDS: reqParams.CLIENT_ID && [reqParams.CLIENT_ID] });
  const dacsList = await sqldb.DACS_DEVICES.getWithMachineAndAut({ CLIENT_IDS: reqParams.CLIENT_ID && [reqParams.CLIENT_ID] });
  const { damDutsRef } = await loadAutomationRefs({ clientIds: reqParams.CLIENT_ID && [reqParams.CLIENT_ID] });

  const list = machinesList.map((rowMachine) => {
    const dacs = dacsList.filter((rowDac) => (rowDac.MACHINE_ID === rowMachine.GROUP_ID)).map((rowDac) => {
      return {
        DAC_ID: rowDac.DAC_ID,
        automationEnabled: (!!rowDac.DAC_AS_DAM) && (rowDac.DAC_AUT_DISABLED !== 1),
      };
    });

    const DAM_DUT_REFS = rowMachine.DEV_AUT && damDutsRef[rowMachine.DEV_AUT];
    const machine = {
      CLIENT_ID: rowMachine.CLIENT_ID,
      CLIENT_NAME: rowMachine.CLIENT_NAME,
      UNIT_ID: rowMachine.UNIT_ID,
      UNIT_NAME: rowMachine.UNIT_NAME,
      GROUP_ID: rowMachine.GROUP_ID,
      GROUP_NAME: rowMachine.GROUP_NAME,
      DEV_AUT: rowMachine.DEV_AUT,
      DAM_ID: (rowMachine.DEV_AUT?.startsWith('DAM') || rowMachine.DEV_AUT?.startsWith('DAC')) && rowMachine.DEV_AUT,
      damIsDac: (!!rowMachine.DAM_AS_DAC),
      DAM_DISABLED: rowMachine.DAM_DISABLED,
      DUT_ID: rowMachine.DUT_ID,
      dutAutomationEnabled: (!!rowMachine.DUT_AS_DUTAUT) && (rowMachine.DUT_AUT_DISABLED !== 1),
      DAM_DUT_REF: DAM_DUT_REFS && DAM_DUT_REFS.join(','),
      dacs,
      problemsFound: undefined as string[],
    };

    let problemsFound = [];
    let automatedBy: { [devId: string]: boolean } = {};
    const temperatureSensors: { [dutId: string]: boolean } = {};

    if (machine.damIsDac && (machine.DAM_DISABLED !== 0)) {
      problemsFound.push(`automatizado pelo ${machine.DEV_AUT} que é um DAC sem automação habilitada`);
    }

    const dataDacAutomation = isDacAutomationEnabled(machine, problemsFound, automatedBy);
    problemsFound = dataDacAutomation.problemsFound;
    automatedBy = dataDacAutomation.automatedBy;

    if (machine.DAM_ID) {
      automatedBy[machine.DAM_ID] = true;
    }

    if (machine.DAM_DUT_REF && machine.DUT_ID !== machine.DAM_DUT_REF) {
      problemsFound.push(`o grupo se referencia pela temperatura do '${machine.DUT_ID || '(null)'}' e o DAM pelo '${machine.DAM_DUT_REF}'`)
    }
    if (machine.DUT_ID) {
      temperatureSensors[machine.DUT_ID] = true;
    }
    if (DAM_DUT_REFS) {
      for (const dutId of DAM_DUT_REFS) {
        temperatureSensors[dutId] = true;
      }
    }

    problemsFound = findAutTempProblems(automatedBy, temperatureSensors, problemsFound);

    if (problemsFound.length > 0) machine.problemsFound = problemsFound;
    return machine;
  });

  return { list };
}

export const realocateManufacturerDevice = async (clientId: number, unitId: number, automation: { DEV_AUT?: string, DUT_ID?: string }, session: SessionData, realocateIfEmptyClient?: boolean) => {
  if (automation.DEV_AUT || automation.DUT_ID) { /* OK, let's check */ }
  else return;

  const manufactures = await sqldb.CLIENTS.getManufacturers();
  const manufIds = manufactures.map((manuf) => manuf.CLIENT_ID);

  if (automation.DUT_ID) {
    const devId = automation.DUT_ID;
    const devInf = await sqldb.DEVICES.getBasicInfo({ devId });
    verifyDevInfo(devInf);
    const manuf = manufIds.includes(devInf.CLIENT_ID) || (realocateIfEmptyClient && devInf.CLIENT_ID === null && devInf.UNIT_ID === null);

    if (manuf) {
      await devInfo.setGetDevInfo(session, {
        CLIENT_ID: clientId,
        DEV_ID: devId,
        UNIT_ID: unitId,
        allowInsert: false,
      });
    }
  }

  if (automation.DEV_AUT) {
    const devId = automation.DEV_AUT;
    const devInf = await sqldb.DEVICES.getBasicInfo({ devId });
    verifyDevInfo(devInf);
    const manuf = manufIds.includes(devInf.CLIENT_ID) || (realocateIfEmptyClient && devInf.CLIENT_ID === null && devInf.UNIT_ID === null);

    if (manuf) {
      await devInfo.setGetDevInfo(session, {
        CLIENT_ID: clientId,
        DEV_ID: devId,
        UNIT_ID: unitId,
        allowInsert: false,
      });
    }
  }
}

const verifyDevInfo = (devInfo: Awaited<ReturnType<typeof sqldb.DEVICES.getBasicInfo>>) => {
  if (!devInfo) { throw Error('Device not found').HttpStatus(400) }
}

export const setMachineRefrigeratesEnvironment = async (qPars: { machineId: number, machineName: string, unitId: number, DUT_CODE?: string, environmentId?: number, environmentName?: string }, userId: string) => {
  // Se não tem DUT de referência, necessário criar ambiente e refrigeração
  if (qPars.DUT_CODE == null) {
    const refrigerateInfo = await sqldb.REFRIGERATES.getRefrigerateInfo({MACHINE_ID: qPars.machineId});

    // Se tiver resultado, já foi inserido anteriormente
    if (refrigerateInfo.length === 0) {
      let environmentId = qPars.environmentId
      if (!qPars.environmentId) {
        const insertedEnvironment = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: qPars.unitId, ENVIRONMENT_NAME: qPars.environmentName, IS_VISIBLE: true, ENVIRONMENT_TYPE: null}, userId);
        environmentId = insertedEnvironment.insertId;
      }
      await sqldb.REFRIGERATES.w_insert({ENVIRONMENT_ID: environmentId, MACHINE_ID: qPars.machineId}, userId);
    }
  }
  else {
    const machineInfo = await sqldb.MACHINES.getMachineAutInfo({
      MACHINE_ID: qPars.machineId,
    });

    if (machineInfo.DUT_ID === qPars.DUT_CODE) {
      return;
    }
    const dutInfo = await sqldb.DUTS.getDevExtraInfo({DEV_ID: qPars.DUT_CODE});

    await controlRefrigeratesWithDut(dutInfo, qPars, userId);
  }
}

export const setMachineAutomation = async (machineId: number, automation: { DEV_AUT?: string, DUT_ID?: string }, debugInfo: string, userId: string) => {
  const machineInfo = await getMachineDevs(machineId, false, debugInfo);
  const dutAutInfo = automation?.DUT_ID && await sqldb.AUTOM_EVAP.getDevBasicInfo({ DUT_ID: automation.DUT_ID });
  const dutInfo = dutAutInfo || (automation.DUT_ID && await sqldb.DUTS.getBasicInfo({ devId: automation.DUT_ID }));
  const damInfo = automation.DEV_AUT?.startsWith('DAM') && await sqldb.DAMS.getDamBasicInfo({ devId: automation.DEV_AUT });
  const driInfo = automation.DEV_AUT?.startsWith('DRI') && await sqldb.DRIS.getBasicInfo({ driId: automation.DEV_AUT });
  const dacInfo = automation.DEV_AUT?.startsWith('DAC') && await sqldb.DACS_DEVICES.getBasicInfo({ DAC_ID: automation.DEV_AUT });

  await checkUnitNullDac(automation, dacInfo, machineInfo, userId);
  await checkUnitNullDam(automation, damInfo, machineInfo, userId);
  await checkUnitNullDri(automation, driInfo, machineInfo, userId);
  await checkUnitNullDut(automation, dutInfo, machineInfo, dutAutInfo, userId);

  checkAutomationVerify(automation, machineInfo, dutAutInfo);

  await controlAutomMachine({ groupId: machineId, automation }, userId)
    .catch((perr) => {
      const msgError = `Error controling autom group history: ${perr} - user: ${userId} - groupId - ${machineId} automation: ${JSON.stringify(automation)}`;
      logger.error(msgError);
      throw Error(msgError).HttpStatus(400);
    });

  // Dut de referência relacionado à máquina
  if (automation.DEV_AUT?.startsWith('DRI') && dutAutInfo && dutAutInfo.DISAB === 1) {
    const dutsDevicesInfos = await sqldb.DUTS_DEVICES.getDutsDevicesInfo({DEVICE_CODE: automation.DUT_ID});
    if (!dutsDevicesInfos.find((item) => item.DUT_REFERENCE_ID && item.MACHINE_ID === machineId)) {
      await sqldb.DUTS_REFERENCE.w_insert({DUT_MONITORING_ID: dutsDevicesInfos[0].DUT_MONITORING_ID, MACHINE_ID: machineId}, userId);
    }
  }

  if (automation.DEV_AUT?.startsWith('DAM') || automation.DEV_AUT?.startsWith('DAC')) {
    eventHooks.ramCaches_DEVGROUPS_setGroupDam(machineId, automation.DEV_AUT);
  } else {
    eventHooks.ramCaches_DEVGROUPS_deleteGroupDam(machineId);
  }
}

export const addMachineHelper = async (insertId: number, reqParams: Parameters<typeof httpRouter.privateRoutes['/dac/add-new-group']>[0], session: SessionData) => {
  // Caso esteja atualmente em fabricante, pode alterar cliente/unidade para o mesmo do grupo
  await realocateManufacturerDevice(
    reqParams.CLIENT_ID,
    reqParams.UNIT_ID,
    {
      DEV_AUT: reqParams.DEV_AUT || ((reqParams as any).REL_DAM_ID || (reqParams as any).REL_DRI_ID) || null,
      DUT_ID: reqParams.REL_DUT_ID || null,
    },
    session, true);

  if (reqParams.ENVIRONMENT_NAME || reqParams.REL_DUT_ID) {
    await setMachineRefrigeratesEnvironment({unitId: reqParams.UNIT_ID, machineId: insertId, machineName: reqParams.GROUP_NAME, DUT_CODE: reqParams.REL_DUT_ID || null, environmentId: reqParams.ENVIRONMENT_ID, environmentName: reqParams.ENVIRONMENT_NAME}, session.user);
  }

  await setMachineAutomation(insertId, {
    DEV_AUT: reqParams.DEV_AUT || ((reqParams as any).REL_DAM_ID || (reqParams as any).REL_DRI_ID) || null,
    DUT_ID: reqParams.REL_DUT_ID || null,
  }, `'/dac/add-new-group' ${JSON.stringify(reqParams)}`, session.user)
}

export const verifyRatedPowerMachine = (ratedPowerMachine: number, sumRatedPowerCondensers: number) => {
  if (sumRatedPowerCondensers > ratedPowerMachine) {
    throw Error('O valor mínimo para a potência nominal da máquina deve ser a soma das potências das condensadoras.').HttpStatus(422);
  }
}

/**
 * @swagger
 * /dac/add-new-group:
 *   post:
 *     summary: Adicionar uma nova máquina
 *     description: Adicionar uma nova máquina com suas demais informações
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Máquina
 *         schema:
 *           type: object
 *           properties:
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: null
 *               required: true
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: null
 *               required: true
 *             GROUP_NAME:
 *               type: string
 *               description: Nome da Máquina
 *               default: ""
 *               required: true
 *             DEV_AUT:
 *               type: string
 *               description: Dispositivo de automação da Máquina
 *               default: ""
 *               required: false
 *             REL_DUT_ID:
 *               type: string
 *               description: Dispositivo Dut relacionado à máquina
 *               default: ""
 *               required: true
 *             MODEL:
 *               type: string
 *               description: Modelo do ativo
 *               default: ""
 *               required: false
 *             INSTALLATION_DATE:
 *               type: string
 *               description: Data de instalação
 *               default: ""
 *               required: false
 *             MCHN_APPL:
 *               type: string
 *               description: Tipo de Aplicação da máquina
 *               default: ""
 *               required: false
 *             GROUP_TYPE:
 *               type: string
 *               description: Tipo da máquina
 *               default: ""
 *               required: false
 *             BRAND:
 *               type: string
 *               description: Marca da Máquina
 *               default: ""
 *               required: false
 *             FRIGO_CAPACITY:
 *               type: number
 *               description: Capacidade de refrigeração do ativo
 *               default: null
 *               required: false
 *             FRIGO_CAPACITY_UNIT:
 *               type: string
 *               description: Unidade da capacidade de refrigeração do ativo
 *               default: ""
 *               required: false
 *             FLUID_TYPE:
 *               type: string
 *               description: Tipo de flúido da máquina
 *               default: ""
 *               required: false
 *             RATED_POWER:
 *               type: number
 *               description: Potência da máquina
 *               default: null
 *               required: false
 *             ENVIRONMENT_ID:
 *               type: number
 *               description: ID do ambiente da máquina
 *               default: null
 *               required: false
 *             ENVIRONMENT_NAME:
 *               type: string
 *               description: Nome do ambiente da máquina
 *               default: ""
 *               required: false
 *             SUM_RATED_POWER_CONDENSERS:
 *               type: number
 *               description: Potência total das condensadoras da máquina
 *               default: null
 *               required: false
 *     responses:
 *       200:
 *         description: Informações da Máquina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 GROUP_NAME: 
 *                   type: string
 *                   description: Nome da máquina
 *                 GROUP_ID: 
 *                   type: number
 *                   description: ID da máquina
 *                 UNIT_ID: 
 *                   type: number
 *                   description: ID da Unidade
 *                 CLIENT_ID: 
 *                   type: number
 *                   description: ID do Cliente
 *                 UNIT_NAME: 
 *                   type: string
 *                   description: Nome da unidade da máquina
 *                 CITY_NAME: 
 *                   type: string
 *                   description: Nome cidade da máquina
 *                 STATE_ID: 
 *                   type: string
 *                   description: Estado da máquina
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Erro de permissão.
 *       500:
 *         description: Erro interno do servidor
 */
export const addNewMachine = async (reqParams: httpRouter.ApiParams['/dac/add-new-group'], session: SessionData) => {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.UNIT_ID) throw Error('Missing parameter: UNIT_ID').HttpStatus(400)
  if (!reqParams.GROUP_NAME) throw Error('Missing parameter: GROUP_NAME').HttpStatus(400)
  if (reqParams.DEV_AUT && !checkDevId(reqParams.DEV_AUT)) { throw Error('Invalid automation device!').HttpStatus(400); }
  if (reqParams.REL_DUT_ID && !checkDevId(reqParams.REL_DUT_ID)) { throw Error('Invalid reference device!').HttpStatus(400); }

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canConfigureNewUnits) throw Error('Permission denied!').HttpStatus(403);

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
  });
  if (!(unitInfo && (unitInfo.CLIENT_ID === reqParams.CLIENT_ID))) throw Error('Invalid UNIT_ID!').HttpStatus(400);

  verifyRatedPowerMachine(reqParams.RATED_POWER, reqParams.SUM_RATED_POWER_CONDENSERS);

  const { insertId } = await sqldb.MACHINES.w_insert({
    NAME: reqParams.GROUP_NAME,
    APPLICATION: reqParams.MCHN_APPL !== undefined ? reqParams.MCHN_APPL : null,
    FLUID_TYPE: reqParams.FLUID_TYPE !== undefined ? reqParams.FLUID_TYPE : null,
    INSTALLATION_DATE: reqParams.INSTALLATION_DATE !== undefined ? reqParams.INSTALLATION_DATE : null,
    TYPE: reqParams.GROUP_TYPE !== undefined ? reqParams.GROUP_TYPE : null,
    BRAND: reqParams.BRAND !== undefined ? reqParams.BRAND : null,
    UNIT_ID: reqParams.UNIT_ID,
    RATED_POWER: reqParams.RATED_POWER,
  }, session.user)

  await addMachineHelper(insertId, reqParams, session);

  const machineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: insertId });

  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();

  return machineInfo;
}

httpRouter.privateRoutes['/dac/add-new-group'] = addNewMachine;

export const editOnlyName = async (reqParams:Parameters<typeof httpRouter.privateRoutes['/clients/edit-group']>[0], userId: string ) => {
  // Admin do cliente pode mudar o nome da máquina, só isso
  if (reqParams.GROUP_NAME) {
    await sqldb.MACHINES.w_update({
      MACHINE_ID: reqParams.GROUP_ID,
      MACHINE_NAME: reqParams.GROUP_NAME,
    }, userId);
    const machineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: reqParams.GROUP_ID });
    return machineInfo;
  }
  throw Error('Permission denied!').HttpStatus(403);
}

export const editMachineHelper = async (reqParams: Parameters<typeof httpRouter.privateRoutes['/clients/edit-group']>[0], machineInfo: Awaited<ReturnType<typeof sqldb.MACHINES.getMachineInfo>>, userId: string) => {
  if (reqParams.REL_DEV_AUT === undefined) {
    reqParams.REL_DEV_AUT = machineInfo.DEV_AUT;
  }
  if (reqParams.REL_DUT_ID === undefined) {
    reqParams.REL_DUT_ID = machineInfo.DUT_ID;
  }

  if (reqParams.GROUP_NAME) {
    await sqldb.MACHINES.w_update({
      MACHINE_ID: reqParams.GROUP_ID,
      MACHINE_NAME: reqParams.GROUP_NAME,
      MACHINE_FLUID_TYPE: reqParams.FLUID_TYPE,
      MACHINE_TYPE: reqParams.GROUP_TYPE,
      MACHINE_APPLICATION: reqParams.MCHN_APPL,
      MACHINE_INSTALLATION_DATE: reqParams.INSTALLATION_DATE,
      MACHINE_BRAND: reqParams.BRAND,
      UNIT_ID: reqParams.UNIT_ID,
    }, userId)
  }
}

export const editRatedPowerMachine = async (reqParams: Parameters<typeof httpRouter.privateRoutes['/clients/edit-group']>[0], userId: string, actualRatedPower: number) => {
  if ((reqParams.RATED_POWER == null || actualRatedPower === reqParams.RATED_POWER) && !reqParams.SUM_RATED_POWER_CONDENSERS) return;
  let minRatedPowerAllowed: number = 0;

  if (reqParams.SUM_RATED_POWER_CONDENSERS === null) {
    const assetsInMachine = await sqldb.ASSETS.getAssetsByMachine({ MACHINE_ID: reqParams.GROUP_ID });
    for (const asset of assetsInMachine) {
      minRatedPowerAllowed += asset.CONDENSER_MACHINE_KW;
    }
  }

  verifyRatedPowerMachine(reqParams.RATED_POWER, (reqParams.SUM_RATED_POWER_CONDENSERS || minRatedPowerAllowed));
  
  await sqldb.MACHINES.w_update({
    MACHINE_ID: reqParams.GROUP_ID,
    RATED_POWER: reqParams.RATED_POWER,
  }, userId);
}

const validateEditMachineReqParams = (reqParams: httpRouter.ApiParams['/clients/edit-group']) => {
  if (!reqParams.GROUP_ID) { throw Error('Invalid properties. Missing GROUP_ID.').HttpStatus(400) }
  if (reqParams.UNIT_ID === null) { throw Error('Invalid properties. UNIT_ID is null.').HttpStatus(400) }
  if (reqParams.REL_DEV_AUT && !checkDevId(reqParams.REL_DEV_AUT)) { throw Error('Invalid automation device!').HttpStatus(400); }
  if (reqParams.REL_DUT_ID && !checkDevId(reqParams.REL_DUT_ID)) { throw Error('Invalid reference device!').HttpStatus(400); }
}

/**
 * @swagger
 * /clients/edit-group:
 *   post:
 *     summary: Editar uma máquina
 *     description: Editar uma máquina com suas demais informações
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Máquina
 *         schema:
 *           type: object
 *           properties:
 *             GROUP_ID:
 *               type: number
 *               description: ID da Máquina
 *               default: null
 *               required: true
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: null
 *               required: false
 *             GROUP_NAME:
 *               type: string
 *               description: Nome da Máquina
 *               default: ""
 *               required: false
 *             REL_DEV_AUT:
 *               type: string
 *               description: Dispositivo de automação da Máquina
 *               default: ""
 *               required: false
 *             REL_DUT_ID:
 *               type: string
 *               description: Dispositivo Dut relacionado à máquina
 *               default: ""
 *               required: true
 *             MODEL:
 *               type: string
 *               description: Modelo do ativo
 *               default: ""
 *               required: false
 *             INSTALLATION_DATE:
 *               type: string
 *               description: Data de instalação
 *               default: ""
 *               required: false
 *             MCHN_APPL:
 *               type: string
 *               description: Tipo de Aplicação da máquina
 *               default: ""
 *               required: false
 *             GROUP_TYPE:
 *               type: string
 *               description: Tipo da máquina
 *               default: ""
 *               required: false
 *             BRAND:
 *               type: string
 *               description: Marca da Máquina
 *               default: ""
 *               required: false
 *             FRIGO_CAPACITY:
 *               type: number
 *               description: Capacidade de refrigeração do ativo
 *               default: null
 *               required: false
 *             FRIGO_CAPACITY_UNIT:
 *               type: string
 *               description: Unidade da capacidade de refrigeração do ativo
 *               default: ""
 *               required: false
 *             FLUID_TYPE:
 *               type: string
 *               description: Tipo de flúido da máquina
 *               default: ""
 *               required: false
 *             RATED_POWER:
 *               type: number
 *               description: Potência da máquina
 *               default: null
 *               required: false
 *             ENVIRONMENT_ID:
 *               type: number
 *               description: ID do ambiente da máquina
 *               default: null
 *               required: false
 *             ENVIRONMENT_NAME:
 *               type: string
 *               description: Nome do ambiente da máquina
 *               default: ""
 *               required: false
 *             SUM_RATED_POWER_CONDENSERS:
 *               type: number
 *               description: Potência total das condensadoras da máquina
 *               default: null
 *               required: false
 *     responses:
 *       200:
 *         description: Informações da Máquina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 GROUP_NAME: 
 *                   type: string
 *                   description: Nome da máquina
 *                 GROUP_ID: 
 *                   type: number
 *                   description: ID da máquina
 *                 UNIT_ID: 
 *                   type: number
 *                   description: ID da Unidade
 *                 CLIENT_ID: 
 *                   type: number
 *                   description: ID do Cliente
 *                 UNIT_NAME: 
 *                   type: string
 *                   description: Nome da unidade da máquina
 *                 CITY_NAME: 
 *                   type: string
 *                   description: Nome cidade da máquina
 *                 STATE_ID: 
 *                   type: string
 *                   description: Estado da máquina
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Erro de permissão.
 *       500:
 *         description: Erro interno do servidor
 */
export const editMachineInfo = async (reqParams: httpRouter.ApiParams['/clients/edit-group'], session: SessionData) => {
  validateEditMachineReqParams(reqParams);
  let machineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: reqParams.GROUP_ID });
  if (!machineInfo) { throw Error('Machine not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (!perms.canManageDevs) throw Error('Permission denied!').HttpStatus(403);

  if (!session.permissions.isAdminSistema) {
    // Admin do cliente pode mudar o nome da máquina, só isso
    const returnedMachine = await editOnlyName(reqParams, session.user);
    return returnedMachine;
  }

  const relDutData = await sqldb.DUTS.getBasicInfo({ devId: reqParams.REL_DUT_ID });

  // DUTs QA contêm umidade & CO2
  if (relDutData?.VARS?.includes('HD')) {
    throw Error('DUTs QA cannot be used as temperature references.').HttpStatus(400)
  }

  await editRatedPowerMachine(reqParams, session.user, machineInfo.RATED_POWER);
  await editMachineHelper(reqParams, machineInfo, session.user);

  // Caso esteja atualmente em fabricante, pode alterar cliente/unidade para o mesmo do grupo
  await realocateManufacturerDevice(
    machineInfo.CLIENT_ID,
    machineInfo.UNIT_ID,
    {
      DEV_AUT: reqParams.REL_DEV_AUT || null,
      DUT_ID: reqParams.REL_DUT_ID || null,
    },
    session, true);

  if (reqParams.ENVIRONMENT_NAME || reqParams.REL_DUT_ID) { 
    await setMachineRefrigeratesEnvironment({unitId: machineInfo.UNIT_ID, machineId: machineInfo.GROUP_ID, machineName: reqParams.GROUP_NAME, DUT_CODE: reqParams.REL_DUT_ID || null, environmentId: reqParams.ENVIRONMENT_ID, environmentName: reqParams.ENVIRONMENT_NAME}, session.user);
  }

  await setMachineAutomation(reqParams.GROUP_ID, {
    DEV_AUT: reqParams.REL_DEV_AUT || null,
    DUT_ID: reqParams.REL_DUT_ID || null,
  }, `'/clients/edit-group' ${JSON.stringify(reqParams)}`, session.user)

  const checkList = await sqldb.MACHINES.checkConsistency_AUTOM();
  if (checkList.length) {
    admLogger(`Erro de consistência! [120] MACHINES-automação. ${JSON.stringify(checkList)}`);
    for (const machine of checkList) {
      await sqldb.DUTS_REFERENCE.w_deleteFromMachine({MACHINE_ID: machine.MACHINE_ID}, session.user);
      await sqldb.DAMS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID}, session.user);
      await sqldb.DACS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: machine.MACHINE_ID}, session.user);
    }
  }

  machineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: reqParams.GROUP_ID });
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();

  return machineInfo;
}

httpRouter.privateRoutes['/clients/edit-group'] = editMachineInfo;

export const removeMachine = async (reqParams: httpRouter.ApiParams['/clients/remove-group'], session: SessionData) => {
  if (!reqParams.GROUP_ID) {
    throw Error('Invalid properties. Missing GROUP_ID.').HttpStatus(400)
  }
  const machineInfo = await sqldb.MACHINES.getBasicInfo({
    MACHINE_ID: reqParams.GROUP_ID,
  });
  if (!machineInfo) throw Error('Máquina não encontrada').HttpStatus(400)

  const perms = getUserGlobalPermissions(session);
  if (!perms.deleteClientUnitsMachinesRooms) {
    throw Error('Permission denied').HttpStatus(403);
  }

  if (reqParams.isChiller) {
    // desassociando da unidade quando é chiller para não aparecer no perfil
    await sqldb.DEVICES_UNITS.w_deleteOfUnitFromMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);
    await sqldb.DEVICES_CLIENTS.w_deleteOfClientFromMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);
  }

  await dacInfo.removingMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteFromMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DRIS_CHILLERS.w_deleteFromMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);

  //Alterar reqParams para trazer machine_id
  await associations.removingMachine({ MACHINE_ID: reqParams.GROUP_ID }, session);

  await assets.removingAssetsByMachine({ MACHINE_ID: reqParams.GROUP_ID }, session);

  await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DAMS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DACS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DRIS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DUTS_AUTOMATION.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID }, session.user);
  await sqldb.DUTS_REFERENCE.w_deleteFromMachine({MACHINE_ID: reqParams.GROUP_ID}, session.user);

  await sqldb.MACHINE_IMAGES.w_deleteMachineImgInfo({ MACHINE_ID: reqParams.GROUP_ID }, session.user);

  await sqldb.ELECTRIC_CIRCUITS_MACHINES.w_deleteElectricCircuitsMachinesByID({MACHINE_ID: reqParams.GROUP_ID}, session.user);
  await sqldb.ELECTRIC_CIRCUITS.w_deleteByMachineId({MACHINE_ID: reqParams.GROUP_ID}, session.user);
  await sqldb.REFRIGERATES.w_deleteFromMachineRow({MACHINE_ID: reqParams.GROUP_ID}, session.user);
  await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_deleteFromMachine({ MACHINE_ID: reqParams.GROUP_ID }, session.user);
  const { affectedRows } = await sqldb.MACHINES.w_deleteRow({ MACHINE_IDS: [reqParams.GROUP_ID] }, {
    FAULTS_DATAS: true,
    HEALTH_BEFORE_OFFLINE: true,
    ASSETS_HEALTH: true,
    ASSETS_HEALTH_HIST: true,
    AIR_CURTAINS: true,
    CONDENSERS: true,
    EVAPORATORS: true,
    DACS_CONDENSERS: true,
    DACS_EVAPORATORS: true,
    CONDENSERS_HEAT_EXCHANGERS: true,
    EVAPORATORS_HEAT_EXCHANGERS: true,
    ASSOC_MACHINES: true,
    ASSOCIATIONS: true,
    MACHINE_IMAGES: true,
    REFRIGERATES: true,
    ADDITIONAL_MACHINE_PARAMETERS: true,
  }, session.user);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();

  return `DELETED ` + affectedRows
}

httpRouter.privateRoutes['/clients/remove-group'] = removeMachine;

export const getGroupInfo = async function (reqParams: httpRouter.ApiParams['/clients/get-group-info'], session: SessionData) {
  if (reqParams.GROUP_ID !== 0 && (!reqParams.GROUP_ID)) {
    throw Error('Invalid properties. Missing GROUP_ID.').HttpStatus(400)
  }
  const machineInfo = await sqldb.MACHINES.getMachineInfo({
    MACHINE_ID: reqParams.GROUP_ID,
  });
  if (!machineInfo) throw Error('Máquina não encontrada').HttpStatus(400)

  const machine_autom = await sqldb.MACHINES.getMachineAutInfo({ MACHINE_ID: reqParams.GROUP_ID });
  let automId = machine_autom.DUT_AUT_DISABLED === 0 ? machine_autom.DUT_AS_DUTAUT : null;
  automId = machineInfo.DEV_AUT || automId;

  const deviceInfo = automId ? await sqldb.DEVICES.getDeviceIdByDeviceCode({DEVICE_CODE: automId}) : null;

  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  return {
    GROUP_ID: machineInfo.GROUP_ID,
    GROUP_NAME: machineInfo.GROUP_NAME,
    UNIT_NAME: machineInfo.UNIT_NAME,
    UNIT_ID: machineInfo.UNIT_ID,
    CLIENT_ID: machineInfo.CLIENT_ID,
    DAM_DAT_BEGMON: machineInfo.DAM_DAT_BEGMON,
    MODEL: machineInfo.MODEL,
    INSTALLATION_DATE: machineInfo.INSTALLATION_DATE,
    AUTOM_ID: automId,
    FLUID_TYPE: machineInfo.FLUID_TYPE,
    MCHN_BRAND: machineInfo.MACHINE_BRAND,
    AUTOM_DEVICE_ID: deviceInfo?.DEVICE_ID || undefined
  };
}

httpRouter.privateRoutes['/clients/get-group-info'] = getGroupInfo;

export const getMachinesList = async function (reqParams: httpRouter.ApiParams['/clients/get-machines-list'], session: SessionData) {
  if ((reqParams as any).CLIENT_IDS) reqParams.clientIds = (reqParams as any).CLIENT_IDS;
  if ((reqParams as any).CLIENT_ID) reqParams.clientIds = [(reqParams as any).CLIENT_ID];
  if ((reqParams as any).UNIT_ID) reqParams.unitIds = [(reqParams as any).UNIT_ID];

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const machines = await sqldb.MACHINES.getMachinesList({ UNIT_IDS: reqParams.unitIds, CLIENT_IDS: reqParams.clientIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT});
  const list = machines.filter(machine => machine.MACHINE_ID !== null);

  const assetsList = await sqldb.ASSETS.getAssetsList({
    unitIds: reqParams.unitIds,
    clientIds: reqParams.clientIds,
  }, {
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
  });

  const response = [] as {
    GROUP_ID: number
    GROUP_NAME: string
    DEV_AUT: string
    DEV_AUTO: string
    DAM_ID: string
    DUT_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    MODEL: string | null
    INSTALLATION_DATE: string|null
    GROUP_TYPE: string|null
    BRAND: string|null
    FRIGO_CAPACITY: number|null
    FRIGO_CAPACITY_UNIT: string|null
    FLUID_TYPE: string|null
    RATED_POWER: number|null
    DEVS_COUNT: number
    ASSETS_COUNT: number
    MCHN_APPL: string | null
    MACHINE_RATED_POWER: number
    assets: Asset[];
  }[];

  for (const machine of list) {

    const assetsMachine = assetsList.filter((asset) => asset.GROUP_ID && asset.GROUP_ID === machine.MACHINE_ID);
    const totalDevsAux = assetsMachine.filter(asset => asset.DEV_CLIENT_ASSET_ID != null);
    const totalDevs = totalDevsAux.length + (machine.DEV_AUT ? 1 : 0) + (machine.DUT_ID ? 1 : 0);

    response.push({
      ...machine,
      DAM_ID: (machine.DEV_AUT?.startsWith('DAM') || machine.DEV_AUT?.startsWith('DAC')) && machine.DEV_AUT,
      DEV_AUTO: machine.DEV_AUT,
      DEVS_COUNT: totalDevs,
      ASSETS_COUNT: assetsMachine.length,
      assets: assetsMachine,
      GROUP_ID:machine.MACHINE_ID, 
      GROUP_NAME: machine.MACHINE_NAME,
    })
  }
  return response;

}

httpRouter.privateRoutes['/clients/get-machines-list'] = getMachinesList;

async function controlRefrigeratesWithDut(
  dutInfo: Awaited<ReturnType<typeof sqldb.DUTS.getDevExtraInfo>>,
  qPars: { machineId: number, machineName: string, unitId: number, DUT_CODE?: string, environmentId?: number, environmentName?: string },
  userId: string
) {
   // Se DUT tem ambiente associado na mesma unidade, adicionar em refrigerates
   if (dutInfo.ENVIRONMENT_ID && dutInfo.UNIT_ID === qPars.unitId) {
    await sqldb.REFRIGERATES.w_deleteFromMachineRow({MACHINE_ID: qPars.machineId}, userId);
    await sqldb.REFRIGERATES.w_insert({ENVIRONMENT_ID: dutInfo.ENVIRONMENT_ID, MACHINE_ID: qPars.machineId}, userId);
  }
  // Se DUT não tem ambiente ou era de outra unidade; necessário limpar associação anterior e criar novo ambiente
  else {
    await sqldb.DUTS_REFERENCE.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DUT_CODE}, userId);
    await sqldb.DUTS_MONITORING.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DUT_CODE}, userId);

    let environmentId = qPars.environmentId
    if (!qPars.environmentId) {
      const insertedEnvironment = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: qPars.unitId, ENVIRONMENT_NAME: qPars.environmentName || dutInfo.DEV_ID, IS_VISIBLE: true, ENVIRONMENT_TYPE: null}, userId);
      environmentId = insertedEnvironment.insertId;
      const refrigerateInfo = await sqldb.REFRIGERATES.getRefrigerateInfo({MACHINE_ID: qPars.machineId});
      if (refrigerateInfo.length > 0) {
        await sqldb.REFRIGERATES.w_deleteFromMachineRow({ MACHINE_ID: qPars.machineId}, userId);
      }
      await sqldb.REFRIGERATES.w_insert({ENVIRONMENT_ID: environmentId, MACHINE_ID: qPars.machineId}, userId);
    }
    await sqldb.DUTS_MONITORING.w_insert({DUT_DEVICE_ID: dutInfo.DUT_DEVICE_ID, ENVIRONMENT_ID: environmentId}, userId);
  }
}

async function fixConsistencyAut(userId: string) {
  const dutsAutomationToFix = await sqldb.DUTS_AUTOMATION.getDutsAutomationToFix({});
  const damsAutomationsToFix = await sqldb.DAMS_AUTOMATIONS.getDamsAutomationsToFix({});
  const dacsAutomationsToFix = await sqldb.DACS_AUTOMATIONS.getDacsAutomationsToFix({});
  const driAutomationsToFix = await sqldb.DRIS_AUTOMATIONS.getDrisAutomationsToFix({});
  const damsIlluminationsToFix = await sqldb.DAMS_ILLUMINATIONS.getDamsIlluminationsToFix({});

  for (const item of dutsAutomationToFix) {
    await sqldb.DUTS_AUTOMATION.w_deleteRow({ID: item.DUT_AUTOMATION_ID}, userId);
  }
  for (const item of damsAutomationsToFix) {
    await sqldb.DAMS_AUTOMATIONS.w_deleteRow({ID: item.DAM_AUTOMATION_ID}, userId);
  }
  for (const item of dacsAutomationsToFix) {
    await sqldb.DACS_AUTOMATIONS.w_deleteRow({ID: item.DAC_AUTOMATION_ID}, userId);
  }
  for (const item of driAutomationsToFix) {
    await sqldb.DRIS_AUTOMATIONS.w_deleteRow({ID: item.DRI_AUTOMATION_ID}, userId);
  }
  for (const item of damsIlluminationsToFix) {
    await sqldb.DAMS_ILLUMINATIONS.w_deleteRow({ID: item.DAM_ILLUMINATION_ID}, userId);
  }

  const affectedRowsTotal = dutsAutomationToFix.length + damsAutomationsToFix.length + dacsAutomationsToFix.length + driAutomationsToFix.length + damsIlluminationsToFix.length;

  return affectedRowsTotal;
}
export async function checkFixConsistency(userId: string) {
  // Remove os dispositivos que não são do mesmo cliente do grupo

  const affectedRows = await fixConsistencyAut(userId);
  const dutsReferenceToFix = await sqldb.DUTS_REFERENCE.getDutsReferenceToFix({});
  for (const item of dutsReferenceToFix) {
    await sqldb.DUTS_REFERENCE.w_deleteRow({ID: item.DUT_REFERENCE_ID},userId);
  }
  if (affectedRows > 0) await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function setMachinesDut(DUT_ID: string, irEnabled: boolean, machines: number[], userId: string) {
  const errors: Error[] = [];

  const currentMachines = await sqldb.MACHINES.getDutMachines({ DUT_ID });
  for (const machine of currentMachines) {
    const machineId = machine.GROUP_ID;
    if (!machines.includes(machineId)) {
      // Se o DUT automatizar a máquina, tira a automação de DUT.
      const devAut = null as string;
      await setMachineAutomation(machineId, { DEV_AUT: devAut, DUT_ID: null }, `setMachinesDut (amont) ${JSON.stringify({ DUT_ID, machineId, machines })}`, userId)
        .catch((err) => {
          logger.error(err);
          errors.push(err);
        });
    }
  }

  for (const machineId of machines) {
    const currentMachineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: machineId });
    // Se o DUT automatizar a máquina, tira a automação de DAM.
    const devAut = DUT_ID;
    if ((currentMachineInfo.DUT_ID !== DUT_ID) || (currentMachineInfo.DEV_AUT !== devAut)) {
      await setMachineAutomation(machineId, { DEV_AUT: devAut, DUT_ID }, `setMachinesDut (aval) ${JSON.stringify({ DEV_AUT: devAut, DUT_ID, machineId, machines })}`, userId)
        .catch((err) => {
          logger.error(err);
          errors.push(err);
        });
    }
  }
}

export async function onDutAutomEnabling(dutId: string, userId: string) {
  // Evitar que a automação de um DUT seja ativada quando ele não puder estar no grupo
  const machines = await sqldb.MACHINES.getMachinesList({ DUT_ID: dutId });
  const alreadyWithAut = machines.filter(machine => !!machine.DEV_AUT);
  if (alreadyWithAut.length > 0) {
    // Avisar no Telegram e remover DUT desses grupos
    for (const machine of alreadyWithAut) {
      await setMachineAutomation(machine.MACHINE_ID, { DUT_ID: null }, `onDutAutomEnabling ${JSON.stringify({ dutId, machine })}`, userId)
    }
  }
}

export async function setMachineDut(machineId: number, relatedDut: string, userId: string) {
  const currentMachineInfo = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: machineId });
  await setMachineAutomation(machineId, {
    DEV_AUT: currentMachineInfo.DEV_AUT,
    DUT_ID: relatedDut,
  }, `setMachineDut ${JSON.stringify({ machineId, relatedDut })}`, userId);
}

export async function setMachinesAutomatedByDam(DAM_ID: string, machines: number[], relatedDut: string, userId: string) {
  const errors: Error[] = [];

  const currentMachines = (await sqldb.MACHINES.getDamMachines({ DEV_AUT: DAM_ID })).map(machine => machine.GROUP_ID);
  for (const machineId of currentMachines) {
    if (!machines.includes(machineId)) {
      await setMachineAutomation(machineId, { DEV_AUT: null, DUT_ID: null }, `setMachinesAutomatedByDam (amont) ${JSON.stringify({ DAM_ID, relatedDut, machineId, machines })}`, userId)
        .catch((err) => {
          logger.error(err);
          errors.push(err);
        });
    }
  }

  for (const machineId of machines) {
    if (relatedDut === undefined) {
      const machine = await sqldb.MACHINES.getMachineInfo({ MACHINE_ID: machineId });
      relatedDut = machine.DUT_ID;
    }
    await setMachineAutomation(machineId, { DEV_AUT: DAM_ID, DUT_ID: relatedDut }, `setMachinesAutomatedByDam (aval) ${JSON.stringify({ DAM_ID, relatedDut, machineId, machines })}`, userId)
      .catch((err) => {
        logger.error(err);
        errors.push(err);
      });
  }

  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();

  // Verifica se está na tabela de DACs e a qual grupo está associado.
  // Encontra todos os grupos que são automatizados por um desses dois
}

type TMachineInfo = {
  automatedBy: string[];
  temperatureSensors: string[];
  dacs: string[];
  dacsAut: string[];
  CLIENT_ID: number;
  UNIT_ID: number;
  problemsFound: string[];
}

async function checkUnitNullDam(automation: { DEV_AUT?: string, DUT_ID?: string}, damInfo: {
  DEV_ID: string;
  DEVICE_ID: number;
  CLIENT_ID: number;
  UNIT_ID: number;
  DISAB: number;
  ENABLE_ECO: number;
  ECO_CFG: string;
  DAT_BEGAUT: string;
  FWVERS: string;
}, machineInfo: TMachineInfo, userId: string) {
  if (automation.DEV_AUT?.startsWith('DAM') && damInfo.UNIT_ID === null && (machineInfo.CLIENT_ID === damInfo.CLIENT_ID || damInfo.CLIENT_ID === null)) {
    await sqldb.DEVICES_UNITS.w_insert({UNIT_ID: machineInfo.UNIT_ID, DEVICE_ID: damInfo.DEVICE_ID}, userId);
    await sendCommandToDeviceWithConfigTimezone({ userId, devId: damInfo.DEVICE_ID });
  } else if (damInfo && damInfo.UNIT_ID !== machineInfo.UNIT_ID) throw Error('O DAM não está na mesma unidade que a máquina').HttpStatus(400);
}

async function checkUnitNullDac(automation: { DEV_AUT?: string, DUT_ID?: string}, dacInfo: {
  DAC_ID: string;
  DEVICE_ID: number;
  CLIENT_ID: number;
  UNIT_ID: number;
}, machineInfo: TMachineInfo, userId: string) {
  if (automation.DEV_AUT?.startsWith('DAC') && dacInfo.UNIT_ID === null && (machineInfo.CLIENT_ID === dacInfo.CLIENT_ID || dacInfo.CLIENT_ID === null)) {
    await sqldb.DEVICES_UNITS.w_insert({UNIT_ID: machineInfo.UNIT_ID, DEVICE_ID: dacInfo.DEVICE_ID}, userId);
    await sendCommandToDeviceWithConfigTimezone({ userId, devId: dacInfo.DEVICE_ID });
  } else if (dacInfo && dacInfo.UNIT_ID !== machineInfo.UNIT_ID) throw Error('O DAC não está na mesma unidade que a máquina').HttpStatus(400);
}

async function checkUnitNullDri(automation: { DEV_AUT?: string, DUT_ID?: string}, driInfo: {
  DRI_ID: string;
  DEVICE_ID: number;
  CLIENT_ID: number;
  UNIT_ID: number;
  VARSCFG: string;
  ENABLE_ECO: number;
  DAT_BEGAUT: string;
}, machineInfo: TMachineInfo, userId: string) {
  if (automation.DEV_AUT?.startsWith('DRI') && driInfo.UNIT_ID === null && (driInfo.CLIENT_ID === machineInfo.CLIENT_ID || driInfo.CLIENT_ID === null)) {
    await sqldb.DEVICES_UNITS.w_insert({UNIT_ID: machineInfo.UNIT_ID, DEVICE_ID: driInfo.DEVICE_ID}, userId);
    await sendCommandToDeviceWithConfigTimezone({ userId, devId: driInfo.DEVICE_ID });
  } else if (driInfo && driInfo.UNIT_ID !== machineInfo.UNIT_ID) throw Error('O DRI não está na mesma unidade que a máquina').HttpStatus(400);
}

type TDutAutType = {
  DEV_ID: string
  DEVICE_ID: number;
  CLIENT_ID: number
  UNIT_ID: number
  DISAB: number
  TSETPOINT: number
  LTCRIT: number
  RESENDPER: number
  CTRLOPER: string
  DAT_BEGAUT: string
  PORTCFG: 'IR'|'RELAY'
  LTINF: number
  UPPER_HYSTERESIS: number
  LOWER_HYSTERESIS: number
  TEMPERATURE_OFFSET: number
  SCHEDULE_START_BEHAVIOR: string
  SCHEDULE_END_BEHAVIOR: string
  FORCED_BEHAVIOR: string
  ACTION_MODE: string
  ACTION_TIME: number
  ACTION_POST_BEHAVIOR: string
  VARS: string
}

async function checkUnitNullDut(automation: { DEV_AUT?: string, DUT_ID?: string}, dutInfo: TDutAutType | {
  CLIENT_ID: number
  DEVICE_ID: number;
  UNIT_ID: number
  TEMPERATURE_OFFSET: number
  SENSOR_AUTOM: number
}, machineInfo: TMachineInfo, dutAutInfo: TDutAutType, userId: string) {
  if (dutInfo && dutInfo.UNIT_ID === null && (dutInfo.CLIENT_ID === machineInfo.CLIENT_ID || dutInfo.CLIENT_ID === null)) {
    await sqldb.DEVICES_UNITS.w_insert({UNIT_ID: machineInfo.UNIT_ID, DEVICE_ID: dutInfo.DEVICE_ID}, userId);
    await sendCommandToDeviceWithConfigTimezone({ userId, devId: dutInfo.DEVICE_ID });
  } else if (dutInfo && dutInfo.UNIT_ID !== machineInfo.UNIT_ID) throw Error('O DUT não está na mesma unidade que a máquina').HttpStatus(400);
}

function checkAutomationVerify(automation: { DEV_AUT?: string, DUT_ID?: string}, machineInfo: TMachineInfo, dutAutInfo: TDutAutType) {

  const shouldBeAutomatedByDac = (machineInfo.dacsAut.length > 0);
  if (shouldBeAutomatedByDac && automation.DEV_AUT != null) {
    if (!machineInfo.dacsAut.includes(automation.DEV_AUT)) throw Error('A máquina deve ser automatizada por um de seus DACs').HttpStatus(400);
    if (dutAutInfo && dutAutInfo.DISAB !== 1) throw Error('A máquina já é automatizada por um de seus DACs').HttpStatus(400);
  }
  const automationDevsList = [automation.DEV_AUT, dutAutInfo && dutAutInfo.DISAB !== 1 && dutAutInfo.DEV_ID !== automation.DEV_AUT];
  if (automationDevsList.filter((dev) => dev).length > 1) {
    throw Error('A máquina só pode ser automatizada por 1 dispositivo').HttpStatus(500);
  }
}

async function getMachineDevs(groupId: number, emmitWarns: boolean, debugInfo: string) {
  const [
    machine_info,
    machine_dacs,
  ] = await Promise.all([
    sqldb.MACHINES.getMachineAutInfo({ MACHINE_ID: groupId }),
    sqldb.DACS_DEVICES.getMachineDacs({ MACHINE_ID: groupId }),
  ]);

  const problemsFound = [];

  if (!machine_info) throw Error('Invalid group').Details(400, { errorCode: 'INVALID_GROUP_ID', debugInfo: { groupId } });

  const DAM_DUT_REFS = machine_info.DEV_AUT && await getDutsUsedAsRefByDam(machine_info.DEV_AUT, machine_info.CLIENT_ID, machine_info.UNIT_ID);
  const DAM_DUT_REF = DAM_DUT_REFS && DAM_DUT_REFS.join(',');

  const automatedBy: { [devId: string]: boolean } = {};
  const temperatureSensors: { [dutId: string]: boolean } = {};

  const dacsAut = machine_dacs.filter(dac => (dac.AS_DAM && dac.DAC_AUT_DISABLED !== 1));
  for (const dac of dacsAut) {
    automatedBy[dac.DAC_ID] = true;
    if (emmitWarns && machine_info.DEV_AUT !== dac.DAC_ID) {
      // eventWarn.typedWarn("DB_CONSISTENCY", `group ${groupId} has DAC automation ${dac.DAC_ID} but is controlled by DAM ${machine_info.DAM_ID}\n${debugInfo}`);
      problemsFound.push(`DB_CONSISTENCY: group ${groupId} has DAC automation ${dac.DAC_ID} but is controlled by DAM ${machine_info.DEV_AUT}`)
      // SELECT
      //   DEVGROUPS.GROUP_ID,
      //   DEVGROUPS.DAM_ID,
      //   DEVACS.DAC_ID,
      //   DAMS.DISAB,
      //   CLIENTS.NAME AS CLIENT_NAME,
      //   CLUNITS.UNIT_NAME,
      //   DEVGROUPS.GROUP_NAME
      // FROM DEVGROUPS
      //   INNER JOIN DEVACS ON (DEVACS.GROUP_ID = DEVGROUPS.GROUP_ID)
      //   INNER JOIN DAMS ON (DAMS.DAM_ID = DEVACS.DAC_ID)
      //   INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVGROUPS.UNIT_ID)
      //   INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
      // WHERE
      //   (DEVACS.DAC_ID <> DEVGROUPS.DAM_ID)
      //   AND (DAMS.DISAB IS NULL OR DAMS.DISAB <> 1)
    }
  }
  if (machine_info.DEV_AUT) {
    automatedBy[machine_info.DEV_AUT] = true;
  }
  if (machine_info.DUT_AS_DUTAUT && machine_info.DUT_AUT_DISABLED !== 1) {
    automatedBy[machine_info.DUT_ID] = true;
    if (emmitWarns && machine_info.DEV_AUT) {
      // eventWarn.typedWarn("DB_CONSISTENCY", `group ${groupId} controlled by DUT ${machine_info.DUT_AS_DUTAUT} and DAM ${machine_info.DAM_ID}\n${debugInfo}`);
      problemsFound.push(`DB_CONSISTENCY: group ${groupId} controlled by DUT ${machine_info.DUT_AS_DUTAUT} and DAM ${machine_info.DEV_AUT}`)
    }
  }
  if (emmitWarns && DAM_DUT_REF && machine_info.DUT_ID !== DAM_DUT_REF) {
    // eventWarn.typedWarn("DB_CONSISTENCY", `group ${groupId} reads temperature from ${machine_info.DUT_ID || '(null)'} and DAM from ${DAM_DUT_REF}\n${debugInfo}`);
    problemsFound.push(`DB_CONSISTENCY: group ${groupId} reads temperature from ${machine_info.DUT_ID || '(null)'} and DAM from ${DAM_DUT_REF}`)
    // SELECT
    //   DEVGROUPS.GROUP_ID,
    //   DEVGROUPS.DAM_ID,
    //   DEVGROUPS.DUT_ID,
    //   DAMS.REL_DUT_ID,
    //   CLIENTS.NAME AS CLIENT_NAME,
    //   CLUNITS.UNIT_NAME,
    //   DEVGROUPS.GROUP_NAME
    // FROM DEVGROUPS
    //   LEFT JOIN DAMS ON (DAMS.DAM_ID = DEVGROUPS.DAM_ID)
    //   INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = DEVGROUPS.UNIT_ID)
    //   INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = CLUNITS.CLIENT_ID)
    // WHERE
    //   (DAMS.REL_DUT_ID <> DEVGROUPS.DUT_ID)
    //   OR ((DAMS.REL_DUT_ID IS NULL) AND (DEVGROUPS.DUT_ID IS NOT NULL))
    //   OR ((DAMS.REL_DUT_ID IS NOT NULL) AND (DEVGROUPS.DUT_ID IS NULL))
  }
  if (machine_info.DUT_ID) {
    temperatureSensors[machine_info.DUT_ID] = true;
  }
  if (DAM_DUT_REFS) {
    for (const dutId of DAM_DUT_REFS) {
      temperatureSensors[dutId] = true;
    }
  }
  if (emmitWarns && Object.keys(automatedBy).length > 1) {
    // eventWarn.typedWarn("DB_CONSISTENCY", `group ${groupId} has multiple automations: ${Object.keys(automatedBy).join(', ')}\n${debugInfo}`);
    problemsFound.push(`DB_CONSISTENCY: group ${groupId} has multiple automations: ${Object.keys(automatedBy).join(', ')}`)
  }
  if (emmitWarns && Object.keys(temperatureSensors).length > 1) {
    // eventWarn.typedWarn("DB_CONSISTENCY", `group ${groupId} has multiple sensors: ${Object.keys(temperatureSensors).join(', ')}\n${debugInfo}`);
    problemsFound.push(`DB_CONSISTENCY: group ${groupId} has multiple sensors: ${Object.keys(temperatureSensors).join(', ')}`)
  }

  return {
    automatedBy: Object.keys(automatedBy),
    temperatureSensors: Object.keys(temperatureSensors),
    dacs: machine_dacs.map(dac => dac.DAC_ID),
    dacsAut: dacsAut.map(dac => dac.DAC_ID),
    CLIENT_ID: machine_info.CLIENT_ID,
    UNIT_ID: machine_info.UNIT_ID,
    problemsFound,
  }
}

export async function deleteUnitMachines (qPars: { UNIT_ID: number }, userId: string) {
  const machines = await sqldb.MACHINES.getMachineIdByUnitId({ UNIT_ID: qPars.UNIT_ID });
  await dacInfo.removeUnitMachines({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteFromUnitAssets(qPars, userId);
  await sqldb.DRIS_CHILLERS.w_deleteFromUnitAssets(qPars, userId);
  await assets.removingUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await associations.removingUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await deleteMachinesImagesFromUnit(qPars.UNIT_ID, userId);
  await sqldb.REFRIGERATES.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.DUTS_REFERENCE.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.DUTS_MONITORING.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.ENVIRONMENTS_ROOM_TYPES.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.ENVIRONMENTS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);

  if (machines.length) {
    const MACHINE_IDS = machines.map(x => x.MACHINE_ID);
    await sqldb.MACHINES.w_deleteRow({ MACHINE_IDS }, {
     FAULTS_DATAS: true,
     HEALTH_BEFORE_OFFLINE: true,
     ASSETS_HEALTH: true,
     ASSETS_HEALTH_HIST: true,
     AIR_CURTAINS: true,
     CONDENSERS: true,
     EVAPORATORS: true,
     DACS_CONDENSERS: true,
     DACS_EVAPORATORS: true,
     CONDENSERS_HEAT_EXCHANGERS: true,
     EVAPORATORS_HEAT_EXCHANGERS: true,
     ASSOC_MACHINES: true,
     ASSOCIATIONS: true,
     MACHINE_IMAGES: true,
     REFRIGERATES: true,
     ADDITIONAL_MACHINE_PARAMETERS: true,
   }, userId);
  }
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

async function deleteMachinesImagesFromUnit(UNIT_ID: number, userId: string) {
  const machines = await sqldb.MACHINES.getMachinesList({ UNIT_ID: UNIT_ID });
  for (const machine of machines) {
    const results = await sqldb.MACHINE_IMAGES.getList({ MACHINE_ID: machine.MACHINE_ID });
    const urlPrefix = `${configfile.filesBucket.url}/${configfile.filesBucket.devGroupsImagesBucketPath}`
    const list = results.map(row => (urlPrefix + row.FILENAME))
    for (const image of list) {
      await machinesDeleteImage(image, machine.MACHINE_ID, userId);
    }
  }
}

async function deleteMachinesImagesFromClient(CLIENT_ID: number, userId: string) {
  const machines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [CLIENT_ID] });
  for (const machine of machines) {
    const results = await sqldb.MACHINE_IMAGES.getList({ MACHINE_ID: machine.MACHINE_ID });
    const urlPrefix = `${configfile.filesBucket.url}/${configfile.filesBucket.devGroupsImagesBucketPath}`
    const list = results.map(row => (urlPrefix + row.FILENAME))
    for (const image of list) {
      await machinesDeleteImage(image, machine.MACHINE_ID, userId);
    }
  }
}

export async function removingClient(qPars: { CLIENT_ID: number }, userId: string) {
  // TODO: verificar se tem que avisar o MQTT server da alteração
  await dacInfo.removingClientMachines(qPars, userId);
  await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteFromClientDris(qPars, userId);
  await sqldb.DRIS_CHILLERS.w_deleteFromClientDris(qPars, userId);
  await assets.removingClientAssets(qPars, userId);
  await associations.removingClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await deleteMachinesImagesFromClient(qPars.CLIENT_ID, userId);
  await sqldb.REFRIGERATES.w_deleteFromClient({CLIENT_ID: qPars.CLIENT_ID}, userId);
  await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_deleteFromCLient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_deleteByClientId({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.MACHINES_AUTOMATIONS_PERIODS.w_deleteByClientId({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.DUTS_AUTOMATION.w_deleteFromClientMachine(qPars, userId);
  await sqldb.DUTS_REFERENCE.w_deleteFromClientMachine(qPars, userId);
  await sqldb.DAMS_AUTOMATIONS.w_deleteFromClientMachine(qPars, userId);
  await sqldb.DACS_AUTOMATIONS.w_deleteFromClientMachine(qPars, userId);
  await sqldb.DRIS_AUTOMATIONS.w_deleteFromClientMachine(qPars, userId);
  await sqldb.ELECTRIC_CIRCUITS_MACHINES.w_deleteFromClient(qPars, userId);
  await sqldb.MACHINES.w_deleteFromClient(qPars, {
    FAULTS_DATAS: true,
    HEALTH_BEFORE_OFFLINE: true,
    ASSETS_HEALTH: true,
    ASSETS_HEALTH_HIST: true,
    AIR_CURTAINS: true,
    CONDENSERS_HEAT_EXCHANGERS: true,
    EVAPORATORS_HEAT_EXCHANGERS: true,
    CONDENSERS: true,
    EVAPORATORS: true,
    DACS_CONDENSERS: true,
    DACS_EVAPORATORS: true,
    ASSOC_MACHINES: true,
    ASSOCIATIONS: true,
    MACHINE_IMAGES: true,
    ADDITIONAL_MACHINE_PARAMETERS: true
  }, userId);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function removingClientDams(qPars: { CLIENT_ID: number }, userId: string) {
  // TODO: verificar se tem que avisar o MQTT server da alteração
  await sqldb.DAMS_AUTOMATIONS.w_removeClientMachinesDam(qPars, userId);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function removingDam(qPars: { DAM_ID: string }, userId: string) {
  // TODO: verificar se tem que avisar o MQTT server da alteração
  await sqldb.DAMS_AUTOMATIONS.w_removeDam({ DEV_AUT: qPars.DAM_ID }, userId);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function removingClientDuts (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.DUTS_REFERENCE.w_removeClientDuts(qPars, userId);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function removingDut (qPars: { DUT_ID: string }, userId: string) {
  await sqldb.DUTS_REFERENCE.w_removeDut({ DUT_ID: qPars.DUT_ID }, userId);
  await sqldb.DUTS_AUTOMATION.w_deleteFromDeviceCode({DEVICE_CODE: qPars.DUT_ID }, userId);
  await eventHooks.ramCaches_DEVGROUPS_loadAutomationRefs();
}

export async function controlAutomMachine(qPars: { groupId: number, automation: { DEV_AUT?: string, DUT_ID?: string }, }, userId: string) {
  const machineInfo = await sqldb.MACHINES.getMachineInfo({
    MACHINE_ID: qPars.groupId,
  });

  const machine_autom = await sqldb.MACHINES.getMachineAutInfo({ MACHINE_ID: qPars.groupId });
  let automId = machine_autom.DUT_AUT_DISABLED === 0 ? machine_autom.DUT_AS_DUTAUT : null;
  automId = machineInfo.DEV_AUT || automId;

  // Se precisar, atualiza DUT_REFERENCE
  if (qPars.automation.DUT_ID !== undefined && machine_autom.DUT_ID !== qPars.automation.DUT_ID) {
    const dutInfo = await sqldb.DUTS.getBasicInfo( {devId: qPars.automation.DUT_ID } )
    // DUTs QA contêm umidade & CO2
    if (dutInfo && dutInfo.VARS && dutInfo.VARS.includes('HD')) {
      throw Error('DUTs QA cannot be used as temperature references.').HttpStatus(400);
    }
    if (machine_autom.DUT_ID) {
      await sqldb.DUTS_REFERENCE.w_deleteFromMachine({ MACHINE_ID: qPars.groupId }, userId);
    }
    if (qPars.automation.DUT_ID) {
      const dutRefInfo = await sqldb.DUTS_DEVICES.getDutsDevicesInfo({DEVICE_CODE: qPars.automation.DUT_ID});
      if (dutRefInfo[0].DUT_MONITORING_ID && !dutRefInfo.find(item => item.MACHINE_ID === qPars.groupId)) {
          await sqldb.DUTS_REFERENCE.w_insert({DUT_MONITORING_ID: dutRefInfo[0].DUT_MONITORING_ID, MACHINE_ID: qPars.groupId}, userId);
      }
    }
  }
  // Se precisar, atualiza DEV_AUT
  if (qPars.automation.DEV_AUT !== undefined && machine_autom.DEV_AUT !== qPars.automation.DEV_AUT ) {
    if (machine_autom.DEV_AUT) {
      await sqldb.DUTS_AUTOMATION.w_deleteByMachineId({MACHINE_ID: qPars.groupId}, userId);
      await sqldb.DAMS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: qPars.groupId}, userId);
      await sqldb.DACS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: qPars.groupId}, userId);
      await sqldb.DRIS_AUTOMATIONS.w_deleteByMachineId({MACHINE_ID: qPars.groupId}, userId);
    }
    if (qPars.automation.DEV_AUT) {      
      const devInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: qPars.automation.DEV_AUT});
      const returnSetMachineCurrentAutomation = await setMachineCurrentAutomation(qPars.groupId, qPars.automation.DEV_AUT, userId);
      if (devInfo.DAC_DEVICE_ID) {
        await sqldb.DACS_AUTOMATIONS.w_insert({DAC_DEVICE_ID: devInfo.DAC_DEVICE_ID, MACHINE_ID: qPars.groupId, DISAB: 0, FW_MODE: 'DAC-1R'}, userId);
      }
      else if (devInfo.DAM_DEVICE_ID) {
        await sqldb.DAMS_AUTOMATIONS.w_insert({DAM_DEVICE_ID: devInfo.DAM_DEVICE_ID, MACHINE_ID: qPars.groupId, READ_DUT_TEMPERATURE_FROM_BROKER: false }, userId);
      }
      else if (devInfo.DUT_DEVICE_ID) {
        await sqldb.DUTS_AUTOMATION.w_insert({DUT_DEVICE_ID: devInfo.DUT_DEVICE_ID, MACHINE_ID: qPars.groupId, DISAB: 0 }, userId);
      }
      else if (devInfo.DRI_DEVICE_ID) {
        await sqldb.DRIS_AUTOMATIONS.w_insert({DRI_DEVICE_ID: devInfo.DRI_DEVICE_ID, MACHINE_ID: qPars.groupId}, userId);
      }

      // Envia programação gravada anteriormente na máquina ao novo dispositivo
      if (returnSetMachineCurrentAutomation === 'keep-from-machine') {
        let needResendDesired = true;
        if (devInfo.DAM_DEVICE_ID) {
          // Envia parâmetros de eco local
          await controlEcoLocalParameters(qPars.automation.DEV_AUT, qPars.automation.DUT_ID, userId);
        }
        else if (devInfo.DUT_DEVICE_ID) {
          const dutInfo = await sqldb.DUTS_SCHEDULES.getDutScheds({DUT_ID: qPars.automation.DEV_AUT, SCHEDULE_STATUS: '1'});
          if (dutInfo.length > 0 && dutInfo[0].NEED_MULT_SCHEDULES) {
            // Envia parametros de eco
            await resendDutAutConfig({devId: qPars.automation.DEV_AUT, user: userId});
          }
          else {
            needResendDesired = false;
          }
        }

        if (needResendDesired) {
          // Envia programação horária da máquina ao dispositivo
          try {
            const currentAutomationParameters = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: qPars.automation.DEV_AUT});
            const lastProg = {version: "v4", week: {}, exceptions: {}} as FullProg_v4;
            await sendMachineProgrammingToDev(qPars.automation.DEV_AUT, JSON.parse(currentAutomationParameters.DESIRED_PROG) as FullProg_v4, lastProg, !!devInfo.DUT_DEVICE_ID);
            requestDevSchedule(qPars.automation.DEV_AUT, userId);
          }
          catch (err) {
            logger.error(`msg: ${(err && (err as Error).message) || 'ERROR 129'} - user: ${userId} - params: ${JSON.stringify(qPars)}`);
          }
        }
      }
    }
  }
}

export async function setMachineCurrentAutomation(machineId: number, deviceCode: string, userId: string) {
  const currentAutomationFromDevice = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParametersByDevice({DEVICE_CODE: deviceCode});
  const currentAutomationFromMachine = await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.getMachineCurrentAutomationsParameters({MACHINE_ID: machineId});
  
  // Se máquina não tem registro relacionado de CURRENT_AUTOMATIONS_PARAMETERS
  if (currentAutomationFromMachine == null) {
    // Se automação relacionada às máquinas automatizadas do dispositivo for nulo, cria novo registro para máquina e faz o relacionamento
    if (currentAutomationFromDevice == null) {
      const inserted = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({LAST_AUTOMATION_DEVICE_TYPE: deviceCode.substring(0,3)}, userId);
      await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_insert({MACHINE_ID: machineId, CURRENT_AUTOMATION_PARAMETERS_ID: inserted.insertId}, userId);
      return 'new';
    }
    // Se automação relacionada às máquinas automatizadas do dispositivo for diferete de nulo, relaciona também com máquina atual
    else {
      await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_insert({MACHINE_ID: machineId, CURRENT_AUTOMATION_PARAMETERS_ID: currentAutomationFromDevice.ID}, userId);
      return 'keep-from-device';
    }
  }
  // Se id de automação da máquina for diferente do que estiver relacionado às máquinas automatizadas pelo dispositivo, altera relação da máquina para o atual do dispositivo
  if (currentAutomationFromMachine != null && currentAutomationFromDevice != null && currentAutomationFromMachine.CURRENT_AUTOMATION_PARAMETERS_ID !== currentAutomationFromDevice.ID) {
    await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationFromMachine.ID, CURRENT_AUTOMATION_PARAMETERS_ID: currentAutomationFromDevice.ID}, userId);
    return 'keep-from-device';
  }
  // Se máquina tem uma automação compartilhada com outras máquinas (estavam anteriormente associadas a um mesmo dispositivo), cria registro novo com mesmos dados
  const listCurrentAutomationFromId = await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.getMachineCurrentAutomationsParametersList({CURRENT_AUTOMATION_PARAMETERS_ID: currentAutomationFromMachine.CURRENT_AUTOMATION_PARAMETERS_ID});
  if (currentAutomationFromMachine != null && (currentAutomationFromDevice == null || (currentAutomationFromDevice != null && currentAutomationFromMachine.CURRENT_AUTOMATION_PARAMETERS_ID !== currentAutomationFromDevice.ID)) && listCurrentAutomationFromId.length > 1) {
    const currentAutomationParameters = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.getCurrentAutomationsParameters({ID: currentAutomationFromMachine.CURRENT_AUTOMATION_PARAMETERS_ID});
    const inserted = await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_insert({
      LAST_AUTOMATION_DEVICE_TYPE: deviceCode.substring(0,3),
      DESIRED_PROG: currentAutomationParameters.DESIRED_PROG,
      ACTION_MODE: currentAutomationParameters.ACTION_MODE,
      ACTION_TIME: currentAutomationParameters.ACTION_TIME,
      ACTION_POST_BEHAVIOR: currentAutomationParameters.ACTION_POST_BEHAVIOR,
      MODE: currentAutomationParameters.MODE,
      FORCED_BEHAVIOR: currentAutomationParameters.FORCED_BEHAVIOR,
      IR_ID_COOL: currentAutomationParameters.IR_ID_COOL,
      LOWER_HYSTERESIS: currentAutomationParameters.LOWER_HYSTERESIS,
      UPPER_HYSTERESIS: currentAutomationParameters.UPPER_HYSTERESIS,
      LTC: currentAutomationParameters.LTC,
      LTI: currentAutomationParameters.LTI,
      SCHEDULE_END_BEHAVIOR: currentAutomationParameters.SCHEDULE_END_BEHAVIOR,
      SCHEDULE_START_BEHAVIOR: currentAutomationParameters.SCHEDULE_START_BEHAVIOR,
      SETPOINT: currentAutomationParameters.SETPOINT,
      PORT_CFG: currentAutomationParameters.PORT_CFG,
      RESENDPER: currentAutomationParameters.RESENDPER,
      ECO_CFG: currentAutomationParameters.ECO_CFG,
      ECO_INT_TIME: currentAutomationParameters.ECO_INT_TIME,
      ECO_OFST_START: currentAutomationParameters.ECO_OFST_START,
      ECO_OFST_END: currentAutomationParameters.ECO_OFST_END,
      ENABLE_ECO: currentAutomationParameters.ENABLE_ECO,
      EXT_THERM_CFG: currentAutomationParameters.EXT_THERM_CFG,
      FAULTS_DATA: currentAutomationParameters.FAULTS_DATA,
      FU_NOM: currentAutomationParameters.FU_NOM,
      MAXIMUM_TEMPERATURE: currentAutomationParameters.MAXIMUM_TEMPERATURE,
      MINIMUM_TEMPERATURE: currentAutomationParameters.MINIMUM_TEMPERATURE,
      SELF_REFERENCE: currentAutomationParameters.SELF_REFERENCE,
      SETPOINT_ECO_REAL_TIME: currentAutomationParameters.SETPOINT_ECO_REAL_TIME,
    }, userId);
    await sqldb.MACHINES_CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationFromMachine.ID, CURRENT_AUTOMATION_PARAMETERS_ID: inserted.insertId}, userId);
    return 'new-with-copy-previous';
  }
  // Update LastProg para null, para fazer envio completo de Desired
  await sqldb.CURRENT_AUTOMATIONS_PARAMETERS.w_updateInfo({ID: currentAutomationFromMachine.ID, LAST_PROG: null}, userId);
  return 'keep-from-machine';
}

export function getAutInfo(unit: {
  DAM_ID?: string
  DUT_AS_DUTAUT: string
  DUT_AUT_DISABLED: number
  PORTCFG: string
  DEV_AUT?: string
}): string | null {

  if (unit == null) return null;

  if (unit.DEV_AUT) return unit.DEV_AUT;

  if (unit.DAM_ID) return unit.DAM_ID;

  if (unit.DUT_AS_DUTAUT && unit.DUT_AUT_DISABLED !== 1 && unit.PORTCFG !== 'RELAY') return unit.DUT_AS_DUTAUT;

  return null;
}

function isDacAutomationEnabled(group: any, problemsFound: string[], automatedBy: { [devId: string]: boolean }) {
  for (const dac of group.dacs) {
    if (dac.automationEnabled) {
      automatedBy[dac.DAC_ID] = true;
      if (group.DEV_AUT !== dac.DAC_ID) {
        problemsFound.push(`possui DAC com automação ${dac.DAC_ID} mas é controlado pelo ${group.DEV_AUT}`)
      }
    }
  }
  return { automatedBy, problemsFound };
};

function findAutTempProblems(automatedBy: { [devId: string]: boolean }, temperatureSensors: { [dutId: string]: boolean }, problemsFound: string[]) {
  if (Object.keys(automatedBy).length > 1) {
    problemsFound.push(`múltiplas automações: ${Object.keys(automatedBy).join(', ')}`)
  }
  if (Object.keys(temperatureSensors).length > 1) {
    problemsFound.push(`múltiplas referências de temperatura: ${Object.keys(temperatureSensors).join(', ')}`)
  }
  return problemsFound;
};


async function sendMachineProgrammingToDev(deviceCode: string, desiredProg: FullProg_v4, lastProg: FullProg_v4, needResendIr: boolean) {
  const commands = adjustSchedule_v2(desiredProg, lastProg, false, 0);
  await sendDevSchedule(deviceCode, commands, '[SYSTEM]', 'setProgrammingV3');

  if (needResendIr) {
    await resendDutIrCodes({ devId: deviceCode });
  }
}

/**
 * @swagger
 * /get-machine-additional-parameters:
 *   post:
 *     summary: Parâmetros adicionais da Máquina
 *     description: Buscar parâmetros adicionais da Máquina a partir do MACHINE_ID
 *     tags:
 *       - Machines
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados da Máquina
 *         schema:
 *           type: object
 *           properties:
 *             MACHINE_ID:
 *               type: number
 *               description: ID da Máquina
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Informações da Máquina
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ID:
 *                     type: number
 *                     description: ID do parâmetro adicional
 *                   COLUMN_NAME:
 *                     type: string
 *                     description: Nome da coluna do parâmetro adicional
 *                   COLUMN_VALUE:
 *                     type: string
 *                     description: Valor da coluna do parâmetro adicional
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       500:
 *         description: Erro interno do servidor
 */

export const getMachineAdditionalParameters = async (reqParams: httpRouter.ApiParams['/get-machine-additional-parameters'], session: SessionData) => {
  if (!reqParams.MACHINE_ID) throw Error('Invalid properties. Missing MACHINE_ID.').HttpStatus(400);
  
  const machineInfo = await sqldb.MACHINES.getMachineInfo({
    MACHINE_ID: reqParams.MACHINE_ID,
  });
  if (!machineInfo) throw Error('Máquina não encontrada').HttpStatus(400)
  
  const perms = await getPermissionsOnUnit(session, machineInfo.CLIENT_ID, machineInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const parametersMachine = await sqldb.ADDITIONAL_MACHINE_PARAMETERS.getAllParametersByMachine({ MACHINE_ID: reqParams.MACHINE_ID });
  
  return parametersMachine ;
}

httpRouter.privateRoutes['/get-machine-additional-parameters'] = getMachineAdditionalParameters;

export async function verifyPermsParams(session: SessionData, reqParams: { 
  clientIds?: number[];
  unitIds?: number[];
}) {
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }
}

httpRouter.privateRoutesDeprecated['/clients/get-machines-list-overview'] = async function (reqParams, session) {

  await verifyPermsParams(session, reqParams);

  const list = await sqldb.MACHINES.getMachinesListOverview({ unitIds: reqParams.unitIds, clientIds: reqParams.clientIds, cityIds: reqParams.cityIds, stateIds: reqParams.stateIds, INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT});

  const response = [] as {
    MACHINE_ID: number | null
    MACHINE_NAME: string | null
    UNIT_ID: number | null
    UNIT_NAME: string | null
    CITY_NAME: string | null
    STATE_ID: string | null
    GROUP_ID: number | null
    assets: AssetWithStatusDeprecated[];
  }[];

  const assetsMachines = await sqldb.ASSETS.getAssetsList({}, {
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
  }) as typeof response[0]['assets'];

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (assetsMachines.length <= 500) ? assetsMachines.map((x) => x.DEV_ID) : undefined,
  });

  for (const machine of list) {
    const assetsFromMachine = assetsMachines.filter(item => item.GROUP_ID === machine.GROUP_ID);
    assetsFromMachine.forEach(async asset => {
      if (asset.DEV_ID) {
        asset.STATUS = lastMessagesTimes.connectionStatus(asset.DEV_ID) || 'OFFLINE'
      }
    });  
    

    response.push({
      ...machine,
      assets: assetsFromMachine,
    })
  }

  return response;
}

httpRouter.privateRoutes['/clients/get-machines-list-overview-v2'] = async function (reqParams, session) {

  await verifyPermsParams(session, reqParams);

  const list = await sqldb.MACHINES.getMachinesListOverview({
    unitIds: reqParams.unitIds,
    clientIds: reqParams.clientIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
    INCLUDE_INSTALLATION_UNIT: reqParams.INCLUDE_INSTALLATION_UNIT,
  });

  const count = {
    total: 0,
    online: 0,
    offline: 0,
  }

  let assetsMachines: AssetWithStatus[];
  const machineIds = list.map(machine => machine.GROUP_ID);
  assetsMachines = (machineIds.length ? await sqldb.ASSETS.getAssetsList({
    machineIds
  }, {
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
  }) : []);

  const lastMessagesTimes = await devsLastComm.loadLastMessagesTimes({
    devIds: (assetsMachines.length <= 500) ? assetsMachines.map((x) => x.DEV_ID) : undefined,
  });

  const machinesOnline = [] as number[];

  for (const asset of assetsMachines) {
    if (asset.DEV_ID && !machinesOnline.includes(asset.GROUP_ID)) {
      const assetStatus = lastMessagesTimes.connectionStatus(asset.DEV_ID);
      if (assetStatus === 'ONLINE') {
        machinesOnline.push(asset.GROUP_ID);
        count.online++;
      }
    }
  }

  count.offline = list.length - count.online;
  count.total = list.length;

  return { count };
}
