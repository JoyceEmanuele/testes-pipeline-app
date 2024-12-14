import sqldb from '../../srcCommon/db';
import { apiLaarger, insertDailyHist, normalizeLaagerConsumption, insertHistory } from '../../srcCommon/extServices/laagerApi';

interface IReadingsPerDay {
  time: string,
  reading:number,
  usage:number
}

export async function getAllUnitsData() {
  // busca dados de consumo da API da Laager e salva no nosso banco
  const laagerMeters = await sqldb.LAAGER.getListWithUnitInfo({});
  const unitsLaager = laagerMeters.map((e) => e.LAAGER_CODE);

  const responseGroup = await apiLaarger['GET /leitura/:meter_type/:group_id']('agua-fria', 1);
  const metersInfo: {
    [customer_id: string]: {
      customer_id: string;
      address: string;
      rf_device_id: number;
      meter_serial_number: string;
      seal_number: string;
      batery_state: string;
      valve_status: string;
      reading: number;
      reading_date: string;
      latitude: string;
      longitude: string;
    }
  } = {};
  for(let meter of responseGroup){
    metersInfo[meter.customer_id] = meter;
  }

  const datFinD = new Date();
  datFinD.setDate(datFinD.getDate()-1);


  // get history by unit;
  for(let unit of unitsLaager){
    // get the last history's date inserted
    const lastDateString = await sqldb.LAAGER_HISTORY_USAGE.getLastData({ LAAGER_CODE: unit });
    const lastDate = new Date((lastDateString != null ? lastDateString.RECORD_DATE : '2000-01-01') + 'T00:00:00Z');
    const nowDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // if doesn't have last date or filter's final date >= current date or last history's date <= filter's final date
    // then read from api

    if (lastDateString === null || datFinD >= nowDate || lastDate <= datFinD){
      const meter = metersInfo[unit];
      if (!meter) continue;
      const { rf_device_id } = meter;
      const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());
      normalizeLaagerConsumption(responseMeter.history);
      await insertHistory(unit, responseMeter.history);
    }

  }

  // get daily history by unit;
  for(let unit of unitsLaager){
    const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')
    const dateNow = new Date();
    const today = `${dateNow.getUTCFullYear()}-${zeroPad(dateNow.getUTCMonth() + 1, 2)}-${zeroPad(dateNow.getUTCDate(), 2)}`
  
    let rowMeterAux: {
      date: string;
      reading: number;
      usage: number;
      readings_per_day: IReadingsPerDay[];
    }[];
  
    const meter = metersInfo[unit];
    if (!meter) continue;

    const { rf_device_id } = meter;
    const responseMeter = await apiLaarger['GET /consumption/meter_details/:unit_id'](rf_device_id.toString());
    normalizeLaagerConsumption(responseMeter.history);
    // insert only records from past days
    const hist = responseMeter.history.filter((row) => today > row.date);
    if (hist.length === 0) continue;

    rowMeterAux = hist;

    await insertDailyHist(rowMeterAux, unit);

  }
  return {};
}
