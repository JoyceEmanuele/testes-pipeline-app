import * as httpRouter from '../apiServer/httpRouter';
import { getDaysList2_YMD } from '../../srcCommon/helpers/dates'
import sqldb from '../../srcCommon/db';
import { getPermissionsOnUnit, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';
import { setGetDevInfo } from '../devInfo';
import { SessionData as sessionAux} from '../../srcCommon/types';
import { checkWaterInfo } from '../dmaInfo';
import { apiLaarger, insertHistory, calculateAverageUsageHistory } from '../../srcCommon/extServices/laagerApi';

httpRouter.privateRoutes['/laager/get-meters-list'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllIntegrationDevices) {
    throw Error('Permission denied').HttpStatus(403);
  }
  const metersList = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1);
  return { list: metersList };
}

httpRouter.privateRoutes['/laager/get-alarms-list'] = async function (reqParams, session) {
  if (!reqParams.date) {
    throw Error('date required').HttpStatus(400)
  }
  const perms = getUserGlobalPermissions(session);
  if (!perms.readAllIntegrationDevices) {
    throw Error('Permission denied').HttpStatus(403);
  }
  const alarmsList = await apiLaarger['GET /alarmes/historico.json:data:pagina:limite'](reqParams.date, 0, 100);
  return { list: alarmsList };
}

httpRouter.privateRoutes['/laager/associate-meter-to-diel-unit'] = async function (reqParams, session) {
  const { unitId, meterId } = reqParams;

  if (!unitId) {
    throw Error('Unit id missing').HttpStatus(400);
  }

  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }

  const listLaager = await sqldb.LAAGER.getListWithUnitInfo({ unitIds: [unitId] });
  
  const dmaByUnit = await sqldb.DMAS_DEVICES.getList({ unitIds: [unitId] });

  if (!meterId && listLaager.length) {
    await sqldb.LAAGER.w_updateInfo({ LAAGER_CODE: listLaager[0].LAAGER_CODE, WATER_ID: null, CARDSCFG: null, INSTALLATION_LOCATION: null, INSTALLATION_DATE: null}, session.user)
    return 'OK'
  } else {
     const meterData = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: meterId });
     if (meterData && meterData.UNIT_ID === unitId) {
      return "METER ALREADY ASSOCIED WITH THE SAME UNIT - OK";
    } else if (listLaager.length !== 0 && reqParams.meterId !== listLaager[0].LAAGER_CODE) {
      if (reqParams.changedByUnit) {
        await sqldb.LAAGER.w_updateInfo({ LAAGER_CODE: listLaager[0].LAAGER_CODE, WATER_ID: null, CARDSCFG: null, INSTALLATION_LOCATION: null, INSTALLATION_DATE: null}, session.user)
      } else {
        throw Error('A unidade escolhida já possui um medidor de água Laager associado a ela.').HttpStatus(400);
      }
    } else if (dmaByUnit.length !== 0) {
      if (reqParams.changedByUnit) {
        await setGetDevInfo(session, {
          DEV_ID: dmaByUnit[0].DMA_ID,
          UNIT_ID: null,
          CLIENT_ID: null,
          allowInsert: dmaByUnit[0].DMA_ID.startsWith('DMA'),
        });
      } else {
        throw Error('Unidade já possui DMA associado.').HttpStatus(400);
      }
    }
        
    const waterId = await checkWaterInfo(unitId, meterId);
    if (meterData && !meterData.UNIT_ID) {
      await sqldb.LAAGER.w_updateInfo({ LAAGER_CODE: meterId, WATER_ID: waterId }, session.user);           
    } else if (meterData && meterData.UNIT_ID !== unitId) {
      throw Error('Medidor pertence à outro cliente').HttpStatus(400);
    } else {      
      await sqldb.LAAGER.w_insert({ LAAGER_CODE: meterId, WATER_ID: waterId}, session.user);
    }
  }
    return 'ASSOCIATION OK';
}

