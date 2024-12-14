import sqldb from '../../srcCommon/db'
import * as httpRouter from '../apiServer/httpRouter'
import { SessionData, ChangeType, RecHealthData } from '../../srcCommon/types';
import { checkFinalMachine, checkFinalUnit, getAvOptsDescs, updateDevicesRelashionship } from '../devInfo';
import servConfig from '../../configfile'
import { checkDevEditPermission, getAllowedUnitsView, getPermissionsOnClient, getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import { logger } from '../../srcCommon/helpers/logger';
import * as dielServices from '../../srcCommon/dielServices';
import { now_shiftedTS_s } from '../../srcCommon/helpers/dates';
import { verifyIdsNotNullDutsDuo } from '../dutInfo';

interface DeviceInfoDevIdIsDut {
  DEV_ID: string;
  DEVICE_ID: number;
  CLIENT_ID: number;
  DEVICE_CLIENT_ID: number;
  UNIT_ID: number;
  DEVICE_UNIT_ID: number;
  DAC_ID: string;
  DAM_ID: string;
  DUT_ID: string;
  DRI_ID: string;
  CURRFW_VERS: string;
}

interface ParamsDevIdIsDut { DEV_ID: string, ASSET_ID: number }

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  await removingClientAssets(qPars, userId);
  await sqldb.ASSET_IMAGES.w_deleteAssetsFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
  await sqldb.ASSETS.w_deleteFromClient(qPars, {
    ASSET_IMAGES: true,
    FAULTS_DATAS: true,
    HEALTH_BEFORE_OFFLINE: true,
    ASSETS_HEALTH: true,
    ASSETS_HEALTH_HIST: true,
    AIR_CURTAINS: true,
    CONDENSERS_HEAT_EXCHANGERS: true,
    EVAPORATORS_HEAT_EXCHANGER: true,
    CONDENSERS: true,
    EVAPORATORS: true
  }, userId);
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  await removingUnitAssets(qPars, userId);
  await sqldb.ASSET_IMAGES.w_deleteAssetsFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.ASSETS_HEALTH_OBS.w_deleteAssetsFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.ASSETS.w_deleteFromUnit({
    UNIT_ID: qPars.UNIT_ID
  }, {
    ASSET_IMAGES: true,
    FAULTS_DATAS: true,
    HEALTH_BEFORE_OFFLINE: true,
    ASSETS_HEALTH: true,
    ASSETS_HEALTH_HIST: true,
    AIR_CURTAINS: true,
    CONDENSERS_HEAT_EXCHANGERS: true,
    EVAPORATORS_HEAT_EXCHANGERS: true,
    CONDENSERS: true,
    EVAPORATORS: true,
  }, userId);
}

export async function removingUnitAssets (qPars: { UNIT_ID: number }, userId: string) {
  const duts_info = await sqldb.DUTS_DUO.getDutDuoInfoByUnit({ UNIT_ID: qPars.UNIT_ID }, userId);

  const assetHeatExchangerIds = duts_info.map(dut => dut.ASSET_HEAT_EXCHANGER_ID).filter(Boolean);
  const evaporatorIds = duts_info.map(dut => dut.EVAPORATOR_ID).filter(Boolean);
  const condensersIds = duts_info.map(dut => dut.CONDENSER_ID).filter(Boolean);
  const airCurtainsIds = duts_info.map(dut => dut.AIR_CURTAIN_ID).filter(Boolean);
  
  await verifyIdsNotNullDutsDuo(assetHeatExchangerIds, evaporatorIds, condensersIds, airCurtainsIds, userId);
  await sqldb.DUTS_DUO.w_deleteFromUnit(qPars, userId);
  
  await sqldb.FAULTS_DATAS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.HEALTH_BEFORE_OFFLINE.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.ASSETS_HEALTH.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.ASSETS_HEALTH_HIST.w_removeAssetsFromUnit(qPars, userId);

  await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.DUTS_DUO_EVAPORATORS.w_deleteFromUnitAssets(qPars, userId);
  await sqldb.AIR_CURTAINS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.CONDENSERS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.EVAPORATORS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.ASSET_HEAT_EXCHANGERS.w_removeAssetsFromUnit(qPars, userId);
  await sqldb.CHILLERS.w_removeAssetsFromUnit(qPars, userId);

  await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.DMTS_NOBREAKS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
  await sqldb.NOBREAKS.w_removeAssetsFromUnit(qPars, userId);
}

export async function removingClientAssets (qPars: { CLIENT_ID: number }, userId: string) {
  await sqldb.FAULTS_DATAS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.HEALTH_BEFORE_OFFLINE.w_removeAssetsFromClient(qPars, userId);
  await sqldb.ASSETS_HEALTH.w_removeAssetsFromClient(qPars, userId);
  await sqldb.ASSETS_HEALTH_HIST.w_removeAssetsFromClient(qPars, userId);

  await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.AIR_CURTAINS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.DACS_CONDENSERS.w_deleteFromClientAsset(qPars, userId);
  await sqldb.CONDENSERS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.DACS_EVAPORATORS.w_deleteFromClientAsset(qPars, userId);
  await sqldb.EVAPORATORS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.ASSET_HEAT_EXCHANGERS.w_removeAssetsFromClient(qPars, userId);
  await sqldb.CHILLERS.w_removeAssetsFromClient(qPars, userId);
}

export async function removingAssetsByAssetId(qPars: { ASSET_ID: number, DEVICE_CODE?: string }, userId: string){ 
    await sqldb.FAULTS_DATAS.w_deleteByAssetId(qPars, userId);
    await sqldb.HEALTH_BEFORE_OFFLINE.w_deleteByAssetId(qPars, userId);
    await sqldb.ASSETS_HEALTH.w_deleteByAssetId(qPars, userId);
    await sqldb.ASSETS_HEALTH_HIST.w_deleteByAssetId(qPars, userId);
    
    await sqldb.ASSET_IMAGES.w_deleteAssetInfo(qPars, userId);
    await sqldb.EVAPORATORS_HEAT_EXCHANGERS.w_deleteByAssetId(qPars, userId);
    await sqldb.CONDENSERS_HEAT_EXCHANGERS.w_deleteByAssetId(qPars, userId);
    await sqldb.DACS_CONDENSERS.w_deleteByAssetId(qPars, userId);
    await sqldb.DACS_EVAPORATORS.w_deleteByAssetId(qPars, userId);
    await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteByAssetId(qPars, userId);
    await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteByAssetId(qPars, userId);
    await sqldb.DRIS_CHILLERS.w_deleteByAssetId(qPars, userId);
    await sqldb.AIR_CURTAINS.w_deleteByAssetId(qPars, userId);

    const duts_info = await sqldb.DUTS_DUO.getByAssetId({ ASSET_ID: qPars.ASSET_ID }, userId);
    
    const assetHeatExchangerIds = duts_info.map(dut => dut.ASSET_HEAT_EXCHANGER_ID).filter(Boolean);
    const evaporatorIds = duts_info.map(dut => dut.EVAPORATOR_ID).filter(Boolean);
    const condensersIds = duts_info.map(dut => dut.CONDENSER_ID).filter(Boolean);
    const airCurtainsIds = duts_info.map(dut => dut.AIR_CURTAIN_ID).filter(Boolean);

    await verifyIdsNotNullDutsDuo(assetHeatExchangerIds, evaporatorIds, condensersIds, airCurtainsIds, userId);
    await sqldb.DUTS_DUO.w_deleteByAssetId(qPars, userId)

    await sqldb.DUTS_AUTOMATION.w_deleteByAssetId(qPars, userId)
    await sqldb.EVAPORATORS.w_deleteByAssetId(qPars, userId);
    await sqldb.CONDENSERS.w_deleteByAssetId(qPars, userId);
    await sqldb.ASSET_HEAT_EXCHANGERS.w_deleteByAssetId(qPars, userId);
    const effectChiller = await sqldb.CHILLERS.w_deleteByAssetId(qPars, userId);
    await sqldb.DRIS_CHILLERS.w_deleteByAssetId({ ASSET_ID: qPars.ASSET_ID }, userId);
    if (effectChiller.affectedRows > 0 && qPars.DEVICE_CODE) {
      const infoDri = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: qPars.DEVICE_CODE });
      await sqldb.DRIS_DEVICES.w_updateInfo({ SYSTEM_NAME: '', ID: infoDri.DRI_DEVICE_ID }, userId);
      await sqldb.DEVICES_UNITS.w_deleteFromDeviceCode({ DEVICE_CODE: qPars.DEVICE_CODE }, userId);
    }
} 

export async function removingAssetsByMachine(qPars: { MACHINE_ID: number }, session: SessionData) {
  const assets = await sqldb.ASSETS.getAssetsList({ MACHINE_ID: qPars.MACHINE_ID }, {
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
  });

  for (const asset of assets){
    await removingAssetsByAssetId({ ASSET_ID: asset.ASSET_ID }, session.user);
    await sqldb.ASSETS.w_deleteRow({ ASSET_ID: asset.ASSET_ID }, { 
      FAULTS_DATAS: true,
      HEALTH_BEFORE_OFFLINE: true,
      ASSETS_HEALTH: true,
      ASSETS_HEALTH_HIST: true,
      ASSET_IMAGES: true,
      EVAPORATORS_HEAT_EXCHANGERS: true,
      CONDENSERS_HEAT_EXCHANGERS: true,
      DACS_CONDENSERS: true,
      DACS_EVAPORATORS: true,
      AIR_CURTAINS: true,
      EVAPORATORS: true,
      CONDENSERS: true,
    }, session.user);
  }
}

export const verifyRatedPowerMachine = async (params: { newRatedPowerAsset: number, oldRatedPowerAsset?: number, machineId: number, updateMachineRatedPower: boolean, userId: string}) => {
  if (params.updateMachineRatedPower && (params.newRatedPowerAsset !== params.oldRatedPowerAsset)) {
    const machineInfo = await sqldb.MACHINES.getMachineRatedPower({ MACHINE_ID: params.machineId });
    let newMachineRatedPower = 0;
    if (params.oldRatedPowerAsset != null) {
      const machineRatedPowerDifference = machineInfo.RATED_POWER - params.oldRatedPowerAsset;
      newMachineRatedPower = machineRatedPowerDifference + params.newRatedPowerAsset;

    } else {
      newMachineRatedPower = machineInfo.RATED_POWER + params.newRatedPowerAsset;
    }

    await sqldb.MACHINES.w_update({ MACHINE_ID: params.machineId,RATED_POWER: newMachineRatedPower }, params.userId);
  }
}

