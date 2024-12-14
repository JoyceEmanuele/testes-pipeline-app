import sqldb from '../../srcCommon/db';
import { apiGA } from '../../srcCommon/extServices/greenAntHelper';
import { logger } from '../../srcCommon/helpers/logger';

export async function saveInDataBaseStatus() {
  try {
    await sqldb.CLUNITS.setAllStatusGANull({});
    logger.info(`[GREENANT] SUCESS CLEANING DATABASE STATUS GA`);
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000);
    today.setUTCDate(today.getUTCDate() - 1);
    const yesterday = today.toISOString().substring(0, 10);
    const listGreenAnt = await sqldb.CLUNITS.getAllStatusGA({}); 
    const objectGreenAnt = {} as { [key: number]: string }
    const totalMeters = {} as { [key: number]: boolean }
    const { meters } = await apiGA['GET /meters']("consumption");
    meters.forEach((meter) => {
      totalMeters[meter.id] = true
    })
    for (const item of listGreenAnt) {
      try {
        if (totalMeters[item.GA_METER]) {
          const { measurement } = await apiGA['GET /meters/:id/measurements'](item.GA_METER, yesterday, yesterday, 'day');
          if (measurement[0]) {
            objectGreenAnt[item.GA_METER] = 'ONLINE';
          } else {
            objectGreenAnt[item.GA_METER] = 'OFFLINE';
          }
        }
      } catch(error) {
        logger.error(`ERROR GETTING STATUS API GREENANT - ${error}`);
      }
    }
    for(const meterId in objectGreenAnt) {
      const statusFinal: boolean = objectGreenAnt[meterId] && objectGreenAnt[meterId] === 'ONLINE' ? true : false;
      await sqldb.CLUNITS.saveInDataBaseStatusGA({GA_METER: meterId, STATUS: statusFinal});
      logger.info(`[GREENANT] SAVIN ${meterId} - ${objectGreenAnt[meterId]} IN DATABASE`);
    };
    logger.info("SUCCESS SAVIN STATUS GREENANT IN DATABASE")
    return { success: true };
  } catch (err) {
    logger.error(`ERROR SAVING STATUS GREENANT - ${err}`)
    return { success: false };
  }
}
