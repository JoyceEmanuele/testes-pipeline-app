import sqldb from '../db'
import * as dielServices from '../dielServices';

export interface DmaIds {
  ID: number,
  DMA_ID: string,
  START_DATE: string,
  END_DATE: string,
  UNIT_ID: number
}

export interface MeterSimpleInf {
  LAAGER_CODE: string;
  UNIT_ID: number;
  INSTALLATION_DATE: string;
}

export async function getDmaTotalDayUsageHistory(dmaId: string, day: string, period_usage: number, rusthistDebug: { motivo: string }, historyList: { information_date: string, usage: number, devId: string}[], unitId?: number){
    if (!dmaId) throw Error('Invalid parameters! Missing dmaId').HttpStatus(400);
    if (!day) throw Error('Invalid parameters! Missing day').HttpStatus(400);
    const dmaInf = await sqldb.DMAS_DEVICES.getExtraInfo({ DEVICE_CODE: dmaId });
    let periodUsage = period_usage;
    let history = historyList;
  
    if (!dmaInf) throw Error('DMA não encontrado').HttpStatus(400)
    if (dmaInf.HYDROMETER_MODEL) {
      const litersPerPulse = Number(dmaInf.HYDROMETER_MODEL.substring(
        dmaInf.HYDROMETER_MODEL.indexOf("(") + 1, 
        dmaInf.HYDROMETER_MODEL.lastIndexOf(")")).split(" ")[0]);
    
      if(!litersPerPulse) throw Error("Não foi encontrado a quantidade de litros por pulso");
    
      const compiledData = await dielServices.apiAsyncInternalApi('/diel-internal/api-async/processDmaDay', { motivo: rusthistDebug.motivo ,dmaId, day, unitId });
    
      let data = compiledData && compiledData["TelemetryList"] ? compiledData?.TelemetryList : [];
    
      let sum = 0;
      data.forEach((e) => {
        sum += e.pulses
      });
      sum *= litersPerPulse;
      periodUsage += sum;
      history.push({ information_date: day, usage: sum, devId: dmaId});
    
      return { history: history, period_usage: periodUsage }
    }
    return null;    
  }