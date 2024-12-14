import { ExtraRouteParams } from "../srcCommon/types/backendTypes"

export interface InternalRequestSession {
  clientIP: string,
}

export interface ApiInternal {
  ['/diel-internal/realtime-rs/getDevicesLastTelemetries']: (reqParams: {
    devIds?: string[]
  }) => {
    lastMessages: {
      [devId: string]: {
        ts: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
        telemetry?: any // último JSON que chegou em tópico 'data/...'
      }
    }
  },

  ['/diel-internal/realtime-rs/getDevicesLastTS']: (reqParams: {
    devIds?: string[]
  }) => {
    deviceLastTs: {
      [devId: string]: number // Timestamp do servidor da última vez que chegou mensagem do dispostivo
    }
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