interface IParamSet {
  OLD_DEV_ID?: string;
  AST_DESC?: string;
  ASSET_ID?: number,
  DAT_ID?: string,
  ASSET_NAME?: string,
  ASSET_INSTALLATION_LOCATION?: string
  ASSET_TYPE?: string,
  ASSET_CAPACITY_POWER?: number,
  ASSET_CAPACITY_UNIT?: string,
  CLIENT_ID?: number,
  MACHINE_FLUID_TYPE?: string,
  MACHINE_ID?: number,
  MACHINE_APPLICATION?: string,
  MACHINE_BRAND?: string,
  MACHINE_ENVIRONMENT?: string,
  MACHINE_KW?: number,
  ASSET_MODEL?: string,
  UNIT_ID?: number,
  MACHINE_INSTALLATION_DATE?: string
  ASSET_ROLE?: number
  COMPRESSOR_NOMINAL_CURRENT?: number
  EQUIPMENT_POWER?: string
  EVAPORATOR_MODEL_ID?: number
  TYPE_CFG?: string
  INSUFFLATION_SPEED?: number
  CHILLER_CARRIER_MODEL_ID?: number
  DEV_ID?: string
}

async function updateDutInfoHeatExchanger(dut_duo_id?: number, dut_device_id?: number, asset_heat_Exchanger_id?: number, session?: SessionData) {
  if (dut_duo_id) {
    const dut_info = await sqldb.DUTS_DUO.getDutDuoInfo({ ID: dut_duo_id });
    if (dut_info.ASSET_HEAT_EXCHANGER_ID) await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_deleteRow({ DUT_DUO_ASSET_HEAT_EXCHANGER_ID: dut_info.ASSET_HEAT_EXCHANGER_ID }, session.user);
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_insert({ ASSET_HEAT_EXCHANGER_ID: asset_heat_Exchanger_id, DUT_DUO_ID: dut_duo_id }, session.user);
  }
  else {
    await sqldb.DUTS_DUO.w_insert({ DUT_DEVICE_ID: dut_device_id, SENSOR_AUTOM: null, REDEFINED_SENSORS: 0 }, session.user);
    const { ID } = await sqldb.DUTS_DUO.getDutDuoInfosByDutDuoId({ DUT_DEVICE_ID: dut_device_id });
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_insert({ ASSET_HEAT_EXCHANGER_ID: asset_heat_Exchanger_id, DUT_DUO_ID: ID }, session.user);
  }
}

async function updateDutInfoEvaporators(dut_duo_id?: number, dut_device_id?: number, evaporator_id?: number, session?: SessionData) {
  if (dut_duo_id) {
    const dut_info = await sqldb.DUTS_DUO.getDutDuoInfo({ ID: dut_duo_id });
    if (dut_info.EVAPORATOR_ID) await sqldb.DUTS_DUO_EVAPORATORS.w_deleteRow({ DUT_DUO_EVAPORATORS_ID: dut_info.EVAPORATOR_ID }, session.user);
    await sqldb.DUTS_DUO_EVAPORATORS.w_insert({ EVAPORATOR_ID: evaporator_id, DUT_DUO_ID: dut_duo_id }, session.user);
  }
  else {
    await sqldb.DUTS_DUO.w_insert({ DUT_DEVICE_ID: dut_device_id, SENSOR_AUTOM: null, REDEFINED_SENSORS: 0 }, session.user);
    const { ID } = await sqldb.DUTS_DUO.getDutDuoInfosByDutDuoId({ DUT_DEVICE_ID: dut_device_id });
    await sqldb.DUTS_DUO_EVAPORATORS.w_insert({ EVAPORATOR_ID: evaporator_id, DUT_DUO_ID: ID }, session.user);
  }
}

async function updateDutInfoCondensers(dut_duo_id?: number, dut_device_id?: number, condenser_id?: number, session?: SessionData) {
  if (dut_duo_id) {
    const dut_info = await sqldb.DUTS_DUO.getDutDuoInfo({ ID: dut_duo_id });
    if (dut_info.CONDENSER_ID) await sqldb.DUTS_DUO_CONDENSERS.w_deleteRow({ DUT_DUO_CONDENSER_ID: dut_info.CONDENSER_ID }, session.user);
    await sqldb.DUTS_DUO_CONDENSERS.w_insert({ CONDENSER_ID: condenser_id, DUT_DUO_ID: dut_duo_id }, session.user);
  }
  else {
    await sqldb.DUTS_DUO.w_insert({ DUT_DEVICE_ID: dut_device_id, SENSOR_AUTOM: null, REDEFINED_SENSORS: 0 }, session.user);
    const { ID } = await sqldb.DUTS_DUO.getDutDuoInfosByDutDuoId({ DUT_DEVICE_ID: dut_device_id });
    await sqldb.DUTS_DUO_CONDENSERS.w_insert({ CONDENSER_ID: condenser_id, DUT_DUO_ID: ID }, session.user);
  }
}

async function updateDutInfoAirCurtains(dut_duo_id?: number, dut_device_id?: number, air_curtain_id?: number, session?: SessionData) {
  if (dut_duo_id) {
    const dut_info = await sqldb.DUTS_DUO.getDutDuoInfo({ ID: dut_duo_id });
    if (dut_info.AIR_CURTAIN_ID) await sqldb.DUTS_DUO_AIR_CURTAINS.w_deleteRow({ DUT_DUO_AIR_CURTAIN_ID: dut_info.AIR_CURTAIN_ID }, session.user);
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_insert({ AIR_CURTAIN_ID: air_curtain_id, DUT_DUO_ID: dut_duo_id }, session.user);
  }
  else {
    await sqldb.DUTS_DUO.w_insert({ DUT_DEVICE_ID: dut_device_id, SENSOR_AUTOM: null, REDEFINED_SENSORS: 0 }, session.user);
    const { ID } = await sqldb.DUTS_DUO.getDutDuoInfosByDutDuoId({ DUT_DEVICE_ID: dut_device_id });
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_insert({ AIR_CURTAIN_ID: air_curtain_id, DUT_DUO_ID: ID }, session.user);
  }
}

function notFoundError(assetInfo?: number) {
  if (!assetInfo) throw Error('Asset not found').HttpStatus(400);
}

async function setHealthDutDuo(asset_id: number, session: SessionData) {
  const idHealthHist = await sqldb.ASSETS_HEALTH_HIST.w_insert({
    ASSET_ID: asset_id,
    P_CAUSE_ID: null,
    CT_ID: 1,
    DAT_REPORT: Math.round(new Date().getTime() / 1000),
    H_INDEX: 100,
    H_DESC: "Sistema operando corretamente",
    H_DATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19)
  }, session.user);
  await sqldb.ASSETS_HEALTH.w_insertOrUpdate({
    ASSET_ID: asset_id,
    HEALTH_HIST_ID: idHealthHist.insertId,
  }, session.user);
}

async function handleRole1(reqParams: ParamsDevIdIsDut, paramSet: IParamSet, session: SessionData, deviceInfo: DeviceInfoDevIdIsDut) {
  const evaporatorInfo = await sqldb.EVAPORATORS.getEvaporatorByAssetId({ ASSET_ID: reqParams.ASSET_ID });
  let infos = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.DEV_ID });
  notFoundError(evaporatorInfo.EVAPORATOR_ID);

  const { userCanEditDev } = await checkDevEditPermission(session, deviceInfo, {
    CLIENT_ID: paramSet.CLIENT_ID,
    UNIT_ID: paramSet.UNIT_ID,
  });

  if (!userCanEditDev) throw Error('Permission denied. Profile cannot edit device.').HttpStatus(403);
  await updateDevicesRelashionship(deviceInfo, paramSet, session.user);

  await updateDutInfoEvaporators(infos.DUT_DUO_ID, infos.DUT_DEVICE_ID, evaporatorInfo.EVAPORATOR_ID, session);
  await setHealthDutDuo(reqParams.ASSET_ID, session);
}

async function handleRole2(reqParams: ParamsDevIdIsDut, paramSet: IParamSet, session: SessionData, deviceInfo: DeviceInfoDevIdIsDut) {
  const condenserInfo = await sqldb.CONDENSERS.getCondenserByAssetId({ ASSET_ID: reqParams.ASSET_ID });
  let infos = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.DEV_ID });
  notFoundError(condenserInfo.CONDENSER_ID);

  const { userCanEditDev } = await checkDevEditPermission(session, deviceInfo, {
    CLIENT_ID: paramSet.CLIENT_ID,
    UNIT_ID: paramSet.UNIT_ID,
  });

  if (!userCanEditDev) throw Error('Permission denied. Profile cannot edit device.').HttpStatus(403);
  await updateDevicesRelashionship(deviceInfo, paramSet, session.user);

  await updateDutInfoCondensers(infos.DUT_DUO_ID, infos.DUT_DEVICE_ID, condenserInfo.CONDENSER_ID, session);
  await setHealthDutDuo(reqParams.ASSET_ID, session);
}

async function handleRole3(reqParams: ParamsDevIdIsDut, paramSet: IParamSet, session: SessionData, deviceInfo: DeviceInfoDevIdIsDut) {
  const airCurtainsInfo = await sqldb.AIR_CURTAINS.getAirCurtainsByAssetId({ ASSET_ID: reqParams.ASSET_ID });
  let infos = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.DEV_ID });
  notFoundError(airCurtainsInfo.AIR_CURTAIN_ID);

  const { userCanEditDev } = await checkDevEditPermission(session, deviceInfo, {
    CLIENT_ID: paramSet.CLIENT_ID,
    UNIT_ID: paramSet.UNIT_ID,
  });

  if (!userCanEditDev) throw Error('Permission denied. Profile cannot edit device.').HttpStatus(403);
  await updateDevicesRelashionship(deviceInfo, paramSet, session.user);

  await updateDutInfoAirCurtains(infos.DUT_DUO_ID, infos.DUT_DEVICE_ID, airCurtainsInfo.AIR_CURTAIN_ID, session);
  await setHealthDutDuo(reqParams.ASSET_ID, session);
}

async function handleRole4(reqParams: ParamsDevIdIsDut, paramSet: IParamSet, session: SessionData, deviceInfo: DeviceInfoDevIdIsDut) {
  const heatExchangersInfo = await sqldb.ASSET_HEAT_EXCHANGERS.getAssetHeatExchangerByAssetId({ ASSET_ID: reqParams.ASSET_ID });
  let infos = await sqldb.DUTS.getDevExtraInfo({ DEV_ID: reqParams.DEV_ID });
  notFoundError(heatExchangersInfo.ASSET_HEAT_EXCHANGER_ID);

  const { userCanEditDev } = await checkDevEditPermission(session, deviceInfo, {
    CLIENT_ID: paramSet.CLIENT_ID,
    UNIT_ID: paramSet.UNIT_ID,
  });

  if (!userCanEditDev) throw Error('Permission denied. Profile cannot edit device.').HttpStatus(403);
  await updateDevicesRelashionship(deviceInfo, paramSet, session.user);

  await updateDutInfoHeatExchanger(infos.DUT_DUO_ID, infos.DUT_DEVICE_ID, heatExchangersInfo.ASSET_HEAT_EXCHANGER_ID, session);
  await setHealthDutDuo(reqParams.ASSET_ID, session);
}