export const verifyActualDevicesByUnit = async (changedByUnit: boolean, unitId: number, meterId: string, session: sessionAux) => {
  const listLaager = await sqldb.LAAGER.getListWithUnitInfo({ unitIds: [unitId] });
  const dmaByUnit = await sqldb.DMAS_DEVICES.getList({ unitIds: [unitId] });
  
  if (listLaager.length && meterId !== listLaager[0].LAAGER_CODE){
    if (changedByUnit) {
      await sqldb.LAAGER.w_updateInfo({ LAAGER_CODE: listLaager[0].LAAGER_CODE, WATER_ID: null, CARDSCFG: null, INSTALLATION_LOCATION: null, INSTALLATION_DATE: null}, session.user)
    } else {
      throw Error('A unidade escolhida já possui um medidor de água Laager associado a ela.').HttpStatus(400);
    }
  } else if (dmaByUnit.length !== 0){
    if (changedByUnit) {
      const dateDmaInf = await sqldb.DMAS_DEVICES.getBasicInfo({ DEVICE_CODE: dmaByUnit[0].DMA_ID });
      await setGetDevInfo(session, {
        DEV_ID: dmaByUnit[0].DMA_ID,
        UNIT_ID: null,
        CLIENT_ID: null,
        allowInsert: dmaByUnit[0].DMA_ID.startsWith('DMA'),
      });
    } else {
      throw Error('Unidade já possui DMA associado.').HttpStatus(400);
    }
  }
}

export async function laagerSetMeterInfo(reqParams: { meterId: string, unitId?: number, cardsCfg?: string, installationLocation?: string, installationDate?: string, totalCapacity?: number, quantityOfReservoirs?: number, hydrometerModel?: string, changedByUnit?: boolean }, session: sessionAux) {
  if (!reqParams.meterId) throw Error('Medidor de água Laager inválido.').HttpStatus(400);
  
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Permission denied').HttpStatus(403);
  }
  
  const laagerInf = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: reqParams.meterId });
  
  if (reqParams.unitId != null) {
    await verifyActualDevicesByUnit(reqParams.changedByUnit, reqParams.unitId, reqParams.meterId, session)
  }

  const hydrometerId = await sqldb.HYDROMETER_MODELS.getHydrometerId({HYDROMETER_MODEL: reqParams.hydrometerModel})

  const waterId = await checkWaterInfo(reqParams.unitId, reqParams.meterId);

  await sqldb.LAAGER.w_updateInfo({ 
    LAAGER_CODE: reqParams.meterId, 
    WATER_ID: waterId,
    CARDSCFG: reqParams.cardsCfg, 
    INSTALLATION_LOCATION: reqParams.installationLocation, 
    INSTALLATION_DATE: reqParams.installationDate, 
  }, session.user)
  await sqldb.WATERS.w_update({
    ID: waterId,
    HYDROMETER_MODELS_ID: hydrometerId && hydrometerId.HYDROMETER_ID,
    UNIT_ID: reqParams.unitId,
    TOTAL_CAPACITY: reqParams.totalCapacity, 
    QUANTITY_OF_RESERVOIRS: reqParams.quantityOfReservoirs,
  }, session.user)

  return 'OK';
}

httpRouter.privateRoutes['/laager/set-meter-info'] = laagerSetMeterInfo;

