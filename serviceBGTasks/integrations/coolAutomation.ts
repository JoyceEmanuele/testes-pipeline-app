import sqldb from '../../srcCommon/db';
import { coolAutomationApi } from '../../srcCommon/extServices/coolAutomation';
import servConfig from '../../configfile';
// import * as ramCaches from '../ramCaches';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';
import { loadCoolAutNotifs } from '../../srcCommon/helpers/ramcacheLoaders/notifsLoader';

export function startCoolautAlertsChecker() {
  if (servConfig.isProductionServer) return; // not yet ready for operation
  recurrentTasks.runLoop({
    taskName: "COOLAUT-ALERTS",
    initialDelay_ms: 1337 + 50412,
    iterationPause_ms: 15 * 60 * 1000,
  }, async () => {
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    if (now.getUTCDay() === 0 && now.getUTCHours() < 3) {
      // As of today, the server is restarted every sunday at 02:00.
      return;
    }

    await buildCoolAutNotifs();
  });
}

export async function buildCoolAutNotifs () {
  const configuredVrfNotifs = {} as {
    [notifId: string]: {
      NOTIF_ID: number
      evtGroupIds: string[]
    }
  };
  const usersNotifs = await loadCoolAutNotifs();

  // Pega a lista de alertas/notificações da cool automation e verifica se algum usuário nosso cadastrou notificações para isso
  // Tem que ter algum lugar para registrar quando foi a última verificação para poder buscar
  // TODO: Tem que ver se o endpoint de lista de notificações da CoolAutomation só mostra os que o usuário configurou ou se são todos e a configuração do usuário é para receber por email
  const eventsGroup = {} as {
    [evtGroupId: string]: {
      // cfgNotifs: { NOTIF_ID: number }[],
      events: {
        resources: { id: string, name: string }[] // [{"id":"62503e881d25cc3864e9dba4","name":"L1.037"}], [{"id":"60e4759e012995318356aa7c","name":"283B960200D8"}]
        acknowledgedTimestamp: number // 0
        customer: string // "611a722d6be1857e875abb93"
        site: string // "6216e2b7d87c341d88179254"
        system: string|null // null
        device: string // "60e47686012995260666969f"
        status: number // 1, 2 => 1=Open, 2=Closed
        eventTime: number // 1649860583115
        shortId: string // "13060486"
        type: number // 6, 7, 2, 3, 4
        createdAt: string // "2022-04-13T14:36:23.118Z"
        updatedAt: string // "2022-04-13T14:36:23.118Z"
        id: string // "6256dfe7b104c77f1a2b6948"
        trapDescription: string // "Unit disconnected", "Units disconnected", "Device disconnected", "Clean filter", "Indoor error"
        data: any // "type":4,"data":"6608"
        clearReason: number // 1
        clearTime: number // 1649731656954
        descs: {
          eventType: string
          typeDesc: string
          code: string
          description: string
          statusDesc: string
        }
      }[]
    }
  };

  // No dash da CoolAutomation só dá para selecionar o tipo de alerta que quer receber e o site. Não dá para escolher nem o dispositivo, quanto menos o sistem ou a unidade.
  // - Disconnect device alerts
  // - Clean Filter alerts (No SMS)
  // - Unit indoor alerts
  // - Unit Outdoor alerts
  // - Unit Disconnected
  // - Line Quality alerts

  // ['GET /services/types']: {
  //   eventTypeStrings: {
  //     "1":"Anomaly",
  //     "2":"Device Disconnected",
  //     "3":"Clean Filter",
  //     "4":"Indoor Error",
  //     "5":"Outdoor Error",
  //     "6":"Unit disconnected",
  //     "7":"Units disconnected",
  //     "8":"Multi Indoor Error",
  //     "25":"Low Line Quality",
  //     "50":"Anomaly",
  //     "98":"Admin Device Disconnected",
  //     "99":"Admin Anomaly",
  //     "201":"User Logic",
  //     "202":"User Logic",
  //     "203":"User Logic",
  //   }
  // }

  // ["GET /services/error-codes"]: {
  //   errorCodeTypes: {
  //     [type: string]: { // "4"
  //       [code: string]: string // "2503": "Drain sensor (Thd) fault"
  //     }
  //   }
  // }

  const vrfGroup = {} as {
    [deviceId: string]: string
  };
  const vrfsUnitsList = await sqldb.INTEGRCOOLAUT.getList({});
  for (const row of vrfsUnitsList) {
    const evtGroupId = `UNIT${row.UNIT_ID}`;
    {
      const unitNotifs = usersNotifs[evtGroupId];
      if (!unitNotifs) continue;
      if (!eventsGroup[evtGroupId]) {
        eventsGroup[evtGroupId] = {
          // cfgNotifs: unitNotifs,
          events: [],
        };
      }
      for (const notifCfg of unitNotifs) {
        const notifId = String(notifCfg.NOTIF_ID);
        if (!configuredVrfNotifs[notifId]) {
          configuredVrfNotifs[notifId] = {
            NOTIF_ID: notifCfg.NOTIF_ID,
            evtGroupIds: [],
          };
        }
        configuredVrfNotifs[notifId].evtGroupIds.push(evtGroupId);
      }
    }
    vrfGroup[row.COOLAUT_ID] = evtGroupId;
  }

  const [
    events,
    { errorCodeTypes },
    { eventTypeStrings },
  ] = await Promise.all([
    coolAutomationApi('GET /events', {
      endTime: Date.now() + 10 * 60 * 1000,
      startTime: Date.now() - 20 * 60 * 1000,
      type: 1,
    }),
    coolAutomationApi('GET /services/error-codes'),
    coolAutomationApi('GET /services/types'),
  ]);
  const statusDescs: { [k: string]: string } = {
    '1': 'Open',
    '2': 'Closed',
  };
  for (const event of Object.values(events)) {
    if (event.device && vrfGroup[event.device]) {
      const eventType = (event.type != null) ? String(event.type) : null;
      const typeDesc = (eventType && eventTypeStrings[eventType]) || null;
      const code = (event.data && String(event.data)) || null;
      const description = (eventType && code && errorCodeTypes[eventType] && errorCodeTypes[eventType][code]) || null;
      const statusDesc = statusDescs[String(event.status)] || String(event.status);
      const evtGroupId = vrfGroup[event.device];
      eventsGroup[evtGroupId].events.push(
        Object.assign(event, {
          descs: {
            eventType,
            typeDesc,
            code,
            description,
            statusDesc,
          }
        })
      );
    }
  }

  return { configuredVrfNotifs, eventsGroup, vrfsUnitsList,  };
}