async function DevIdIsDut(reqParams: ParamsDevIdIsDut, paramSet: IParamSet, session: SessionData) {
  if (reqParams.DEV_ID.startsWith('DUT')) {
    const deviceInfo = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DEV_ID });
    if (!deviceInfo.DUT_ID) throw Error('Device not found').HttpStatus(400);

    switch (paramSet.ASSET_ROLE) {
      case 1:
        await handleRole1(reqParams, paramSet, session, deviceInfo);
        break;
      case 2:
        await handleRole2(reqParams, paramSet, session, deviceInfo);
        break;
      case 3:
        await handleRole3(reqParams, paramSet, session, deviceInfo);
        break;
      case 4:
        await handleRole4(reqParams, paramSet, session, deviceInfo);
        break;
      default:
        throw Error('Invalid ASSET_ROLE').HttpStatus(400);
    }
  }
}

async function DevIdIsDri(reqParams: { DEV_ID: string, ASSET_ID: number }, paramSet: IParamSet, session: SessionData) {
  if (reqParams.DEV_ID.startsWith('DRI')) {
    const deviceInfo = await sqldb.DEVICES.getBasicInfo({ devId: reqParams.DEV_ID });
    if (!deviceInfo.DRI_ID) throw Error('Device not found').HttpStatus(400);

    if (paramSet.ASSET_ROLE === 4) {
      const heatExchangersInfo = await sqldb.ASSET_HEAT_EXCHANGERS.getAssetHeatExchangerByAssetId({ ASSET_ID: reqParams.ASSET_ID });
      if (!heatExchangersInfo) throw Error('Asset not found').HttpStatus(400);

      await checkDevEditPermission(session, deviceInfo, {
        CLIENT_ID: paramSet.CLIENT_ID,
        UNIT_ID: paramSet.UNIT_ID,
      });
      const driInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: reqParams.DEV_ID });
  
      await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_insert({ ASSET_HEAT_EXCHANGER_ID: heatExchangersInfo.ASSET_HEAT_EXCHANGER_ID, DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID}, session.user);

    }
    else if (paramSet.ASSET_ROLE === 5) {
      const chillersInfo = await sqldb.CHILLERS.getAssetChillerByAssetId({ ASSET_ID: reqParams.ASSET_ID });
      if (!chillersInfo) throw Error('Chiller not found').HttpStatus(400);

      const { userCanEditDev } = await checkDevEditPermission(session, deviceInfo, {
        CLIENT_ID: paramSet.CLIENT_ID,
        UNIT_ID: paramSet.UNIT_ID,
      }); 

      if (!userCanEditDev) throw Error('Permission denied. Profile cannot edit device.').HttpStatus(403);

      await updateDevicesRelashionship(deviceInfo, paramSet, session.user);

      const driInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: reqParams.DEV_ID });
      await sqldb.DRIS_CHILLERS.w_insertUpdate({ CHILLER_ID: chillersInfo.CHILLER_ID, DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID}, session.user);
    }
  }
}

