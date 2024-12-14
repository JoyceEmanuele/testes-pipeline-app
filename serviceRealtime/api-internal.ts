import { TopicType } from "../srcCommon/types"
import { DevDebugSystemInfo } from "../srcCommon/types/devicesMessages"
import { ExtraRouteParams } from "../srcCommon/types/backendTypes"
import { Report_Broker2DynamoV1 } from "./realTime/serversStatus"

export interface InternalRequestSession {
  clientIP: string,
}

export interface ApiInternal {
  ['/diel-internal/realtime/getDevicesLastTelemetries']: (reqParams: {
    devIds?: string[]
  }) => {
    lastMessages: {
      [devId: string]: {
        ts: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
        topic?: TopicType // Tópico 'data/...' que foi usado, e não o tipo do dispositivo. O DMA por exemplo usa tópico de DUT.
        telemetry?: any // último JSON que chegou em tópico 'data/...'
      }
    }
  },

  ['/diel-internal/realtime/getDevicesLastTS']: (reqParams: {
    devIds?: string[]
  }) => {
    deviceLastTs: {
      [devId: string]: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
    }
  },

  ['/diel-internal/realtime/getDevsSystemInfo']: (reqParams: {
    devIds?: string[]
  }) => {
    devsSystemInfo: {
      [devId: string]: DevDebugSystemInfo
    }
  },

  ['/diel-internal/realtime/triggerRamCacheUpdate']: (reqParams: {
    TIMEZONES_updateTimezoneId?: { motivo: string, deviceCode: string, timezoneId: number }
    TIMEZONES_updatePosixTimezone?: { motivo: string, idTimezone: string, posix: string }
    DAMS_loadDamsEcoCfg?: { motivo: string }
    DEVACS_loadDacDbInfo?: { motivo: string, dacId: string }
    DEVGROUPS_loadAutomationRefs?: { motivo: string }
    DRIS_loadDrisCfg?: { motivo: string }
    DUTS_loadDutRoomTypes?: { motivo: string }
    ROOMTYPES_loadRtypeSched?: { motivo: string, rtypeId: number }
    ROOMTYPES_loadRtypesScheds?: { motivo: string }
    NOTIFSCFG_updateAllUserNotifs?: { motivo: string }
    DEVGROUPS_deleteGroupDam?: { motivo: string, machineId: number }
    DEVGROUPS_setGroupDam?: { motivo: string, machineId: number, DEV_AUT: string }
    DUTS_deleteDutRoomPars?: { motivo: string, dutId: string }
    DUTS_setDutRTypeId?: { motivo: string, devId: string, RTYPE_ID: number }
    DUTS_setDutRoomPars?: { motivo: string, DEV_ID: string, RTYPE_ID: number, VARS: string }
    ROOMTYPES_deleteRType?: { motivo: string, rtypeId: number }
    damFaults_clearDamNOp?: { motivo: string, damId: string }
    DAMS_setDamThermostatCfg?: { motivo: string, damCode: string, valueThermostat: number}
  }) => {},

  ['/diel-internal/realtime/setServerStatus_brokersGateway']: (reqParams: {
    report: { origin: "broker-diel-v1" },
    apiPort: number,
    hostname: string,
  }) => {},

  ['/diel-internal/realtime/setServerStatus_iotRelay']: (reqParams: {
    report: { origin: "iotrelay-v1" },
    apiPort: number,
    hostname: string,
  }) => {},

  ['/diel-internal/realtime/setServerStatus_broker2dynamo']: (reqParams: {
    report: Report_Broker2DynamoV1,
    apiPort: number,
    hostname: string,
    respondWithDynamoTables?: string
  }) => {
    autoCreatedDynamoDbTables?: string
  },

  ['/diel-internal/realtime/getServersList']: (reqParams: {
  }) => {
    broker2dynamo: {
      ip: string;
      apiPort: number,
      hostname: string;
    }[]
    brokersGateway: {
      ip: string;
      apiPort: number,
      hostname: string;
    }[]
    iotrelay: {
      ip: string;
      apiPort: number,
      hostname: string;
    }[]
  },
}

export type ApiInternalParams = {
  [Route in keyof ApiInternal]: Parameters<ApiInternal[Route]>[0];
};

type ApiInternalResps = {
  [Route in keyof ApiInternal]: Awaited<ReturnType<ApiInternal[Route]>>;
};

export type API_Internal = {
  [Route in keyof ApiInternal]: (reqParams: ApiInternalParams[Route], session: InternalRequestSession, extra: ExtraRouteParams) => Promise<ApiInternalResps[Route]>;
};
