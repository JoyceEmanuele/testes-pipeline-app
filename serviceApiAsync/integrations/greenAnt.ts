import { API_private2 } from '../../srcCommon/types/api-private';
import { API_Internal } from '../api-internal';
import sqldb from '../../srcCommon/db';
import { addDays_YMD, getDaysList2_YMD, isDayComplete_YMD, lastDayComplete_YMD, now_shiftedTS_s, sumDaysXAxis } from '../../srcCommon/helpers/dates';
import { apiGA } from '../../srcCommon/extServices/greenAntHelper';
import { mergeVarsCommomX } from '../../srcCommon/helpers/chartDataFormats';
import { getAllowedUnitsView, getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import { logger } from '../../srcCommon/helpers/logger';

// httpRouter.privateRoutes['/get-greenant-auth-token'] = async function (reqParams, session) {
//   if (!reqParams.email) { throw Error('"email" required').HttpStatus(400) }
//   if (!reqParams.password) { throw Error('"password" required').HttpStatus(400) }
//   const GAsession: SessionData = { token: null };
//   const response = await apiGA['POST /login']({ email: reqParams.email, password: reqParams.password }, GAsession);
//   return response;
//   // POST https://backend.greenant.com.br/api/login => {"email", "password"}
//   // if(response.message == 'success')
//   // let logoutUrl = 'https://boltenergy.com.br/';
//   //  window.location.href = `https://dashboard.greenant.com.br/#!/redirect?token=${data.token}&url=${logoutUrl}`
// }

export const getUnitEnergyConsumption: API_private2['/get-unit-energy-consumption'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('"UNIT_ID" required').HttpStatus(400) }
  if (!reqParams.day) { throw Error('"day" required').HttpStatus(400) }

  const unitInfo = await sqldb.CLUNITS.getUnitInfoWithMeter({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID })
  if (!unitInfo) { throw Error('invalid unit').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (unitInfo.GA_METER) {
    const list = await get_unit_power_measures(reqParams.day, unitInfo.GA_METER)
    return { list }
  }

  return { list: null }
}

export const getUnitEnergyConsumptionCommonX: API_private2['/get-unit-energy-consumption-commonX'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('"UNIT_ID" required').HttpStatus(400); }
  if (!reqParams.day) { throw Error('"day" required').HttpStatus(400); }
  if (!reqParams.numDays) { throw Error('"numDays" required').HttpStatus(400); }

  const unitInfo = await sqldb.CLUNITS.getUnitInfoWithMeter({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID })
  if (!unitInfo) { throw Error('invalid unit').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (reqParams.numDays !== undefined) {
    if ((reqParams.numDays < 1) || (reqParams.numDays > 15)) {
      throw Error('O período aceitável é de 1 a 15 dias').HttpStatus(400);
    }
  }

  const days = [] as string[];
  for (let i = 0; i < reqParams.numDays; i++) {
    const dayAux = addDays_YMD(reqParams.day, i);
    days.push(dayAux);
  }

  const measuresList = await Promise.all(days.map(async (day, index) => {
    if (unitInfo.GA_METER) {
      const list = await get_unit_power_measures(day, unitInfo.GA_METER);

      const measures = list.map((item) => ({
        x: sumDaysXAxis(item.x, index),
        y: item.y,
      }));

      return { measures }
    }

    return { measures: null }
  }));

  let xAux = [] as number[];
  let yAux = [] as number[];
  const varList = [] as any[];

  // Une os dados de cada dia em um vetor por variável
  for (const { measures } of measuresList) {
    measures.forEach((item) => {
      xAux.push(item.x);
      yAux.push(item.y);
    });
  }
  varList.push({c: xAux, v: yAux});

  const list = mergeVarsCommomX(varList, reqParams.numDays);

  const commonX = list.c as number[];
  const energyConsumption = { y: list.vs[0].map((y) => y != null ? Number(y) : null) };

  return { energyConsumption, commonX };
}

export const getUnitsEnergyConsumptionByDay: API_private2['/get-units-energy-consumption-byDay'] = async function (reqParams, session) {
  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }
  const unitsList = await sqldb.CLUNITS.getUnitsList2({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
  }, { onlyWithGA: true });

  const dayStartD = new Date(reqParams.dayStart + 'Z');
  const dayEndD = new Date(dayStartD.getTime() + (reqParams.numDays - 1) * 24 * 60 * 60 * 1000);
  const dayEnd = dayEndD.toISOString().substr(0, 10);

  const list = [];
  for (const unit of unitsList) {
    if (!unit.GA_METER) continue;
    const consList = await get_unit_power_consumption({ dayStart: reqParams.dayStart, dayEndInc: dayEnd, greenantMeterId: unit.GA_METER })
      .catch((err) => {
        logger.error(err);
        return null;
      });
    if (!consList) continue;
    for (const consItem of consList) {
      list.push({
        unitId: unit.UNIT_ID,
        date: consItem.date,
        consumedEnergy: consItem.consumedEnergy,
        invoiceValue: consItem.invoice && consItem.invoice.value,
      });
    }
  }
  return { list };
}