async function decideByAssetRoleWhickAssetIs(paramSet: IParamSet, session: SessionData, dacInfo: Awaited<ReturnType<typeof sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode>>, insertId: number) {
  if (paramSet.ASSET_ROLE == 2 && (!dacInfo.EVAPORATOR_ID && !dacInfo.ASSET_HEAT_EXCHANGER_ID)) {
    const condenserInfo = await sqldb.CONDENSERS.getCondenserByAssetId({ ASSET_ID: insertId });
    if (!condenserInfo) throw Error('Asset not found').HttpStatus(400);

    await sqldb.DACS_CONDENSERS.w_insert({ CONDENSER_ID: condenserInfo.CONDENSER_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
  }
  if (paramSet.ASSET_ROLE == 1 && (!dacInfo.CONDENSER_ID && !dacInfo.ASSET_HEAT_EXCHANGER_ID)) {
    const evaporatorInfo = await sqldb.EVAPORATORS.getEvaporatorByAssetId({ ASSET_ID: insertId });
    if (!evaporatorInfo) throw Error('Asset not found').HttpStatus(400);

    await sqldb.DACS_EVAPORATORS.w_insert({ EVAPORATOR_ID: evaporatorInfo.EVAPORATOR_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
  }
  if (paramSet.ASSET_ROLE == 4 && (!dacInfo.CONDENSER_ID && !dacInfo.EVAPORATOR_ID)) {
    const assetHeatExchangerInfo = await sqldb.ASSET_HEAT_EXCHANGERS.getAssetHeatExchangerByAssetId({ ASSET_ID: insertId });
    if (!assetHeatExchangerInfo) throw Error('Asset not found').HttpStatus(400);

    await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_insert_update({ ASSET_HEAT_EXCHANGER_ID: assetHeatExchangerInfo.ASSET_HEAT_EXCHANGER_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
  }
}

async function checkDevIdAlreadyBeenRelated(reqParams: httpRouter.ApiParams['/clients/add-new-asset'], paramSet: IParamSet, insertId: number, session: SessionData) {
  if (reqParams.DEV_ID) {
    // Check if DEV_ID already been related to DAT_ID, so ignore (operation error)
    const alreadyRelated = await sqldb.ASSETS.getDevsClientAssets({ DAT_ID: reqParams.DAT_ID, DEV_ID: reqParams.DEV_ID});

    if (alreadyRelated.length === 0) {
      if (reqParams.DEV_ID.startsWith('DAC')) {
        const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: reqParams.DEV_ID });
        if (!dacInfo) throw Error('Device not found').HttpStatus(400);

        await decideByAssetRoleWhickAssetIs(paramSet, session, dacInfo, insertId);
        await setNewDacHealthMaybeNeverOnline(reqParams.DEV_ID, session.user);
      }
    }
    await DevIdIsDut({ ASSET_ID: insertId, DEV_ID: reqParams.DEV_ID }, paramSet, session);
    await DevIdIsDri({ ASSET_ID: insertId, DEV_ID: reqParams.DEV_ID }, paramSet, session);

  }
}

/**
 * @swagger
 * /clients/add-new-asset:
 *   post:
 *     summary: Adicionar um ativo
 *     description: Adicionar um ativo com suas demais informações
 *     tags:
 *       - Assets
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Ativo
 *         schema:
 *           type: object
 *           properties:
 *             TYPE_CFG:
 *               type: string
 *               description: Tipo da máquina
 *               default: ""
 *               required: false
 *             DAT_ID:
 *               type: string
 *               description: DAT_CODE do ativo
 *               default: null
 *               required: false
 *             AST_DESC:
 *               type: string
 *               description: Nome do Ativo
 *               default: ""
 *               required: true
 *             INSTALLATION_LOCATION:
 *               type: string
 *               description: Local de instalação do ativo
 *               default: ""
 *               required: false
 *             AST_TYPE:
 *               type: string
 *               description: Tipo do ativo
 *               default: ""
 *               required: true
 *             CAPACITY_PWR:
 *               type: number
 *               description: Capacidade frigorífica
 *               default: null
 *               required: false
 *             CAPACITY_UNIT:
 *               type: string
 *               description: Unidade da capacidade frigorífica
 *               default: ""
 *               required: false
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: null
 *               required: false
 *             FLUID_TYPE:
 *               type: string
 *               description: Tipo de flúido da máquina
 *               default: ""
 *               required: false
 *             GROUP_ID:
 *               type: number
 *               description: ID da máquina
 *               default: null
 *               required: false
 *             MCHN_APPL:
 *               type: string
 *               description: Tipo de aplicação da máquina
 *               default: ""
 *               required: false
 *             MCHN_BRAND:
 *               type: string
 *               description: Marca da máquina
 *               default: ""
 *               required: false
 *             MCHN_ENV:
 *               type: string
 *               description: Ambiente da máquina
 *               default: ""
 *               required: false
 *             MCHN_KW:
 *               type: number
 *               description: Potência do ativo
 *               default: null
 *               required: false
 *             MCHN_MODEL:
 *               type: string
 *               description: Modelo do Ativo
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: null
 *               required: false
 *             INSTALLATION_DATE:
 *               type: string
 *               description: Data de instalação
 *               default: ""
 *               required: false
 *             AST_ROLE:
 *               type: number
 *               description: Função do ativo
 *               default: null
 *               required: false
 *             DEV_ID:
 *               type: string
 *               description: DEVICE_CODE do dispositivo
 *               default: ""
 *               required: false
 *             DAT_COUNT:
 *               type: number
 *               description: Quantidade de ativos
 *               default: null
 *               required: false
 *             COMPRESSOR_NOMINAL_CURRENT:
 *               type: number
 *               description: Corrente nominal do compressor
 *               default: null
 *               required: false
 *             EQUIPMENT_POWER:
 *               type: string
 *               description: Potência do Equipamento
 *               default: ""
 *               required: false
 *             EVAPORATOR_MODEL_ID:
 *               type: number
 *               description: ID do modelo do Ativo Evaporadora
 *               default: ""
 *               required: false
 *             INSUFFLATION_SPEED:
 *               type: number
 *               description: Velocidade de insuflação do ativo
 *               default: null
 *               required: false
 *             UPDATE_MACHINE_RATED_POWER:
 *               type: number
 *               description: Verificar se preciso atualizar a potência nominal da máquina
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
 *                 info:
 *                   type: object
 *                   properties:
 *                     DAT_ID:
 *                       type: string
 *                       description: DAT_CODE do Ativo
 *                     AST_DESC:
 *                       type: string
 *                       description: Nome do ativo
 *                     AST_TYPE:
 *                       type: string
 *                       description: Tipo do ativo
 *                     CAPACITY_PWR:
 *                       type: number
 *                       description: Capacidade Frigorífica
 *                     CAPACITY_UNIT:
 *                       type: string
 *                       description: Unidade da capacidade frigorífica
 *                     CLIENT_ID:
 *                       type: number
 *                       description: ID do Cliente
 *                     FLUID_TYPE:
 *                       type: string
 *                       description: Tipo de fluído da máquina
 *                     GROUP_ID:
 *                       type: number
 *                       description: ID da Máquina
 *                     MCHN_APPL:
 *                       type: string
 *                       description: Tipo de aplicação da máquina
 *                     MCHN_BRAND:
 *                       type: string
 *                       description: Marca da máquina
 *                     MCHN_ENV:
 *                       type: string
 *                       description: Ambiente da máquina
 *                     MCHN_KW:
 *                       type: string
 *                       description: Potência do ativo
 *                     MCHN_MODEL:
 *                       type: number
 *                       description: Modelo do ativo
 *                     UNIT_ID:
 *                       type: number
 *                       description: ID da Unidade
 *                     INSTALLATION_DATE:
 *                       type: string
 *                       description: Data de instalação
 *                     AST_ROLE:
 *                       type: number
 *                       description: Função do ativo
 *                     ASSET_ID:
 *                       type: number
 *                       description: ID do Ativo
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Erro de permissão.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/clients/add-new-asset'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400);
  if (reqParams.DAT_ID && !reqParams.DAT_ID.startsWith('DAT')) throw Error('Invalid DAT_ID').HttpStatus(400);

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canConfigureNewUnits) { } // OK
  else throw Error('Permission denied!').HttpStatus(403);

  const paramSet = await buildSqlParams({
    DAT_ID: reqParams.DAT_ID,
    AST_DESC: reqParams.AST_DESC,
    INSTALLATION_LOCATION: reqParams.INSTALLATION_LOCATION,
    AST_TYPE: reqParams.AST_TYPE,
    CAPACITY_PWR: reqParams.CAPACITY_PWR,
    CAPACITY_UNIT: reqParams.CAPACITY_UNIT,
    CLIENT_ID: reqParams.CLIENT_ID,
    FLUID_TYPE: reqParams.FLUID_TYPE,
    GROUP_ID: reqParams.GROUP_ID,
    MCHN_APPL: reqParams.MCHN_APPL,
    MCHN_BRAND: reqParams.MCHN_BRAND,
    MCHN_ENV: reqParams.MCHN_ENV,
    MCHN_KW: reqParams.MCHN_KW,
    MCHN_MODEL: reqParams.MCHN_MODEL,
    UNIT_ID: reqParams.UNIT_ID,
    INSTALLATION_DATE: reqParams.INSTALLATION_DATE,
    AST_ROLE: reqParams.AST_ROLE,
    COMPRESSOR_NOMINAL_CURRENT: reqParams.COMPRESSOR_NOMINAL_CURRENT,
    EQUIPMENT_POWER: reqParams.EQUIPMENT_POWER,
    EVAPORATOR_MODEL_ID: reqParams.EVAPORATOR_MODEL_ID,
    TYPE_CFG: reqParams.TYPE_CFG,
    INSUFFLATION_SPEED: reqParams.INSUFFLATION_SPEED,
    CHILLER_CARRIER_MODEL_ID: reqParams.CHILLER_CARRIER_MODEL_ID
  }, session);

  const {insertId} = await sqldb.ASSETS.w_insertIgnore({
    DAT_CODE: paramSet.DAT_ID,
    UNIT_ID: paramSet.UNIT_ID,
    NAME: paramSet.ASSET_NAME,
    MODEL: paramSet.ASSET_MODEL,
    INSTALLATION_LOCATION: paramSet.ASSET_INSTALLATION_LOCATION
  }, session.user)

  switch (paramSet.ASSET_ROLE) {
    case 1:
      //EVAPORADORA
      await sqldb.EVAPORATORS.w_insert({
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: insertId,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
        TYPE_CFG: paramSet.TYPE_CFG,
        APPL_CFG: paramSet.MACHINE_APPLICATION,
        INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
      }, session.user)
      break;
    case 2:
      //CONDENSADORA
      await sqldb.CONDENSERS.w_insert({
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: insertId,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
        TYPE_CFG: paramSet.TYPE_CFG,
        APPL_CFG: paramSet.MACHINE_APPLICATION,
        INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
      }, session.user)
      await verifyRatedPowerMachine({ newRatedPowerAsset: paramSet.MACHINE_KW, machineId: reqParams.GROUP_ID, updateMachineRatedPower: reqParams.UPDATE_MACHINE_RATED_POWER, userId: session.user })
      break;
    case 3:
      //CORTINA DE AR
      await sqldb.AIR_CURTAINS.w_insert({
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: insertId,
      }, session.user)
      break;
    case 4:
      // TROCADOR DE CALOR
      await sqldb.ASSET_HEAT_EXCHANGERS.w_insert({
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: insertId,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
        TYPE_CFG: 'tipo-trocador-de-calor',
        APPL_CFG: 'trocador-de-calor',
      }, session.user);
      break;
    case 5:
      // CHILLER
      await sqldb.CHILLERS.w_insert({
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: insertId,
        CHILLER_CARRIER_MODEL_ID: paramSet.CHILLER_CARRIER_MODEL_ID,
      }, session.user);
      break;
    default:
      break;
  }

  if (reqParams.MCHN_APPL || reqParams.MCHN_BRAND || reqParams.FLUID_TYPE || paramSet.MACHINE_INSTALLATION_DATE) {
    await sqldb.MACHINES.w_update({ 
      MACHINE_ID: reqParams.GROUP_ID,
      MACHINE_APPLICATION: reqParams.MCHN_APPL,
      MACHINE_BRAND: reqParams.MCHN_BRAND,
      MACHINE_FLUID_TYPE: reqParams.FLUID_TYPE,
      MACHINE_INSTALLATION_DATE: paramSet.MACHINE_INSTALLATION_DATE,
    }, session.user);
  }

  const info = await sqldb.ASSETS.getAssetInfo({ DAT_CODE: reqParams.DAT_ID, ASSET_ID: insertId });

  if (info == null) {
    throw Error('Erro ao inserir ativo!').HttpStatus(400);
  }

  await checkDevIdAlreadyBeenRelated(reqParams, paramSet, insertId, session);

  return { info };
}

httpRouter.privateRoutes['/clients/get-assets-list'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  let rows = await sqldb.ASSETS.getAssetsList({
    clientIds: reqParams.clientIds,
    stateIds: reqParams.stateIds,
    cityIds: reqParams.cityIds,
    unitIds: reqParams.unitIds,
  }, {
    addUnownedDevs: (!!session.permissions.MANAGE_UNOWNED_DEVS),
  });

  const list = [];
  let totalItems = 0;
  let skipRows = reqParams.SKIP || 0;

  function rowSorter (a: { UNIT_ID: number, DAT_ID: string }, b: { UNIT_ID: number, DAT_ID: string }) {
    if ((a.UNIT_ID == null) && (b.UNIT_ID != null)) return 1;
    if ((a.UNIT_ID != null) && (b.UNIT_ID == null)) return -1;
    if (a.UNIT_ID !== b.UNIT_ID) return b.UNIT_ID - a.UNIT_ID;
    if (a.DAT_ID > b.DAT_ID) return -1;
    if (b.DAT_ID > a.DAT_ID) return 1;
    return 0;
  }
  rows = rows.sort(rowSorter);

  const searchTerms = reqParams.searchTerms;
  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { delete reqParams.ownershipFilter; }
  let manufacturers: number[] = [];
  if (reqParams.ownershipFilter) {
    manufacturers = (await sqldb.CLIENTS.getManufacturers()).map(row => row.CLIENT_ID);
  }

  for (const rowDb of rows) {
    const regDev = Object.assign(rowDb, {
      unComis: false,
      capacityKW: <number>undefined,
    })

    if (reqParams.ownershipFilter) {
      if (reqParams.ownershipFilter === 'CLIENTS') {
        if (!(rowDb.CLIENT_ID && (rowDb.CLIENT_ID !== servConfig.dielClientId) && !manufacturers.includes(rowDb.CLIENT_ID))) continue;
      }
      else if (reqParams.ownershipFilter === 'N-COMIS') {
        if (!(regDev.unComis)) continue;
      }
      else if (reqParams.ownershipFilter === 'N-ASSOC') {
        if (!((!rowDb.CLIENT_ID) && (!regDev.unComis))) continue;
      }
      else if (reqParams.ownershipFilter === 'MANUFAC') {
        if (!(rowDb.CLIENT_ID && manufacturers.includes(rowDb.CLIENT_ID))) continue;
      }
      else if ((reqParams.ownershipFilter === 'D-TESTS') && servConfig.dielClientId) {
        if (!(rowDb.CLIENT_ID === servConfig.dielClientId)) continue;
      }
    }
    if (searchTerms && searchTerms.length > 0) {
      let shouldNotInclude = false;
      for (const searchTerm of searchTerms) {
        if (rowDb.STATE_ID && rowDb.STATE_ID.toLowerCase().includes(searchTerm)) { continue; }
        if (rowDb.CITY_NAME && rowDb.CITY_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (rowDb.UNIT_NAME && rowDb.UNIT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (rowDb.CLIENT_NAME && rowDb.CLIENT_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (rowDb.GROUP_NAME && rowDb.GROUP_NAME.toLowerCase().includes(searchTerm)) { continue; }
        if (rowDb.DAT_ID && rowDb.DAT_ID.toLowerCase().includes(searchTerm)) { continue; }
        shouldNotInclude = true;
        break;
      }
      if (shouldNotInclude) { continue; }
    }

    delete regDev.CAPACITY_PWR;
    delete regDev.CAPACITY_UNIT;

    totalItems++;

    if (skipRows > 0) {
      skipRows--;
      continue;
    }
    if (reqParams.LIMIT && list.length >= reqParams.LIMIT) { }
    else {
      list.push(regDev);
    }
  }

  return { list, totalItems };
}

async function verifyUpdateAssetMachine(paramSet: IParamSet, session: SessionData) {
  if (paramSet.MACHINE_APPLICATION || paramSet.MACHINE_BRAND || paramSet.MACHINE_FLUID_TYPE || paramSet.MACHINE_INSTALLATION_DATE) {
    await sqldb.MACHINES.w_update({ 
      MACHINE_ID: paramSet.MACHINE_ID,
      MACHINE_APPLICATION: paramSet.MACHINE_APPLICATION,
      MACHINE_BRAND: paramSet.MACHINE_BRAND,
      MACHINE_FLUID_TYPE: paramSet.MACHINE_FLUID_TYPE,
      MACHINE_INSTALLATION_DATE: paramSet.MACHINE_INSTALLATION_DATE,
    }, session.user);
  }
}

const DevIdIsDac = async (DEV_ID: string, ASSET_ID: number, ASSET_ROLE: number, session: SessionData) => {
  const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: DEV_ID });
  if (!dacInfo) throw Error('Device not found').HttpStatus(400);

  switch (ASSET_ROLE) {
    case 1: {
      const evaporatorInfo = await sqldb.EVAPORATORS.getEvaporatorByAssetId({ ASSET_ID });
      if (!evaporatorInfo) throw Error('Asset not found').HttpStatus(400);
  
      await sqldb.DACS_EVAPORATORS.w_insert({ EVAPORATOR_ID: evaporatorInfo.EVAPORATOR_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
      break;
    }
    case 2: {
      const condenserInfo = await sqldb.CONDENSERS.getCondenserByAssetId({ ASSET_ID });
      if (!condenserInfo) throw Error('Asset not found').HttpStatus(400);
      const dacCondenserInfo = await sqldb.DACS_CONDENSERS.getInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID });
      if (!dacCondenserInfo) {
        await sqldb.DACS_CONDENSERS.w_insert({ CONDENSER_ID: condenserInfo.CONDENSER_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
      }
      else {
        if (dacCondenserInfo.CONDENSER_ID !== condenserInfo.CONDENSER_ID) throw Error('DAC associado a outra condensadora');
      }
      break;
    }
    case 4: {
      const assetHeatExchangerInfo = await sqldb.ASSET_HEAT_EXCHANGERS.getAssetHeatExchangerByAssetId({ ASSET_ID });
      if (!assetHeatExchangerInfo) throw Error('Asset not found').HttpStatus(400);
  
      await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_insert_update({ ASSET_HEAT_EXCHANGER_ID: assetHeatExchangerInfo.ASSET_HEAT_EXCHANGER_ID, DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, session.user);
      break;
    }
    default:
      break;
  }

  await setNewDacHealthMaybeNeverOnline(DEV_ID, session.user);
}

async function verifyNewAssetDevice(DEV_ID: string, ASSET_ID: number, ASSET_ROLE: number, paramSet: IParamSet, session: SessionData) { 
  if (DEV_ID.startsWith('DAC')) {
    await DevIdIsDac(DEV_ID, ASSET_ID, ASSET_ROLE, session);
  } else if (DEV_ID.startsWith('DUT')) {
    await DevIdIsDut({ DEV_ID: DEV_ID, ASSET_ID: ASSET_ID }, paramSet, session);
  } else {
    await DevIdIsDri({ DEV_ID: DEV_ID, ASSET_ID: ASSET_ID }, paramSet, session);
  }
}

const verifyOldAssetDac = async (params: { OLD_DEV_ID?: string, ASSET_ID: number, ASSET_ROLE: number, userId: string, }) => {
  const userId = params.userId;
  const result  = await dielServices.healthInternalApi('/diel-internal/health/setDacHealthStatus', {
    DAC_ID: params.OLD_DEV_ID,
    H_INDEX: 1,
    H_DESC: 'Dispositivo Realocado',
    H_OFFL: null,
    CT_ID: ChangeType.Realocacao,
    userId,
  });
  if (!result?.affectedRows) logger.error(`Não foi possível reiniciar a saúde da condensadora do ativo ${params.ASSET_ID}`);
  const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: params.OLD_DEV_ID });
  if (params.ASSET_ROLE === 1) {
    await sqldb.DACS_EVAPORATORS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, params.userId);
  } else if (params.ASSET_ROLE === 2) {
    await sqldb.DACS_CONDENSERS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, params.userId);
  }
  else if (params.ASSET_ROLE === 4) {
    await sqldb.DACS_ASSET_HEAT_EXCHANGERS.w_deleteDacInfo({ DAC_DEVICE_ID: dacInfo.DAC_DEVICE_ID }, params.userId);
  }
}

async function deleteDutDuoInfoAssetRole(asset_role: number, DUT_DUO_ID: number, userId: string) {
  if (asset_role === 1) {
    await sqldb.DUTS_DUO_EVAPORATORS.w_deleteDutDuoInfo({ DUT_DUO_ID }, userId);
  } else if (asset_role === 2) {
    await sqldb.DUTS_DUO_CONDENSERS.w_deleteDutDuoInfo({ DUT_DUO_ID }, userId);
  } else if (asset_role === 3) {
    await sqldb.DUTS_DUO_AIR_CURTAINS.w_deleteDutDuoInfo({ DUT_DUO_ID }, userId);
  } else if (asset_role === 4) {
    await sqldb.DUTS_DUO_ASSET_HEAT_EXCHANGERS.w_deleteDutDuoInfo({ DUT_DUO_ID }, userId);
  }
}

async function verifyOldAssetDevice(params: { OLD_DEV_ID?: string, ASSET_ID: number, ASSET_ROLE: number, userId: string, }) {
  if (params.OLD_DEV_ID) {
    if (params.OLD_DEV_ID.startsWith('DAC')){
      await verifyOldAssetDac(params);
    } else if (params.OLD_DEV_ID.startsWith('DUT')) {
      const oldDeviceInfo = await sqldb.DUTS_DEVICES.getDutClientAndUnit({ DEVICE_CODE: params.OLD_DEV_ID });
      await deleteDutDuoInfoAssetRole(params.ASSET_ROLE, oldDeviceInfo.DUT_DUO_ID, params.userId);
    } else if (params.OLD_DEV_ID.startsWith('DRI')) {
      const driInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: params.OLD_DEV_ID });
      if (params.ASSET_ROLE === 4) {
        await sqldb.DRIS_ASSET_HEAT_EXCHANGERS.w_deleteDriInfo({ DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, params.userId);
      }
      else if (params.ASSET_ROLE === 5) {
        await sqldb.DRIS_CHILLERS.w_deleteDriInfo({ DRI_DEVICE_ID: driInfo.DRI_DEVICE_ID }, params.userId);
      }
    }
  }
}

async function verifyAssetDevices(params: { OLD_DEV_ID?: string, DEV_ID?: string, ASSET_ID: number, ASSET_ROLE: number }, paramSet: IParamSet, session: SessionData) {
  if (params.DEV_ID !== params.OLD_DEV_ID) {
    await verifyOldAssetDevice({ OLD_DEV_ID: params.OLD_DEV_ID, ASSET_ID: params.ASSET_ID, ASSET_ROLE: params.ASSET_ROLE, userId: session.user})
    if (params.DEV_ID) {  
      await verifyNewAssetDevice(params.DEV_ID, params.ASSET_ID, paramSet.ASSET_ROLE, paramSet, session);
    }
  }
}

/**
 * @swagger
 * /clients/edit-asset:
 *   post:
 *     summary: Editar um ativo
 *     description: Editar um ativo com suas demais informações
 *     tags:
 *       - Assets
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do Ativo
 *         schema:
 *           type: object
 *           properties:
 *             ASSET_ID:
 *               type: number
 *               description: ID do Ativo
 *               default: null
 *               required: false
 *             DAT_ID:
 *               type: string
 *               description: DAT_CODE do ativo
 *               default: null
 *               required: false
 *             AST_DESC:
 *               type: string
 *               description: Nome do Ativo
 *               default: ""
 *               required: false
 *             INSTALLATION_LOCATION:
 *               type: string
 *               description: Local de instalação do ativo
 *               default: ""
 *               required: false
 *             AST_TYPE:
 *               type: string
 *               description: Tipo do ativo
 *               default: ""
 *               required: true
 *             CAPACITY_PWR:
 *               type: number
 *               description: Capacidade frigorífica
 *               default: null
 *               required: false
 *             CAPACITY_UNIT:
 *               type: string
 *               description: Unidade da capacidade frigorífica
 *               default: ""
 *               required: false
 *             CLIENT_ID:
 *               type: number
 *               description: ID do Cliente
 *               default: null
 *               required: false
 *             FLUID_TYPE:
 *               type: string
 *               description: Tipo de flúido da máquina
 *               default: ""
 *               required: false
 *             GROUP_ID:
 *               type: number
 *               description: ID da máquina
 *               default: null
 *               required: false
 *             MCHN_APPL:
 *               type: string
 *               description: Tipo de aplicação da máquina
 *               default: ""
 *               required: false
 *             MCHN_BRAND:
 *               type: string
 *               description: Marca da máquina
 *               default: ""
 *               required: false
 *             MCHN_ENV:
 *               type: string
 *               description: Ambiente da máquina
 *               default: ""
 *               required: false
 *             MCHN_KW:
 *               type: number
 *               description: Potência do ativo
 *               default: null
 *               required: false
 *             MCHN_MODEL:
 *               type: string
 *               description: Modelo do Ativo
 *               default: ""
 *               required: false
 *             UNIT_ID:
 *               type: number
 *               description: ID da Unidade
 *               default: null
 *               required: false
 *             INSTALLATION_DATE:
 *               type: string
 *               description: Data de instalação
 *               default: ""
 *               required: false
 *             AST_ROLE:
 *               type: number
 *               description: Função do ativo
 *               default: null
 *               required: false
 *             DEV_ID:
 *               type: string
 *               description: DEVICE_CODE do dispositivo
 *               default: ""
 *               required: false
 *             DAT_COUNT:
 *               type: number
 *               description: Quantidade de ativos
 *               default: null
 *               required: false
 *             OLD_DEV_ID:
 *               type: string
 *               description: DEVICE_CODE do antigo dispositivo da máquina
 *               default: ""
 *               required: false
 *             DEV_CLIENT_ASSET_ID:
 *               type: number
 *               description: ID do Ativo
 *               default: null
 *               required: false
 *             DAT_INDEX:
 *               type: number
 *               description: ID do Ativo
 *               default: null
 *               required: false
 *             COMPRESSOR_NOMINAL_CURRENT:
 *               type: number
 *               description: Corrente nominal do compressor
 *               default: null
 *               required: false
 *             EQUIPMENT_POWER:
 *               type: string
 *               description: Potência do Equipamento
 *               default: ""
 *               required: false
 *             EVAPORATOR_MODEL_ID:
 *               type: number
 *               description: ID do modelo do Ativo Evaporadora
 *               default: ""
 *               required: false
 *             INSUFFLATION_SPEED:
 *               type: number
 *               description: Velocidade de insuflação do ativo
 *               default: null
 *               required: false
 *             UPDATE_MACHINE_RATED_POWER:
 *               type: number
 *               description: Verificar se preciso atualizar a potência nominal da máquina
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
 *                 info:
 *                   type: object
 *                   properties:
 *                     DAT_ID:
 *                       type: string
 *                       description: DAT_CODE do Ativo
 *                     AST_DESC:
 *                       type: string
 *                       description: Nome do ativo
 *                     AST_TYPE:
 *                       type: string
 *                       description: Tipo do ativo
 *                     CAPACITY_PWR:
 *                       type: number
 *                       description: Capacidade Frigorífica
 *                     CAPACITY_UNIT:
 *                       type: string
 *                       description: Unidade da capacidade frigorífica
 *                     CLIENT_ID:
 *                       type: number
 *                       description: ID do Cliente
 *                     FLUID_TYPE:
 *                       type: string
 *                       description: Tipo de fluído da máquina
 *                     GROUP_ID:
 *                       type: number
 *                       description: ID da Máquina
 *                     MCHN_APPL:
 *                       type: string
 *                       description: Tipo de aplicação da máquina
 *                     MCHN_BRAND:
 *                       type: string
 *                       description: Marca da máquina
 *                     MCHN_ENV:
 *                       type: string
 *                       description: Ambiente da máquina
 *                     MCHN_KW:
 *                       type: string
 *                       description: Potência do ativo
 *                     MCHN_MODEL:
 *                       type: number
 *                       description: Modelo do ativo
 *                     UNIT_ID:
 *                       type: number
 *                       description: ID da Unidade
 *                     INSTALLATION_DATE:
 *                       type: string
 *                       description: Data de instalação
 *                     AST_ROLE:
 *                       type: number
 *                       description: Função do ativo
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Erro de permissão.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/clients/edit-asset'] = async function (reqParams, session) {
  if (!reqParams.DAT_ID && !reqParams.ASSET_ID) {
    throw Error('Invalid properties. Missing DAT_ID or ASSET_ID.').HttpStatus(400);
  }

  const qPars = reqParams.ASSET_ID ? { ASSET_ID: reqParams.ASSET_ID } : { DAT_CODE: reqParams.DAT_ID };
  const assetInfo = await sqldb.ASSETS.getBasicInfo(qPars);
  if (!assetInfo) { throw Error('Asset not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, assetInfo.CLIENT_ID, assetInfo.UNIT_ID);
  if (perms.canManageDevs) { } // OK
  else throw Error('Permission denied!').HttpStatus(403);
  // TODO: PERMS: tem que conferir se o reqParams.UNIT_ID é permitido

  const paramSet = await buildSqlParams({
    ASSET_ID: reqParams.ASSET_ID,
    DAT_ID: reqParams.DAT_ID,
    AST_DESC: reqParams.AST_DESC,
    AST_TYPE: reqParams.AST_TYPE,
    CAPACITY_PWR: reqParams.CAPACITY_PWR,
    CAPACITY_UNIT: reqParams.CAPACITY_UNIT,
    CLIENT_ID: reqParams.CLIENT_ID,
    FLUID_TYPE: reqParams.FLUID_TYPE,
    GROUP_ID: reqParams.GROUP_ID,
    MCHN_APPL: reqParams.MCHN_APPL,
    MCHN_BRAND: reqParams.MCHN_BRAND,
    MCHN_ENV: reqParams.MCHN_ENV,
    MCHN_KW: reqParams.MCHN_KW,
    MCHN_MODEL: reqParams.MCHN_MODEL,
    UNIT_ID: reqParams.UNIT_ID,
    INSTALLATION_DATE: reqParams.INSTALLATION_DATE,
    INSTALLATION_LOCATION: reqParams.INSTALLATION_LOCATION,
    AST_ROLE: reqParams.AST_ROLE,
    COMPRESSOR_NOMINAL_CURRENT: reqParams.COMPRESSOR_NOMINAL_CURRENT,
    EQUIPMENT_POWER: reqParams.EQUIPMENT_POWER,
    EVAPORATOR_MODEL_ID: reqParams.EVAPORATOR_MODEL_ID,
    INSUFFLATION_SPEED: reqParams.INSUFFLATION_SPEED,
    CHILLER_CARRIER_MODEL_ID: reqParams.CHILLER_CARRIER_MODEL_ID,
    DEV_ID: reqParams.DEV_ID,
    OLD_DEV_ID: reqParams.OLD_DEV_ID,
  }, session);

  //to do: vir assetId, EVAPORATOR_ID, CONDENSER_ID, AIR_CURTAINS do reqParams

  await sqldb.ASSETS.w_update({
    ASSET_ID: assetInfo.ASSET_ID,
    DAT_CODE: paramSet.DAT_ID,
    UNIT_ID: paramSet.UNIT_ID,
    NAME: paramSet.ASSET_NAME,
    MODEL: paramSet.ASSET_MODEL,
  }, session.user)
  switch (paramSet.ASSET_ROLE) {
    case 1:
      //EVAPORADORA
      const evaporatorInfo = await sqldb.EVAPORATORS.getEvaporatorByAssetId({ ASSET_ID: assetInfo.ASSET_ID });
      if (!evaporatorInfo) throw Error('Evaporator not found').HttpStatus(400);
      await sqldb.EVAPORATORS.w_updateInfo({
        EVAPORATOR_ID: evaporatorInfo.EVAPORATOR_ID,
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: assetInfo.ASSET_ID,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
        INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
      }, session.user)
      break;
    case 2:
      //CONDENSADORA
      const condenserInfo = await sqldb.CONDENSERS.getCondenserByAssetId({ ASSET_ID: assetInfo.ASSET_ID });
      if (!condenserInfo) throw Error('Condenser not found').HttpStatus(400);
      await sqldb.CONDENSERS.w_updateInfo({
        CONDENSER_ID: condenserInfo.CONDENSER_ID,
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: assetInfo.ASSET_ID,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
        INSUFFLATION_SPEED: paramSet.INSUFFLATION_SPEED,
      }, session.user)
      await verifyRatedPowerMachine({ newRatedPowerAsset: paramSet.MACHINE_KW, oldRatedPowerAsset: assetInfo.MACHINE_KW, machineId: reqParams.GROUP_ID, updateMachineRatedPower: reqParams.UPDATE_MACHINE_RATED_POWER, userId: session.user });
      break;
    case 3:
      //CORTINA DE AR
      const airCurtainInfo = await sqldb.AIR_CURTAINS.getAirCurtainsByAssetId({ ASSET_ID: assetInfo.ASSET_ID });
      if (!airCurtainInfo) throw Error('Air Curtains not found').HttpStatus(400);
      await sqldb.AIR_CURTAINS.w_updateInfo({
        AIR_CURTAIN_ID: airCurtainInfo.AIR_CURTAIN_ID,
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: assetInfo.ASSET_ID,
      }, session.user)
      break;
    case 4:
      //TROCADOR DE CALOR
      const assetHeatExchangerInfo = await sqldb.ASSET_HEAT_EXCHANGERS.getAssetHeatExchangerByAssetId({ ASSET_ID: assetInfo.ASSET_ID });
      if (!assetHeatExchangerInfo) throw Error('Heat exchanger not found').HttpStatus(400);
      await sqldb.ASSET_HEAT_EXCHANGERS.w_updateInfo({
        ID: assetHeatExchangerInfo.ASSET_HEAT_EXCHANGER_ID,
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: assetInfo.ASSET_ID,
        CAPACITY_POWER: paramSet.ASSET_CAPACITY_POWER,
        CAPACITY_UNIT: paramSet.ASSET_CAPACITY_UNIT,
        MACHINE_KW: paramSet.MACHINE_KW,
        COMPRESSOR_NOMINAL_CURRENT: paramSet.COMPRESSOR_NOMINAL_CURRENT,
        EQUIPMENT_POWER: paramSet.EQUIPMENT_POWER,
        EVAPORATOR_MODEL_ID: paramSet.EVAPORATOR_MODEL_ID,
      }, session.user)
      break;
    case 5:
      //CHILLER
      const assetChillersInfo = await sqldb.CHILLERS.getAssetChillerByAssetId({ ASSET_ID: assetInfo.ASSET_ID });
      if (!assetChillersInfo) throw Error('Chiller not found').HttpStatus(400);
      await sqldb.CHILLERS.w_updateInfo({
        ID: assetChillersInfo.CHILLER_ID,
        MACHINE_ID: paramSet.MACHINE_ID,
        ASSET_ID: assetInfo.ASSET_ID,
        CHILLER_CARRIER_MODEL_ID: paramSet.CHILLER_CARRIER_MODEL_ID,
      }, session.user);
      if ((paramSet.DEV_ID || paramSet.OLD_DEV_ID) && paramSet.ASSET_NAME) {
        const infoDri = await sqldb.DRIS_DEVICES.getBaciInfoByDeviceCode({ DEVICE_CODE: paramSet.DEV_ID || paramSet.OLD_DEV_ID });
        await sqldb.DRIS_DEVICES.w_updateInfo({ SYSTEM_NAME: paramSet.ASSET_NAME, ID: infoDri.DRI_DEVICE_ID }, session.user);
      }
      break;
    default:
      break;
  }

  await verifyUpdateAssetMachine(paramSet, session);

  await verifyAssetDevices({ OLD_DEV_ID: reqParams.OLD_DEV_ID, DEV_ID: reqParams.DEV_ID, ASSET_ID: assetInfo.ASSET_ID, ASSET_ROLE: paramSet.ASSET_ROLE }, paramSet, session);
 
  const info = await sqldb.ASSETS.getAssetInfo({ ASSET_ID: reqParams.ASSET_ID });

  return { info };
}

async function buildSqlParams (reqParams: {
  ASSET_ID?: number
  DAT_ID?: string
  AST_DESC?: string
  INSTALLATION_LOCATION?: string
  AST_TYPE?: string
  CAPACITY_PWR?: number
  CAPACITY_UNIT?: string
  CLIENT_ID?: number
  FLUID_TYPE?: string
  GROUP_ID?: number
  MCHN_APPL?: string
  MCHN_BRAND?: string
  MCHN_ENV?: string
  MCHN_KW?: number
  MCHN_MODEL?: string
  UNIT_ID?: number
  INSTALLATION_DATE?: string
  AST_ROLE?: number
  COMPRESSOR_NOMINAL_CURRENT?: number
  EQUIPMENT_POWER?: string
  EVAPORATOR_MODEL_ID?: number
  TYPE_CFG?: string
  INSUFFLATION_SPEED?: number
  CHILLER_CARRIER_MODEL_ID?: number
  DEV_ID?: string
  OLD_DEV_ID?: string
}, session: SessionData) {
  // Check required params
  const devId = reqParams.DAT_ID;

  // Format some property values
  if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;
  if (<any>reqParams.GROUP_ID === '') reqParams.GROUP_ID = null;
  if (<any>reqParams.UNIT_ID === '') reqParams.UNIT_ID = null;
  if (reqParams.AST_DESC === '') reqParams.AST_DESC = null;
  if (reqParams.MCHN_MODEL === '') reqParams.MCHN_MODEL = null;
  if (reqParams.CAPACITY_UNIT === '') reqParams.CAPACITY_UNIT = null;
  if ((<any>reqParams.CAPACITY_PWR) === '') reqParams.CAPACITY_PWR = null;
  if ((<any>reqParams.MCHN_KW) === '') reqParams.MCHN_KW = null;
  if ((<any>reqParams.COMPRESSOR_NOMINAL_CURRENT) === '') reqParams.COMPRESSOR_NOMINAL_CURRENT = null;
  if (reqParams.FLUID_TYPE === '') reqParams.FLUID_TYPE = null;
  if ((<any>reqParams.EVAPORATOR_MODEL_ID) === '') reqParams.EVAPORATOR_MODEL_ID = null;
  if ((<any>reqParams.INSUFFLATION_SPEED) === '') reqParams.INSUFFLATION_SPEED = null;
  if (reqParams.FLUID_TYPE === '') reqParams.FLUID_TYPE = null;
  if (reqParams.MCHN_APPL === '') reqParams.MCHN_APPL = null;
  if (reqParams.AST_TYPE === '') reqParams.AST_TYPE = null;
  if (reqParams.TYPE_CFG === '') reqParams.TYPE_CFG = null;
  if (reqParams.MCHN_ENV === '') reqParams.MCHN_ENV = null;
  if (reqParams.MCHN_BRAND === '') reqParams.MCHN_BRAND = null;
  if (reqParams.CAPACITY_PWR === null) reqParams.CAPACITY_UNIT = null;
  if (reqParams.CAPACITY_PWR === undefined) reqParams.CAPACITY_UNIT = undefined;
  if (reqParams.INSTALLATION_DATE === '') reqParams.INSTALLATION_DATE = null;
  if (reqParams.INSTALLATION_LOCATION === '') reqParams.INSTALLATION_LOCATION = null;
  if (<any>reqParams.AST_ROLE === undefined) reqParams.AST_ROLE = undefined;
  if (<any>reqParams.CHILLER_CARRIER_MODEL_ID === '') reqParams.CHILLER_CARRIER_MODEL_ID = null;
  if (<any>reqParams.DEV_ID === '') reqParams.DEV_ID = null;
  if (<any>reqParams.OLD_DEV_ID === '') reqParams.OLD_DEV_ID = null;
  if (reqParams.GROUP_ID && ((typeof reqParams.GROUP_ID) === 'string')) {
    reqParams.GROUP_ID = Number(reqParams.GROUP_ID);
    if (isNaN(reqParams.GROUP_ID)) throw Error('Invalid GROUP_ID!').HttpStatus(400);
  }
  if ((typeof reqParams.CAPACITY_PWR) === 'string') {
    reqParams.CAPACITY_PWR = Number(reqParams.CAPACITY_PWR);
    if (isNaN(reqParams.CAPACITY_PWR)) throw Error('Invalid CAPACITY_PWR!').HttpStatus(400);
  }
  if ((typeof reqParams.MCHN_KW) === 'string') {
    reqParams.MCHN_KW = Number(reqParams.MCHN_KW);
    if (isNaN(reqParams.MCHN_KW)) throw Error('Invalid MCHN_KW!').HttpStatus(400);
  }
  if (reqParams.CAPACITY_PWR && !reqParams.CAPACITY_UNIT) {
    throw Error('Invalid CAPACITY_UNIT!').HttpStatus(400);
  }

  // Check if new dev
  let currentDevInfo = reqParams.ASSET_ID ? await sqldb.ASSETS.getBasicInfo({ ASSET_ID: reqParams.ASSET_ID}) : null;

  // Verifica as permissões do usuário para o cliente e unidade do ativo
  const { userCanEditDev, finalClient, userCanAddNewInfo, clientChanged } = await checkDevEditPermission(session, currentDevInfo, {
    CLIENT_ID: reqParams.CLIENT_ID,
    UNIT_ID: reqParams.UNIT_ID,
  });

  if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);

  // Check if new dev
  if (!currentDevInfo) {
    if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
    if (devId && devId !== devId.toUpperCase()) throw Error('Invalid DEV ID! Lower case not allowed.').HttpStatus(400);
    const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
    if (perms.canConfigureNewUnits) { } // OK
    else throw Error('Permission denied! Profile cannot add new assets to selected client.').HttpStatus(403)
  }

  const { finalUnit, unitChanged } = await checkFinalUnit({ userCanEditDev }, currentDevInfo && currentDevInfo.UNIT_ID, reqParams.UNIT_ID, finalClient);
  const { finalMachine, machineChanged } = await checkFinalMachine({ userCanEditDev }, currentDevInfo && currentDevInfo.MACHINE_ID, reqParams.GROUP_ID, finalUnit);

  let paramSet: IParamSet = { DAT_ID: devId };

  if (clientChanged) {
    paramSet.CLIENT_ID = finalClient;
  }
  if (unitChanged) {
    paramSet.UNIT_ID = finalUnit;
  }
  if (machineChanged) {
    paramSet.MACHINE_ID = finalMachine;
  }

  if (reqParams.ASSET_ID !== undefined) { paramSet.ASSET_ID = reqParams.ASSET_ID; }
  if (reqParams.AST_DESC !== undefined) paramSet.ASSET_NAME = reqParams.AST_DESC;
  if (reqParams.INSTALLATION_LOCATION !== undefined) paramSet.ASSET_INSTALLATION_LOCATION = reqParams.INSTALLATION_LOCATION;
  if (reqParams.MCHN_MODEL !== undefined) paramSet.ASSET_MODEL = reqParams.MCHN_MODEL;
  if (reqParams.CAPACITY_PWR !== undefined) paramSet.ASSET_CAPACITY_POWER = reqParams.CAPACITY_PWR;
  if (reqParams.CAPACITY_UNIT !== undefined) paramSet.ASSET_CAPACITY_UNIT = reqParams.CAPACITY_UNIT;
  if (reqParams.MCHN_KW !== undefined) paramSet.MACHINE_KW = reqParams.MCHN_KW;
  if (reqParams.COMPRESSOR_NOMINAL_CURRENT !== undefined) paramSet.COMPRESSOR_NOMINAL_CURRENT = reqParams.COMPRESSOR_NOMINAL_CURRENT;
  if (reqParams.EQUIPMENT_POWER !== undefined) paramSet.EQUIPMENT_POWER = reqParams.EQUIPMENT_POWER;
  if (reqParams.EVAPORATOR_MODEL_ID !== undefined) paramSet.EVAPORATOR_MODEL_ID = reqParams.EVAPORATOR_MODEL_ID;
  if (reqParams.INSUFFLATION_SPEED !== undefined) paramSet.INSUFFLATION_SPEED = reqParams.INSUFFLATION_SPEED;
  if (reqParams.FLUID_TYPE !== undefined) paramSet.MACHINE_FLUID_TYPE = reqParams.FLUID_TYPE;
  if (reqParams.MCHN_APPL !== undefined) paramSet.MACHINE_APPLICATION = reqParams.MCHN_APPL;
  if (reqParams.AST_TYPE !== undefined) paramSet.ASSET_TYPE = reqParams.AST_TYPE;
  if (reqParams.MCHN_ENV !== undefined) paramSet.MACHINE_ENVIRONMENT = reqParams.MCHN_ENV;
  if (reqParams.MCHN_BRAND !== undefined) paramSet.MACHINE_BRAND = reqParams.MCHN_BRAND;
  if (reqParams.INSTALLATION_DATE !== undefined) paramSet.MACHINE_INSTALLATION_DATE = reqParams.INSTALLATION_DATE;
  if (reqParams.AST_ROLE !== undefined) paramSet.ASSET_ROLE = reqParams.AST_ROLE;
  if (reqParams.TYPE_CFG !== undefined) paramSet.TYPE_CFG = reqParams.TYPE_CFG;
  if (reqParams.CHILLER_CARRIER_MODEL_ID !== undefined) paramSet.CHILLER_CARRIER_MODEL_ID = reqParams.CHILLER_CARRIER_MODEL_ID;
  if (reqParams.DEV_ID !== undefined) paramSet.DEV_ID = reqParams.DEV_ID;
  if (reqParams.OLD_DEV_ID !== undefined) paramSet.OLD_DEV_ID = reqParams.OLD_DEV_ID;

  return paramSet;
}


httpRouter.privateRoutes['/clients/remove-asset'] = async function (reqParams, session) {
  if (!reqParams.DAT_ID && !reqParams.ASSET_ID) {
    throw Error('Invalid properties. Missing DAT_ID or ASSET_ID.').HttpStatus(400);
  }
  const qPars = reqParams.ASSET_ID ? { ASSET_ID: reqParams.ASSET_ID } : { DAT_CODE: reqParams.DAT_ID };

  const assetInfo = await sqldb.ASSETS.getBasicInfo(qPars);
  if (!assetInfo) { throw Error('Asset not found').HttpStatus(400); }

  const perms = await getPermissionsOnClient(session, assetInfo.CLIENT_ID);
  if (!perms.canDeleteDevs) throw Error('Permission denied!').HttpStatus(403);

  await removingAssetsByAssetId({ ASSET_ID: assetInfo.ASSET_ID, DEVICE_CODE: reqParams.DEVICE_CODE }, session.user);
  const { affectedRows } = await sqldb.ASSETS.w_deleteRow({ ASSET_ID: assetInfo.ASSET_ID }, {
    FAULTS_DATAS: true,
    HEALTH_BEFORE_OFFLINE: true,
    ASSETS_HEALTH: true,
    ASSETS_HEALTH_HIST: true,
    ASSET_IMAGES: true,
    EVAPORATORS_HEAT_EXCHANGERS: true,
    CONDENSERS_HEAT_EXCHANGERS: true,
    DACS_CONDENSERS: true,
    DACS_EVAPORATORS: true,
    AIR_CURTAINS: true,
    EVAPORATORS: true,
    CONDENSERS: true,
  }, session.user);

  return `DELETED ` + affectedRows;
}

httpRouter.privateRoutes['/clients/get-asset-info'] = async function (reqParams, session) {
  // # Verifica permissão
  if (!reqParams.DEV_ID && !reqParams.DAT_ID && !reqParams.ASSET_ID) throw Error('Invalid parameters! Missing DEV_ID, DAT_ID or ASSET_ID').HttpStatus(400)

  let assetInf = null as null|{ 
    ASSET_ID: number
    DAT_ID: string
    AST_DESC: string
    INSTALLATION_LOCATION: string | null
    AST_TYPE: string
    CAPACITY_PWR: number
    CAPACITY_UNIT: string
    CLIENT_ID: number
    MCHN_KW: number
    FLUID_TYPE: string
    GROUP_ID: number
    MCHN_APPL: string
    MCHN_BRAND: string
    MCHN_ENV: string
    MCHN_MODEL: string
    UNIT_ID: number
    INSTALLATION_DATE: string
    AST_ROLE: number
    AST_ROLE_NAME: string
    GROUP_NAME: string
    UNIT_NAME: string
    CLIENT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    DEV_CLIENT_ASSET_ID: number|null
    DAT_INDEX: number|null
    DEV_ID: string|null
    TIMEZONE_AREA: string|null
    TIMEZONE_OFFSET: number|null
    TIMEZONE_ID: number|null
  };

  if (reqParams.DEV_ID) {
    try{
      assetInf = await sqldb.ASSETS.getAssetInfo({ DEV_ID: reqParams.DEV_ID})
    }
    catch (err){
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
      // Continue, can be DAT_ID
    }
  }
  if (reqParams.DAT_ID && !assetInf){
    // DAC information not set yet
    assetInf = await sqldb.ASSETS.getAssetInfo({ DAT_CODE: reqParams.DAT_ID, DAT_INDEX: reqParams.DAT_INDEX })
  }

  if (reqParams.ASSET_ID && !assetInf && !isNaN(Number(reqParams.ASSET_ID))){
    assetInf = await sqldb.ASSETS.getAssetInfo({ ASSET_ID: Number(reqParams.ASSET_ID) })
  }
  

  if (!assetInf && (reqParams.DAT_ID || reqParams.ASSET_ID)) {
    throw Error('Could not find DAC information').HttpStatus(400);
  } else if (!assetInf) {
    return { info: null, optsDescs: null}
  }

  const perms = await getPermissionsOnUnit(session, assetInf.CLIENT_ID, assetInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let optsIds = [] as string[];
  if (assetInf.FLUID_TYPE) optsIds.push(assetInf.FLUID_TYPE);
  if (assetInf.MCHN_APPL) optsIds.push(assetInf.MCHN_APPL);
  if (assetInf.AST_TYPE) optsIds.push(assetInf.AST_TYPE);
  if (assetInf.MCHN_ENV) optsIds.push(assetInf.MCHN_ENV);
  if (assetInf.MCHN_BRAND) optsIds.push(assetInf.MCHN_BRAND);
  const optsDescs = await getAvOptsDescs(optsIds);

  return { info: assetInf, optsDescs };
}

httpRouter.privateRoutes['/clients/get-client-assets-by-group'] = async function (reqParams, session) {
  if (!reqParams.GROUP_ID) {
    throw Error('Invalid properties. Missing GROUP_ID.').HttpStatus(400);
  }

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }
  const addUnownedDevs = (!!session.permissions.MANAGE_UNOWNED_DEVS);

  const assets = await sqldb.ASSETS.getAssetsList_dacsAndAssets({
    clientIds: reqParams.clientIds,
    machineIds: [reqParams.GROUP_ID]
  },{addUnownedDevs});

  let assetsResult = [] as {
      ASSET_ID: number;
      DAT_ID: string;
      AST_TYPE: string;
      AST_DESC: string;
      DEV_ID: string;
      DEVICE_ID: number|null;
      H_INDEX: number|null;
      AST_ROLE: number;
      AST_ROLE_NAME: string;
      INSTALLATION_DATE: string;
      DAT_INDEX: number;
      MCHN_BRAND: string;
      CAPACITY_PWR: number;
      CAPACITY_UNIT: string;
      FLUID_TYPE: string;
      MCHN_MODEL: string;
      PLACEMENT: string|null;
  }[];

  if (assets) {
    for (const asset of assets) {
      const devsClientAsset = await sqldb.ASSETS.getDevsClientAssets({DAT_ID: asset.DAT_ID, ASSET_ID: asset.ASSET_ID});

      if (devsClientAsset && devsClientAsset.length > 0) {
        devsClientAsset.forEach((item) => assetsResult.push({
          ASSET_ID: asset.ASSET_ID,
          DAT_ID: item.DAT_ID,
          AST_TYPE: asset.AST_TYPE,
          AST_DESC: asset.AST_DESC,
          DEV_ID: item.DEV_ID,
          DEVICE_ID: item.DEVICE_ID,
          H_INDEX: (item.PLACEMENT === 'DUO'|| item.DEV_ID.startsWith('DAC')) ? item.H_INDEX : null,
          AST_ROLE: asset.AST_ROLE,
          AST_ROLE_NAME: asset.AST_ROLE_NAME,
          INSTALLATION_DATE: asset.INSTALLATION_DATE,
          DAT_INDEX: item.DAT_INDEX,
          MCHN_BRAND: asset.MCHN_BRAND,
          CAPACITY_PWR: asset.CAPACITY_PWR,
          CAPACITY_UNIT: asset.CAPACITY_UNIT,
          FLUID_TYPE: asset.FLUID_TYPE,
          MCHN_MODEL: asset.MCHN_MODEL,
          PLACEMENT: item.PLACEMENT,
          })
        )
      }
      else{
        assetsResult.push({
          ASSET_ID: asset.ASSET_ID,
          DAT_ID: asset.DAT_ID,
          AST_TYPE: asset.AST_TYPE,
          AST_DESC: asset.AST_DESC,
          DEV_ID: '',
          DEVICE_ID: null,
          H_INDEX: null,
          AST_ROLE: asset.AST_ROLE,
          AST_ROLE_NAME: asset.AST_ROLE_NAME,
          INSTALLATION_DATE: asset.INSTALLATION_DATE,
          DAT_INDEX: 0,
          MCHN_BRAND: asset.MCHN_BRAND,
          CAPACITY_PWR: asset.CAPACITY_PWR,
          CAPACITY_UNIT: asset.CAPACITY_UNIT,
          FLUID_TYPE: asset.FLUID_TYPE,
          MCHN_MODEL: asset.MCHN_MODEL,
          PLACEMENT: null,
          })
      }
    }

    return {
      GROUP_ID: reqParams.GROUP_ID,
      GROUP_NAME: (assets.length > 0 ? assets[0].GROUP_NAME : null),
      DAM_ID: (assets.length > 0 ? assets[0].DEV_AUT : null),
      DEV_AUT: (assets.length > 0 ? assets[0].DEV_AUT : null),
      DUT_ID: (assets.length > 0 ? assets[0].DUT_ID : null),
      assets: assetsResult
    };
  }

  return null;
}

httpRouter.privateRoutes['/clients/get-client-asset'] = async function (reqParams, session) {
  if (!reqParams.ASSET_ID && !reqParams.DAT_ID) {
    throw Error('Invalid properties. Missing ASSET_ID or DAT_ID.').HttpStatus(400);
  }

  const qPars = reqParams.ASSET_ID? { assetId: reqParams.ASSET_ID } : { datId: reqParams.DAT_ID };

  const assets = await sqldb.ASSETS.getAssetsList_dacsAndAssets({
    clientIds: reqParams.clientIds,
    ...qPars,
  }, { addUnownedDevs: true });

  if (assets.length === 0) {
    throw Error('Ativo não encontrado').HttpStatus(400);
  }
  if (assets.length !== 1) {
    throw Error('Erro ao acessar o banco de dados').HttpStatus(500);
  }

  const assetInf = assets[0];
  if (reqParams.clientIds && !reqParams.clientIds.includes(assetInf.CLIENT_ID)) {
    throw Error('Ativo não encontrado no cliente').HttpStatus(400);
  }

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    // OK
  }
  else {
    const perms = await getPermissionsOnUnit(session, assetInf.CLIENT_ID, assetInf.UNIT_ID);
    if (!perms.canViewDevs) throw Error('Permissão negada').HttpStatus(403);
  }

  const devsClientAsset = await sqldb.ASSETS.getDevsClientAssets({ DAT_ID: assets[0].DAT_ID, ASSET_ID: assets[0].ASSET_ID });
  const devInf = devsClientAsset[0] || null;

  const assetsResult = {
    ASSET_ID: assetInf.ASSET_ID,
    DAT_ID: assetInf.DAT_ID,
    AST_TYPE: assetInf.AST_TYPE,
    AST_DESC: assetInf.AST_DESC,
    DEV_ID: devInf && devInf.DEV_ID,
    DEVICE_ID: devInf && devInf.DEVICE_ID,
    H_INDEX: devInf && devInf.H_INDEX,
    AST_ROLE: assetInf.AST_ROLE,
    AST_ROLE_NAME: assetInf.AST_ROLE_NAME,
    INSTALLATION_DATE: assetInf.INSTALLATION_DATE,
    DAT_INDEX: devInf && devInf.DAT_INDEX,
    MCHN_BRAND: assetInf.MCHN_BRAND,
    CAPACITY_PWR: assetInf.CAPACITY_PWR,
    CAPACITY_UNIT: assetInf.CAPACITY_UNIT,
    FLUID_TYPE: assetInf.FLUID_TYPE,
    MCHN_MODEL: assetInf.MCHN_MODEL,
  }

  return {
    asset: assetsResult
  };
}

// rota temporaria para script
httpRouter.privateRoutes['/clients/route-insert-health-dut-duo'] = async function (_reqParams, session) {
  try {
    const registers = await sqldb.ASSETS.getAssetWithoutHealthDutDuo();
    for (const id of registers) {
      const idHealthHist = await sqldb.ASSETS_HEALTH_HIST.w_insert({
        ASSET_ID: id.ASSET_ID,
        P_CAUSE_ID: null,
        CT_ID: 1,
        DAT_REPORT: Math.round(new Date().getTime() / 1000),
        H_INDEX: 100,
        H_DESC: "Sistema operando corretamente",
        H_DATE: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19)
      }, session.user);
      await sqldb.ASSETS_HEALTH.w_insertOrUpdate({
        ASSET_ID: id.ASSET_ID,
        HEALTH_HIST_ID: idHealthHist.insertId,
      }, session.user);
    }
  } catch (err) { logger.error(err); }
}


async function setNewDacHealthMaybeNeverOnline (devId: string, userId: string) {
  try {
    const dacInf = await sqldb.ASSETS_HEALTH.getAssetHealthStatus({ DEV_ID: devId });
    if (dacInf.H_OFFL) return;
    const recHealth: RecHealthData = {
      H_INDEX: dacInf.H_INDEX,
      H_DESC: dacInf.H_DESC,
      P_CAUSES: dacInf.P_CAUSES,
    };

    if (dacInf.H_INDEX !== 4) {
      await sqldb.MSGTOSERVICE.w_insert({
        DEST: 'health',
        ORIG: 'api-async',
        MSG: JSON.stringify({
          msgtype: 'setDacHealthStatus',
          DAC_ID: devId,
          H_INDEX: 2,
          H_DESC: 'Equipamento sendo modificado por planilha',
          P_CAUSES: null,
          H_OFFL: JSON.stringify(recHealth),
          CT_ID: ChangeType.Timeout,
          userId,
        }),
        DAT_SEND: now_shiftedTS_s(),
      }, userId);
    }
  } catch (err) { logger.error(err); }
}
