import axios, { AxiosResponse, AxiosRequestConfig, Method } from 'axios'
import { logger } from '../../srcCommon/helpers/logger'
import servConfig from '../../configfile'

function checkAxiosError(err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request
    if (err.response) {
      delete err.response.request
      delete err.response.config
    }
    logger.error(err)
    throw Error(err.response.data.message)
      .HttpStatus(500)
      .DebugInfo({ errorCode: 'EXT_API_MAIN_SERVICE_HTTP' })
  }
  throw err
}

async function mainServiceAPI(
  route: string,
  method: Method,
  body?: any,
  authHeader?: string
) {
  const config: AxiosRequestConfig = {
    method: method,
    baseURL: servConfig.mainServiceAPI + route,
    data: body,
    headers: authHeader && {
      Authorization: `${authHeader}`,
      Accept: 'application/json'
    },
    params: body || null
  }
  return axios(config).catch(checkAxiosError)
}

const apiMainService = {
  ['POST /mainservice/notifications/create-notification-energy']:
    async function (reqParams: {
      detections: {
        unitId: number
        dateDetection: string
        consumption: number
      }[]
      destinataryIds: string[]
      setpoint: number
      isGreater: boolean
      isInstantaneous: boolean
    }) {
      const response = await mainServiceAPI(
        '/mainservice/notifications/create-notification-energy',
        'POST',
        {
          detections: reqParams.detections,
          destinataryIds: reqParams.destinataryIds,
          setpoint: reqParams.setpoint,
          isGreater: reqParams.isGreater,
          isInstantaneous: reqParams.isInstantaneous
        }
      )
      return response.data
    },

  ['POST /mainservice/notifications/create-notification-water']:
    async function (reqParams: {
      detections: {
        unitId: number
        dateDetection: string
        consumption: number
      }[]
      destinataryIds: string[]
      isInstantaneous: boolean
    }) {
      const response = await mainServiceAPI(
        '/mainservice/notifications/create-notification-water',
        'POST',
        {
          detections: reqParams.detections,
          destinataryIds: reqParams.destinataryIds,
          isInstantaneous: reqParams.isInstantaneous
        }
      )
      return response.data
    },

  ['POST /mainservice/notifications/create-notification-machine-health-index']:
    async function (reqParams: {
      detections: {
        unitId: number
        dateDetection: string
        machineName: string
        machineId: number
        assetName: string
        assetId: number
        deviceCode: string
        report: string
      }[]
      destinataryIds: string[]
      isInstantaneous: boolean
      healthIndex: number
    }) {
      const response = await mainServiceAPI(
        '/mainservice/notifications/create-notification-machine-health-index',
        'POST',
        {
          detections: reqParams.detections,
          destinataryIds: reqParams.destinataryIds,
          isInstantaneous: reqParams.isInstantaneous,
          healthIndex: reqParams.healthIndex
        }
      )
      return response.data
    },

  ['PATCH /mainservice/notifications/view-notification']: async function (
    reqParams: { notificationId: number },
    authHeader: string
  ) {
    const response = await mainServiceAPI(
      '/mainservice/notifications/view-notification',
      'PATCH',
      {
        notificationId: reqParams.notificationId
      },
      authHeader
    )
    return response.data
  },

  ['POST /mainservice/notifications/view-all-notifications']: async function (
    reqParams: {},
    authHeader: string
  ) {
    const response = await mainServiceAPI(
      '/mainservice/notifications/view-all-notifications',
      'POST',
      reqParams,
      authHeader
    )
    return response.data
  },

  ['GET /mainservice/notifications/get-notifications']: async function (
    reqParams: {
      isViewed?: boolean
      stateIds?: string[]
      cityIds?: string[]
      clientIds?: number[]
      unitIds?: number[]
      typeIds?: number[]
      subtypeIds?: number[]
      dateStart?: string
      dateEnd?: string
      skip?: number
    },
    authHeader: string
  ) {
    const response = await mainServiceAPI(
      '/mainservice/notifications/get-notifications',
      'GET',
      {
        isViewed: reqParams?.isViewed,
        stateIds: reqParams?.stateIds,
        cityIds: reqParams?.cityIds,
        clientIds: reqParams?.clientIds,
        unitIds: reqParams?.unitIds,
        typeIds: reqParams?.typeIds,
        subtypeIds: reqParams?.subtypeIds,
        dateStart: reqParams?.dateStart,
        dateEnd: reqParams?.dateEnd,
        skip: reqParams?.skip,
      },
      authHeader
    )
    return response.data
  },

  ['GET /mainservice/notifications/get-count-notifications']: async function (
    reqParams: {},
    authHeader: string
  ) {
    const response = await mainServiceAPI(
      '/mainservice/notifications/get-count-notifications',
      'GET',
      reqParams,
      authHeader
    )
    return response.data
  },

  ['POST /mainservice/api-registries/get-apis']:
  async function (reqParams: {
    clientIds?: number[]
    unitIds?: number[]
    clientName?: string
    triggerId?: string
    integrationType?: string
    healthStatus?: string
    notifyCondition?: string
    title?: string
    status?: boolean
    isTest?: boolean
    createdAt?: string
    updatedAt?: string
    orderBy?: string
    orderDirection?: string
    limit?: number
    page?: number
  }, authHeader: string) {
    const response = await mainServiceAPI(
      '/mainservice/api-registries/get-apis',
      'POST',
      {
        clientIds: reqParams.clientIds,
        unitIds: reqParams.unitIds,
        clientName: reqParams.clientName,
        triggerId: reqParams.triggerId,
        integrationType: reqParams.integrationType,
        healthStatus: reqParams.healthStatus,
        notifyCondition: reqParams.notifyCondition,
        title: reqParams.title,
        status: reqParams.status,
        isTest: reqParams.isTest,
        createdAt: reqParams.createdAt,
        updatedAt: reqParams.updatedAt,
        orderBy: reqParams.orderBy,
        orderDirection: reqParams.orderDirection,
        page: reqParams.page,
        limit: reqParams.limit,
      },
      authHeader
    )
    return response.data
  },

  ['GET /mainservice/api-registries/get-combo-opts']:
  async function (reqParams: {}, authHeader: string) {
    const response = await mainServiceAPI(
      '/mainservice/api-registries/get-combo-opts',
      'GET',
      reqParams,
      authHeader,
    )
    return response.data
  },

  ['POST /mainservice/api-registries']:
    async function (body: {
      clientId: number,
      clientName: string,
      title: string,
      unitRelations?: {
        unitName: string;
        unitId: number;
      }[];
      notifyCondition: 'HEALTH_INDEX',
      healthStatus: 'RED' | 'RED_OR_ORANGE' | 'NOT_GREEN',
      integrationType: 'GOOGLE' | 'CELSIUS',
      triggerId: string,
      isTest: boolean
    }, authHeader: string) {
      const response = await mainServiceAPI(
        '/mainservice/api-registries',
        'POST',
        {
          clientId: body.clientId,
          clientName: body.clientName,
          title: body.title,
          unitRelations: body.unitRelations,
          notifyCondition: body.notifyCondition,
          healthStatus: body.healthStatus,
          integrationType: body.integrationType,
          triggerId: body.triggerId,
          isTest: body.isTest,
          status: true,
        },
        authHeader
      )
      return response.data
    },

  ['POST /mainservice/api-registries/delete-apis']:
    async function (body: {
      ids: number[]
    }, authHeader: string) {
      const response = await mainServiceAPI(
        '/mainservice/api-registries/delete-apis',
        'POST',
        body.ids,
        authHeader
      )
      return response.data
    },

    ['PATCH /mainservice/api-registries/update-api/:id']:
    async function (id: number, body: Partial<{
      clientId: number,
      clientName: string,
      title: string,
      unitRelations?: {
        unitName: string;
        unitId: number;
      }[];
      notifyCondition: 'HEALTH_INDEX',
      healthStatus: 'RED' | 'RED_OR_ORANGE' | 'NOT_GREEN',
      integrationType: 'GOOGLE' | 'CELSIUS',
      triggerId: string,
      isTest: boolean
    }>, authHeader: string) {
      const response = await mainServiceAPI(
        `/mainservice/api-registries/update-api/${id}`,
        'PATCH',
        body,
        authHeader
      );
      return response.data;
    },
}

export { apiMainService }