export const getUnitEnergyConsumptionByDay: API_private2['/get-unit-energy-consumption-byDay'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('"UNIT_ID" required').HttpStatus(400) }
  if (!reqParams.dayStart) { throw Error('"dayStart" required').HttpStatus(400) }

  if (!reqParams.dayEnd) reqParams.dayEnd = reqParams.dayStart

  const unitInfo = await sqldb.CLUNITS.getUnitInfoWithMeter({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID })
  if (!unitInfo) { throw Error('invalid unit').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  if (unitInfo.GA_METER) {
    const list = await get_unit_power_consumption({ dayStart: reqParams.dayStart, dayEndInc: reqParams.dayEnd, greenantMeterId: unitInfo.GA_METER })
    return { list }
  }

  return { list: null }
}

export const get_unit_power_consumption: API_Internal['/diel-internal/api-async/get_unit_power_consumption'] = async function(reqParams) {
  let { dayStart, dayEndInc, greenantMeterId } = reqParams; // day = '2020-05-17'
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(dayStart)) { throw Error('Invalid day').HttpStatus(400).DebugInfo({ dayStart }) }
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(dayEndInc)) { throw Error('Invalid day').HttpStatus(400).DebugInfo({ dayEndInc }) }

  const lastDayComplete = lastDayComplete_YMD();
  if (dayEndInc > lastDayComplete) dayEndInc = lastDayComplete;

  const list: { date: string, consumedEnergy: number, invoice: { value: number } }[] = []
  const listDays = getDaysList2_YMD(dayStart, dayEndInc);

  {
    const alreadyCompiled = await sqldb.cache_gameter_cons.getList({ meterIds: [greenantMeterId], dayStart, dayEndInc });
    while (listDays.length > 0) {
      const compiledItem = alreadyCompiled.find(x => x.YMD === listDays[0]);
      if (compiledItem) {
        list.push({
          date: compiledItem.YMD,
          consumedEnergy: compiledItem.conswh,
          invoice: (compiledItem.invoice == null) ? undefined : {
            value: compiledItem.invoice,
          },
        })
        listDays.shift();
        continue;
      }
      break;
    }
    if (listDays.length === 0) {
      return list;
    }
    dayStart = listDays[0];
  }

  const response = await apiGA['GET /meters/:id/measurements'](greenantMeterId, dayStart, dayEndInc, 'day')
  .catch(async (err) => {
    if (err && err.isAxiosError && err.response && err.response.status === 502) {
      // Wait 3 seconds and try again
      await new Promise((r) => setTimeout(r, 3000));
      return apiGA['GET /meters/:id/measurements'](greenantMeterId, dayStart, dayEndInc, 'day')
    } else {
      throw err;
    }
  })
  .catch(async (err) => {
    if (err && err.isAxiosError && err.response && err.response.status === 502) {
      // Wait 3 seconds and try again
      await new Promise((r) => setTimeout(r, 3000));
      return apiGA['GET /meters/:id/measurements'](greenantMeterId, dayStart, dayEndInc, 'day')
    } else {
      throw err;
    }
  })

  // const hours = Array(24).fill(null)
  // response.measurement.forEach((measure) => {
  //   // 2020-05-17T00:14:59-03:00
  //   const hour = Math.trunc(Number(measure.date.substr(11, 2)))
  //   if (hour >= 0 && hour <= 23) {
  //     hours[hour] = measure.consumedEnergy
  //   }
  // })
  // const list = hours.reduce((list, consumedEnergy, index) => {
  //   list.push({ x: index, y: consumedEnergy })
  //   list.push({ x: index + 1, y: consumedEnergy })
  //   return list
  // }, [])

  for (const item of response.measurement) {
    item.date = item.date.substr(0, 10);
    if (isDayComplete_YMD(item.date)) {
      await sqldb.cache_gameter_cons.w_insertUpdate({
        YMD: item.date,
        meterId: greenantMeterId,
        conswh: item.consumedEnergy,
        invoice: item.invoice && item.invoice.value,
        datCache: now_shiftedTS_s(true),
      });
    }
    list.push({
      date: item.date,
      consumedEnergy: item.consumedEnergy,
      invoice: item.invoice && {
        value: item.invoice.value,
        // tariff: item.invoice.tariff,
      } || undefined,
    })
  }
  for (const day of listDays) {
    if (isDayComplete_YMD(day) && !response.measurement.some(x => x.date.startsWith(day))) {
      await sqldb.cache_gameter_cons.w_insertIgnore({
        YMD: day,
        meterId: greenantMeterId,
        conswh: null,
        invoice: null,
        datCache: now_shiftedTS_s(true),
      });
    }
  }

  return list
}

