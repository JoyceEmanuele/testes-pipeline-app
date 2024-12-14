import sqldb from "../db";
import detailedError from "./detailedError";
import { logger } from "./logger";

export function parseNotificationFilter(FILT_DEVS: string, CLIENT_ID: number) {
  const devsFilter: Parameters<typeof sqldb.DEVICES.getListNotifs>[0] = {
    clientIds: [CLIENT_ID],
  };
  if (FILT_DEVS) {
    const { FILT_TYPE, FILT_IDS } = decodeFilterIds(FILT_DEVS, CLIENT_ID);
    if ((!FILT_TYPE) || (!FILT_IDS) || (!FILT_IDS.length)) {
      logger.error('Unknown FILT_TYPE: ' + String(FILT_TYPE));
      return null;
    }
    switch (FILT_TYPE) {
      case 'DAC': devsFilter.devIds = FILT_IDS as string[]; break;
      case 'DUT': devsFilter.devIds = FILT_IDS as string[]; break;
      case 'DRI': devsFilter.devIds = FILT_IDS as string[]; break;
      case 'UNIT': devsFilter.unitIds = FILT_IDS as number[]; break;
      case 'GROUP': devsFilter.machineIds = FILT_IDS as number[]; break;
      case 'CLIENT': break; // Filtro de cliente já incluído
      default: {
        logger.error('Unknown FILT_TYPE: ' + String(FILT_TYPE));
        return null;
      }
    }
  }
  return devsFilter;
}

interface NotificationFilter {
  FILT_TYPE: 'CLIENT'|'DAC'|'DUT'|'UNIT'|'GROUP'|'DRI'
  FILT_IDS: string[] | number[]
}
export function decodeFilterIds (FILT_DEVS: string, CLIENT_ID: number): NotificationFilter {
  if (!FILT_DEVS) {
    if (!CLIENT_ID) throw detailedError('Erro interno ao processar o filtro de notificações', 500);
    return { FILT_TYPE: 'CLIENT', FILT_IDS: [CLIENT_ID] }
  }
  const [FILT_TYPE, IDS] = FILT_DEVS && FILT_DEVS.split(':') || []
  if (FILT_TYPE === 'DAC')        return { FILT_TYPE, FILT_IDS: IDS.split(',').filter(x => !!x) };
  else if (FILT_TYPE === 'DUT')   return { FILT_TYPE, FILT_IDS: IDS.split(',').filter(x => !!x) };
  else if (FILT_TYPE === 'DRI')   return { FILT_TYPE, FILT_IDS: IDS.split(',').filter(x => !!x) };
  else if (FILT_TYPE === 'UNIT')  return { FILT_TYPE, FILT_IDS: IDS.split(',').filter(x => !!x).map(x => Number(x)) };
  else if (FILT_TYPE === 'GROUP') return { FILT_TYPE, FILT_IDS: IDS.split(',').filter(x => !!x).map(x => Number(x)) };
  else {
    throw detailedError('Erro interno ao processar o filtro de notificações', 500);
  }
}