httpRouter.privateRoutes['/laager/get-informations'] = async function (reqParams, session) {
  if (!reqParams.unit_id) { throw Error('"unit_id" required').HttpStatus(400)}

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const meterInf = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.unit_id });
    const clientId = meterInf && meterInf.CLIENT_ID;
    const unitId = meterInf && meterInf.UNIT_ID;
    const perms = await getPermissionsOnUnit(session, clientId, unitId);
    if (!perms.canViewDevs) throw Error('Permissão negada').HttpStatus(403);
  }

  const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1)
  const meter = responseGroup.find((meter) => meter.customer_id === reqParams.unit_id);
  if (!meter) throw Error('Medidor de água não encontrado').HttpStatus(400);
  const { rf_device_id } = meter;
  const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString())
  const responseConsumption = await apiLaarger['GET /consumption/:unit_id'](reqParams.unit_id)

  // Insert history to database, to don't use laager api to old information
  await insertHistory(reqParams.unit_id, responseMeter.history)

  const rowGroupAux =  responseGroup.find(row => row.customer_id === reqParams.unit_id)
  const rowMeterAux = responseMeter.history.find(row => row.date === responseMeter.current_reading_at.substring(0,10))

  const response = {
    module_rf: responseMeter.module_rf_id,
    batery_state: rowGroupAux && rowGroupAux.batery_state,
    meter_type: 'Agua Fria',
    current_usage: responseConsumption.resume.current_usage,
    day_usage: rowMeterAux && rowMeterAux.usage,
    last_reading_date: responseMeter.current_reading_at
  }

  return response;
}

httpRouter.privateRoutes['/laager/get-reading-history'] = async function (reqParams, session) {
  if (!reqParams.unit_id) { throw Error('"unit_id" required').HttpStatus(400)}
  if (!reqParams.start_date) { throw Error('"start_date" required').HttpStatus(400)}
  if (!reqParams.end_date) { throw Error('"end_date" required').HttpStatus(400)}

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const meterInf = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.unit_id });
    const clientId = meterInf && meterInf.CLIENT_ID;
    const unitId = meterInf && meterInf.UNIT_ID;
    const perms = await getPermissionsOnUnit(session, clientId, unitId);
    if (!perms.canViewDevs) throw Error('Permissão negada').HttpStatus(403);
  }

  const datIniD = new Date(reqParams.start_date + 'T00:00:00Z');
  const datFinD = new Date(reqParams.end_date + 'T00:00:00Z');
  const dateList = getDaysList2_YMD(reqParams.start_date, reqParams.end_date)

  // get the last history's date inserted
  const lastDateString = await sqldb.LAAGER_HISTORY_USAGE.getLastData({LAAGER_CODE: reqParams.unit_id})
  const lastDate = newLastDateString(lastDateString);
  const nowDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // date now - last 24 hours
  let rowMeterAux

  const dateCurrent = checkDateCurrent(lastDateString, datFinD, nowDate, lastDate);

  // then read from api
  if (dateCurrent){
    const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1)
    const meter = responseGroup.find((meter) => meter.customer_id === reqParams.unit_id);
    if (!meter) throw Error('Medidor de água não encontrado').HttpStatus(400);
    const { rf_device_id } = meter;
    const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());
    await insertHistory(reqParams.unit_id, responseMeter.history)
    rowMeterAux = responseMeter.history.filter(row => datIniD <= new Date(row.date + 'T00:00:00Z') &&
                                                          datFinD >= new Date(row.date + 'T00:00:00Z'))
  }
  else{
    // else, read from data base (old information)
    rowMeterAux = [] as {
      date: string
      reading: number
      usage: number
    }[];

    const responseMeterDb = await sqldb.LAAGER_HISTORY_USAGE.getExtraInfo({LAAGER_CODE: reqParams.unit_id, start_date: reqParams.start_date, end_date: reqParams.end_date})

    for (const row of responseMeterDb){
      rowMeterAux.push({
        date: row.RECORD_DATE,
        reading: row.DAY_READING,
        usage: row.DAY_USAGE
      })
    }
  }

  const {dailyAverage, periodReading, predicted, history} = calculateAverageReadingHistory(dateList, datFinD, nowDate, rowMeterAux)
 
  return {
    daily_average: dailyAverage,
    period_reading: periodReading,
    predicted: predicted,
    history: history
  };
}