export async function get_units_power_consumption (dayStart: string, dayEndInc: string, greenantMeterIds: number[]) { // day = '2020-05-17'
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(dayStart)) { throw Error('Invalid day').HttpStatus(400).DebugInfo({ dayStart }) }
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(dayEndInc)) { throw Error('Invalid day').HttpStatus(400).DebugInfo({ dayEndInc }) }

  const lastDayComplete = lastDayComplete_YMD();
  if (dayEndInc > lastDayComplete) dayEndInc = lastDayComplete;

  const listDays = getDaysList2_YMD(dayStart, dayEndInc);

  const obj = {} as {
    [meterId: number]: {
      date: string,
      consumedEnergy: number,
      invoice: { value: number },
    }[]
  }

  if (greenantMeterIds.length === 0) {
    return obj;
  }

  const cacheList = await sqldb.cache_gameter_cons.getList({ meterIds: greenantMeterIds, dayStart, dayEndInc });
  for (const meterId of greenantMeterIds) {
    if (!meterId) continue;
    const alreadyCompiled = cacheList.filter((x) => x.meterId === meterId);
    const listDaysCopy = [...listDays];
    while (listDaysCopy.length > 0) {
      const compiledItem = alreadyCompiled.find(x => x.YMD === listDaysCopy[0]);
      if (compiledItem) {
        if (!obj[meterId]) obj[meterId] = [];
        obj[meterId].push({
          date: compiledItem.YMD,
          consumedEnergy: compiledItem.conswh,
          invoice: (compiledItem.invoice == null) ? undefined : {
            value: compiledItem.invoice,
          },
        });
        listDaysCopy.shift();
        continue;
      }
      break;
    }
    if (listDaysCopy.length === 0) {
      continue;
    } else {
      const newDayStart = listDaysCopy[0];
      const response = await apiGA['GET /meters/:id/measurements'](meterId, newDayStart, dayEndInc, 'day')
      .catch(async (err) => {
        if (err && err.isAxiosError && err.response && err.response.status === 502) {
          // Wait 3 seconds and try again
          await new Promise((r) => setTimeout(r, 3000));
          return apiGA['GET /meters/:id/measurements'](meterId, newDayStart, dayEndInc, 'day')
        } else {
          throw err;
        }
      })
      .catch(async (err) => {
        if (err && err.isAxiosError && err.response && err.response.status === 502) {
          // Wait 3 seconds and try again
          await new Promise((r) => setTimeout(r, 3000));
          return apiGA['GET /meters/:id/measurements'](meterId, newDayStart, dayEndInc, 'day')
        } else {
          throw err;
        }
      })

      for (const item of response.measurement) {
        item.date = item.date.substr(0, 10);
        if (isDayComplete_YMD(item.date)) {
          await sqldb.cache_gameter_cons.w_insertUpdate({
            YMD: item.date,
            meterId: meterId,
            conswh: item.consumedEnergy,
            invoice: item.invoice && item.invoice.value,
            datCache: now_shiftedTS_s(true),
          });
        }
        if (!obj[meterId]) obj[meterId] = [];
        obj[meterId].push({
          date: item.date,
          consumedEnergy: item.consumedEnergy,
          invoice: item.invoice && {
            value: item.invoice.value,
            // tariff: item.invoice.tariff,
          } || undefined,
        })
      }
      for (const day of listDaysCopy) {
        if (isDayComplete_YMD(day) && !response.measurement.some(x => x.date.startsWith(day))) {
          await sqldb.cache_gameter_cons.w_insertIgnore({
            YMD: day,
            meterId: meterId,
            conswh: null,
            invoice: null,
            datCache: now_shiftedTS_s(true),
          });
        }
      }
    }
  }

  return obj;
}

async function get_unit_power_measures (day: string, greenantMeterId: number) {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(day)) { throw Error('Invalid day').HttpStatus(400).DebugInfo({ day }) }

  const response = await apiGA['GET /meters/:id/powers'](greenantMeterId, day, day, 'minute')
  const list: { x: number, y: number }[] = []
  response.powers.forEach((measure) => {
    // 2020-05-17T00:14:59-03:00
    let x = Number(measure.date.substr(11, 2)) * 1 + Number(measure.date.substr(14, 2)) / 60 - 0.25
    if (x > -0.2 && x < 0) { x = 0; }
    if (x > 23.75 && x <= 24) { x = 23.75; }
    if (!(x >= 0 && x <= 24)) { return; }
    if (measure.avgActivePower < 0) { measure.avgActivePower = -measure.avgActivePower }
    if (list.length === 0) {
      list.push({ x: x, y: measure.avgActivePower })
      list.push({ x: x + 0.25, y: measure.avgActivePower })
    } else {
      const lastX = list[list.length - 1].x
      const delta = x - lastX
      if (!(delta > -0.2)) { return; }
      if (Math.abs(delta) < 0.2) {
        list[list.length - 1].x = x
      } else {
        list.push({ x: lastX, y: null })
        list.push({ x: x, y: null })
      }
      list.push({ x: x, y: measure.avgActivePower })
      list.push({ x: x + 0.25, y: measure.avgActivePower })
    }
  })

  return list
}