httpRouter.privateRoutes['/laager/get-usage-history'] = async function (reqParams, session) {
  if (!reqParams.unit_id) { throw Error('"unit_id" required').HttpStatus(400)}
  if (!reqParams.start_date) { throw Error('"start_date" required').HttpStatus(400)}
  if (!reqParams.end_date) { throw Error('"end_date" required').HttpStatus(400)}

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
    const meterInf = await sqldb.LAAGER.getExtraInfo({ LAAGER_CODE: reqParams.unit_id });
    const clientId = meterInf && meterInf.CLIENT_ID;
    const unitId = meterInf && meterInf.UNIT_ID;
    const perms = await getPermissionsOnUnit(session, clientId, unitId);
    if (!perms.canViewDevs) throw Error('Permissão negada').HttpStatus(403);
  }

  let dmaIds = [] as { 
    ID: number,
    DMA_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  let laagerIds = [] as { 
    ID: number,
    LAAGER_ID: string,
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
  }[];
  let unLaager = reqParams.unit_id;
  const meterSimpleInf = await sqldb.LAAGER.getSimpleInfo({ LAAGER_CODE: unLaager });
  if (meterSimpleInf.UNIT_ID) {
    dmaIds = await sqldb.DMAS_HIST.getDmaHist({ UNIT_ID: meterSimpleInf.UNIT_ID, dateStart: reqParams.start_date, dateEnd: reqParams.end_date })
    laagerIds = await sqldb.LAAGER_HIST.getLaagerHist({ UNIT_ID: meterSimpleInf.UNIT_ID, dateStart: reqParams.start_date, dateEnd: reqParams.end_date })
  }


  const {dailyAverage, periodUsage, predicted, history} = await calculateAverageUsageHistory(reqParams, dmaIds, laagerIds, meterSimpleInf, unLaager, session)

  return {
    daily_average: dailyAverage,
    period_usage: periodUsage,
    predicted: predicted,
    history: history,
  };
}

function calculateAverageReadingHistory(dateList:string[], datFinD:Date, nowDate:Date, rowMeterAux:{
  date: string;
  reading: number;
  usage: number;
}[] ) {
  
  const history = [] as {
    information_date: string
    reading: number
  }[];

  let historyAux;
  let reading;
  let dailyAverage;
  let periodReading = 0;
  let predicted;
  let auxAverage = dateList.length;
  let diffDays = 0;

  // Defines the days to be considered when calculating the average
  // As the date range can be longer than today's date, the days to be considered in the average will not always be the total days in the range.
  if (datFinD > nowDate){
    diffDays = Math.round((datFinD.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    auxAverage -= diffDays
  }

  for (let dateValue of dateList) {
    historyAux = rowMeterAux.find(row => row.date === dateValue)
    if (historyAux) {
      reading = historyAux.reading ?? 0
    }
    else {
      reading = 0
    }
    periodReading += (reading * 1000) // 'Period reading' equals sum of all reading on range
    history.push({
      information_date: dateValue,
      reading: reading * 1000, // reading in cubic meter, then multiplying by 1000
    })
  }
  dailyAverage = periodReading / (auxAverage > 0 ? auxAverage : 1) // Daily Average equals 'Period Reading' by days to be considered
  predicted = periodReading + (dailyAverage * diffDays) // 'Predicted' equals 'Period Reading' plus 'daily average' times days left in range

  return {dailyAverage, periodReading, predicted, history}  
}

function checkDateCurrent(lastDateString:{
  LAAGER_CODE: string;
  RECORD_DATE: string;
},datFinD: Date, nowDate:Date, lastDate:Date) {
    // if doesn't have last date or filter's final date >= current date or last history's date <= filter's final date
  return (lastDateString === null || datFinD >= nowDate || lastDate <= datFinD);
}

function newLastDateString(lastDateString:{
  LAAGER_CODE: string;
  RECORD_DATE: string;
}) {
  return new Date((lastDateString != null ? lastDateString.RECORD_DATE : '2000-01-01') + 'T00:00:00Z')
}

export async function returnStatus(UN_LAAGER: string){
  const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](UN_LAAGER)

  if (!responseMeter)
    return false

  const yesterdayDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dataResponse = new Date(responseMeter.current_reading_at)

  return dataResponse >= yesterdayDate
}
