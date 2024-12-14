import { SessionData } from '.';
import { BinaryRouteResponse, ExtraRouteParams } from './backendTypes';
import { Simulation } from './machine';
import { GroupItem, AssociationItem, DutItem, ChillerHxParamsGrouped, ChillerXaParamsGrouped, ChillerXaHvarParamsGrouped} from './exportRealTime';

type API_private = API_private1 & API_private2 & API_serviceHealth & API_serviceRealtime;
export default API_private;

export interface API_private1 {
  ['/my-profile']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<{
    token: string,
    user: string,
    name: string|null,
    lastName: string|null,
    isMasterUser?: boolean,
    permissions: UserPermissions,
    prefs: string|null,
    notifsby: 'email'|'telegram'|'email and telegram'|null,
    phonenb: string|null,
    dataToFront?: { topage: string }
  }>
  ['/dri/get-dris-list']: (reqParams: {
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
    SKIP?: number
    LIMIT?: number
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      DRI_ID: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_NAME: string
      CITY_ID: string
      STATE_ID: number
      STATE_NAME: string
      CLIENT_ID: number
      CLIENT_NAME: string
      status: string
    }[]
    totalItems: number
  }>
  ['/send-dri-command-reboot']: (reqParams: {
    DRI_ID: string
  }, session: SessionData) => Promise<{
  }>
  // ['/create-dri-monitored-entity']: (reqParams: {
  //   DRI_ID: string
  // }, session: SessionData) => Promise<{
  // }>
  // ['/edit-dri-monitored-entity']: (reqParams: {
  //   DRI_ID: string
  // }, session: SessionData) => Promise<{
  // }>
  // ['/delete-dri-monitored-entity']: (reqParams: {
  //   DRI_ID: string
  // }, session: SessionData) => Promise<{
  // }>
  ['/dri/set-dri-info']: (reqParams: {
    DRI_ID: string
    SYSTEM_NAME?: string|null
    UNIT_ID?: number|null
    CLIENT_ID?: number|null
    varsList?: { address: { protocol: string } }[]
    DUT_ID?: string|null
    ENABLE_ECO?: number|null
    ECO_CFG?: string|null
    ECO_OFST_START?: number|null
    ECO_OFST_END?: number|null
    ECO_INT_TIME?: number
    AUTOMATION_INTERVAL?: number | null
  }, session: SessionData) => Promise<string>
  ['/dri/delete-dri-info']: (reqParams: { driId: string }, session: SessionData) => Promise<string>
  ['/dri/update-time-send-config'
  ]: (reqParams: {
    DRI_ID: string
    VALUE: number
  }, session: SessionData) => Promise<string>
  ['/dam/get-dams-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
    SKIP?: number
    LIMIT?: number
    includeDacs?: boolean
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    removeIlluminations?: boolean,
    status?: string[],
    controlMode?: string[],
    ecoMode?: string[],
    hasProgramming?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      DAM_ID: string
      bt_id: string
      UNIT_ID: number
      ENABLE_ECO: 0|1|2
      UNIT_NAME: string
      CITY_ID: string
      LAT: string
      LON: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      COUNTRY_NAME: string
      CLIENT_ID?: number
      CLIENT_NAME?: string
      status: string
      Mode: string
      State: string
      isDac: boolean
      damInop: boolean
      groupsIds: number[]
      groupsNames: string[]
      DUT_ID: string
      CAN_SELF_REFERENCE: number
      SELF_REFERENCE: boolean
      MINIMUM_TEMPERATURE: number
      MAXIMUM_TEMPERATURE: number
      hasProgramming: boolean
    }[]
    totalItems: number
  }>
  ['/get-autom-devs-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
    SKIP?: number
    LIMIT?: number
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    controlMode?: string[],
    operationStatus?: string[],
    ecoMode?: string[],
    status?: string[],
    orderByProp?: string,
    orderByDesc?: boolean,
    temprtAlerts?: string[],
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_NAME: string
      STATE_ID: string
      CLIENT_ID: number
      CLIENT_NAME: string
      DAM_LASTPROG: FullProg_v4
      DUT_LASTPROG: FullProg_v4
      machineName: string
      status: string
      lastCommTs: string
      Mode: string
      State: string
      damInop: boolean
      ecoModeEnabled: boolean
      temprtSetpoint: number
      temprtAlert: string
      referenceTemperature: number
      DUT_NEED_MULT_SCHEDULES: boolean
    }[]
    totalItems: number
  }>
  ['/automation-type-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
    SKIP?: number
    LIMIT?: number
  }, session: SessionData) => Promise<{
    list: {
      UNIT_NAME: string
      automDevType: 'dac'|'dut'|'dam'
      automDevId: string
      useSchedule: boolean
      useEcoMode: boolean
    }[]
    totalItems: number
  }>
  ['/dam/get-dam-info']: (reqParams: {
    DAM_ID: string
  }, session: SessionData) => Promise<{
    info: {
      DAM_ID: string,
      BT_ID: string,
      UNIT_ID: number,
      CLIENT_ID: number,
      UNIT_NAME: string,
      CITY_ID: string,
      LAT: string,
      LON: string,
      STATE_ID: string,
      CITY_NAME: string
    },
    groups: {
      GROUP_ID: number
      GROUP_NAME: string
    }[]
  }>
  ['/dam/set-dam-info']: (reqParams: {
    DAM_ID: string
    UNIT_ID?: number|null
    CLIENT_ID?: number|null
    ENABLE_ECO?: 0|1|2|null
    ENABLE_ECO_LOCAL?: 0|1|null
    FW_MODE?: string|null
    ECO_CFG?: string|null
    REL_DUT_ID?: string|null
    ECO_OFST_START?: number|null
    ECO_OFST_END?: number|null
    ECO_INT_TIME?: number
    FU_NOM?: number|null
    groups?: string[]
    SCHEDULE_START_BEHAVIOR?: string|null
    SETPOINT?: number|null
    LTC?: number|null
    LTI?: number|null
    UPPER_HYSTERESIS?: number|null
    LOWER_HYSTERESIS?: number|null
    SELF_REFERENCE?: boolean|null
    MINIMUM_TEMPERATURE?: number|null
    MAXIMUM_TEMPERATURE?: number|null
    HAD_AUTOMATION_SETTING_CHANGED?: boolean|null
    EXT_THERM_CFG?: string|null
    INSTALLATION_LOCATION?: string|null
    PLACEMENT?: 'RETURN'|'DUO'|null
    T0_POSITION?: 'RETURN'|'INSUFFLATION'|null
    T1_POSITION?: 'RETURN'|'INSUFFLATION'|null
    IGNORE_SET_SENSORS?: boolean|null
  }, session: SessionData) => Promise<string>
  ['/dam/get-programming-v3']: (reqParams: { damId: string }, session: SessionData) => Promise<FullProg_v4>
  ['/dam/set-programming-v3']: (reqParams: { damId: string } & FullProg_v4, session: SessionData) => Promise<FullProg_v4>
  ['/dam/update-programming']: (reqParams: { damId: string } & FullProg_v4, session: SessionData) => Promise<FullProg_v4>
  ['/dam/delete-all-schedules']: (reqParams: { damId: string }, session: SessionData) => Promise<string>
  ['/dam/delete-all-exceptions']: (reqParams: { damId: string }, session: SessionData) => Promise<string>
  ['/set-full-sched-batch-v2']: (reqParams: { damIds: string[], dutIds: string[] } & FullProg_v4, session: SessionData) => Promise<{
    responsesDAM: ({ devId: string } & FullProg_v4)[]
    responsesDUT: ({ devId: string } & FullProg_v4)[]
  }>
  ['/dam/get-sched-list-v2']: (reqParams: { damIds?: string[] }, session: SessionData) => Promise<{
    list: {
      damId: string,
      current: FullProg_v4,
      desired: FullProg_v4
    }[]
  }>
  ['/dam/get-sched']: (reqParams: { damId: string }, session: SessionData) => Promise<{
    current: FullProg_v4,
    desired: FullProg_v4
  }>

  ['/dal/delete-illumination-all-scheds']: (reqParams: {
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>

  ['/dal/delete-illumination-all-exceptions']: (reqParams: {
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>

  ['/dam/delete-dam-info']: (reqParams: {
    damId: string
  }, session: SessionData) => Promise<string>
  ['/dam/set-dam-operation']: (reqParams: {
    dev_id: string
    relay?: 'forbid' | 'allow' | 'onlyfan' | 'thermostat'
    mode?: 'auto' | 'manual'
  }, session: SessionData) => Promise<{
    dev_id?: string
    status?: string
    Mode?: string
    State?: string
  }>
  ['/dut/set-dut-aut-operation']: (reqParams: {
    dut_id: string
    mode: 'auto' | 'manual'
  }, session: SessionData) => Promise<{
    dev_id?: string
    status?: string
    Mode?: string
    State?: string
  }>
  ['/dal/set-dal-operation']: (reqParams: {
    dalCode: string
    instance?: number,
    mode?: 'AUTO'|'MANUAL'
    relays?: number[],
    values?: number[],
  }, session: SessionData) => Promise<{
    dev_id?: string
    status?: string
    Mode?: string[]
    Relays?: boolean[]
    Feedback?: boolean[]
    State?: string
  }>

  ['/users/list-users']: (reqParams: {
    CLIENT_ID?: number
    CLIENT_IDS?: number[]
    USER?: string
    includeAdmins?: boolean
    includeAllUsers?: boolean
  }, session: SessionData) => Promise<{
    list: {
      USER: string
      LAST_ACCESS: string
      NOME: string
      SOBRENOME: string
      perfil: string
      PERMS_U: string
      CLIENT_BIND: number
      FULLNAME: string
      clientName: string
      clientIds: number[]
      clientNames: string[]
      unitIds?: number[]
      RG: string
      COMMENTS: string
      PICTURE: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      IS_ACTIVE: string
    }[]
    profileDesc: { [k: string]: string }
    adminUsers?: {
      USER: string;
      NOME: string;
      SOBRENOME: string;
      FULLNAME: string;
    }[]
  }>

  ['/users/get-user-info']: (reqParams: {
    userId: string
  }, session: SessionData) => Promise<{
    item: {
      EMAIL: string
      LAST_ACCESS: string
      NOME: string
      SOBRENOME: string
      PERMS_U: string
      RG: string
      COMMENTS: string
      PICTURE: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      PHONENB: string
      CLBIND_ID: number
    }
    permissions: {
      isUserManut: boolean
      isInstaller?: boolean
    }
    profiles_v2: {
      clientId: number
      p: ProfilePerClient[]
      units: number[]|null
    }[]
  }>

  ['/users/invite-new-user']: (reqParams: {
    EMAIL: string
    NOME?: string
    SOBRENOME?: string
    PASSWORD?: string
    CLIENT_BIND?: number
    RG?: string,
    COMMENTS?: string,
    PICTURE?: string|null,
    CITY_ID?: string,
    PHONENB?: string,
    clients_v2: {
      clientId: number
      p: ProfilePerClient[] | null
      units?: number[]|null
    }[]
  }, session: SessionData) => Promise<string>

  ['/users/edit-user']: (reqParams: {
    USER: string
    PASSWORD?: string
    NOME?: string
    SOBRENOME?: string
    PREFS?: string
    CLIENT_BIND?: number
    NOTIFSBY?: 'email'|'telegram'|'email and telegram'
    RG?: string,
    COMMENTS?: string,
    PICTURE?: string|null,
    CITY_ID?: string,
    PHONENB?: string,
    clients_v2?: {
      clientId: number
      p: ProfilePerClient[] | null
      units?: number[]|null
    }[]
  }, session: SessionData) => Promise<{
    NOME: string
    SOBRENOME: string
    PREFS: string
    NOTIFSBY: string
  }>

  ['/users/remove-user']: (reqParams: {
    USER: string
  }, session: SessionData) => Promise<string>

  ['/users/reactivate-user']: (reqParams: {
    USER: string
    clientIds: number[]
  }, session: SessionData) => Promise<string>

  ['/users/set-profiles']: (reqParams: {
    userId: string,
    clients_v2: {
      clientId: number
      p: ProfilePerClient[] | null
      units?: number[]|null
    }[]
  }, session: SessionData) => Promise<string>

  ['/users/set-prefs-overview']: (reqParams: {
    userId: string,
    prefs: {
      type: number
      title?: string
      position?: number
      isActive?: boolean
      isExpanded?: boolean
    }[]
  }, session: SessionData) => Promise<string>

  ['/users/get-prefs-overview']: (reqParams: {
    userId: string
  }, session: SessionData) => Promise<{
    prefs: {
      type: number
      title?: string
      position?: number
      isActive?: boolean
      isExpanded?: boolean
    }[]
  }>

  ['/users/set-notif-unitrep']: (reqParams: {
    USER: string
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    FREQ: 'NONE'|'DAY'|'WEEK'|'MONTH'
  }, session: SessionData) => Promise<string>

  ['/users/get-notif-unitrep']: (reqParams: {}, session: SessionData) => Promise<{
    USER: string
    FILT_TYPE: string
    FILT_IDS: string[] | number[]
    filter: string
    FREQ: string // 'NONE'|'DAY'|'WEEK'|'MONTH'
  }>

  ['/request-dev-cert-check']: (reqParams: { devId: string }, session: SessionData) => Promise<string>
  ['/devs/get-firmware-versions-v2']: (reqParams: {
    fwStages?: ('prod'|'test')[]
    fwFamilies?: string[]
  }, session: SessionData) => Promise<{
    list: {
      path: string
      date: string
      fwType: 'prod' | 'test'
      fwFamily: string // dac4, dut3, dal0...
      fwVers: string
      versionNumber?: {
        vMajor: number
        vMinor: number
        vPatch: number
        vExtra?: string
      }
    }[]
    fwHwRevs: string[]
  }>
  ['/devs/get-registered-firmware-versions']: (reqParams: {
    fwFamilies?: string[]
    deviceType?: string
  }, session: SessionData) => Promise<{
    list: {
      date: string
      fwFamily: string // dac4, dut3, dal0...
      fwVers: string
      versionNumber?: {
        vMajor: number
        vMinor: number
        vPatch: number
        vExtra?: string
      }
    }[]
  }>
  ['/devs/get-devs-fwinfo']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      devId: string,
      fwInfo?: {
        hardware_type: string
        firmware_version: string
        last_update_result?: string
      }
      versionNumber?: {
        vMajor: number
        vMinor: number
        vPatch: number
        vExtra?: string
      }
      TARGFW_REQDATE: string
    }[]
  }>
  ['/devs/get-devs-fwinfo-v2']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      STATE_ID: string
      CITY_NAME: string
      UNIT_NAME: string
      UNIT_ID: number
      CLIENT_NAME: string
      OTAPROCSTATUS: string
      FWVERSSTATUS: string
      machineName: string
      status: string
      fwInfo?: {
        hardware_type: string
        firmware_version: string
        last_update_result?: string
      }
      versionNumber?: {
        vMajor: number
        vMinor: number
        vPatch: number
        vExtra?: string
      }
    }[]
  }>
  ['/devs/upload-new-firmware-version']: (reqParams: {
    fwStage: 'prod'|'test',
    fwFamily: string, // dac4, dut3, dal0...
    fileName: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<string>
  ['/dac/add-client-unit']: (reqParams: {
    CLIENT_ID: number
    UNIT_NAME: string
    UNIT_CODE_CELSIUS?: string|null
    UNIT_CODE_API?: string|null
    LAT: string|null
    LON: string|null
    CITY_ID: string|null
    TIMEZONE_ID: number|null
    EXTRA_DATA?: string|null
    DISTRIBUTOR_ID?: number|null
    CONSUMER_UNIT?: string|null
    LOGIN?: string|null
    PASSWORD?: string|null
    LOGIN_EXTRA?: string|null
    ADDRESS?: string|null
    PRODUCTION?: boolean|null
    PRODUCTION_TIMESTAMP?: Date|null
    AMOUNT_PEOPLE?: string | null
    CONSTRUCTED_AREA?: string | null
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    UNIT_NAME: string
    LAT: string
    LON: string
    CITY_ID: string
    CITY_NAME: string
    STATE_ID: string
    CONSTRUCTED_AREA?: number
  }>

  ['/check-client-units-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      UNIT_NAME: string
      COUNTRY_NAME: string
      STATE_ID: string
      CITY_NAME: string
      LATLONG: string
      PRODUCTION: string
      TIMEZONE_AREA: string
      extras: string[][]
      key: string
      errors: { message: string }[]
    }[]
  }>

  ['/add-client-units-batch']: (reqParams: {
    CLIENT_ID: number
    units: {
      UNIT_NAME: string
      COUNTRY_NAME: string
      STATE_ID: string
      CITY_NAME: string
      LATLONG: string
      PRODUCTION: string
      TIMEZONE_AREA: string
      extras: string[][]
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/dri/add-dri-sched']: (reqParams: {
    DRI_ID: string
    NAME: string
    ACTIVE: string
    OPERATION: string
    BEGIN_TIME: string
    END_TIME: string
    MODE?: string
    DAYS: string
    SETPOINT?: number
    EXCEPTION_DATE?: string
    EXCEPTION_REPEAT_YEARLY?: string
    AUTOMATION_INTERVAL?: number
  }, session: SessionData) => Promise<String>

  ['/dri/update-dri-sched']: (reqParams: {
    SCHED_ID: number
    DRI_ID: string
    NAME?: string
    ACTIVE?: string
    OPERATION?: string
    BEGIN_TIME?: string
    END_TIME?: string
    MODE?: string
    DAYS?: string
    SETPOINT?: number
    EXCEPTION_DATE?: string
    EXCEPTION_REPEAT_YEARLY?: string
    AUTOMATION_INTERVAL?: number
  }, session: SessionData) => Promise<String>

  ['/dri/delete-dri-sched']: (reqParams: {
    SCHED_ID: number
    DRI_ID: string,
    AUTOMATION_INTERVAL?: number
  }, session: SessionData) => Promise<String>

  ['/dri/get-dri-scheds']: (reqParams: {
    DRI_ID: string
  }, session: SessionData) => Promise<{
    list: {
      SCHED_ID: number
      DRI_ID: string
      NAME: string
      ACTIVE: string
      OPERATION: string
      BEGIN_TIME: string
      END_TIME: string
      MODE: string
      DAYS: string
      SETPOINT: number
      EXCEPTION_DATE: string
      EXCEPTION_REPEAT_YEARLY: string
    }[]
  }>

  ['/dri/send-dri-command']: (reqParams: {
    DRI_ID: string
    TYPE: string
    VALUE: string
  }, session: SessionData) => Promise<String>

  ['/dri/update-dri-vav']: (reqParams: {
    VAV_ID: string
    THERM_MANUF?: string | null,
    THERM_MODEL?: string | null,
    VALVE_MANUF?: string | null,
    VALVE_MODEL?: string,
    VALVE_TYPE?: string,
    BOX_MANUF?: string | null,
    BOX_MODEL?: string,
    ROOM_NAME?: string,
    RTYPE_ID?: number,
    remove?: boolean,
  }, session: SessionData) => Promise<string>

  ['/dri/get-dri-vav-info']: (reqParams: {
    VAV_ID: string
  }, session: SessionData) => Promise<{
    VAV_ID: string,
    THERM_MANUF?: string,
    THERM_MODEL?: string,
    VALVE_MANUF?: string,
    VALVE_MODEL?: string,
    VALVE_TYPE?: string,
    BOX_MANUF?: string,
    BOX_MODEL?: string,
    ROOM_NAME?: string,
    RTYPE_ID?: number,
    ROOM_TYPE_NAME?: string,
    TUSEMIN?: number,
    TUSEMAX?: number,
  }>

  ['/dri/get-dri-vavs-list']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    rtypeId?: number,
    SKIP?: number,
    LIMIT?: number,
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    includeMeanTemperature?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      bt_id: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      ROOM_NAME: string
      ISVISIBLE: number
      UNIT_ID: number
      UNIT_NAME: string
      LAT: string
      LON: string
      CLIENT_NAME: string
      CLIENT_ID: number
      RTYPE_ID: number
      RTYPE_NAME: string
      status: string
      lastCommTs: string
      Temperature?: number
      Mode?: string|number
      ValveState?: number
      TUSEMIN?: number
      TUSEMAX?: number
      temprtAlert: 'low'|'high'|'good'|null
      tpstats?: { med: number, max: number, min: number }
    }[]
    totalItems: number
  }>

  ['/dri/update-dri-fancoil']: (reqParams: {
    FANCOIL_ID: string
    THERM_MANUF?: string | null,
    THERM_MODEL?: string | null,
    THERM_T_MIN?: number | null,
    THERM_T_MAX?: number | null,
    VALVE_MANUF?: string | null,
    VALVE_MODEL?: string,
    VALVE_TYPE?: string,
    FANCOIL_MANUF?: string | null,
    FANCOIL_MODEL?: string,
    ROOM_NAME?: string | null,
    RTYPE_ID?: number | null,
    DUT_ID_FROM_ROOM?: string | null,
    remove?: boolean,
  }, session: SessionData) => Promise<string>

  ['/dri/get-dri-fancoil-info']: (reqParams: {
    FANCOIL_ID: string
  }, session: SessionData) => Promise<{
    FANCOIL_ID: string,
    THERM_MANUF?: string,
    THERM_MODEL?: string,
    THERM_T_MIN?: number,
    THERM_T_MAX?: number,
    VALVE_MANUF?: string,
    VALVE_MODEL?: string,
    VALVE_TYPE?: string,
    FANCOIL_MANUF?: string,
    FANCOIL_MODEL?: string,
    ROOM_NAME?: string,
    HAS_ROOMTYPE?: number,
    RTYPE_ID?: number,
    ROOM_TYPE_NAME?: string,
    DUT_ID_FROM_ROOM?: string,
    TUSEMIN?: number,
    TUSEMAX?: number,
  }>

  ['/dri/get-chiller-alarms-list']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      ID: number,
      ALARM_CODE: string,
    }[]
  }>

  ['/dri/get-chiller-alarms-list-hist']: (reqParams: {
    DEVICE_CODE: string,
    START_DATE?: string,
    END_DATE?: string,
    ORDER_BY?: { column: string, desc: boolean }
    SKIP?: number,
    LIMIT?: number,
    filterBy?: { column: string, values: string[] }[]
  }, session: SessionData) => Promise<{
    list: {
      ID: number,
      ALARM_CODE: string,
      START_DATE: string,
      END_DATE: string,
    }[]
    totalItems: number
  }>

  ['/dri/get-all-chiller-alarms-codes']: (reqParams: {
    DEVICE_CODE: string,
    START_DATE: string,
    END_DATE: string,
  }, session: SessionData) => Promise<{
    list: {
      ALARM_CODE: string
    }[]
  }>

  ['/dri/get-chiller-parameters-hist']: (reqParams: { DEVICE_CODE: string, START_DATE: string, END_DATE: string, MODEL: string, HOUR_GRAPHIC?: boolean }, session: SessionData) => Promise<{
    paramsLists: {
      paramsChanged: {
        device_code: string,
        parameter_name: string,
        parameter_value: number,
        record_date: string
      }[],
      paramsGrouped: (ChillerHxParamsGrouped | ChillerXaParamsGrouped | ChillerXaHvarParamsGrouped)[]
    }
  }>

  ['/dri/get-chiller-models-list']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      id: number,
      modelName: string,
      lineName: string,
      nominalCapacity: number,
      nominalVoltage: number,
      nominalFrequency: number,
    }[]
  }>

  ['/dri/get-chiller-combo-opts']: (reqParams: {}, session: SessionData) => Promise<{
    chillerLines: {
      ID: number,
      LINE_NAME: string,
    }[]
    chillerModels: {
      ID: number,
      MODEL_NAME: string,
    }[]
  }>

  ['/dmt/set-dmt-nobreak']: (reqParams: {
    ID?: number | null
    UNIT_ID: number
    DMT_CODE?: string
    DAT_CODE?: string | null
    NAME: string
    MANUFACTURER?: string | null
    MODEL?: string | null
    INPUT_VOLTAGE?: number | null
    OUTPUT_VOLTAGE?: number | null
    NOMINAL_POTENTIAL?: number | null
    NOMINAL_BATTERY_LIFE?: number | null
    INPUT_ELECTRIC_CURRENT?: number | null
    OUTPUT_ELECTRIC_CURRENT?: number | null
    NOMINAL_BATTERY_CAPACITY?: number | null
    INSTALLATION_DATE?: string | null
    PORT?: number | null
  }, session: SessionData) => Promise<{
    dmtId: number,
    nobreakId: number
  }>

  ['/dmt/set-dmt-illumination']: (reqParams: {
    ID?: number | null
    UNIT_ID: number
    DMT_CODE?: string
    NAME: string
    GRID_VOLTAGE?: number | null
    GRID_CURRENT?: number | null
    PORT?: number | null
  }, session: SessionData) => Promise<string>

  ['/dmt/get-dmt-nobreak-list']: (reqParams: {
    unitIds?: number[]
    stateIds?: number[]
    cityIds?: string[]
    clientIds?: number[]
    INCLUDE_INSTALLATION_UNIT?: boolean
    status?: string[]
    connection?: string[]
  }, session: SessionData) => Promise<{
    ID: number
    UNIT_ID: number
    UNIT_NAME: string
    DMT_CODE: string
    DAT_CODE: string
    NAME: string
    MANUFACTURER?: string
    MODEL?: string
    INPUT_VOLTAGE?: number
    OUTPUT_VOLTAGE?: number
    NOMINAL_POTENTIAL?: number
    NOMINAL_BATTERY_LIFE?: number
    INPUT_ELECTRIC_CURRENT?: number
    OUTPUT_ELECTRIC_CURRENT?: number
    NOMINAL_BATTERY_CAPACITY?: number
    INSTALLATION_DATE?: string
    PORT: number
    APPLICATION: string
    CITY_NAME: string
    CLIENT_ID: number
    STATE_ID: number
    CITY_ID: string
    CLIENT_NAME: string
    STATE_UF: string
    connection?: string
    autonon?: string
    averageDur?: string
    status?: string
  }[]>

  ['/dmt/get-dmt-nobreak-list-unit']: (reqParams: {
    UNIT_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    UNIT_ID: number
    UNIT_NAME: string
    DMT_CODE: string
    DAT_CODE: string
    NAME: string
    MANUFACTURER: string
    MODEL: string
    INPUT_VOLTAGE: number
    OUTPUT_VOLTAGE: number
    NOMINAL_POTENTIAL: number
    NOMINAL_BATTERY_LIFE: number
    INSTALLATION_DATE: string
    PORT: number
    PORT_ELETRIC: number
    APPLICATION: string
    checked?: boolean
  }[]>

  ['/dmt/delete-dmt-nobreak']: (reqParams: {
    NOBREAK_ID: number
  }, session: SessionData) => Promise<string>

  ['/dmt/get-dmt-ports-info']: (reqParams: {
    DMT_CODE: string
    NEW_UTILITY_TYPE?: 'Nobreak'|'Illumination'
    CLIENT_ID?: number
  }, session: SessionData) => Promise<{
    freePorts: boolean,
    ports: {
      label: string,
      associated: boolean,
      port: number,
      nobreakId?: number,
      eletricCircuitId?: number,
      illuminationId?: number,
      name?: string,
      datId?: string,
    }[]
  }>

  ['/dmt/get-dmt-utilities-list']: (reqParams: {
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    UNIT_ID: number
    UNIT_NAME: string
    DMT_CODE: string
    DAT_CODE?: string
    NAME: string
    MANUFACTURER?: string
    MODEL?: string
    INPUT_VOLTAGE?: number
    OUTPUT_VOLTAGE?: number
    NOMINAL_POTENTIAL?: number
    NOMINAL_BATTERY_LIFE?: number
    INPUT_ELECTRIC_CURRENT?: number
    OUTPUT_ELECTRIC_CURRENT?: number
    NOMINAL_BATTERY_CAPACITY?: number
    INSTALLATION_DATE?: string
    PORT: number
    APPLICATION: string
    GRID_VOLTAGE?: number
    GRID_CURRENT?: number
  }[]>

  ['/dmt/set-dmt-utilities']: (reqParams: {
    DMT_CODE: string;
    UNIT_ID: number;
    utilities: {
      INSERT?: boolean;
      DISSOCIATE?: boolean;
      APPLICATION?: 'Nobreak'|'Illumination'|'Electric Network';
      NOBREAK_ID?: number;
      ILLUMINATION_ID?: number;
      CIRCUIT_ID?: number;
      PORT?: number;
      DMT_CODE?: string;
      UNIT_ID?: number;
    }[]
  }, session: SessionData) => Promise<string>

  ['/dmt/get-nobreak-info']: (reqParams: {
    NOBREAK_ID: number
  }, session: SessionData) => Promise<{
    NOBREAK_ID: number;
    NAME: string;
    MANUFACTURER: string;
    MODEL: string;
    INPUT_VOLTAGE: number;
    OUTPUT_VOLTAGE: number;
    NOMINAL_POTENTIAL: number;
    NOMINAL_BATTERY_LIFE: number;
    INPUT_ELECTRIC_CURRENT: number
    OUTPUT_ELECTRIC_CURRENT: number
    NOMINAL_BATTERY_CAPACITY: number
    INSTALLATION_DATE: string;
    DAT_CODE: string;
    DMT_ID: number;
    DMT_CODE: string;
    PORT: number;
    UNIT_ID: number;
    UNIT_NAME: string;
    CLIENT_ID: number;
    CLIENT_NAME: string;
    STATUS: string;
  }>

  ['/dmt/get-nobreak-additional-parameters']: (reqParams: {
    NOBREAK_ID: number
  }, session: SessionData) => Promise<{
      ID: number
      COLUMN_NAME: string
      COLUMN_VALUE: string
    }[]
  >

  ['/dal-dam/get-illumination-list']: (reqParams: {
    unitIds?: number[]
    clientIds?: number[]
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    ILLUMINATION_ID: number,
    ILLUM_DEV_ID: number,
    DEVICE_CODE: string
    UNIT_NAME: string
    UNIT_ID: number
    CITY_NAME: string
    STATE_NAME: string
    ILLUMINATION_NAME: string
    PORT: number
    FEEDBACK: number
    HAS_SCHEDULE: boolean
  }[]>

  ['/dal/set-dal-illumination']: (reqParams: {
    ID?: number | null
    UNIT_ID: number
    DAL_CODE?: string
    NAME: string
    GRID_VOLTAGE?: number | null
    GRID_CURRENT?: number | null
    PORT?: number | null
    FEEDBACK?: number | null
    DEFAULT_MODE?: string | null
  }, session: SessionData) => Promise<string>

  ['/dal/get-dal-illumination-list']: (reqParams: {
    unitIds?: number[]
    clientIds?: number[]
    INCLUDE_INSTALLATION_UNIT?: boolean
    stateIds?: string[]
    cityIds?: string[]
    status?: string[]
    connection?: string[]
  }, session: SessionData) => Promise<{
    ID: number
    UNIT_ID: number
    UNIT_NAME: string
    DAL_CODE: string
    DMT_CODE: string
    DAM_ILLUMINATION_CODE: string
    DEVICE_CODE: string
    NAME: string
    GRID_VOLTAGE: number
    GRID_CURRENT: number
    PORT: number
    FEEDBACK: number
    APPLICATION: string
    connection: string
    CLIENT_NAME: string
    CITY_NAME: string
    STATE_UF: string
    CLIENT_ID: number
  }[]>

  ['/dal/delete-dal-illumination']: (reqParams: {
    ILLUMINATION_ID: number
  }, session: SessionData) => Promise<string>

  ['/dal/get-dal-ports-info']: (reqParams: {
    DAL_CODE: string
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    freePorts: boolean,
    freeFeedbacks: boolean,
    ports: {label: string, associated: boolean, port: number, illuminationId?: number}[]
    feedbacks: {label: string, associated: boolean, port: number, illuminationId?: number}[]
  }>

  ['/dal/get-illumination-info']: (reqParams: {
    ILLUMINATION_ID: number
  }, session: SessionData) => Promise<{
    ID: number;
    NAME: string;
    GRID_VOLTAGE: number;
    GRID_CURRENT: number;
    DAL_ID?: number;
    DAL_CODE?: string;
    DMT_ID?: number;
    DMT_CODE?: string;
    DAM_DEVICE_ID?: number;
    DAM_ILLUMINATION_CODE?: string;
    PORT: number;
    FEEDBACK: number;
    DEFAULT_MODE: string;
    UNIT_ID: number;
    UNIT_NAME: string;
    CLIENT_ID: number;
    CLIENT_NAME: string;
    STATUS?: string;
    isCommandAvailable?: boolean;
  }>

  ['/dal/get-dal-scheds']: (reqParams: {
    DAL_CODE: string;
    ILLUMINATION_ID?: number;
  }, session: SessionData) => Promise<{
    scheds: {
      ID: number;
      DAL_ID: number;
      ILLUMINATION_ID: number;
      TITLE: string;
      ACTIVE: string;
      BEGIN_TIME: string;
      END_TIME: string;
      DAYS: string;
      STATUS: string;
      DEFAULT_MODE?: string;
    }[]
    exceptions: {
      ID: number;
      DAL_ID: number;
      ILLUMINATION_ID: number;
      TITLE: string;
      ACTIVE: string;
      BEGIN_TIME: string;
      END_TIME: string;
      EXCEPTION_DATE: string;
      REPEAT_YEARLY: string;
      STATUS: string;
      DEFAULT_MODE?: string;
    }[]
  }>

  ['/dal/add-illumination-multiple-scheds']: (reqParams: {
    DAL_CODE: string,
    ILLUMINATION_ID: number,
    SCHEDS : {
      ID: number;
      DAL_CODE: string;
      ILLUMINATION_ID: number;
      TITLE: string;
      ACTIVE: string;
      BEGIN_TIME: string;
      END_TIME: string;
      DAYS: string;
      STATUS: string;
      DELETE?: boolean
      INSERT?: boolean;
      EDIT?: boolean;
    }[],
    EXCEPTIONS : {
      ID: number;
      DAL_CODE: string;
      ILLUMINATION_ID: number;
      TITLE: string;
      ACTIVE: string;
      BEGIN_TIME: string;
      END_TIME: string;
      EXCEPTION_DATE: string;
      REPEAT_YEARLY: string;
      STATUS: string;
      DELETE?: boolean
      INSERT?: boolean;
      EDIT?: boolean;
    }[],
  }, session: SessionData) => Promise<string>

  ['/dal/add-illumination-sched']: (reqParams: {
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    TITLE: string;
    ACTIVE: string;
    BEGIN_TIME: string;
    END_TIME: string;
    DAYS: string;
    STATUS: string;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>
  ['/dal/update-illumination-sched']: (reqParams: {
    SCHED_ID: number;
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    TITLE?: string;
    ACTIVE?: string;
    BEGIN_TIME?: string;
    END_TIME?: string;
    DAYS?: string;
    STATUS?: string;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>
  ['/dal/delete-illumination-sched']: (reqParams: {
    SCHED_ID: number;
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>

  ['/dal/add-illumination-exception']: (reqParams: {
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    TITLE: string;
    ACTIVE: string;
    BEGIN_TIME: string;
    END_TIME: string;
    EXCEPTION_DATE: string;
    REPEAT_YEARLY: string;
    STATUS: string;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>
  ['/dal/update-illumination-exception']: (reqParams: {
    EXCEPTION_ID: number;
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    TITLE?: string;
    ACTIVE?: string;
    BEGIN_TIME?: string;
    END_TIME?: string;
    EXCEPTION_DATE?: string;
    REPEAT_YEARLY?: string;
    STATUS?: string;
  }, session: SessionData) => Promise<string>
  ['/dal/delete-illumination-exception']: (reqParams: {
    EXCEPTION_ID: number;
    DAL_CODE: string;
    ILLUMINATION_ID: number;
    FROM_MULTIPLE_PROGRAMMING?: boolean;
  }, session: SessionData) => Promise<string>

  ['/dal/handle-multiple-illumination-sched']: (reqParams: {
    DAL_CODE: string,
    ILLUMINATION_ID: number,
    SCHEDS : {
      DAL_CODE: string;
      ILLUMINATION_ID: number;
      SCHED_ID?: number;
      TITLE?: string;
      ACTIVE?: string;
      BEGIN_TIME?: string;
      END_TIME?: string;
      DAYS?: string;
      STATUS?: string;
      INSERT?: boolean;
      EDIT?: boolean;
      DELETE?: boolean
    }[],
    EXCEPTIONS : {
      EXCEPTION_ID?: number;
      DAL_CODE: string;
      ILLUMINATION_ID: number;
      TITLE?: string;
      ACTIVE?: string;
      BEGIN_TIME?: string;
      END_TIME?: string;
      EXCEPTION_DATE?: string;
      REPEAT_YEARLY?: string;
      STATUS?: string;
      INSERT?: boolean;
      DELETE?: boolean
      EDIT?: boolean;
    }[],
  }, session: SessionData) => Promise<string>

  ['/dam/set-dam-illumination']: (reqParams: {
    ID?: number | null
    UNIT_ID: number
    DAM_ILLUMINATION_CODE?: string
    NAME: string
    GRID_VOLTAGE?: number | null
    GRID_CURRENT?: number | null
  }, session: SessionData) => Promise<string>

  ['/dam/get-dam-illumination-validation']: (reqParams: {
    DAM_ILLUMINATION_CODE?: string
    UNIT_ID?: number
    CLIENT_ID?: number
  }, session: SessionData) => Promise<{
    freeDevice: boolean,
    newDevice: boolean,
    hasMachine: boolean,
  }>

  ['/devices/get-devices-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    unitIds?: number[]
    device?: 'all'| 'dac' | 'dal' | 'dam' | 'dma' | 'dmt' | 'dri' | 'dut'
    stateIds?: string[]
    cityIds?: string[]
    searchTerms?: string[],
    status?: string[],
  }, session: SessionData) => Promise<{
    list: {
      STATE: string
      STATE_ID: number
      CITY_NAME: string
      CITY_ID: string
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      DEVICE: 'DAC' | 'DAL' | 'DAM' | 'DMA' | 'DMT' | 'DRI' | 'DUT'
      DEVICE_CODE: string
      STATUS: string
      ASSOCIATED: boolean
      MAC?: string
    }[],
  }>

  ['/devices/get-offline-device-info']: (reqParams: {
    DEVICE_CODE: string
  }, session: SessionData) => Promise<{
    device?: {
      DEVICE_CODE: string
      UNIT_ID: number
      UNIT_NAME: string
      CLIENT_ID: number
      CLIENT_NAME: string
    }
  }>

  ['/devices/get-config-devices']: (reqParams: {
    UNIT_ID: number
    DAY: string
  }, session: SessionData) => Promise<{
    devices: {
      dacs_devices?: {
        DEVICE_CODE: string
        MACHINE_ID: number
        MACHINE_NAME: string
        MACHINE_KW: number
        IS_VRF: boolean
        CALCULATE_L1_FANCOIL: boolean
        HAS_AUTOMATION: boolean
        FLUID_TYPE: string
        P0_PSUC: boolean
        P1_PSUC: boolean
        P0_PLIQ: boolean
        P1_PLIQ: boolean
        P0_MULT: number
        P1_MULT: number
        P0_OFST: number
        P1_OFST: number
        P0_MULT_QUAD: number
        P0_MULT_LIN: number
        P1_MULT_QUAD: number
        P1_MULT_LIN: number
        T0_T1_T2?: string[]
        VIRTUAL_L1: boolean
        V_MAJOR?: number,
      }[]
      dacs_to_disponibility?: {
        DEVICE_CODE: string
        IS_VRF: boolean
        CALCULATE_L1_FANCOIL: boolean
        HAS_AUTOMATION: boolean
        FLUID_TYPE: string
        P0_PSUC: boolean
        P1_PSUC: boolean
        P0_PLIQ: boolean
        P1_PLIQ: boolean
        P0_MULT: number
        P1_MULT: number
        P0_OFST: number
        P1_OFST: number
        P0_MULT_QUAD: number
        P0_MULT_LIN: number
        P1_MULT_QUAD: number
        P1_MULT_LIN: number
        T0_T1_T2?: string[]
        VIRTUAL_L1: boolean,
        V_MAJOR?: number,
      }[],
      dacs_to_l1_automation?: {
        DEVICE_CODE: string
        MACHINE_ID: number
        MACHINE_NAME: string
        MACHINE_KW: number
        IS_VRF: boolean
        CALCULATE_L1_FANCOIL: boolean
        HAS_AUTOMATION: boolean
        FLUID_TYPE: string
        P0_PSUC: boolean
        P1_PSUC: boolean
        P0_PLIQ: boolean
        P1_PLIQ: boolean
        P0_MULT: number
        P1_MULT: number
        P0_OFST: number
        P1_OFST: number
        T0_T1_T2?: string[]
        VIRTUAL_L1: boolean,
        DEVICE_CODE_AUTOM: string,
        ASSET_ID: number,
        ASSET_NAME: string,
        V_MAJOR?: number,
        machine_autom_intervals: {
          seconds_start: number,
          seconds_end: number,
          must_be_on: boolean
        }[],
      }[],
      duts_devices?: {
        DEVICE_CODE: string
        MACHINE_ID: number
        MACHINE_NAME: string
        MACHINE_KW: number
        TEMPERATURE_OFFSET?: number,
        has_energy_efficiency: boolean,
      }[],
      duts_to_l1_automation?: {
        DEVICE_CODE: string
        MACHINE_ID: number
        MACHINE_NAME: string
        MACHINE_KW: number
        TEMPERATURE_OFFSET?: number
        DEVICE_CODE_AUTOM: string
        ASSET_ID: number,
        ASSET_NAME: string,
        machine_autom_intervals: {
          seconds_start: number,
          seconds_end: number,
          must_be_on: boolean
        }[],
        has_energy_efficiency: boolean,
      }[]
      duts_to_disponibility?: {
        DEVICE_CODE: string
        TEMPERATURE_OFFSET?: number
      }[],
      dma_device?: {
        DEVICE_CODE: string
        LITERS_PER_PULSE?: number
        INSTALLATION_DATE?: string
      }
      laager_device?: {
        LAAGER_CODE: string
        INSTALLATION_DATE?: string
      }
      energy_devices?: {
        DEVICE_CODE: string
        SERIAL?: string
        MANUFACTURER: string
        MODEL?: string
        ELECTRIC_CIRCUIT_ID: number
        ELECTRIC_CIRCUIT_NAME: string
        DRI_INTERVAL: number
        formulas?: {
          [key: string]: string
        }
      }[]
      dris_to_disponibility?: {
        DEVICE_CODE: string
        DRI_TYPE: string
        DRI_INTERVAL?: number
        formulas?: {
          [key: string]: string
        }
      }[],
      dmts_to_disponibility?: {
        DEVICE_CODE: string
      }[],
      dals_to_disponibility?: {
        DEVICE_CODE: string,
      }[],
      dams_to_disponibility?: {
        DEVICE_CODE: string,
      }[]
    }
  }>

  ['/upload-dri-varscfg']: (reqParams: {
    driId: string
    application: string | null
    protocol: string | null
    modbusBaudRate?: string
    telemetryInterval?: string
    serialMode?: string
    parity?: string
    stopBits?: string
    capacityTc?: string
    installationType?: string
    slaveId?: string
    worksheetName?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    success: boolean
  }>

  ['/check-client-dacs-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      DAC_ID: string
      UNIT_NAME?: string
      GROUP_NAME?: string
      AUTOM_ENABLE?: 'S'|'N'
      DAC_APPL?: string
      FLUID_TYPE?: string
      P0_SENSOR?: string
      P1_SENSOR?: string
      P0_POSITN?: string
      P1_POSITN?: string
      DAC_TYPE?: string
      CAPACITY_PWR?: string
      CAPACITY_UNIT?: string
      DAC_COP?: string
      DAC_KW?: string
      DAC_ENV?: string
      DAC_BRAND?: string
      DAC_MODEL?: string
      DAC_DESC?: string
      DAC_NAME?: string
      DAC_MODIF?: string
      DAC_COMIS?: string
      PHOTO_1?: string;
      PHOTO_2?: string;
      PHOTO_3?: string;
      PHOTO_4?: string;
      PHOTO_5?: string;
      key: string
      errors: { message: string }[]
    }[]
    tableCols: string[]
  }>
  ['/add-client-dacs-batch']: (reqParams: {
    CLIENT_ID: number
    dacs: {
      DAC_ID: string
      UNIT_NAME?: string
      GROUP_NAME?: string
      AUTOM_ENABLE?: 'S'|'N'
      DAC_APPL?: string
      FLUID_TYPE?: string
      P0_SENSOR?: string
      P1_SENSOR?: string
      P0_POSITN?: string
      P1_POSITN?: string
      DAC_TYPE?: string
      CAPACITY_PWR?: string
      CAPACITY_UNIT?: string
      DAC_COP?: string
      DAC_KW?: string
      DAC_ENV?: string
      DAC_BRAND?: string
      DAC_MODEL?: string
      DAC_DESC?: string
      DAC_NAME?: string
      DAC_MODIF?: string
      DAC_COMIS?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>
  ['/export-client-dacs-batch-input']: (reqParams: {
    CLIENT_ID: number
    UNIT_ID: number
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/get-assets-sheet-manual']: (reqParams: {
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/check-client-assets-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      UNIT_NAME?: string
      GROUP_ID?: string
      GROUP_NAME?: string
      INSTALLATION_DATE?: string
      MCHN_APPL?: string
      GROUP_TYPE?: string
      MCHN_BRAND?: string
      FLUID_TYPE?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      DEV_AUTOM_ID?: string
      DAT_ID?: string
      AST_DESC?: string
      INSTALLATION_LOCATION?: string
      AST_ROLE_NAME?: string
      MCHN_MODEL?: string
      CAPACITY_PWR?: string
      CAPACITY_UNIT?: string
      MCHN_KW?: string
      DEV_ID?: string
      DAC_COMIS?: string
      DUT_ID?: string
      AST_TYPE?: string
      MCHN_ENV?: string
      PHOTO_6?: string
      PHOTO_7?: string
      PHOTO_8?: string
      PHOTO_9?: string
      PHOTO_10?: string
      key: string
      errors: { message: string }[]
    }[]
    tableCols: string[]
  }>
  ['/add-client-assets-batch']: (reqParams: {
    CLIENT_ID: number
    assets: {
      UNIT_NAME?: string
      GROUP_ID?: string
      GROUP_NAME?: string
      INSTALLATION_DATE?: string
      MCHN_APPL?: string
      GROUP_TYPE?: string
      MCHN_BRAND?: string
      FLUID_TYPE?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      DEV_AUTOM_ID?: string
      DAT_ID?: string
      AST_DESC?: string
      INSTALLATION_LOCATION?: string
      AST_ROLE_NAME?: string
      MCHN_MODEL?: string
      CAPACITY_PWR?: string
      CAPACITY_UNIT?: string
      MCHN_KW?: string
      DEV_ID?: string
      DAC_COMIS?: string
      DUT_ID?: string
      AST_TYPE?: string
      MCHN_ENV?: string
      PHOTO_6?: string
      PHOTO_7?: string
      PHOTO_8?: string
      PHOTO_9?: string
      PHOTO_10?: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>
  ['/export-client-assets-batch-input']: (reqParams: {
    CLIENT_ID: number
    UNIT_ID: number
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/check-client-duts-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      DUT_ID: string
      ROOM_NAME?: string
      UNIT_NAME?: string
      RTYPE_NAME?: string
      PLACEMENT?: 'INS' | 'AMB' | 'DUO'
      AUTOM_CFG?: 'S'|'N'|'RELÉ'
      MCHN_BRAND?: string
      MCHN_MODEL?: string
      MONIT_MACHINE?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      key: string
      errors: { message: string }[]
    }[]
    tableCols: string[]
  }>
  ['/add-client-duts-batch']: (reqParams: {
    CLIENT_ID: number
    duts: {
      DUT_ID: string
      ROOM_NAME?: string
      UNIT_NAME?: string
      RTYPE_NAME?: string
      PLACEMENT?: 'INS' | 'AMB' | 'DUO'
      AUTOM_CFG?: 'S'|'N'|'RELÉ'
      MCHN_BRAND?: string
      MCHN_MODEL?: string
      MONIT_MACHINE?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/check-client-dmas-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      METER_ID: string
      UNIT_NAME?: string
      SUPPLIER?: string
      HYDROMETER_MODEL?: string
      INSTALLATION_LOCATION?: string
      INSTALLATION_DATE?: string
      TOTAL_CAPACITY?: string
      QUANTITY_OF_RESERVOIRS?: string
      key: string
      errors: { message: string }[]
    }[]
    tableCols: string[]
  }>

  ['/add-client-dmas-batch']: (reqParams: {
    CLIENT_ID: number
    dmas: {
      METER_ID: string
      UNIT_NAME?: string
      SUPPLIER?: string
      HYDROMETER_MODEL?: string
      INSTALLATION_LOCATION?: string
      INSTALLATION_DATE?: string
      TOTAL_CAPACITY?: string
      QUANTITY_OF_RESERVOIRS?: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/check-client-dams-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      DAM_ID: string
      UNIT_NAME: string
      AUT_GROUP: string
      EXT_THERM_CFG?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      key: string
      errors: { message: string }[]
    }[]
  }>
  ['/add-client-dams-batch']: (reqParams: {
    CLIENT_ID: number
    dams: {
      DAM_ID: string
      UNIT_NAME: string
      AUT_GROUP: string
      EXT_THERM_CFG?: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/check-client-dris-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      UNIT_NAME: string,
      APPLICATION: string,
      DRI_ID: string,
      GROUP: string,
      ROOM?: string,
      ENERGY_METER_SERIAL: string,
      ENERGY_METER_MODEL: string,
      THERM_MANUF?: string,
      THERM_MODEL?: string,
      VALVE_MANUF?: string,
      VALVE_MODEL?: string,
      VALVE_TYPE?: string,
      BOX_MANUF?: string,
      BOX_MODEL?: string,
      TC_CAPACITY: string,
      INSTALLATION_TYPE: string,
      TELEMETRY_INTERVAL: string,
      key: string
      errors: { message: string }[]
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
    }[]
  }>
  ['/add-client-dris-batch']: (reqParams: {
    CLIENT_ID: number
    dris: {
      UNIT_NAME: string,
      APPLICATION: string,
      DRI_ID: string,
      GROUP: string,
      ROOM?: string,
      ENERGY_METER_SERIAL: string,
      ENERGY_METER_MODEL: string,
      THERM_MANUF?: string,
      THERM_MODEL?: string,
      VALVE_MANUF?: string,
      VALVE_MODEL?: string,
      VALVE_TYPE?: string,
      BOX_MANUF?: string,
      BOX_MODEL?: string,
      TC_CAPACITY: string,
      INSTALLATION_TYPE: string,
      TELEMETRY_INTERVAL: string,
      key: string
      PHOTO_1?: string
      PHOTO_2?: string
      PHOTO_3?: string
      PHOTO_4?: string
      PHOTO_5?: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
      driId: string
      driCfg: { application: string, telemetryInterval: string, meterModel?: string, vavModel?: string, capacityTc?: string, installationType?: string }
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/check-client-roomtypes-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      RTYPE_NAME: string
      TUSEMIN: string
      TUSEMAX: string
      mon: string
      tue: string
      wed: string
      thu: string
      fri: string
      sat: string
      sun: string
      key: string
      errors: { message: string }[]
    }[]
  }>
  ['/add-client-roomtypes-batch']: (reqParams: {
    CLIENT_ID: number
    rtypes: {
      RTYPE_NAME: string
      TUSEMIN: string
      TUSEMAX: string
      mon: string
      tue: string
      wed: string
      thu: string
      fri: string
      sat: string
      sun: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/check-client-supervisors-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      USER_ID: string
      UNIT_NAME: string
      key: string
      errors: { message: string }[]
    }[]
  }>

  ['/add-client-supervisors-batch']: (reqParams: {
    CLIENT_ID: number
    supervisors: {
      USER_ID: string
      UNIT_NAME: string
      key: string
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/batch-input-columns']: (reqParams: {
    assets?: boolean
    dacs?: boolean
    dams?: boolean
    dmas?: boolean
    duts?: boolean
    dris?: boolean
    units?: boolean
    roomtypes?: boolean
    supervisors?: boolean
    invoices?: boolean
    unified?: boolean
  }, session: SessionData) => Promise<{
    assets?: {
      UNIT_NAME: { label: string, example: string, exampleList: string[] }
      GROUP_ID: { label: string, example: string, exampleList: string[] }
      GROUP_NAME: { label: string, example: string, exampleList: string[] }
      INSTALLATION_DATE: { label: string, example: string, exampleList: string[] }
      MCHN_APPL: { label: string, example: string, exampleList: string[] }
      GROUP_TYPE: { label: string, example: string, exampleList: string[] },
      MCHN_BRAND: { label: string, example: string, exampleList: string[] }
      FLUID_TYPE: { label: string, example: string, exampleList: string[] },
      PHOTO_1?: { label: string, exampleList: string[] }
      PHOTO_2?: { label: string, exampleList: string[] }
      PHOTO_3?: { label: string, exampleList: string[] }
      PHOTO_4?: { label: string, exampleList: string[] }
      PHOTO_5?: { label: string, exampleList: string[] }
      DEV_AUTOM_ID: { label: string, example: string, exampleList: string[] },
      DUT_ID: { label: string, example: string, exampleList: string[] },
      DAT_ID: { label: string, example: string, exampleList: string[] }
      AST_DESC: { label: string, example: string, exampleList: string[] }
      INSTALLATION_LOCATION: { label: string, example: string, exampleList: string[] }
      AST_ROLE_NAME: { label: string, example: string, exampleList: string[] }
      MCHN_MODEL: { label: string, example: string, exampleList: string[] }
      CAPACITY_PWR: { label: string, example: string, exampleList: string[] }
      CAPACITY_UNIT: { label: string, example: string, exampleList: string[] }
      MCHN_KW: { label: string, example: string, exampleList: string[] }
      DEV_ID: { label: string, example: string, exampleList: string[] }
      DAC_COMIS: { label: string, example: string, exampleList: string[] }
      AST_TYPE?: { label: string, example: string, exampleList: string[] }
      MCHN_ENV?: { label: string, example: string, exampleList: string[] }
      PHOTO_6?: { label: string, exampleList: string[] }
      PHOTO_7?: { label: string, exampleList: string[] }
      PHOTO_8?: { label: string, exampleList: string[] }
      PHOTO_9?: { label: string, exampleList: string[] }
      PHOTO_10?: { label: string, exampleList: string[] }
    }
    dacs?: {
      DAC_ID: { label: string, example: string }
      UNIT_NAME: { label: string, example: string }
      GROUP_NAME: { label: string, example: string }
      AUTOM_ENABLE: { label: string, example: string }
      DAC_APPL: { label: string, example: string }
      FLUID_TYPE: { label: string, example: string }
      P0_SENSOR: { label: string, example: string }
      P0_POSITN: { label: string, example: string }
      P1_SENSOR: { label: string, example: string }
      P1_POSITN: { label: string, example: string }
      DAC_TYPE: { label: string, example: string }
      CAPACITY_PWR: { label: string, example: string }
      CAPACITY_UNIT: { label: string, example: string }
      DAC_COP: { label: string, example: string }
      DAC_KW: { label: string, example: string }
      DAC_ENV: { label: string, example: string }
      DAC_BRAND: { label: string, example: string }
      DAC_MODEL: { label: string, example: string }
      DAC_DESC: { label: string, example: string }
      DAC_NAME: { label: string, example: string }
      DAC_MODIF: { label: string, example: string }
      DAC_COMIS: { label: string, example: string }
      PHOTO_1?: { label: string, example: string }
      PHOTO_2?: { label: string, example: string }
      PHOTO_3?: { label: string, example: string }
      PHOTO_4?: { label: string, example: string }
      PHOTO_5?: { label: string, example: string }
    }
    dams?: {
      DAM_ID: { label: string, exampleList: string[] }
      UNIT_NAME: { label: string, exampleList: string[] }
      AUT_GROUP: { label: string, exampleList: string[]}
      EXT_THERM_CFG: { label: string, exampleList: string[] }
      PHOTO_1?: { label: string, exampleList: string[] }
      PHOTO_2?: { label: string, exampleList: string[]}
      PHOTO_3?: { label: string, exampleList: string[] }
      PHOTO_4?: { label: string, exampleList: string[] }
      PHOTO_5?: { label: string, exampleList: string[] }
    }
    duts?: {
      DUT_ID: { label: string, example: string }
      ROOM_NAME: { label: string, example: string }
      UNIT_NAME: { label: string, example: string }
      RTYPE_NAME: { label: string, example: string }
      PLACEMENT: { label: string, example: string }
      AUTOM_CFG: { label: string, example: string }
      MCHN_BRAND: { label: string, example: string }
      MCHN_MODEL: { label: string, example: string }
      MONIT_MACHINE: { label: string, example: string }
      PHOTO_1: { label: string, example: string }
      PHOTO_2: { label: string, example: string }
      PHOTO_3: { label: string, example: string }
      PHOTO_4: { label: string, example: string }
      PHOTO_5: { label: string, example: string }
    }
    dris?: {
      UNIT_NAME: { label: string, exampleList: string[] },
      APPLICATION: { label: string, exampleList: string[] },
      DRI_ID: { label: string, exampleList: string[] },
      GROUP: { label: string, exampleList: string[] },
      ROOM: { label: string, exampleList: string[] },
      ENERGY_METER_SERIAL: { label: string, exampleList: string[] },
      ENERGY_METER_MODEL: { label: string, exampleList: string[] },
      THERM_MANUF: { label: string, exampleList: string[] },
      THERM_MODEL: { label: string, exampleList: string[] },
      VALVE_MANUF: { label: string, exampleList: string[] },
      VALVE_MODEL: { label: string, exampleList: string[] },
      VALVE_TYPE: { label: string, exampleList: string[] },
      BOX_MANUF: { label: string, exampleList: string[] },
      BOX_MODEL: { label: string, exampleList: string[] },
      TC_CAPACITY: { label: string, exampleList: string[] },
      INSTALLATION_TYPE: {label: string, exampleList: string[] },
      TELEMETRY_INTERVAL: { label: string, exampleList: string[] },
      PHOTO_1: { label: string, exampleList: string[] }
      PHOTO_2: { label: string, exampleList: string[] }
      PHOTO_3: { label: string, exampleList: string[] }
      PHOTO_4: { label: string, exampleList: string[] }
      PHOTO_5: { label: string, exampleList: string[] }
    }
    dmas?: {
      METER_ID: { label: string, exampleList: string[] },
      UNIT_NAME: { label: string, exampleList: string[] },
      SUPPLIER: { label: string, exampleList: string[] },
      // DRI_ID: { label: string, exampleList: string[] },
      HYDROMETER_MODEL: { label: string, exampleList: string[] },
      INSTALLATION_LOCATION: { label: string, exampleList: string[] },
      INSTALLATION_DATE: { label: string, exampleList: string[] },
      TOTAL_CAPACITY: { label: string, exampleList: string[] },
      QUANTITY_OF_RESERVOIRS: { label: string, exampleList: string[] },
    }
    units?: {
      UNIT_NAME: { label: string, example: string }
      UNIT_CODE_CELSIUS: { label: string, example: string },
      UNIT_CODE_API: { label: string, example: string },
      COUNTRY_NAME: { label: string, example: string }
      STATE_ID: { label: string, example: string }
      CITY_NAME: { label: string, example: string }
      LATLONG: { label: string, example: string }
      PRODUCTION: { label: string, example: string }
      TIMEZONE_AREA: { label: string, example: string }
      CONSTRUCTED_AREA: { label: string, example: string }
    }
    roomtypes?: {
      RTYPE_NAME: { label: string, example: string }
      TUSEMIN: { label: string, example: string }
      TUSEMAX: { label: string, example: string }
      mon: { label: string, example: string }
      tue: { label: string, example: string }
      wed: { label: string, example: string }
      thu: { label: string, example: string }
      fri: { label: string, example: string }
      sat: { label: string, example: string }
      sun: { label: string, example: string }
    }
    supervisors?: {
      USER_ID: { label: string, example: string },
      UNIT_NAME: { label: string, example: string },
    }
    invoices?: {
      UNIT_ID: { label: string, example: string }
      CONSUMER_UNIT: { label: string, example: string }
      DISTRIBUTOR_NAME: { label: string, example: string }
      ADDITIONAL_DISTRIBUTOR_INFO: { label: string, example: string }
      LOGIN: { label: string, example: string }
      PASSWORD: { label: string, example: string }
      LOGIN_EXTRA: { label: string, example: string }
      BASELINE_TEMPLATE: { label: string, example: string }
      JANUARY_PRICE: { label: string, example: string }
      JANUARY_KWH: { label: string, example: string }
      FEBRUARY_PRICE: { label: string, example: string }
      FEBRUARY_KWH: { label: string, example: string }
      MARCH_PRICE: { label: string, example: string }
      MARCH_KWH: { label: string, example: string }
      APRIL_PRICE: { label: string, example: string }
      APRIL_KWH: { label: string, example: string }
      MAY_PRICE: { label: string, example: string }
      MAY_KWH: { label: string, example: string }
      JUNE_PRICE: { label: string, example: string }
      JUNE_KWH: { label: string, example: string }
      JULLY_PRICE: { label: string, example: string }
      JULLY_KWH: { label: string, example: string }
      AUGUST_PRICE: { label: string, example: string }
      AUGUST_KWH: { label: string, example: string }
      SEPTEMBER_PRICE: { label: string, example: string }
      SEPTEMBER_KWH: { label: string, example: string }
      OCTOBER_PRICE: { label: string, example: string }
      OCTOBER_KWH: { label: string, example: string }
      NOVEMBER_PRICE: { label: string, example: string }
      NOVEMBER_KWH: { label: string, example: string }
      DECEMBER_PRICE: { label: string, example: string }
      DECEMBER_KWH: { label: string, example: string }
    }
    unified?: {
      SOLUTION_TYPE: { label: string, exampleList: string[] },
      UNIT_NAME: { label: string, exampleList: string[] },
      UNIT_ID: { label: string, exampleList: string[] },
      UNIT_CODE_CELSIUS: { label: string, exampleList: string[] },
      UNIT_CODE_API: { label: string, exampleList: string[] },
      COUNTRY: { label: string, exampleList: string[] },
      UNIT_STATUS: { label: string, exampleList: string[] },
      TIME_ZONE: { label: string, exampleList: string[] },
      CONSTRUCTED_AREA: { label: string, exampleList: string[] },
      STATE_ID: { label: string, exampleList: string[] },
      CITY_NAME: { label: string, exampleList: string[] },
      LATLONG: { label: string, exampleList: string[] },
      ADDRESS: { label: string, exampleList: string[] },
      AMOUNT_PEOPLE: { label: string, exampleList: string[] },
      ICCID: { label: string, exampleList: string[] },
      ACCESSPOINT: { label: string, exampleList: string[] },
      MODEM: { label: string, exampleList: string[] },
      MACACCESSPOINT: { label: string, exampleList: string[] },
      MACREPEATER: { label: string, exampleList: string[] },
      SIMCARD_PHOTO1: { label: string, exampleList: string[] },
      SIMCARD_PHOTO2: { label: string, exampleList: string[] },
      SIMCARD_PHOTO3: { label: string, exampleList: string[] },
      SKETCH_1: { label: string, exampleList: string[] },
      SKETCH_2: { label: string, exampleList: string[] },
      SKETCH_3: { label: string, exampleList: string[] },
      SKETCH_4: { label: string, exampleList: string[] },
      SKETCH_5: { label: string, exampleList: string[] },
      GROUP_ID: { label: string, exampleList: string[] },
      GROUP_NAME: { label: string, exampleList: string[] },
      INSTALLATION_DATE: { label: string, exampleList: string[] },
      MCHN_APPL: { label: string, exampleList: string[] },
      GROUP_TYPE: { label: string, exampleList: string[] },
      MCHN_BRAND: { label: string, exampleList: string[] },
      FLUID_TYPE: { label: string, exampleList: string[] },
      MACHINE_RATED_POWER: { label: string, exampleList: string[] },
      PHOTO_DEVGROUPS_1: { label: string, exampleList: string[] },
      PHOTO_DEVGROUPS_2: { label: string, exampleList: string[] },
      PHOTO_DEVGROUPS_3: { label: string, exampleList: string[] },
      PHOTO_DEVGROUPS_4: { label: string, exampleList: string[] },
      PHOTO_DEVGROUPS_5: { label: string, exampleList: string[] },
      DEV_AUTOM_ID: { label: string, exampleList: string[] },
      PLACEMENT: { label: string, exampleList: string[] },
      SENSORS_DUT_DUO: { label: string, exampleList: string[] },
      DAM_INSTALLATION_LOCATION: { label: string, exampleList: string[] },
      DAM_PLACEMENT: { label: string, exampleList: string[] },
      DAM_T0_POSITION: { label: string, exampleList: string[] },
      DAM_T1_POSITION: { label: string, exampleList: string[] },
      PHOTO_AUTOM_DEV_1: { label: string, exampleList: string[] },
      PHOTO_AUTOM_DEV_2: { label: string, exampleList: string[] },
      PHOTO_AUTOM_DEV_3: { label: string, exampleList: string[] },
      PHOTO_AUTOM_DEV_4: { label: string, exampleList: string[] },
      PHOTO_AUTOM_DEV_5: { label: string, exampleList: string[] },
      DUT_ID: { label: string, exampleList: string[] },
      PHOTO_DUT_1: { label: string, exampleList: string[] },
      PHOTO_DUT_2: { label: string, exampleList: string[] },
      PHOTO_DUT_3: { label: string, exampleList: string[] },
      PHOTO_DUT_4: { label: string, exampleList: string[] },
      PHOTO_DUT_5: { label: string, exampleList: string[] },
      ROOM_NAME: { label: string, exampleList: string[] },
      RTYPE_NAME: { label: string, exampleList: string[] },
      DAT_ID: { label: string, exampleList: string[] },
      AST_DESC: { label: string, exampleList: string[] },
      AST_ROLE_NAME: { label: string, exampleList: string[] },
      MCHN_MODEL: { label: string, exampleList: string[] },
      CAPACITY_PWR: { label: string, exampleList: string[] },
      // CAPACITY_UNIT: { label: string, exampleList: string[] },
      DAC_COP: { label: string, exampleList: string[] },
      MCHN_KW: { label: string, exampleList: string[] },
      EVAPORATOR_MODEL: { label: string, exampleList: string[] },
      INSUFFLATION_SPEED: { label: string, exampleList: string[] },
      COMPRESSOR_RLA: { label: string, exampleList: string[] },
      EQUIPMENT_POWER: { label: string, exampleList: string[] },
      PHOTO_ASSET_1: { label: string, exampleList: string[] },
      PHOTO_ASSET_2: { label: string, exampleList: string[] },
      PHOTO_ASSET_3: { label: string, exampleList: string[] },
      PHOTO_ASSET_4: { label: string, exampleList: string[] },
      PHOTO_ASSET_5: { label: string, exampleList: string[] },
      DEV_ID: { label: string, exampleList: string[] },
      DAC_COMIS: { label: string, exampleList: string[] },
      // AUTOM_ENABLE: { label: string, exampleList: string[] },
      P0_SENSOR: { label: string, exampleList: string[] },
      P0_POSITN: { label: string, exampleList: string[] },
      P1_SENSOR: { label: string, exampleList: string[] },
      P1_POSITN: { label: string, exampleList: string[] },
      // DAC_DESC: { label: string, exampleList: string[] },
      PHOTO_DAC_1: { label: string, exampleList: string[] },
      PHOTO_DAC_2: { label: string, exampleList: string[] },
      PHOTO_DAC_3: { label: string, exampleList: string[] },
      PHOTO_DAC_4: { label: string, exampleList: string[] },
      PHOTO_DAC_5: { label: string, exampleList: string[] },
      ELECTRIC_CIRCUIT_ID: { label: string, exampleList: string[] },
      ELECTRIC_CIRCUIT_NAME: { label: string, exampleList: string[] },
      ENERGY_DEVICES_INFO_ID: { label: string, exampleList: string[] },
      ID_MED_ENERGY: { label: string, exampleList: string[] },
      NUM_SERIE_MED_ENERGY: { label: string, exampleList: string[] },
      MODEL_MED_ENERGY: { label: string, exampleList: string[] },
      CAPACITY_TCA: { label: string, exampleList: string[] },
      INSTALLATION_ELETRICAL_TYPE: { label: string, exampleList: string[] },
      SHIPPING_INTERVAL: { label: string, exampleList: string[] },
      ROOM_VAV: { label: string, exampleList: string[] },
      THERM_MANUF: { label: string, exampleList: string[] },
      THERM_MODEL: { label: string, exampleList: string[] },
      VALVE_MANUF: { label: string, exampleList: string[] },
      VALVE_MODEL: { label: string, exampleList: string[] },
      VALVE_TYPE: { label: string, exampleList: string[] },
      BOX_MANUF: { label: string, exampleList: string[] },
      BOX_MODEL: { label: string, exampleList: string[] },
      PHOTO_DRI_1: { label: string, exampleList: string[] },
      PHOTO_DRI_2: { label: string, exampleList: string[] },
      PHOTO_DRI_3: { label: string, exampleList: string[] },
      PHOTO_DRI_4: { label: string, exampleList: string[] },
      PHOTO_DRI_5: { label: string, exampleList: string[] },
      DMA_ID: { label: string, exampleList: string[] },
      // WATER_SUPPLIER: { label: string, exampleList: string[] },
      HYDROMETER_MODEL: { label: string, exampleList: string[] },
      INSTALLATION_LOCATION: { label: string, exampleList: string[] },
      WATER_INSTALLATION_DATE: { label: string, exampleList: string[] },
      TOTAL_CAPACITY: { label: string, exampleList: string[] },
      TOTAL_RESERVOIRS: { label: string, exampleList: string[] },
      PHOTO_DMA_1: { label: string, exampleList: string[] },
      PHOTO_DMA_2: { label: string, exampleList: string[] },
      PHOTO_DMA_3: { label: string, exampleList: string[] },
      PHOTO_DMA_4: { label: string, exampleList: string[] },
      PHOTO_DMA_5: { label: string, exampleList: string[] },
      UTILITY_ID: { label: string, exampleList: string[] },
      UTILITY_NAME: { label: string, exampleList: string[] },
      INSTALLATION_DATE_UTIL: { label: string, exampleList: string[] },
      DISTRIBUTOR: { label: string, exampleList: string[] },
      MODEL: { label: string, exampleList: string[] },
      ENTRY_VOLTAGE: { label: string, exampleList: string[] },
      OUT_VOLTAGE: { label: string, exampleList: string[] },
      POT_NOMINAL: { label: string, exampleList: string[] },
      AUTON_NOMINAL: { label: string, exampleList: string[] },
      INPUT_ELECTRIC_CURRENT: { label: string, exampleList: string[] },
      OUTPUT_ELECTRIC_CURRENT: { label: string, exampleList: string[] },
      NOMINAL_BATTERY_CAPACITY: { label: string, exampleList: string[] },
      GRID_VOLTAGE: { label: string, exampleList: string[] },
      MAINS_CURRENT: { label: string, exampleList: string[] },
      ASSOCIATE_DEV: { label: string, exampleList: string[] },
      ASSOCIATE_DEV_PORT: { label: string, exampleList: string[] },
      ASSOCIATE_ASSET: { label: string, exampleList: string[] },
      FEEDBACK_DAL: { label: string, exampleList: string[] },
      PHOTO_DMT: { label: string, exampleList: string[] },
      PHOTO_DAL: { label: string, exampleList: string[] },
      PHOTO_UTILITY: { label: string, exampleList: string[] },
    }
  }>

  ['/dac/add-new-group']: (reqParams: {
    CLIENT_ID: number
    UNIT_ID: number
    GROUP_NAME: string
    DEV_AUT?: string|null
    REL_DUT_ID?: string|null
    MODEL?: string | null
    INSTALLATION_DATE?: string|null
    MCHN_APPL?: string|null
    GROUP_TYPE?: string|null
    BRAND?: string|null
    FRIGO_CAPACITY?: number|null
    FRIGO_CAPACITY_UNIT?: string|null
    FLUID_TYPE?: string|null
    RATED_POWER?: number | null
    ENVIRONMENT_ID?: number | null
    ENVIRONMENT_NAME?: string | null
    SUM_RATED_POWER_CONDENSERS?: number | null
  }, session: SessionData) => Promise<{
    GROUP_NAME: string
    GROUP_ID: number
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
  }>
  ['/clients/get-units-list']: (reqParams: {
    UNIT_ID?: number
    CLIENT_ID?: number
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    UNIT_NAME: string
    CLIENT_ID: number
    CLIENT_NAME: string
    LAT: string
    LON: string
    TARIFA_KWH: number
    CITY_ID: string
    CITY_NAME: string
    MODEL_NAME: string
    RATE_MODEL_ID: number
    STATE_ID: string
    STATE_NAME: string
    COUNTRY_NAME: string
    DISTRIBUTOR_ID: string
    ADDITIONAL_DISTRIBUTOR_INFO: string
    LOGIN: string
    CONSUMER_UNIT: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    BASELINE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_ID: number
    TIMEZONE_OFFSET: number
    SUPERVISOR_ID: string
    SUPERVISOR_NAME: string
    SUPERVISOR_SOBRENOME: string
    AMOUNT_PEOPLE: number
  }[]>
  ['/clients/get-units-list-basic']: (reqParams: {
    UNIT_IDS?: number[]
    CLIENT_IDS?: number[]
    CITY_IDS?: number[]
    STATE_IDS?: number[]
    UNIT_ID?: number
    CLIENT_ID?: number
    LIMIT?: number
    SKIP?: number
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number;
      UNIT_ID: number;
      UNIT_NAME: string;
      CITY_ID: string;
      STATE_ID: string;
      PRODUCTION: number;
      PRODUCTION_TIMESTAMP: string;
    }[]
    totalItems: number;
  }>
  ['/energy/get-analysis-list']: (reqParams: {
    unitIds?: number[]
    stateIds?: number[]
    cityIds?: string[]
    clientIds?: number[],
    page: number,
    pageSize: number,
    startDate: string,
    endDate: string,
    orderByField?: string,
    orderByType?: string,
    modelId?: number,
    insideFilters?: {
      clientIds?: number[],
      stateIds?: number[],
      cityIds?: string[],
      unitIds?: number[],
      categoryFilter?: string[]
    }
  }, session: SessionData) => Promise<{
    resume: {
      totalItems: number,
      totalCITIES: number,
      totalSTATES: number,
      procel: {
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
        g: number,
      }
    },
    unitsList?: {
      clientId: number,
      clientName: string,
      unitId: number,
      unitName: string,
      stateId: number,
      stateName: string,
      cityId: string,
      cityName: string,
      consumption?: number,
      refrigerationConsumption?: number,
      refrigerationConsumptionPercentage?: number,
      refCapacity?: number,
      totalCharged?: number,
      consumptionByArea?: number,
      refrigerationConsumptionByArea?: number,
      dataIsInvalid: boolean,
      dataIsProcessed: boolean,
      procelRanking?: number,
      procelCategory?: string,
      consumptionPreviousPercentage?: number
    }[]
  }>

  ['/energy/export-energy-analysis-list']: (reqParams: {
    unitIds?: number[]
    stateIds?: number[]
    cityIds?: string[]
    clientIds?: number[]
    categoryFilter?: string[]
    startDate: string,
    endDate: string,
    orderByField: string,
    orderByType: string,
    modelId?: number,
    checkEnergyEfficiency: boolean
    columnsToExport: string[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/energy/get-analysis-model']: (reqParams: {
    modelId: number
  }, session: SessionData) => Promise<{ID: number, NAME: string, INTERESTS_ORGANIZATION: string, USER_ID?: string, filters: string, shared: string}>

  ['/energy/get-analysis-models-list']: (reqParams: {
    general: boolean,
    name?: string,
  }, session: SessionData) => Promise<{
    ID: number,
    NAME: string,
    INTERESTS_ORGANIZATION: string,
    USER_ID?: string
    IS_HISTORIC: 0|1
  }[]>

  ['/energy/get-energy-analysis-filters']: (reqParams: {
    startDate: string,
    endDate: string,
    clients?: number[],
    states?: number[],
    cities?: string[],
    categoryFilter?: string[]
  }, session: SessionData) => Promise<{
    clients: {
      id: number,
      name: string,
    }[],
    states: {
      id: number,
      name: string,
    }[],
    cities: {
      id: string,
      name: string
    }[],
    units: {
      id: number,
      name: string,
    }[]
  }>

  ['/energy/get-energy-analysis-hist']: (reqParams: {
    startDate: string,
    endDate: string,
    filterType: string,
    startDateToCompare?: string,
    endDateToCompare?: string,
    clientIds?: number[],
    unitIds?: number[],
    cityIds?: string[],
    stateIds?: number[],
    insideFilters?: {
      clientIds?: number[],
      stateIds?: number[],
      cityIds?: string[],
      unitIds?: number[]
    }
  }, session: SessionData) => Promise<{
    current: {
      consumption: string,
      time: Date,
      totalCharged: number,
      dataIsInvalid: boolean,
      dataIsProcessed: boolean
      totalUnits: number;
    }[],
    compare: {
      consumption: string,
      time: Date,
      totalCharged: number,
      dataIsInvalid: boolean,
      dataIsProcessed: boolean
      totalUnits: number;
    }[]
    totalUnits: number;
    totalUnitsWithConstructedArea: number;
  }>

  ['/energy/get-energy-analysis-hist-filter']: (reqParams: {
    unitIds?: number[],
    cityIds?: string[],
    stateIds?: number[],
    clientIds?: number[],
    insideFilters?: {
      clientIds?: number[],
      stateIds?: number[],
      cityIds?: string[],
      unitIds?: number[]
    }
    type: string
  }, session: SessionData) => Promise<{
    months: {
      time: Date
    }[]
    years: {
      time: Date
    }[]
  }>

  ['/energy/get-energy-hist-filters']: (reqParams: {
    startDate: string,
    endDate: string,
    clientIds: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    insideFilters?: {
      clientIds: number[],
      stateIds: number[],
      cityIds: string[],
      unitIds: number[]
    }
  }, session: SessionData) => Promise<{
    clients: {
      id: number,
      name: string,
    }[],
    states: {
      id: number,
      name: string,
    }[],
    cities: {
      id: string,
      name: string
    }[],
    units: {
      id: number,
      name: string,
    }[]
  }>

  ['/energy/get-procel-insights']: (reqParams: {
    startDate: string,
    endDate: string,
    clientIds: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    procelUnitsFilter?: number[]
    insideFilters?: {
      clientIds: number[],
      stateIds: number[],
      cityIds: string[],
      unitIds: number[]
    }
  }, session: SessionData) => Promise<{
  averageConsumption: number,
  averageConsumptionPreviousMonthPercentage?: number,
  totalConsumption: number,
  totalCharged: number,
  containsProcel: boolean,
  containsAnalysisData: boolean,
  classA: {
      units: number[],
      percentage: number
  },
  classB: {
      units: number[],
      percentage: number
  },
  classC: {
      units: number[],
      percentage: number
  },
  classD: {
      units: number[],
      percentage: number
  },
  classE: {
      units: number[],
      percentage: number
  },
  classF: {
      units: number[],
      percentage: number
  },
  classG: {
      units: number[],
      percentage: number
  }
}>

['/energy/get-energy-trends']: (reqParams: {
  startDate: string,
  endDate: string,
  clientIds: number[],
  stateIds?: number[],
  cityIds?: string[],
  unitIds?: number[],
  insideFilters?: {
    clientIds: number[],
    stateIds: number[],
    cityIds: string[],
    unitIds: number[],
    categoryFilter?: string[]
  }
}, session: SessionData) => Promise<{
  trendsData: {
    time: Date,
    consumption: number,
    consumptionForecast: number,
    consumptionTarget: number,
    consumptionOverTarget: number,
    consumptionPercentage: number
  }[],
  monthlyForecast: number,
  monthlyTarget: number,
  monthlyForecastPercentage: number,
  totalConsumtionPercentage: number,
  totalConsumption: number,
  }>

  ['/clients/get-unit-info']: (reqParams: {
    unitId: number
  }, session: SessionData) => Promise<{
    CLIENT_NAME: string
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    LAT: string
    LON: string
    CITY_ID: string
    CITY_NAME: string
    STATE_ID: string
    ADDRESS: string
    PRODUCTION: boolean
    AMOUNT_PEOPLE: number
    hasEnergyInfo: boolean
    TARIFA_KWH: number
    EXTRA_DATA: string
    GA_METER: number
    TARIFA_DIEL: 0|1
    hasNess: boolean
    hasWater: boolean
    hasOxyn: boolean
    hasChiller: boolean
    hasLaager: boolean
    hasVrf: boolean
    dmaId: string
    BASELINE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_ID: number
    TIMEZONE_OFFSET: number
    CONSTRUCTED_AREA: number
    arrayChiller: {
      VARSCFG: string
      DEVICE_ID: string
      DEVICE_CODE: string
      MACHINE_NAME: string
    }[]
  }>
  ['/clients/get-units-and-meters']: (reqParams: {}, session: SessionData) => Promise<{
    units: {
      UNIT_ID: number;
      UNIT_NAME: string;
      GA_METER: number;
      CLIENT_NAME: string;
      CLIENT_ID: number;
    }[]
    meters: {
      id: number;
      organizationName: string;
      label: string;
      uid?: string;
    }[]
  }>
  ['/clients/edit-unit']: (reqParams: {
    UNIT_ID: number
    UNIT_CODE_CELSIUS?: string
    UNIT_CODE_API?: string
    CLIENT_ID?: number
    UNIT_NAME?: string
    CITY_ID?: string|null
    LAT?: string|null
    LON?: string|null
    DISABREP?: 0|1
    TARIFA_KWH?: number|null
    EXTRA_DATA?: string|null
    GA_METER?: number|null
    TARIFA_DIEL?: 0|1
    DISTRIBUTOR_ID?: number|null
    CONSUMER_UNIT?: string|null
    LOGIN?: string|null
    PASSWORD?: string|null
    LOGIN_EXTRA?: string|null
    TIMEZONE_ID?: number|null
    ADDRESS?: string|null
    PRODUCTION?: boolean|null
    PRODUCTION_TIMESTAMP?: Date|null
    RATE_MODEL_ID?: number | null
    AMOUNT_PEOPLE?: string | null
    CONSTRUCTED_AREA?: string | null
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    UNIT_NAME: string
    LAT: string
    LON: string
    CITY_ID: string
    CITY_NAME: string
    STATE_ID: string
    GA_METER: number
    TARIFA_DIEL: 0|1
  }>
  ['/clients/remove-unit']: (reqParams: { UNIT_ID: number, CLIENT_ID?: number }, session: SessionData) => Promise<string>
  ['/clients/get-groups-list']: (reqParams: {
    unitIds?: number[],
    clientIds?: number[],
  }, session: SessionData) => Promise<{
    DEV_AUT: string;
    GROUP_ID: number
    GROUP_NAME: string
    DUT_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    MCHN_APPL: string
  }[]>
  ['/get-machines-automation-info']: (reqParams: {
    CLIENT_ID?: number,
  }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      GROUP_ID: number
      GROUP_NAME: string
      DEV_AUT: string
      damIsDac: boolean
      DAM_DISABLED: number
      DUT_ID: string
      dutAutomationEnabled: boolean
      DAM_DUT_REF: string
      dacs: {
        DAC_ID: string
        automationEnabled: boolean
      }[]
      problemsFound?: string[]
    }[]
  }>
  ['/get-machine-additional-parameters']: (reqParams: {
    MACHINE_ID: number
  }, session: SessionData) => Promise<{
      ID: number
      COLUMN_NAME: string
      COLUMN_VALUE: string
    }[]
  >
  ['/clients/edit-group']: (reqParams: {
    GROUP_ID: number
    GROUP_NAME?: string
    REL_DEV_AUT?: string|null
    REL_DUT_ID?: string|null
    MODEL?: string | null
    INSTALLATION_DATE?: string|null
    GROUP_TYPE?: string|null
    BRAND?: string|null
    FRIGO_CAPACITY?: number|null
    FRIGO_CAPACITY_UNIT?: string|null
    FLUID_TYPE?: string|null
    RATED_POWER?: number|null
    MCHN_APPL?: string | null
    ENVIRONMENT_ID?: number | null
    ENVIRONMENT_NAME?: string | null
    UNIT_ID?: number
    SUM_RATED_POWER_CONDENSERS?: number|null
  }, session: SessionData) => Promise<{
    GROUP_NAME: string
    UNIT_ID: number
    CLIENT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
  }>
  ['/clients/remove-group']: (reqParams: { GROUP_ID: number, isChiller?: boolean }, session: SessionData) => Promise<string>
  ['/online-devices-overview']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    onlineDevs: number
    offlineDevs: number
  }>
  ['/clients/get-roomtypes-list']: (reqParams: { CLIENT_ID?: number, CLIENT_IDS?: number[] }, session: SessionData) => Promise<{
    rtypes: {
      RTYPE_ID: number
      RTYPE_NAME: string
      TUSEMIN: number
      TUSEMAX: number
      HUMIMAX?: number|null
      HUMIMIN?: number|null
      workPeriods: { [day: string]: string }
      workPeriodExceptions: { [day: string]: string }
      fullProg: FullProg_v4
    }[]
  }>
  ['/clients/add-new-roomtype']: (reqParams: {
    RTYPE_NAME: string
    workPeriods?: { [day: string]: string }
    TUSEMIN: number|null
    TUSEMAX: number|null
    CLIENT_ID: number
    CO2MAX?: number|null
    HUMIMAX?: number|null
    HUMIMIN?: number|null
  }, session: SessionData) => Promise<{
    RTYPE_NAME: string
    RTYPE_ID: number
    CLIENT_ID: number
    workPeriods: { [day: string]: string }
    workPeriodExceptions: { [day: string]: string }
    TUSEMIN: number
    TUSEMAX: number
  }>
  ['/clients/edit-roomtype']: (reqParams: {
    RTYPE_ID: number
    RTYPE_NAME?: string
    TUSEMIN?: number|null
    TUSEMAX?: number|null
    CO2MAX?: number|null
    HUMIMAX?: number|null
    HUMIMIN?: number|null
    workPeriods?: { [day: string]: string }
  }, session: SessionData) => Promise<{
    RTYPE_NAME: string
    RTYPE_ID: number
    CLIENT_ID: number
    workPeriods: { [day: string]: string }
    workPeriodExceptions: { [day: string]: string }
    TUSEMIN: number
    TUSEMAX: number
  }>
  ['/clients/remove-roomtype']: (reqParams: { RTYPE_ID: number }, session: SessionData) => Promise<string>
  ['/clients/add-new-asset']: (reqParams: {
    DAT_ID?: string|null
    AST_DESC: string
    INSTALLATION_LOCATION?: string | null
    AST_TYPE?: string|null
    CAPACITY_PWR?: number|null
    CAPACITY_UNIT?: string|null
    CLIENT_ID?: number|null
    FLUID_TYPE?: string|null
    GROUP_ID: number|null
    MCHN_APPL?: string|null
    MCHN_BRAND?: string|null
    MCHN_ENV?: string|null
    MCHN_KW?: number|null
    MCHN_MODEL?: string|null
    UNIT_ID: number
    INSTALLATION_DATE?: string|null
    AST_ROLE?: number|null
    DEV_ID?: string|null
    DAT_COUNT?: number|null
    COMPRESSOR_NOMINAL_CURRENT?: number|null
    EQUIPMENT_POWER?: string|null
    EVAPORATOR_MODEL_ID?: number|null
    TYPE_CFG?: string|null
    INSUFFLATION_SPEED?: number|null
    UPDATE_MACHINE_RATED_POWER?: boolean|null
    CHILLER_CARRIER_MODEL_ID?: number|null
  }, session: SessionData) => Promise<{
    info: {
      DAT_ID: string
      AST_DESC: string
      AST_TYPE: string
      CAPACITY_PWR: number
      CAPACITY_UNIT: string
      CLIENT_ID: number
      FLUID_TYPE: string
      GROUP_ID: number
      MCHN_APPL: string
      MCHN_BRAND: string
      MCHN_ENV: string
      MCHN_KW: number
      MCHN_MODEL: string
      UNIT_ID: number
      INSTALLATION_DATE: string
      AST_ROLE: number
      ASSET_ID: number
    }
  }>
  ['/clients/edit-asset']: (reqParams: {
    ASSET_ID?: number|null
    DAT_ID?: string
    AST_DESC?: string|null
    INSTALLATION_LOCATION?: string | null
    AST_TYPE?: string|null
    CAPACITY_PWR?: number|null
    CAPACITY_UNIT?: string|null
    CLIENT_ID?: number|null
    FLUID_TYPE?: string|null
    GROUP_ID?: number|null
    MCHN_APPL?: string|null
    MCHN_BRAND?: string|null
    MCHN_ENV?: string|null
    MCHN_KW?: number|null
    MCHN_MODEL?: string|null
    UNIT_ID?: number|null
    INSTALLATION_DATE?: string|null
    AST_ROLE?: number|null
    DEV_ID?: string|null
    DAT_COUNT?: number
    OLD_DEV_ID?: string|null
    DEV_CLIENT_ASSET_ID?: number|null
    DAT_INDEX?: number|null
    COMPRESSOR_NOMINAL_CURRENT?: number|null
    EQUIPMENT_POWER?: string|null
    EVAPORATOR_MODEL_ID?: number|null
    INSUFFLATION_SPEED?: number|null
    UPDATE_MACHINE_RATED_POWER?: boolean|null
    CHILLER_CARRIER_MODEL_ID?: number|null
  }, session: SessionData) => Promise<{
    info: {
      DAT_ID: string
      AST_DESC: string
      AST_TYPE: string
      CAPACITY_PWR: number
      CAPACITY_UNIT: string
      CLIENT_ID: number
      FLUID_TYPE: string
      GROUP_ID: number
      MCHN_APPL: string
      MCHN_BRAND: string
      MCHN_ENV: string
      MCHN_KW: number
      MCHN_MODEL: string
      UNIT_ID: number
      INSTALLATION_DATE: string
      AST_ROLE: number
    }
  }>
  ['/clients/get-assets-list']: (reqParams: {
    clientIds?: number[],
    stateIds?: string[],
    cityIds?: string[],
    unitIds?: number[],
    SKIP?: number,
    LIMIT?: number,
    searchTerms?: string[],
    ownershipFilter?: string,
  }, session: SessionData) => Promise<{
    list: {
      ASSET_ID: number
      DAT_ID: string
      AST_DESC: string
      INSTALLATION_LOCATION: string | null
      AST_TYPE: string
      CAPACITY_PWR: number
      CAPACITY_UNIT: string
      DEV_ID: string
      CLIENT_ID: number
      FLUID_TYPE: string
      GROUP_ID: number
      MCHN_APPL: string
      MCHN_BRAND: string
      MCHN_ENV: string
      MCHN_KW: number
      MCHN_MODEL: string
      UNIT_ID: number
      STATE_ID: string
      CITY_NAME: string
      CLIENT_NAME: string
      UNIT_NAME: string
      GROUP_NAME: string
      INSTALLATION_DATE: string
    }[]
    totalItems: number
  }>
  ['/clients/get-asset-info']: (reqParams: { ASSET_ID?: string, DAT_ID?: string, DEV_ID?: string, DAT_INDEX?: number }, session: SessionData) => Promise<{
    info: {
      ASSET_ID: number
      DAT_ID: string
      AST_DESC: string
      INSTALLATION_LOCATION: string
      AST_TYPE: string
      CAPACITY_PWR: number
      CAPACITY_UNIT: string
      CLIENT_ID: number
      FLUID_TYPE: string
      GROUP_ID: number
      MCHN_APPL: string
      MCHN_BRAND: string
      MCHN_ENV: string
      MCHN_KW: number
      MCHN_MODEL: string
      UNIT_ID: number
      STATE_ID: string
      CITY_NAME: string
      CLIENT_NAME: string
      UNIT_NAME: string
      GROUP_NAME: string
      INSTALLATION_DATE: string
      AST_ROLE: number
      AST_ROLE_NAME: string
      DAT_INDEX: number|null
      DEV_ID: string|null
      DEV_CLIENT_ASSET_ID: number|null
      TIMEZONE_ID: number
      TIMEZONE_AREA: string
      TIMEZONE_OFFSET: number
    }
    optsDescs: {
      [id: string]: string
    },
  }>
  ['/clients/remove-asset']: (reqParams: { DAT_ID?: string, ASSET_ID?: number, DEVICE_CODE?: string }, session: SessionData) => Promise<string>
  ['/clients/get-clients-list']: (reqParams: {
    INCLUDE_CITIES?: boolean
    INCLUDE_STATES?: boolean
    full?: boolean
    withManagerPermission?: boolean
    clientId?: number
    clientIds?: number[]
  }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number
      NAME: string
      PERMS_C: string
      EMAIL?: string
      PICTURE?: string
      ENABLED?: string
      clientType: ('cliente'|'fabricante'|'mantenedor'|'parceira')[]
      CNPJ?: string
      PHONE?: string
      CITIES?: string[]
      STATES?: number[]
    }[]
    dielClientId?: number
    clientTypes?: {
      [id: string]: { cod2: ('cliente'|'fabricante'|'mantenedor'|'parceira'), label: string }
    }
  }>

  ['/get-integrations-list/water-overview-v2']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    count: {
      online: number,
      offline: number
    },
  }>

  ['/energy/get-energy-list-overview-v2']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    count: {
      online: number,
      offline: number
    }
  }>

  ['/environments/get-environment-list-overview-v2']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    count: {
      unMonitored: number,
      online: number,
      offline: number
    }
  }>

  ['/environments/get-environment-list']: (reqParams: {
    CLIENT_ID?: number|null
    UNIT_ID?: number|null
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    environments: {
      ENVIRONMENT_ID: number
      ENVIRONMENT_NAME: string
      ENVIRONMENTS_ROOM_TYPES_ID: number
      DUT_CODE: string
      UNIT_ID: number
      UNIT_NAME: string
      IS_VISIBLE: number
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      COUNTRY_NAME: string
      LAT: string
      LON: string
      CLIENT_NAME: string
      CLIENT_ID: number
      RTYPE_ID: number
      RTYPE_NAME: string
      MACHINE_ID: number
    }[]
  }>

  ['/environments/delete-environment']: (reqParams: {
    ENVIRONMENT_ID: number
    CLIENT_ID?: number|null
    UNIT_ID?: number|null
  }, session: SessionData) => Promise<string>

  ['/environments/edit-environment']: (reqParams: {
    ENVIRONMENT_ID: number
    ENVIRONMENT_NAME: string
    CLIENT_ID?: number
    UNIT_ID?: number
    RTYPE_ID?: number
  }, session: SessionData) => Promise<string>

  ['/clients/get-client-info']: (reqParams: {
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    client: {
      CLIENT_ID: number
      NAME: string
      EMAIL: string
      PICTURE: string
      ENABLED: string
      PERMS_C: string
      clientType: ('cliente'|'mantenedor'|'fabricante')[]
      CNPJ: string
      PHONE: string
    }
  }>
  ['/clients/add-new-client']: (reqParams: {
    EMAIL: string
    NAME: string
    PICTURE?: string|null
    ENABLED?: '0'|'1'
    clientType?: ('cliente'|'mantenedor'|'fabricante')[]
    CNPJ?: string
    PHONE?: string
  }, session: SessionData) => Promise<{
    CLIENT_ID: number
    NAME: string
    EMAIL: string
    PICTURE: string
    ENABLED: string
    CNPJ: string
    PHONE: string
  }>
  ['/clients/edit-client']: (reqParams: {
    CLIENT_ID: number
    EMAIL?: string
    NAME?: string
    PICTURE?: string|null
    ENABLED?: '0'|'1'
    clientType?: ('cliente'|'mantenedor'|'fabricante')[]
    CNPJ?: string
    PHONE?: string
  }, session: SessionData) => Promise<{
    CLIENT_ID: number
    NAME: string
    EMAIL: string
    PICTURE: string
    ENABLED: string
    CNPJ: string
    PHONE: string
  }>
  ['/clients/remove-client']: (reqParams: { clientId: number, keepDevsData: boolean }, session: SessionData) => Promise<string>

  ['/dac/edit-notification-request']: (reqParams: {
    NOTIF_ID: number
    COND_VAR: string
    COND_OP: string
    COND_PARS?: string | null
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    CLIENT_ID?: number
    NAME: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    NOTIF_DESTS: string[]
  }, session: SessionData) => Promise<string>
  ['/dac/add-notification-request']: (reqParams: {
    COND_VAR: string
    COND_OP: string
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    CLIENT_ID: number
    NAME: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    COND_PARS?: string | null
    NOTIF_DESTS: string[]
    ENERGY_CARDS?: {
      COND_OP: string
      COND_VAL: string
      DAYS: string
      SCHEDULES_LIST: string
      INSTANT: boolean
    }[]
  }, session: SessionData) => Promise<{ id: number }>
  ['/dac/list-notification-requests']: (reqParams: {
    COND_VAR?: string,
    clientIds?: number[]
    unitIds?: number[]
    typeIds?: number[]
    subtypeIds?: number[]
    destinataryIds?: string[]
    searchTerms?: string[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    id: number
    name: string
    condition: string
    value: string
    dests: string[]
    filter: string
    clientId: number
    owner: string
    clientName: string
  }[]>
  ['/dac/get-notification-request']: (reqParams: {
    notifId: number
    clientId?: number
  }, session: SessionData) => Promise<{
    NOTIF_ID: number
    NAME: string
    FILT_DEVS: string
    COND_VAR: string
    COND_OP: string
    COND_VAL: string
    COND_SECONDARY_VAL: string
    NOTIF_DESTS: string[]
    NOTIF_MSG: string
    CLIENT_ID: number
    FILT_TYPE: string
    FILT_IDS: number[] | string[]
    COND_PARS: string
  }>
  ['/dac/remove-notification-request']: (reqParams: {
    id: number
    clientId?: number
  }, session: SessionData) => Promise<string>
  ['/dac/notifications-options']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<{
    notifTypes: {
      id: string,
      name: string,
      ops: { label: string, value: string, unit: string, unit2: string }[],
      type: string
    }[],
    destTypes: { label: string, value: string}[],
    frequencyOptions: { label: string, value: 'NONE'|'DAY'|'WEEK'|'MONTH' }[],
  }>

  ['/energy/add-notification-request']: (reqParams: {
    COND_VAR: string
    COND_OP: string
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    CLIENT_ID: number
    NAME: string
    NOTIF_DESTS: string[]
    ENERGY_CARDS?: {
      condOper: string,
      limiarInput: string,
      allDays: boolean,
      selectedDays: {
        mon: boolean,
        tue: boolean,
        wed: boolean,
        thu: boolean,
        fri: boolean,
        sat: boolean,
        sun: boolean,
      },
      schedulesList: {start: string, end: string}[]
      allHours: boolean,
      instant: boolean,
      endOfDay: boolean,
    }[],
  }, session: SessionData) => Promise<{ id: number }>
  ['/energy/edit-notification-request']: (reqParams: {
    NOTIF_ID: number
    COND_VAR: string
    COND_OP: string
    FILT_TYPE: null|string
    FILT_IDS: null|(string[])|(number[])
    CLIENT_ID?: number
    NAME: string
    NOTIF_DESTS: string[]
    ENERGY_CARDS?: {
      condOper: string,
      limiarInput: string,
      allDays: boolean,
      selectedDays: {
        mon: boolean,
        tue: boolean,
        wed: boolean,
        thu: boolean,
        fri: boolean,
        sat: boolean,
        sun: boolean,
      },
      schedulesList: {start: string, end: string}[]
      allHours: boolean,
      instant: boolean,
      endOfDay: boolean,
    }[],
  }, session: SessionData) => Promise<string>

  ['/get-holidays-list']: (reqParams: {
  }, session: SessionData) => Promise<{
    list: {
      DAT_FER: string
      DESC_FER: string
    }[]
  }>

  ['/dac/get-cities-list']: (reqParams: {
    stateId?: string,
    clientId?: number,
    clientIds?: number[],
  }, session: SessionData) => Promise<{
    list: {
      id: string
      name: string
      country: string
      state: string
      stateId: number
      stateFullName: string
      lat: string
      lon: string
    }[]
  }>
  ['/dac/search-city-info']: (reqParams: {
    id: string
    state?: string
  }, session: SessionData) => Promise<{
    list: {
      CITY_ID: string,
      COUNTRY_NAME: string,
      STATE_ID: string,
      NAME: string,
      LAT: number,
      LONG: number
    }[]
  }>
  ['/dac/add-new-city']: (reqParams: {
    CITY_ID: string
    NAME: string
    COUNTRY_NAME: string
    COUNTRY_LAT: string
    COUNTRY_LON: string
    STATE_NAME: string
    STATE_CODE: string
    LAT: string
    LON: string
    STATE_LAT: string
    STATE_LON: string
  }, session: SessionData) => Promise<string>
  ['/dac/get-states-list']: (reqParams: {
    clientId?: number
    clientIds?: number[]
    full?: boolean
  }, session: SessionData) => Promise<{
    list: {
      id: string
      name: string
      fullName: string
      lat: string
      lon: string
      countryId: number
    }[]
  }>
  ['/dac/get-countries-list']: (reqParams: {
    clientId?: number
    clientIds?: number[]
    full?: boolean
  }, session: SessionData) => Promise<{
    list: {
      id: number
      name: string
      lat: string
      lon: string
    }[]
  }>
  ['/dac/remove-city']: (reqParams: { cityId: string }, session: SessionData) => Promise<string>
  ['/dac/edit-city']: (reqParams: { cityId: string, LAT?: string, LON?: string, NAME?: string }, session: SessionData) => Promise<string>

  ['/dam/clear-fault-daminop']: (reqParams: { damId: string }, session: SessionData) => Promise<{
    DAM_ID: string
    damInop: boolean
  }>

  ['/unit/upload-ground-plan']: (reqParams: {
    UNIT_ID: string,
    NAME_GP: string,
    FILE_NAME: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<number>

  ['/unit/set-points-ground-plan']: (reqParams: {
    GROUNDPLAN_ID: number,
    UNIT_ID: number,
    POINTS: {
      DUT_ID: number,
      x: string,
      y: string
    }[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/unit/list-devs-unit']: (reqParams: {
    UNIT_ID: number,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    DEV_ID: string
    DUT_ID: number
    ROOM_NAME: string
    HUMIMAX: number
    HUMIMIN: number
    TUSEMAX: number
    TUSEMIN: number
    CO2MAX: number
    ENVIRONMENT_ID: number
    TEMPERATURE?: number
    TEMPERATURE_1?: number
    HUMIDITY?: number
    eCO2?: number
    isDutQA?: boolean
  }[]>

  ['/unit/get-ground-plans']: (reqParams: {
    UNIT_ID: number,
    PARAMS?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    UNIT_ID: number,
    GROUNDPLAN_ID: number,
    NAME_GP: string,
    IMAGE: string,
    POINTS?: {
      POINT_ID: number,
      DUT_ID: number,
      POINT_X: string,
      POINT_Y: string,
      DEV_ID: string
      ROOM_NAME: string
      HUMIMAX: number
      HUMIMIN: number
      TUSEMAX: number
      TUSEMIN: number
      CO2MAX: number
      ENVIRONMENT_ID: number
      TEMPERATURE?: number
      TEMPERATURE_1?: number
      HUMIDITY?: number
      eCO2?: number
      ISVISIBLE: number
    }[]
  }[]>

  ['/unit/update-ground-plan']: (reqParams: {
    GROUNDPLAN_ID: number,
    UNIT_ID: number,
    NAME_GP?: string,
    POINTS?: {
      POINT_ID?: number,
      DUT_ID: number,
      x: string,
      y: string
    }[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/unit/delete-ground-plan']: (reqParams: { GROUND_PLAN_IDS: number[], UNIT_ID: number}, session: SessionData) => Promise<string>

  ['/get-dacs-and-assets-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[],
    stateIds?: string[],
    cityIds?: string[],
    unitIds?: number[],
    groupIds?: number[],
    healthIndexes?: number[],
    status?: string[],
    SKIP?: number,
    LIMIT?: number,
    searchTerms?: string[],
    searchMachine?: string,
    ownershipFilter?: string,
    orderByProp?: string
    orderByDesc?: boolean
  }, session: SessionData) => Promise<{
    list: {
      DAC_ID?: string
      VAV_ID?: string
      DUT_DUO_ID?: string
      DAT_ID?: string
      CLIENT_ID: number
      UNIT_ID: number
      GROUP_ID: number
      STATE_ID: string
      CITY_NAME: string
      CLIENT_NAME: string
      UNIT_NAME: string
      GROUP_NAME: string
      H_INDEX?: number
      H_DESC?: string
      AST_DESC?: string
      ASSET_ID?: number
      DAC_COMIS?: string
      status?: string
      lastCommTs?: string
      Lcmp?: number
      TIMEZONE_ID?: number
      TIMEZONE_AREA?: string
      TIMEZONE_OFFSET?: number
    }[]
    totalItems: number
  }>

  ['/dac/get-dacs-list']: (reqParams: {
    dacId?: string,
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    groupIds?: number[],
    SKIP?: number,
    LIMIT?: number,
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    includeSensorInfo?: boolean,
    includeHealthDesc?: boolean,
    includeCapacityKW?: boolean,
    includeConsumption?: boolean,
    includeLastMeasures?: boolean,
    dateStart?: string,
    dateEnd?: string,
    INCLUDE_INSTALLATION_UNIT?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      DAC_ID: string
      bt_id: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      COUNTRY_NAME: string
      GROUP_ID: number
      GROUP_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      DAC_NAME: string
      DAC_APPL: string
      DAC_TYPE: string
      DAC_ENV: string
      LAT: string
      LON: string
      H_INDEX: number
      H_DATE: string
      H_DESC?: string
      P_CAUSES?: string
      CLIENT_NAME: string
      CLIENT_ID: number
      DAC_COMIS?: string
      FLUID_TYPE?: string
      P0_POSITN?: string
      P0_SENSOR?: string
      P1_POSITN?: string
      P1_SENSOR?: string
      P0_MULT?: number
      P0_OFST?: number
      P1_MULT?: number
      P1_OFST?: number
      DAC_KW?: number
      TARIFA_KWH?: number
      capacityKW?: number
      status: string
      lastCommTs: string
      Lcmp: number
      Tamb?: number
      Tsuc?: number
      Tliq?: number
      P0Raw?: number
      P1Raw?: number
      CONSUMPTION?: {
        DAT_REPORT: string;
        DAY_HOURS_ON: number;
        DAY_HOURS_OFF: number;
        DAY_NUM_DEPARTS: number;
        meanT: number;
        maxT: number;
        minT: number;
      }[]
      automationEnabled: boolean
      HEAT_EXCHANGER_ID: number
    }[]
    totalItems: number
  }>
  ['/dac/get-dacs-list-by-unit']: (reqParams: {
    dacId?: string,
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    cityId?: string,
    unitId?: number,
    groupId?: number,
    groupIds?: number[],
    SKIP?: number,
    LIMIT?: number,
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    includeSensorInfo?: boolean,
    includeHealthDesc?: boolean,
    includeCapacityKW?: boolean,
    includeConsumption?: boolean,
    dateStart?: string,
    dateEnd?: string,
  }, session: SessionData) => Promise<{
    units: {
      UNIT_ID: number,
      dacs: {
        DAC_ID: string
        bt_id: string
        CITY_ID: string
        CITY_NAME: string
        STATE_ID: string
        GROUP_ID: number
        GROUP_NAME: string
        UNIT_ID: number
        UNIT_NAME: string
        DAC_NAME: string
        LAT: string
        LON: string
        H_INDEX: number
        H_DESC?: string
        P_CAUSES?: string
        CLIENT_NAME?: string
        CLIENT_ID?: number
        DAC_COMIS?: string
        FLUID_TYPE?: string
        P0_POSITN?: string
        P0_SENSOR?: string
        P1_POSITN?: string
        P1_SENSOR?: string
        P0_MULT?: number
        P0_OFST?: number
        P1_MULT?: number
        P1_OFST?: number
        DAC_KW?: number
        capacityKW?: number
        status: string
        automationEnabled: boolean
      }[]
    }[]
    totalItems: number
  }>

  ['/create-model-rate']: (reqParams: {
    CLIENT_ID: number,
    MODEL_NAME: string
    RATEMODALITY_ID: number
    SUBGROUP_ID: number
    DISTRIBUTOR_ID: number
   }, session: SessionData) => Promise<string>
 ['/update-model-rate']: (reqParams: {
    MODEL_ID: number,
    MODEL_NAME?: string,
    RATEMODALITY_ID?: number,
    SUBGROUP_ID?: number,
    DISTRIBUTOR_ID?: number
  }, session: SessionData) => Promise<string>
  ['/get-model-rates']: (reqParams: { CLIENT_ID: number }, session: SessionData) => Promise<
  {
    modelName: string,
    modelId: number,
    distributorId: number,
    subGroupId: number,
    subGroupName: string,
    rateGroupId: number,
    groupName: string,
    rateModalityId: number,
    rateModalityName: string,
    distributorTag: string,
    distributorLabel: string,
    rateCicles: {
      CICLE_ID: number
      MODEL_ID: number
      START_CICLE_DATE : string
      END_CICLE_DATE: string
      PIS: number
      COFINS: number
      VIGENCYCICLE: boolean
      ICMS: number
      CONVENTIONALRATE_PARAMETERS?: {
        RATE: string
        CONVENTIONALRATE_ID: number,
      }
      WHITERATE_PARAMETERS?: {
        WHITERATE_ID: number,
        RATE_PONTA: string,
        RATE_OUTPONTA: string,
        START_PONTA: string,
        END_PONTA: string,
        FIRST_MID_RATE: string,
        START_FIRST_MID_RATE: string,
        END_FIRST_MID_RATE: string,
        LAST_MID_RATE?: string,
        START_LAST_MID_RATE: string,
        END_LAST_MID_RATE: string,
      },
    }[]
  }[]>
  ['/get-rate-cicles']: (reqParams: { MODEL_ID: number }, session: SessionData) => Promise<
  {
    CICLE_ID: number
    MODEL_ID: number
    START_CICLE_DATE : string
    END_CICLE_DATE: string
    PIS: number
    COFINS: number
    ICMS: number
    VIGENCYCICLE: boolean
    CONVENTIONALRATE_PARAMETERS?: {
      RATE: string
    }
    WHITERATE_PARAMETERS?: {
      RATE_PONTA: string,
      RATE_OUTPONTA: string,
      START_PONTA: string,
      END_PONTA: string,
      FIRST_MID_RATE: string,
      START_FIRST_MID_RATE: string,
      END_FIRST_MID_RATE: string,
      LAST_MID_RATE?: string,
      START_LAST_MID_RATE: string,
      END_LAST_MID_RATE: string,
    }
  }[]>
  ['/load-model-options']: (reqParams: { clientId: number }, session: SessionData) => Promise<{
    rateModalities: {
      name: string,
      value: number,
    }[],
    rateGroups: {
      name: string,
      value: number,
    }[],
    rateSubGroups: {
      name: string,
      value: number,
      groupId: number,
    }[],
    distributors: {
      name: string,
      value: number,
    }[],
  }>
  ['/get-rate-cicle']: (reqParams: { CICLE_ID: number }, session: SessionData) => Promise<
  {
    MODEL_ID: number
    START_CICLE_DATE : string
    END_CICLE_DATE: string
    PIS: number
    COFINS: number
    ICMS: number
    VIGENCYCICLE: boolean
    CONVENTIONALRATE_PARAMETERS?: {
      RATE: string
    }
    WHITERATE_PARAMETERS?: {
      RATE_PONTA: string,
      RATE_OUTPONTA: string,
      START_PONTA: string,
      END_PONTA: string,
      FIRST_MID_RATE: string,
      START_FIRST_MID_RATE: string,
      END_FIRST_MID_RATE: string,
      LAST_MID_RATE?: string,
      START_LAST_MID_RATE: string,
      END_LAST_MID_RATE: string,
    }
  }>
  ['/create-rate-cicle']: (reqParams: {
    MODEL_ID: number
    START_CICLE_DATE : string
    END_CICLE_DATE?: string
    PIS: number
    COFINS: number
    ICMS: number
    CONVENTIONALRATE_PARAMETERS?: {
      RATE: string,
    }
    WHITERATE_PARAMETERS?: {
      RATE_PONTA: string,
      RATE_OUTPONTA: string,
      START_PONTA: string,
      END_PONTA: string,
      FIRST_MID_RATE: string,
      START_FIRST_MID_RATE: string,
      END_FIRST_MID_RATE: string,
      LAST_MID_RATE: string,
      START_LAST_MID_RATE: string,
      END_LAST_MID_RATE: string,
    }
  }, session: SessionData) => Promise<string>
  ['/update-rate-cicle']: (reqParams: {
    CICLE_ID: number,
    MODEL_ID?: number,
    START_CICLE_DATE?: string
    END_CICLE_DATE?: string
    PIS?: number
    COFINS?: number
    ICMS?: number
    CONVENTIONALRATE_PARAMETERS?: {
      RATE: string,
    }
    WHITERATE_PARAMETERS?: {
      RATE_PONTA?: string,
      RATE_OUTPONTA?: string,
      START_PONTA?: string,
      END_PONTA?: string,
      FIRST_MID_RATE?: string,
      START_FIRST_MID_RATE?: string,
      END_FIRST_MID_RATE?: string,
      LAST_MID_RATE?: string,
      START_LAST_MID_RATE?: string,
      END_LAST_MID_RATE?: string,
    }
  }, session: SessionData) => Promise<string>
  ['/delete-rate-cicle']: (reqParams: { CICLE_ID: number }, session: SessionData) => Promise<string>
  ['/delete-model-rate']: (reqParams: { MODEL_ID: number }, session: SessionData) => Promise<string>

  ['/get-timezones-list']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      id: number
      area: string
    }[];
  }>
  ['/timezone/set-posix']: (reqParams: { dateInitial: string, dateFinal: string, hourInitial: string, hourFinal: string, areas: number[] }, session: SessionData) => Promise<string>

  ['/get-timezones-list-with-offset']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      id: number
      area: string
      offset: number
    }[];
  }>

  ['/unit/get-list-analyse-machines']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    groupIds: number[],
    machinesTypes?: string[],
    operation_modes?: string[],
    health?: number[],
    status?: string[],
    offset: number
    ordered?: string
    stateDev?: string[],
    typeOrdered?: string,
    onlyAut?: boolean,
    tempAmb?: string[],
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    CLIENT_ID: number;
    CLIENT_NAME: string;
    UNIT_ID: number;
    UNIT_NAME: string;
    STATE_ID: number;
    STATE_NAME: string;
    CITY_ID: string;
    CITY_NAME: string;
    MACHINE_ID: number;
    MACHINE_NAME: string;
    DEV_AUT: string;
    LAST_PROG: string;
    MACHINE_TYPE: string;
    MCHN_BRAND: string;
    RATED_POWER: number;
    ECO_CFG: string;
    ENABLE_ECO: number
    SETPOINT: number;
    MODE: string;
    TUSEMAX: number;
    TUSEMIN: number;
    STATE: string;
    CAPACITY_PWR: number;
    CAPACITY_UNIT: string;
    MACHINE_KW: number;
    MODEL: string;
    AST_ROLE_NAME: string;
    TOTAL_CAPACITY_CONDENSER: number;
    TOTAL_DEV_COUNT: number;
    TEMPERATURE: number;
    TEMPERATURE1: number;
    STATE_CONN: string;
    DUT_MULT_SCHEDULE_DAYS: {
      sun: boolean;
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
      sat: boolean;
    },
    ASSETS: {
      ASSET_ID: number;
      MACHINE_ID: number,
      ASSET_NAME: string,
      DAT_CODE: string,
      DEVICE_CODE: string,
      CAPACITY_PWR: number,
      CAPACITY_UNIT: string,
      MACHINE_KW: number,
      H_INDEX: number,
      BRAND: string,
      STATE_CONN: string,
      STATE: string,
      MODEL: string,
      ASSET_TYPE: string,
      AST_ROLE_NAME: string;
    }[];
  }[]>

  ['/machines/export-machines-analysis-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    groupIds?: number[],
    machinesTypes?: string[],
    operation_modes?: string[],
    health?: number[],
    status?: string[],
    ordered?: string
    stateDev?: string[],
    typeOrdered?: string,
    onlyAut?: boolean,
    tempAmb?: string[],
    columnsToExport: string[],
    haveProg: boolean
    offset?: number;
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/unit/get-total-analyse-machines']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    groupIds: number[],
    machinesTypes?: string[],
    operation_modes?: string[],
    health?: number[],
    status?: string[],
    searchMachine?: string,
    onlyAut?: boolean,
    stateDev?: string[],
    tempAmb?: string[],
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    TOTAL_CAPACITY_PWR: number
    TOTAL_MACHINE_KW: number
    TOTAL_ASSETS: number
    TOTAL_CITY: number
    TOTAL_UNITS: number
    TOTAL_STATE: number
    TOTAL_MACHINES: number
    TOTAL_H_INDEX100: number
    TOTAL_H_INDEX50: number
    TOTAL_H_INDEX75: number
    TOTAL_H_INDEX25: number
    TOTAL_H_INDEX2: number
    TOTAL_H_INDEX4: number
    TOTAL_H_INDEX_NULL: number
    TOTAL_ONLINE: number
    TOTAL_OFFLINE: number
    TOTAL_LATE: number
  }>

  ['/unit/get-filters-analyse-machines']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[],
    stateIds?: number[],
    cityIds?: string[],
    unitIds?: number[],
    groupIds?: number[],
    healthIndexes?: number[],
    searchMachine?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    CLIENTS: {
      CLIENT_NAME: string,
      CLIENT_ID: number,
    }[],
    UNITS: {
      UNIT_NAME: string,
      UNIT_ID: number,
    }[]
    STATES: {
      STATE_ID: string,
      STATE_NAME: string,
    }[];
    CITIES: {
      CITY_ID: string,
      CITY_NAME: string,
    }[];
    MACHINES: {
      MACHINE_ID: number,
      MACHINE_NAME: string,
    }[];
    MACHINES_TYPES?: {
      ID: string,
      MACHINE_TYPE: string
    }[],
    MACHINES_BRANDS?: string[],
    MODELS?: string[],
    STATE_DEV?: string[]
    OPERATION_MODES?: string[]
  }>
  ['/get-timezone-offset-by-devId']: (reqParams: { devId: string }, session: SessionData) => Promise<number>

  ['/get-units-list-page']: (reqParams: {
    cityIds?: string[];
    stateIds?: string[];
    clientIds?: number[];
    unitIds?: number[];
    SKIP?: number,
    LIMIT?: number,
    status?: string,
    startOperation?: string,
    endOperation?: string,
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      UNIT_ID: number
      UNIT_NAME: string
      UNIT_CODE_CELSIUS: string
      UNIT_CODE_API: string
      CITY_NAME: string
      STATE_ID: string
      STATE_ID_KEY: number
      CLIENT_NAME: string
      CLIENT_ID: number
      COUNTRY_NAME: string
      TOTAL_CHARGES: number | null
      TOTAL_MEASURED: number | null
      PRODUCTION_TIMESTAMP: string | null
      PRODUCTION: number | null
      dmaId: string
      chillers: {
        VARSCFG: string
        DEVICE_ID: string
        DEVICE_CODE: string
        MACHINE_NAME: string
      }[],
      dacs: {
        DEV_ID: string
        GROUP_NAME: string
        H_INDEX: number
        H_DESC: string
        insufDutId?: string
        GROUP_ID?: number
        DAT_ID?: string
        DEV_AUTO?: string
        status?: string | null
        H_DATE: string
      }[]
      dams: {
        DEV_ID: string
        groupName: string
        autMode: string
        autState: string
      }[]
      duts: {
        DEV_ID: string
        ROOM_NAME: string
        ISVISIBLE: number | null
        Temperature: number
        eCO2: number
        temprtAlert: 'low'|'high'|'good'|null
        PLACEMENT: 'AMB'|'INS'|'DUO'
        isAuto?: boolean
        status?: string | null
        co2Max?: number
      }[]
      vavs: {
        DEV_ID: string,
        GROUP_NAME?: string,
        GROUP_ID?: number,
        ISVISIBLE: number | null,
        ROOM_NAME: string,
        Temperature?: number,
        isAuto?: boolean
        temprtAlert: 'low'|'high'|'good'|null,
        status?: string | null,
      }[]
      nobreaks: {
        DAT_CODE: string,
        DMT_CODE: string,
        NOMINAL_POTENTIAL: number,
        NOBREAK_NAME: string,
        NOMINAL_BATERY_LIFE: number,
        INPUT_VOLTAGE: number,
        OUTPUT_VOLTAGE: number,
        NOBREAK_ID: number,
        STATUS: string | null,
        AVERAGEDUR: string | null,
        AUTON: string | null,
        CONNECTION: string | null,
      }[]
      illumination: {
        ID: number,
        NAME: string,
        UNIT_ID: number,
        GRID_VOLTAGE: number,
        GRID_CURRENT: number,
        FEEDBACK: number,
        CONNECTION: string,
        STATUS: string,
        DEVICE_CODE: string
      }[]
      automation: string[]
      machineWithoutDevices: {
        MACHINE_NAME: string
        MACHINE_ID: number
        DEV_AUTO?: string
      }[]
    }[]
    totalItems: number
  }>
  ['/get-environments-list-page']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    rtypeId?: number,
    SKIP?: number,
    LIMIT?: number,
    temprtAlerts?: string[],
    status?: string[],
    searchText?: string,
    searchTerms?: string[],
    searchEnvironment?: string,
    ownershipFilter?: string,
    orderByProp?: string,
    orderByDesc?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      bt_id?: string
      CITY_ID?: string
      CITY_NAME?: string
      STATE_ID?: string
      ROOM_NAME?: string
      PLACEMENT?: 'AMB'|'INS'|'DUO'
      UNIT_ID?: number
      UNIT_NAME?: string
      LAT?: string
      LON?: string
      CLIENT_NAME?: string
      CLIENT_ID?: number
      RTYPE_ID?: number
      RTYPE_NAME?: string
      VARS?: string
      status?: string
      lastCommTs?: string
      Temperature?: number
      Temperature_1?: number
      Humidity?: number
      ISVISIBLE?: number
      eCO2?: number
      TVOC?: number
      Mode?: string
      State?: string
      automationEnabled?: boolean
      MCHN_BRAND?: string
      MCHN_MODEL?: string
      TUSEMIN?: number
      TUSEMAX?: number
      temprtAlert: 'low'|'high'|'good'|null
      tpstats?: { med: number, max: number, min: number }
      CO2MAX?: number
      CURRFW_VERS?: string
    }[]
    totalItems: number
  }>

  ['/clients/get-units-with-energy-device']: (reqParams: {
    clientIds?: number[],
    unitIds?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      UNIT_ID: number
      UNIT_NAME: string
      devices: {
        ID: string,
        NAME: string,
      }[]
    }[]
  }>

  ['/get-dams-faults']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
  }, session: SessionData) => Promise<{
    list: {
      DAM_ID: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      groupIds: number[]
      groupNames: string[]
      UNIT_ID: number
      UNIT_NAME: string
      CLIENT_NAME: string
      CLIENT_ID: number
      status: string,
      fdetected: {
        [id: string]: {
          id: string
          faultName: string
          lastRiseTS: number
          firstRiseTS: number
        }
      }
    }[]
  }>
  ['/dac/get-dac-usage']: (reqParams: {
    DAC_ID: string
  }, session: SessionData) => Promise<{
    info: {
      DAC_ID: string
      CLIENT_ID: number
      DAC_APPL: string
      MEAN_USE: string
      usageHistory: { DAY_HOURS_ON: number, DAT_REPORT: string }[]
    }
  }>
  ['/get-dev-full-info']: (reqParams: { DEV_ID: string }, session: SessionData) => Promise<{
    info: {
      DEV_ID: string,
      CLIENT_ID: number,
      UNIT_ID: number,
      UNIT_NAME: string,
      TIMEZONE_AREA: string,
      TIMEZONE_OFFSET: number,
      CLIENT_NAME: string,
      GROUP_ID: number,
      GROUP_NAME: string,
      BT_ID: string,
      STATE_ID: string,
      CITY_NAME: string,
      DAT_BEGMON: string,
      DAT_BEGAUT: string,
      status: string,
      lastMessageTS: string,
      LTE_NETWORK: string,
      LTE_RSRP: number,
      ASSET_ID: number,
      isDutDuo: boolean,
      DEVICE_ID: number,
    },
    dac?: {
      DAC_NAME: string,
      DAC_DESC: string,
      DAC_MODEL: string,
      CAPACITY_UNIT: string,
      CAPACITY_PWR: number,
      DAC_COP: number,
      DAC_KW: number,
      FLUID_TYPE: string,
      GROUP_ID: number,
      DAC_APPL: string,
      DAC_TYPE: string,
      DAC_ENV: string,
      DAC_MODIF: string,
      DAC_COMIS: string,
      DAC_BRAND: string,
      HEAT_EXCHANGER_ID: number,
      GROUP_NAME: string,
      T0_T1_T2: string,
      P0_POSITN: string,
      P0_SENSOR: string,
      P1_POSITN: string,
      P1_SENSOR: string,
      P0_MULT: number,
      P0_OFST: number,
      P1_MULT: number,
      P1_OFST: number,
      P0_MULT_QUAD: number
      P0_MULT_LIN: number
      P1_MULT_QUAD: number
      P1_MULT_LIN: number
      REL_DUT_ID: string,
      P0Psuc: boolean,
      P1Psuc: boolean,
      P0Pliq: boolean,
      P1Pliq: boolean,
      hasAutomation: boolean,
      SELECTED_L1_SIM: string,
      EQUIPMENT_POWER: string,
      COMPRESSOR_NOMINAL_CURRENT: number,
      AST_DESC: string,
      AST_ROLE: number,
      AST_ROLE_NAME: string,
      EVAPORATOR_MODEL: string,
      EVAPORATOR_MODEL_ID: number,
      INSUFFLATION_SPEED: number,
    },
    dam?: {
      REL_DUT_ID: string,
      ENABLE_ECO: 0|1|2,
      ENABLE_ECO_LOCAL: 0|1,
      ECO_CFG: string,
      ECO_OFST_START: number,
      ECO_OFST_END: number,
      ECO_INT_TIME: number,
      FW_MODE: string,
      DESIREDPROG: string,
      LASTPROG: string,
      DAM_DISABLED: 0|1,
      FU_NOM: number,
      groups: {
        GROUP_ID: number;
        GROUP_NAME: string;
      }[],
      dam_mode: string,
      supportsVentEnd: boolean,
      SCHEDULE_START_BEHAVIOR: string
      SETPOINT: number
      LTC: number
      LTI: number
      UPPER_HYSTERESIS: number
      LOWER_HYSTERESIS: number
      SELF_REFERENCE?: boolean|null
      MINIMUM_TEMPERATURE?: number|null
      MAXIMUM_TEMPERATURE?: number|null
      SETPOINT_ECO_REAL_TIME?: number|null
      CAN_SELF_REFERENCE?: boolean|null
      EXT_THERM_CFG: string|null
      supportsExtTherm: boolean
      INSTALLATION_LOCATION?: string|null
      PLACEMENT?: 'RETURN'|'DUO'|null
      T0_POSITION?: 'RETURN'|'INSUFFLATION'|null
      T1_POSITION?: 'RETURN'|'INSUFFLATION'|null
    },
    dut?: {
      ROOM_NAME: string,
      PLACEMENT: 'AMB'|'INS'|'DUO',
      VARS: string,
      TUSEMAX: number,
      TUSEMIN: number,
      HUMIMAX?: number,
      HUMIMIN?: number,
      CO2MAX: number,
      workPeriods: { [day: string]: string },
      workPeriodExceptions: { [day: string]: string },
      TEMPERATURE_OFFSET: number,
      SENSOR_AUTOM: number,
      ENVIRONMENT_ID: number,
      operation_mode?: number,
      APPLICATION?: string,
    },
    dut_aut?: {
      TSETPOINT: number,
      RESENDPER: number,
      LTCRIT: number,
      DESIREDPROG: string,
      LASTPROG: string,
      CTRLOPER: ControlMode,
      PORTCFG: 'IR'|'RELAY',
      DUTAUT_DISABLED: 0|1,
      MCHN_MODEL: string,
      MCHN_BRAND: string,
      FU_NOM: number,
      groups: {
        GROUP_ID: number;
        GROUP_NAME: string;
      }[],
      TEMPERATURE_OFFSET: number,
      LTINF: number,
      UPPER_HYSTERESIS: number,
      LOWER_HYSTERESIS: number,
      COMPATIBLE_MODES: string[],
      IS_ECO_2_WITH_HYSTERESIS: boolean,
      SCHEDULE_START_BEHAVIOR: string,
      SCHEDULE_END_BEHAVIOR: string,
      FORCED_BEHAVIOR: string
    },
    dri?: {
      varsCfg: {
        application?: string
        varsList: {
          name: string,
          address?: {
            protocol?: string,
          },
          value?: string,
        }[]
      },
      automationCfg: {
        AUTOMATION_INTERVAL?: number
      },
      ecoCfg?: {
        DUT_ID: string,
        TUSEMAX?: number,
        TUSEMIN?: number,
        ENABLE_ECO: number,
        ECO_CFG: string,
        ECO_OFST_START: number,
        ECO_OFST_END: number,
        ECO_INT_TIME: number,
        DAT_BEGAUT: string,
      },
      vavCfg?: {
        VAV_ID: string,
        THERM_MANUF?: string,
        THERM_MODEL?: string,
        VALVE_MANUF?: string,
        VALVE_MODEL?: string,
        VALVE_TYPE?: string,
        BOX_MANUF?: string,
        BOX_MODEL?: string,
        ROOM_NAME?: string,
        RTYPE_ID?: number,
        ROOM_TYPE_NAME?: string,
        TUSEMIN?: number,
        TUSEMAX?: number,
      },
      fancoilCfg?: {
        FANCOIL_ID: string
        THERM_MANUF: string
        THERM_MODEL: string
        THERM_T_MIN: number
        THERM_T_MAX: number
        VALVE_MANUF: string
        VALVE_MODEL: string
        VALVE_TYPE?: string,
        FANCOIL_MANUF: string
        FANCOIL_MODEL: string
        ROOM_NAME: string
        RTYPE_ID: number
        HAS_ROOMTYPE: number
        DUT_ID_FROM_ROOM: string
        ROOM_TYPE_NAME: string
        TUSEMIN: number
        TUSEMAX: number
      },
      entitiesCfg?: {
        ENT_ID: number
        varsList: {
          name: string,
          address: {
            protocol: string
          },
        }[]
      }[],
      associatedDacs?: { DAC_ID: string }[];
      associatedDutsDuo?: {
        DUT_DUO_ID: string,
        CITY_NAME: string,
        STATE_ID: string,
        GROUP_ID: number,
        GROUP_NAME: string,
        UNIT_ID: number,
        UNIT_NAME: string,
        H_INDEX: number,
        CLIENT_NAME: string,
        CLIENT_ID: number,
        H_DESC: string,
        DAT_ID: string,
        AST_DESC: string,
        ASSET_ID: number,
        TIMEZONE_ID: number,
        TIMEZONE_AREA: string,
        TIMEZONE_OFFSET: number
      }[];
    },
    dma?: {
      DMA_ID: string,
      HYDROMETER_MODEL?: string,
      INSTALLATION_LOCATION?: string,
      INSTALLATION_DATE?: string,
      TOTAL_CAPACITY?: number,
      QUANTITY_OF_RESERVOIRS?: number,
    },
    dal?: {
      illuminationList: {
        ID: number;
        DAL_ID: number;
        DAL_CODE: string;
        ILLUMINATION_ID: number;
        PORT: number;
        FEEDBACK: number;
        DEFAULT_MODE: string;
        NAME: string;
        GRID_VOLTAGE: number;
        GRID_CURRENT: number;
        UNIT_ID: number;
      }[]
    },
    dmt?: {
      nobreaksList: {
        ID: number;
        DMT_CODE: string;
        DMT_ID: number;
        NOBREAK_ID: number;
        PORT: number;
        NAME: string;
        DAT_CODE: number;
        UNIT_ID: number;
        INPUT_VOLTAGE: number;
        OUTPUT_VOLTAGE: number;
        NOMINAL_POTENTIAL: number;
        NOMINAL_BATTERY_LIFE: number;
        INPUT_ELECTRIC_CURRENT?: number
        OUTPUT_ELECTRIC_CURRENT?: number
        NOMINAL_BATTERY_CAPACITY?: number
        MODEL: string;
        MANUFACTURER: string;
      }[],
      illuminationList: {
        ID: number;
        DMT_ID: number;
        DMT_CODE: string;
        ILLUMINATION_ID: number;
        PORT: number;
        NAME: string;
        GRID_VOLTAGE: number;
        GRID_CURRENT: number;
        UNIT_ID: number;
      }[]
      utilitiesList: {
        ID: number;
        DMT_CODE: string;
        DMT_ID: number;
        NOBREAK_ID?: number;
        PORT: number;
        NAME?: string;
        DAT_CODE?: number;
        UNIT_ID?: number;
        INPUT_VOLTAGE?: number;
        OUTPUT_VOLTAGE?: number;
        NOMINAL_POTENTIAL?: number;
        NOMINAL_BATTERY_LIFE?: number;
        INPUT_ELECTRIC_CURRENT?: number
        OUTPUT_ELECTRIC_CURRENT?: number
        NOMINAL_BATTERY_CAPACITY?: number
        MODEL?: string;
        MANUFACTURER?: string;
        ILLUMINATION_ID?: number;
        GRID_VOLTAGE?: number;
        GRID_CURRENT?: number;
        APPLICATION: string;
        CIRCUIT_ID?: number;
        STATUS?: string;
      }[]
    },
    optsDescs: {
      [id: string]: string
    },
  }>

  ['/get-devs-full-info']: (reqParams: { DEV_IDs: string[] }, session: SessionData) => Promise<{[key: string]:{
    DEV_ID: string,
    CLIENT_ID: number,
    UNIT_ID: number,
    UNIT_NAME: string,
    CLIENT_NAME: string,
    GROUP_ID: number,
    GROUP_NAME: string,
    BT_ID: string,
    STATE_ID: string,
    CITY_NAME: string,
    DAT_BEGMON: string,
    DAT_BEGAUT: string,
    status: string,
    lastMessageTS: string,
    dac?: {
      DAC_NAME: string,
      DAC_DESC: string,
      DAC_MODEL: string,
      CAPACITY_UNIT: string,
      CAPACITY_PWR: number,
      DAC_COP: number,
      DAC_KW: number,
      FLUID_TYPE: string,
      GROUP_ID: number,
      DAC_APPL: string,
      DAC_TYPE: string,
      DAC_ENV: string,
      DAC_MODIF: string,
      DAC_COMIS: string,
      DAC_BRAND: string,
      HEAT_EXCHANGER_ID: number,
      GROUP_NAME: string,
      T0_T1_T2: string,
      P0_POSITN: string,
      P0_SENSOR: string,
      P1_POSITN: string,
      P1_SENSOR: string,
      P0_MULT: number,
      P0_OFST: number,
      P1_MULT: number,
      P1_OFST: number,
      P0_MULT_QUAD: number
      P0_MULT_LIN: number
      P1_MULT_QUAD: number
      P1_MULT_LIN: number
      REL_DUT_ID: string,
      P0Psuc: boolean,
      P1Psuc: boolean,
      P0Pliq: boolean,
      P1Pliq: boolean,
      hasAutomation: boolean,
      SELECTED_L1_SIM: string,
      EQUIPMENT_POWER: string,
      COMPRESSOR_NOMINAL_CURRENT: number,
      EVAPORATOR_MODEL: string,
      EVAPORATOR_MODEL_ID: number,
    },
    dam?: {
      REL_DUT_ID: string,
      ENABLE_ECO: 0|1|2,
      ECO_CFG: string,
      ECO_OFST_START: number,
      ECO_OFST_END: number,
      ECO_INT_TIME: number,
      FW_MODE: string,
      DESIREDPROG: string,
      LASTPROG: string,
      DAM_DISABLED: 0|1,
      FU_NOM: number,
      groups: {
        GROUP_ID: number;
        GROUP_NAME: string;
      }[],
      dam_mode: string,
      supportsVentEnd: boolean,
      SCHEDULE_START_BEHAVIOR: string
      SETPOINT: number
      LTC: number
      LTI: number
      UPPER_HYSTERESIS: number
      LOWER_HYSTERESIS: number
      EXT_THERM_CFG: string|null
      supportsExtTherm: boolean
    },
    dut?: {
      ROOM_NAME: string,
      PLACEMENT: 'AMB'|'INS'|'DUO',
      VARS: string,
      TUSEMAX: number,
      TUSEMIN: number,
      CO2MAX: number,
      workPeriods: { [day: string]: string },
      workPeriodExceptions: { [day: string]: string },
      TEMPERATURE_OFFSET: number,
    },
    dut_aut?: {
      TSETPOINT: number,
      RESENDPER: number,
      LTCRIT: number,
      DESIREDPROG: string,
      LASTPROG: string,
      CTRLOPER: ControlMode,
      PORTCFG: 'IR'|'RELAY',
      DUTAUT_DISABLED: 0|1,
      MCHN_MODEL: string,
      MCHN_BRAND: string,
      FU_NOM: number,
      groups: {
        GROUP_ID: number;
        GROUP_NAME: string;
      }[],
      TEMPERATURE_OFFSET: number,
      LTINF: number,
      UPPER_HYSTERESIS: number,
      LOWER_HYSTERESIS: number,
      COMPATIBLE_MODES: string[],
      IS_ECO_2_WITH_HYSTERESIS: boolean,
      SCHEDULE_START_BEHAVIOR: string,
      SCHEDULE_END_BEHAVIOR: string,
      FORCED_BEHAVIOR: string
    },
    dri?: {
      varsCfg: {
        varsList: {
          name: string,
          address?: {
            protocol?: string,
          },
          value?: string,
        }[]
      },
      ecoCfg?: {
        DUT_ID: string,
        TUSEMAX?: number,
        TUSEMIN?: number,
        ENABLE_ECO: number,
        ECO_CFG: string,
        ECO_OFST_START: number,
        ECO_OFST_END: number,
        ECO_INT_TIME: number,
        DAT_BEGAUT: string,
      },
      vavCfg?: {
        VAV_ID: string,
        THERM_MANUF?: string,
        THERM_MODEL?: string,
        VALVE_MANUF?: string,
        VALVE_MODEL?: string,
        VALVE_TYPE?: string,
        BOX_MANUF?: string,
        BOX_MODEL?: string,
        ROOM_NAME?: string,
        RTYPE_ID?: number,
        ROOM_TYPE_NAME?: string,
        TUSEMIN?: number,
        TUSEMAX?: number,
      }
      entitiesCfg?: {
        ENT_ID: number
        varsList: {
          name: string,
          address: { protocol: string },
        }[]
      }[],
    },
    dma?: {
      DMA_ID: string,
      HYDROMETER_MODEL?: string,
      INSTALLATION_LOCATION?: string,
      INSTALLATION_DATE?: string,
      TOTAL_CAPACITY?: number,
      QUANTITY_OF_RESERVOIRS?: number,
    },
    dal?: {
      illuminationList: {
        ID: number;
        DAL_ID: number;
        ILLUMINATION_ID: number;
        PORT: number;
        NAME: string;
        GRID_VOLTAGE: number;
        GRID_CURRENT: number;
        UNIT_ID: number;
      }[]
    },
    optsDescs: {
      [id: string]: string
    },
  }}>

  ['/get-devs-list']: (reqParams: {
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
    SKIP?: number
    LIMIT?: number
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_NAME: string
      STATE_ID: string
      CLIENT_ID: number
      CLIENT_NAME: string
      machineName: string
      status: string
    }[]
    totalItems: number
  }>
  ['/dac/get-dac-info']: (reqParams: { DAC_ID: string }, session: SessionData) => Promise<{
    info: {
      DAC_ID: string
      BT_ID: string
      CLIENT_ID: number
      DAC_DESC: string
      DAC_MODEL: string
      CAPACITY_UNIT: string
      CAPACITY_PWR: number
      DAC_COP: number
      DAC_KW: number
      FLUID_TYPE: string
      DAT_BEGMON: string
      GROUP_ID: number
      UNIT_ID: number
      DAC_APPL: string
      DAC_TYPE: string
      DAC_ENV: string
      DAC_MODIF: string
      DAC_COMIS: string
      DAC_BRAND: string
      CITY_ID: string
      STATE_ID: string
      CITY_NAME: string
      UNIT_NAME: string
      GROUP_NAME: string
      LAT: string
      LON: string
      P0_POSITN: string
      P0_SENSOR: string
      P1_POSITN: string
      P1_SENSOR: string
      P0_MULT: number
      P0_OFST: number
      P1_MULT: number
      P1_OFST: number
      P0_MULT_QUAD: number
      P0_MULT_LIN: number
      P1_MULT_QUAD: number
      P1_MULT_LIN: number
      DAC_APPL_DESC: string
      DAC_TYPE_DESC: string
      DAC_ENV_DESC: string
      DAC_BRAND_DESC: string
      FLUID_TYPE_DESC: string
      SELECTED_L1_SIM: string
    }
  }>
  ['/dac/set-dac-info']: (reqParams: {
    DAC_ID: string
    CLIENT_ID?: number|null
    UNIT_ID?: number|null
    DAC_DESC?: string|null
    DAC_NAME?: string|null
    DAC_MODEL?: string|null
    CAPACITY_UNIT?: string|null
    CAPACITY_PWR?: number|null
    DAC_COP?: number|null
    DAC_KW?: number|null
    FLUID_TYPE?: string|null
    GROUP_ID?: number|null
    DAC_APPL?: string|null
    DAC_TYPE?: string|null
    DAC_ENV?: string|null
    DAC_BRAND?: string|null
    DAC_MODIF?: string|null
    DAC_COMIS?: string|null
    DAC_HEAT_EXCHANGER_ID?: number|null
    USE_RELAY?: 0|1|null
    REL_DUT_ID?: string|null
    P0_POSITN?: string|null
    P1_POSITN?: string|null
    P0_SENSOR?: string|null
    P1_SENSOR?: string|null
    DAC_APPLCFG?: string|null
    PRESSURE_SENSOR?: string|null
    ENABLE_ECO?: 0|1|2|null
    ECO_CFG?: string|null
    ECO_OFST_START?: number|null
    ECO_OFST_END?: number|null
    ECO_INT_TIME?: number
    T0_T1_T2?: [string|null, string|null, string|null]|null
    FU_NOM?: number|null
    SELECTED_L1_SIM?: string|null
    SCHEDULE_START_BEHAVIOR?: string|null
    SETPOINT?: number|null
    LTC?: number|null
    LTI?: number|null
    UPPER_HYSTERESIS?: number|null
    LOWER_HYSTERESIS?: number|null
    EQUIPMENT_POWER?: string|null
    COMPRESSOR_NOMINAL_CURRENT?: number|null
    EVAPORATOR_MODEL_ID?: number|null
    INSUFFLATION_SPEED?: number|null
    MULT_PROG_SCREEN?: boolean
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/get-list-v2']: (reqParams: {
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    NAME: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
  }[]>

  ['/heat-exchanger/delete-info']: (reqParams: {
    ID: number
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/create-v2']: (reqParams: {
    NAME: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/set-info-v2']: (reqParams: {
    ID: number
    NAME: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
    CLIENT_ID: number
  }, session: SessionData) => Promise<string>

  ['/heat-exchanger/get-brands-list-v2']: (reqParams: {}, session: SessionData) => Promise<{
    value: string
    label: string
    tags: string
  }[]>

  ['/heat-exchanger/get-info-v2']: (reqParams: {
    CLIENT_ID: number
    HEAT_EXCHANGER_ID: number
  }, session: SessionData) => Promise<{
    ID: number
    NAME: string
    T_MIN: number
    T_MAX: number
    DELTA_T_MIN: number
    DELTA_T_MAX: number
  }>

  ['/dma/get-dma-info']: (reqParams: {
    dmaId: string
  }, session: SessionData) => Promise<{
    DMA_ID: string
    UNIT_ID?: number
    CLIENT_ID?: number
    UNIT_NAME?: string
    HYDROMETER_MODEL?: string
    INSTALLATION_LOCATION?: string
    INSTALLATION_DATE?: string
    TOTAL_CAPACITY?: number
    QUANTITY_OF_RESERVOIRS?: number
    STATUS?: string
  }>

  ['/dma/get-day-usage']: (reqParams: {
    dmaId: string
    dayYMD: string
  }, session: SessionData) => Promise<{
    period_usage: number
    history: {
      information_date: string
      usage: number
      devId: string
      readings_per_day: {
        time: string
        usage: number
      }[]
    }[]
  }>

  ['/dma/get-usage-history']: (reqParams: {
    dmaId: string,
    start_date: string
    end_date: string
  }, session: SessionData) => Promise<{
    daily_average: number
    period_usage: number
    predicted: number
    history: {
      information_date: string
      usage: number
      devId: string
    }[]
  }>

  ['/dma/get-consumption-history']: (reqParams: {
    DEVICE_CODE: string,
    START_DATE: string
    END_DATE: string
    LAST_START_DATE: string
    LAST_END_DATE: string
    YEAR_GRAPHIC: boolean
  }, session: SessionData) => Promise<{
    daily_average: number
    period_usage: number
    period_usage_last: number
    history: {
      usage: number
      number_devices?: number
      hour?: string
      day?: {
        dayDate: string
        dayWeek: string
        dayWeekName: string
      }
      month: number
      year: number
    }[]
  }>

  ['/dma/get-forecast-usage']: (reqParams: {
    DEVICE_CODE: string
  }, session: SessionData) => Promise<{
    monday: number;
    tuesday: number;
    wednesday: number;
    thurdsday: number;
    friday: number;
    saturday: number;
    sunday: number;
  }>

  ['/laager/get-consumption-history']: (reqParams: {
    LAAGER_CODE: string,
    START_DATE: string
    END_DATE: string
    LAST_START_DATE: string
    LAST_END_DATE: string
    YEAR_GRAPHIC: boolean
  }, session: SessionData) => Promise<{
    daily_average: number
    period_usage: number
    period_usage_last: number
    history: {
      usage: number
      number_devices?: number
      hour?: string
      day?: {
        dayDate: string
        dayWeek: string
        dayWeekName: string
      }
      month: number
      year: number
    }[]
  }>

  ['/laager/get-forecast-usage']: (reqParams: {
    LAAGER_CODE: string
  }, session: SessionData) => Promise<{
    monday: number;
    tuesday: number;
    wednesday: number;
    thurdsday: number;
    friday: number;
    saturday: number;
    sunday: number;
  }>

  ['/dma/get-last-reading-date']: (reqParams: {
    dmaId: string
  }, session: SessionData) => Promise<{
    date: string | null
  }>

  ['/dma/get-dma-mean-history']: (reqParams: {
    dmaId: string
  }, session: SessionData) => Promise<{
    day: string
    averageConsumption: number
    consideredDays: number
  }[]>

  ['/dma/get-month-usage']: (reqParams: {
    client_ids?: number[]
    state_ids?: string[]
    city_ids?: string[]
    unit_ids?: number[]
    onlyInfo?: boolean
    startDate: string
    endDate: string
  }, session: SessionData) => Promise<{
    info: {
      state_name: string
      client_id: number
      client_name: string
      city_name: string
      unit_id: number
      city_id: string,
      state_id: number,
      unit_name: string
      period_usage: number
      usage_people: number | null
      usage_area: number | null
      device_code: string
    }[]
    history:{
      usage: number
      number_devices: number
      month: number
      year: number
    }[]
  }>

  ['/dma/get-dates-usage']: (reqParams: {
    client_ids?: number[]
    state_ids?: string[]
    city_ids?: string[]
    unit_ids?: number[]
    period: 'day'|'month'|'year'
    startDate?: string
    endDate?: string
  }, session: SessionData) => Promise<{
    times: {
      name: string
      hasUsage: boolean
    }[]
  }>

  ['/dev/dev-info-combo-options']: (reqParams: {
    DEVICE_CODE?: string
    CLIENT_ID?: number
    UNIT_ID?: number
    units?: boolean
    groups?: boolean
    rtypes?: boolean
    ambientes?: boolean
    fluids?: boolean
    applics?: boolean
    types?: boolean
    envs?: boolean
    brands?: boolean
    dutapl?: boolean
    psens?: boolean
    ecoModeCfg?: boolean
    applicsCfg?: boolean
    roles?: boolean
    dutPlacement?: boolean
    vavs?: boolean
    fancoils?: boolean
    scheduleStartBehavior?: boolean
    dutScheduleStartBehavior?: boolean
    dutScheduleEndBehavior?: boolean
    dutForcedBehavior?: boolean
    damInstallationLocation?: boolean
    evaporatorModels?: boolean
    chillerModels?: boolean
    chillerLines?: boolean
  }, session: SessionData) => Promise<{
    units?: { value: number, label: string }[]
    groups?: { value: number, label: string, unit: number, devAut?: string }[]
    rtypes?: { RTYPE_ID: number, RTYPE_NAME: string }[]
    ambientes?: { value: string, label: string }[]
    fluids?: { value: string, label: string, tags?: string }[]
    applics?: { value: string, label: string, tags?: string }[]
    types?: { value: string, label: string, tags?: string }[]
    envs?: { value: string, label: string, tags?: string }[]
    brands?: { value: string, label: string, tags?: string }[]
    // dutapl?: { value: string, label: string, tags?: string }[]
    psens?: { value: string, label: string, tags?: string }[]
    ecoModeCfg?: { value: string, label: string, tags?: string }[]
    applicsCfg?: { value: string, label: string, tags?: string }[]
    roles?: { value: string, label: string }[]
    dutPlacement?: { value: string, label: string }[]
    vavs?: { value: string, label: string, type: string }[]
    fancoils?: { value: string, label: string, type: string }[]
    scheduleStartBehavior?: { value: string, label: string, tags?: string }[]
    dutScheduleStartBehavior?: { value: string, label: string, tags?: string }[]
    dutScheduleEndBehavior?: { value: string, label: string, tags?: string }[]
    dutForcedBehavior?: { value: string, label: string, tags?: string }[]
    damInstallationLocation?: { value: string, label: string }[]
    evaporatorModels?: { value: string, label: string }[]
    chillerModels?: { value: string, label: string }[]
    chillerLines?: { value: string, label: string }[]
  }>
  ['/dev/get-health-power-data']: (reqParams: {
    clientIds?: number[],
    unitIds?: number[],
    cityIds?: string[],
    stateIds?: string[],
    groupIds?: number[],
    SKIP: number,
    LIMIT: number,
  }, session: SessionData) => Promise<{
    list: {
      STATE_NAME: string
      CITY_NAME: string
      CLIENT: string
      CLIENT_ID: number
      UNIT: string
      UNIT_ID: number
      DEV_ID: string
      capacityKW: number
      H_INDEX: number
      H_DATE: string
      MACHINE_ID: number
    }[],
    totalItems: number
  }>
  ['/dacs-with-automation-enabled']: (reqParams: {
    clientId: number,
    unitId?: number,
  }, session: SessionData) => Promise<{
    list: {
      DAC_ID: string
      UNIT_ID: number
      GROUP_ID: number
    }[]
  }>
  ['/dac/delete-dac-info']: (reqParams: {
    dacId: string
  }, session: SessionData) => Promise<string>

  ['/dut/get-duts-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    rtypeId?: number,
    SKIP?: number,
    LIMIT?: number,
    temprtAlerts?: string[],
    status?: string[],
    onlyWithAutomation?: boolean
    onlyPossibleAutomation?: boolean
    includeMeanTemperature?: boolean
    checkQuantiyToMeanTemperature?: boolean
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string,
    controlMode?: string[],
    automationConfig?: string[],
    hasProgrammingMult?: boolean
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      bt_id: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      STATE_NAME: string
      COUNTRY_NAME: string
      ROOM_NAME: string
      ENVIRONMENT_ID: number
      ENVIRONMENTS_ROOM_TYPES_ID: number
      ISVISIBLE: number
      PLACEMENT: 'AMB'|'INS'|'DUO'
      UNIT_ID: number
      UNIT_NAME: string
      LAT: string
      LON: string
      CLIENT_NAME: string
      CLIENT_ID: number
      RTYPE_ID: number
      RTYPE_NAME: string
      VARS: string
      status: string
      lastCommTs: string
      Temperature?: number
      Temperature_1?: number
      Humidity?: number
      eCO2?: number
      TVOC?: number
      Mode?: string
      State?: string
      automationEnabled: boolean
      MCHN_BRAND?: string
      MCHN_MODEL?: string
      TUSEMIN?: number
      TUSEMAX?: number
      HUMIMIN?: number
      HUMIMAX?: number
      temprtAlert: 'low'|'high'|'good'|null
      tpstats?: { med: number, max: number, min: number }
      CO2MAX?: number
      CURRFW_VERS?: string
      CTRLOPER: ControlMode|null
      PORTCFG: 'IR'|'RELAY'|null
    }[]
    totalItems: number
  }>

  ['/dut/get-dut-info']: (reqParams: {
    DEV_ID: string
  }, session: SessionData) => Promise<{
    info: {
      DEV_ID: string
      BT_ID: string
      DAT_BEGMON: string
      ROOM_NAME: string
      PLACEMENT: 'AMB'|'INS'|'DUO'
      UNIT_ID: number
      CLIENT_ID: number
      CITY_ID: string
      STATE_ID: string
      CITY_NAME: string
      UNIT_NAME: string
      LAT: string
      LON: string
      TUSEMIN: number
      TUSEMAX: number
      VARS: string[]
    },
    workPeriods: { [day: string]: string },
    workPeriodExceptions: { [day: string]: string },
  }>
  ['/dut/set-dut-info']: (reqParams: {
    DEV_ID: string
    CLIENT_ID?: number|null
    UNIT_ID?: number|null
    ROOM_NAME?: string|null
    PLACEMENT?: 'AMB'|'INS'|'DUO'|null
    CTRLOPER?: ControlMode
    PORTCFG?: 'IR'|'RELAY'
    RTYPE_ID?: number|null
    USE_IR?: 0|1|null
    groups?: string[]|null
    MCHN_BRAND?: string|null
    MCHN_MODEL?: string|null
    ECO_OFST_START?: number|null
    ECO_OFST_END?: number|null
    TSETPOINT?: number|null
    LTCRIT?: number|null
    RESENDPER?: number|null
    TEMPERATURE_OFFSET?: number|null
    LTINF?: number|null
    UPPER_HYSTERESIS?: number|null
    LOWER_HYSTERESIS?: number|null
    SCHEDULE_START_BEHAVIOR?: string|null
    SCHEDULE_END_BEHAVIOR?: string|null
    FORCED_BEHAVIOR?: string|null
    UPDATE_AUTOM_INFO?: boolean|null
    IR_ID_COOL?: string|null
    ACTION_MODE?: string|null
    ACTION_POST_BEHAVIOR?: string|null
    ACTION_TIME?: number|null
    ENVIRONMENT_ID?: number|null
  }, session: SessionData) => Promise<{
    DEV_ID: string
    ROOM_NAME: string
    UNIT_ID: number
    RTYPE_ID: number
    RTYPE_NAME: string
    CLIENT_ID: number
    UNIT_NAME: string
  }>
  ['/dut/delete-dut-info']: (reqParams: { dutId: string }, session: SessionData) => Promise<string>

  ['/dut/set-visibility']: (reqParams: {
    dutsList: {
      DEV_ID: string,
      ISVISIBLE: number,
      ROOM_NAME: string
    }[],
    unitId: number,
    clientId: number,
  }, session: SessionData) => Promise<{
    DEV_ID: string,
    ISVISIBLE: number,
    ROOM_NAME: string
  }[]>

  ['/dut/get-visibility']: (reqParams: {
    unitId: number,
    clientId: number
  }, session: SessionData) => Promise<{
    DEV_ID: string,
    ISVISIBLE: number,
    ROOM_NAME: string
  }[]>

  ['/dut/get-dut-duo-list']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    groupIds?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean,
  }, session: SessionData) => Promise<{
    list: {
      DUT_DUO_ID: string
      CITY_NAME: string
      STATE_ID: string
      GROUP_ID: number
      GROUP_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      H_INDEX: number
      CLIENT_NAME: string
      CLIENT_ID: number
      H_DESC: string
      DAT_ID: string
      AST_DESC: string
      ASSET_ID: number
      TIMEZONE_ID: number
      TIMEZONE_AREA: string
      TIMEZONE_OFFSET: number
    }[]
    totalItems: number
  }>

  ['/unit/get-observations']: (reqParams: {
    unitId: number,
  }, session: SessionData) => Promise<{
    ID: number
    UNIT_ID: number,
    ISVISIBLE: number,
    DATE_OBS: string,
    USER_ID: string,
    OBS: string,
    NOME: string,
    SOBRENOME: string
  }[]>

  ['/unit/set-observation']: (reqParams: {
    ID?: number
    UNIT_ID: number,
    ISVISIBLE: number,
    DATE_OBS: Date,
    OBS: string,
  }, session: SessionData) => Promise<string>

  ['/unit/delete-observation']: (reqParams: { observation: {
    ID: number
  }, unitId: number }, session: SessionData) => Promise<string>

  ['/unit/get-refrigeration-consumption-unit']: (reqParams: {
    UNIT_ID: number,
    START_DATE: string,
    END_DATE: string,
  }, session: SessionData) => Promise<{
    total_consumption: number,
    consumption_by_device_machine: {
      machine_id: number,
      device_code: string,
      total_utilization_time: number,
      total_refrigeration_consumption: number
    }[]
  }>

  ['/unit/get-energy-consumption-unit']: (reqParams: {
    UNIT_ID: number,
    START_DATE: string,
    END_DATE: string,
    GET_HOURS_CONSUMPTION?: boolean,
  }, session: SessionData) => Promise<{
    consumptionByDevice: {
      device_code: string,
      consumption: {
        day: string,
        totalMeasured: number,
        maxDayTotalMeasured: number,
        hours: {
          hour: string,
          totalMeasured: number,
          dataIsInvalid: boolean,
          dataIsProcessed: boolean
        }[],
        dataIsInvalid: boolean,
        dataIsProcessed: boolean,
      }[]
    }[]
  }>

  ['/dut/set-dut-rtype-v2']: (reqParams: {
    DEVS_INFO: {
      DEV_ID: string,
      ENV_ID: number,
    }[],
    RTYPE_ID?: number | null,
  }, session: SessionData) => Promise<string>

  ['/dut/delete-environments']: (reqParams: {
    DEVS_INFO: {
      DEV_ID: string,
      ENV_ID: number,
    }[],
  }, session: SessionData) => Promise<string>

  ['/dma/set-dma-info']: (reqParams: {
    DMA_ID?: string
    UNIT_ID?: number|null
    CLIENT_ID?: number|null
    UNIT_NAME?: string | null
    HYDROMETER_MODEL?: string | null
    INSTALLATION_LOCATION?: string | null
    INSTALLATION_DATE?: string | null
    TOTAL_CAPACITY?: number | null
    QUANTITY_OF_RESERVOIRS?: number | null
    LEAK_ANALYSIS?: boolean | null
    LA_CONTINUOUS_CONSUMPTION?: boolean | null
    LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL?: number | null
    LA_CONTINUOUS_CONSUMPTION_MIN_VALUE?: number | null
    LA_HISTORY_CONSUMPTION?: boolean | null
    LA_HISTORY_CONSUMPTION_TIMES?: number | null
    LA_CAPACITY_CONSUMPTION?: boolean | null
    LA_CAPACITY_CONSUMPTION_TIMES?: number | null
    CHANGED_BY_UNIT?: boolean | null
  }, session: SessionData) => Promise<{
    DMA_ID: string
    UNIT_ID?: number
    CLIENT_ID?: number
    UNIT_NAME?: string
    HYDROMETER_MODEL?: string
    INSTALLATION_LOCATION?: string
    INSTALLATION_DATE?: string
    TOTAL_CAPACITY?: number
    QUANTITY_OF_RESERVOIRS?: number
    LEAK_ANALYSIS?: boolean
    LA_CONTINUOUS_CONSUMPTION?: boolean
    LA_CONTINUOUS_CONSUMPTION_TIME_INTERVAL?: number
    LA_CONTINUOUS_CONSUMPTION_MIN_VALUE?: number
    LA_HISTORY_CONSUMPTION?: boolean
    LA_HISTORY_CONSUMPTION_TIMES?: number
    LA_CAPACITY_CONSUMPTION?: boolean
    LA_CAPACITY_CONSUMPTION_TIMES?: number
  }>

  ['/dma/get-dmas-list']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
    stateIds?: string[],
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean,
    SKIP?: number,
    LIMIT?: number,
    searchText?: string,
    searchTerms?: string[],
    ownershipFilter?: string
  }, session: SessionData) => Promise<{
    list: {
      DMA_ID: string
      UNIT_ID: number
      CLIENT_ID: number
      UNIT_NAME: string
      STATE_ID: number
      STATE_NAME: string
      CITY_ID: string
      CITY_NAME: string
      CLIENT_NAME: string
    }[]
    totalItems: number
  }>

  ['/dma/get-disassociated-dmas']: (reqParams: {},
    session: SessionData) => Promise<{
    list : {
      dataSource: string
    }[],
  }>
  ['/config/add-pressure-sensor']: (reqParams: {
    SENSOR_ID: string
    SENSOR_NAME?: string
  }, session: SessionData) => Promise<{
    SENSOR_ID: string
    SENSOR_NAME: string
  }>
  ['/config/add-pressure-curve']: (reqParams: {
    SENSOR_ID: string
    MULT_QUAD: number
    MULT_LIN: number
    OFST: number
    MIN_FIRMWARE_VERSION: string
  }, session: SessionData) => Promise<{
    ID: number
    SENSOR_ID: string
    MIN_FIRMWARE_VERSION: string
    MULT_QUAD: number
    MULT_LIN: number
    OFST: number
    SENSOR_NAME: string
  }>
  ['/config/delete-pressure-sensor']: (reqParams: {
    SENSOR_ID: string
  }, session: SessionData) => Promise<string>
  ['/config/delete-pressure-curve']: (reqParams: {
    CURVE_ID: number
  }, session: SessionData) => Promise<string>
  ['/config/edit-pressure-sensor']: (reqParams: {
    SENSOR_ID: string
    SENSOR_NAME?: string
  }, session: SessionData) => Promise<{
    SENSOR_ID: string
    SENSOR_NAME: string
  }>
  ['/config/edit-pressure-curve']: (reqParams: {
    ID: number,
    SENSOR_ID?: string
    MULT?: number
    MULT_QUAD?: number
    MULT_LIN?: number
    OFST?: number
    MIN_FIRMWARE_VERSION?: string
  }, session: SessionData) => Promise<{
    ID: number
    SENSOR_ID: string
    MULT: number
    MULT_QUAD: number
    MULT_LIN: number
    OFST: number
    SENSOR_NAME: string
    MIN_FIRMWARE_VERSION: string
  }>
  ['/config/get-pressure-sensors']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      SENSOR_ID: string
      SENSOR_NAME: string
    }[]
  }>
  ['/config/get-pressure-curves']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      ID: number
      SENSOR_ID: string
      MULT: number
      MULT_QUAD: number
      MULT_LIN: number
      OFST: number
      MIN_FIRMWARE_VERSION: string
    }[]
  }>

  ['/config/add-manufact-devs']: (reqParams: {
    IDSTART: string
    IDEND: string
    CLIENT_ID: number
  }, session: SessionData) => Promise<{
    IDSTART: string
    IDEND: string
    CLIENT_ID: number
  }>
  ['/config/delete-manufact-devs']: (reqParams: {
    IDSTART: string
    IDEND: string
  }, session: SessionData) => Promise<string>
  ['/config/get-manufact-devs']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      IDSTART: string
      IDEND: string
      CLIENT_ID: number
      CLIENT_NAME: string
    }[]
  }>
  ['/coolautomation/get-units-and-systems']: (reqParams: {}, session: SessionData) => Promise<{
    customers: {
      [id: string]: {
        id: string
        name: string
      }
    }
    sites: {
      [id: string]: {
        id: string
        name: string
        customer: string
      }
    }
    devices: {
      [id: string]: {
        id: string
        name: string
        site: string
        serial: string
        isConnected: boolean
      }
    }
    systems: {
      [id: string]: {
        id: string
        name: string
        site: string
        device: string
        operationMode: number
        operationStatus: number
      }
    }
    units: {
      [id: string]: {
        id: string
        name: string
        system: string
        activeFanMode: number
        activeOperationMode: number
        activeOperationStatus: number
        activeSetpoint: number
        activeSwingMode: number
        ambientTemperature: number
        line: number
        task?: number
        type: number
      }
    }
    valsTransl: {
      operationStatuses: { [k: string]: string }
      operationModes: { [k: string]: string }
      fanModes: { [k: string]: string }
      swingModes: { [k: string]: string }
      unitTypes: { [k: string]: string }
      outdoorUnitTasks: { [k: string]: string }
    }
  }>
  ['/coolautomation/get-unit-charts']: (reqParams: { unitId: string, day: string }, session: SessionData) => Promise<{
    list: {
      name: string
      x: number[]
      y: number[]
    }[]
  }>
  ['/coolautomation/get-system-units']: (reqParams: {
    coolAutSystemId: string
  }, session: SessionData) => Promise<{
    list: {
      id: string
      name: string
      site: string
      type: number
      activeOperationMode: number
      activeSetpoint: number
      ambientTemperature: number
      activeOperationStatus: number
      activeFanMode: number
      activeSwingMode: number
    }[]
    valsTransl: {
      operationStatuses: { [k: string]: string }
      operationModes: { [k: string]: string }
      fanModes: { [k: string]: string }
      swingModes: { [k: string]: string }
      unitTypes: { [k: string]: string }
      outdoorUnitTasks: { [k: string]: string }
    }
  }>
  ['/coolautomation/get-device-units']: (reqParams: {
    coolAutDeviceId: string
  }, session: SessionData) => Promise<{
    list: {
      id: string
      name: string
      site: string
      system: string
      type: number
      activeOperationMode: number
      activeSetpoint: number
      ambientTemperature: number
      activeOperationStatus: number
      activeFanMode: number
      activeSwingMode: number
    }[]
    valsTransl: {
      operationStatuses: { [k: string]: string }
      operationModes: { [k: string]: string }
      fanModes: { [k: string]: string }
      swingModes: { [k: string]: string }
      unitTypes: { [k: string]: string }
      outdoorUnitTasks: { [k: string]: string }
    }
  }>
  ['/coolautomation/get-unit-last-telemetry']: (reqParams: {
    coolAutUnitId: string
  }, session: SessionData) => Promise<{
    telemetry: {
      [varId: string]: { name: string, y: number }
    }
    valsTransl: {
      operationStatuses: { [k: string]: string }
      operationModes: { [k: string]: string }
      fanModes: { [k: string]: string }
      swingModes: { [k: string]: string }
      unitTypes: { [k: string]: string }
      outdoorUnitTasks: { [k: string]: string }
    }
  }>
  ['/coolautomation/get-unit-history']: (reqParams: {
    dayYMD: string
    coolAutUnitId: string
    numDays?: number
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: {
      [varId: string]: {
        name: string;
        y: number[];
      }
    };
  }>
  ['/coolautomation/get-system-programming']: (reqParams: {
    coolAutSystemId: string
  }, session: SessionData) => Promise<{
    list: {}[]
  }>
  ['/coolautomation/get-unit-programming']: (reqParams: {
    coolAutUnitId: string
  }, session: SessionData) => Promise<{
    list: {
      id: string
      name: string
      isDisabled: boolean
      powerOnTime: number
      powerOffTime: number
      setpoint: number
      days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[],
    }[]
  }>
  ['/coolautomation/associate-device-to-diel-unit']: (reqParams: {
    dielUnitId: number
    coolAutSystemId: string
  }, session: SessionData) => Promise<{}>
  ['/coolautomation/control-unit-operation']: (reqParams: {
    unitId: string
    setpoint?: number
    operationMode?: number
    fanMode?: number
    swingMode?: number
    operationStatus?: number
  }, session: SessionData) => Promise<{ success: true }>

  ['/coolautomation/add-unit-schedule']: (reqParams: {
    unitId: string
    isDisabled: boolean
    name: string
    powerOnTime: string // "23:59"
    powerOffTime: string // "23:59"
    setpoint: null|number
    days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
  }, session: SessionData) => Promise<{
    info: {
      id: string
      isDisabled: boolean
      name: string
      powerOnTime: number
      powerOffTime?: number
      setpoint: null|number
      days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
    }
  }>
  ['/coolautomation/alter-unit-schedule']: (reqParams: {
    scheduleId: string
    isDisabled?: boolean
    name?: string
    powerOnTime?: string // "23:59"
    powerOffTime?: string // "23:59"
    setpoint?: null|number
    days?: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
  }, session: SessionData) => Promise<{
    info: {
      id: string
      isDisabled: boolean
      name: string
      powerOnTime: number
      powerOffTime?: number
      setpoint: null|number
      days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
    }
  }>
  ['/coolautomation/delete-unit-schedule']: (reqParams: {
    scheduleId: string
  }, session: SessionData) => Promise<string>
  ['/coolautomation/debug-alerts']: (reqParams: {
    startTime?: string
    endTime?: string
  }, session: SessionData) => Promise<{
    groupedEvents: {
      colSite: string
      colDevice: string
      colSystem: string
      colResources: string
      colEventType: string
      colCode: string
      colDescription: string
      colStatus: string
      firstTs: string
      lastTs: string
      evCount: number
    }[]
  }>

  ['/dac/export-unit-report']: (reqParams: {
    clientId: number
    unitId: number
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/dac/export-preventive-report']: (reqParams: {
    clientId: number
    unitId: number
    startDate: string
    endDate: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/get-private-unit-report-file']: (reqParams: {
    key: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/sims-v2']: (reqParams: { solution: 'kite' | 'tns' | 'meta' | 'todos' }, session: SessionData) => Promise<{
    tns: {
      id: number
      soldplan__consumption_f: string
      line__total_f: string
      iccid: string
      status__name: string
      soldplan__name: string
      last_conn: string
      last_disc: string
      client: number
      clientName: string
      unit: number
      unitName: string
      accessPoint: string
      modem: string
      accessPointMAC: string
      repeaterMAC: string
      associationDate: string
      cityId: number
      stateId: number
    }[] | null
    meta: {
      iccid: string
      online: string
      operadora: string
      mensalidade: number
      reset: number
      descPlano: string
      ultimaConexao: string
      saldo: number
      client: number
      clientName: string
      unit: number
      unitName: string
      accessPoint: string
      modem: string
      accessPointMAC: string
      repeaterMAC: string
      associationDate: string
      cityId: number
      stateId: number
    }[] | null
    vivo: {
      icc: string;
      imsi: string;
      msisdn: string;
      alias: string;
      simModel: string;
      simType: string;
      gprsStatus: {
        status: number;
        lastConnStart?: string
        lastConnStop?: string
      };
      ipStatus: {
        status: number;
      };
      advancedSupervision: boolean;
      consumptionDaily: {
        voice: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
        sms: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
        data: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
      };
      consumptionMonthly: {
        voice: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
        sms: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
        data: {
          limit: number;
          value: number;
          thrReached: number;
          enabled: boolean;
        };
      };
      expenseMonthly: {
        voiceOver: {
          limit: string;
          value: string;
          thrReached: string;
          enabled: boolean;
        };
        smsOver: {
          limit: string;
          value: string;
          thrReached: string;
          enabled: boolean;
        };
        dataOver: {
          limit: string;
          value: string;
          thrReached: string;
          enabled: boolean;
        };
        totalOver: {
          limit: string;
          value: string;
          thrReached: string;
          enabled: boolean;
        };
        voiceFee: string;
        smsFee: string;
        dataFee: string;
        totalFee: string;
        other: string;
        total: string;
        voiceGroupWarning: boolean;
        smsGroupWarning: boolean;
        dataGroupWarning: boolean;
        totalGroupWarning: boolean;
      };
      provisionDate: string;
      shippingDate: string;
      activationDate: string;
      supervisionGroup: string;
      orderNumber: string;
      postalCode: string;
      country: string;
      operator: string;
      lteEnabled: boolean;
      manufacturerOrderNumber: string;
      chargingType: string;
      qci: number;
      serviceProviderCommercialId: string;
      serviceProviderCommercialName: string;
      serviceProviderEnablerId: string;
      serviceProviderEnablerName: string;
      customerName: string;
      lifeCycleStatus: string;
      billingAccountName: string;
      servicePackId: string;
      commercialGroupId: string;
      customerCurrency: string;
      customerCurrencyName: string;
      legacy: boolean;
      logistics: string;
      subscriptionId: string;
      customerID: string;
      customField1: string;
      customField2: string;
      customField3: string;
      customField4: string;
      ip: string;
      billingAccount: string;
      commModuleManufacturer: string;
      commModuleModel: string;
      supplServices: {
        vpn: boolean;
        location: boolean;
        dca: boolean;
        dim: boolean;
        advancedSupervision: boolean;
      };
      sgsnIP: string;
      ggsnIP: string;
      servicePack: string;
      staticIp: string;
      commercialGroup: string;
      subscriptionType: string;
      apn: string;
      masterId: string;
      masterName: string;
      customerId: string;
      aggregatorId: string;
      aggregatorName: string;
      staticApnIndex: number;
      apn0: string;
      apn1: string;
      apn2: string;
      apn3: string;
      apn4: string;
      apn5: string;
      apn6: string;
      apn7: string;
      apn8: string;
      apn9: string;
      staticIpAddress0: string;
      staticIpAddress1: string;
      staticIpAddress2: string;
      staticIpAddress3: string;
      staticIpAddress4: string;
      staticIpAddress5: string;
      staticIpAddress6: string;
      staticIpAddress7: string;
      staticIpAddress8: string;
      staticIpAddress9: string;
      basicServices: {
        voiceOriginatedHome: boolean;
        voiceOriginatedRoaming: boolean;
        voiceOriginatedInternational: boolean;
        voiceTerminatedHome: boolean;
        voiceTerminatedRoaming: boolean;
        smsOriginatedHome: boolean;
        smsOriginatedRoaming: boolean;
        smsOriginatedInternational: boolean;
        smsTerminatedHome: boolean;
        smsTerminatedRoaming: boolean;
        dataHome: boolean;
        dataRoaming: boolean;
      };
      iccid: string
      client: number
      clientName: string
      unit: number
      unitName: string
      accessPoint: string
      modem: string
      accessPointMAC: string
      repeaterMAC: string
      associationDate: string
      cityId: number
      stateId: number
    }[] | null
  }>
  ['/sims/set-sim-info']: (reqParams: {
    ICCID: string
    CLIENT?: number|null
    UNIT?: number|null
    ACCESSPOINT?: string|null
    OLDICCID?: string|null
    MODEM?: string|null
    MACACCESSPOINT?: string|null
    MACREPEATER?: string|null
    ASSOCIATION_DATE?: string|null
  }, session: SessionData) => Promise<{
    ID: number
    CLIENT?: number
    UNIT?: number
    ACCESSPOINT?: string
    MODEM?: string
    MACACCESSPOINT?: string
    MACREPEATER?: string
    ASSOCIATION_DATE?: string|null
  }>
  ['/sims/send-reset-request']: (reqParams: {
    iccid: string
    type: string
  }, session: SessionData) => Promise<{
    respostas: { iccid: string }[],
  }>

  ['/sims/get-unit-sims']: (reqParams: {
    unitId: number
  }, session: SessionData) => Promise<{
    ID: number
    ICCID: string
    CLIENT?: number
    UNIT?: number
    ACCESSPOINT?: string
    MODEM?: string
    MACACCESSPOINT?: string
    MACREPEATER?: string
    ASSOCIATION_DATE?: string|null
    NAME?: string|null
    IMAGES?: { name: string, url: string }[]
  }[]>

  ['/sims/delete-sim']: (reqParams: {
    ICCIDS: { ICCID: string, OLDICCID?: string }[],
  }, session: SessionData) => Promise<string>

  ['/sims/get-info-sim']: (reqParams: {
    ICCID: string
  }, session: SessionData) => Promise<{
    ID: number
    CLIENT?: number
    UNIT?: number
    ACCESSPOINT?: string
    MODEM?: string
    MACACCESSPOINT?: string
    MACREPEATER?: string
    ASSOCIATION_DATE?: string|null
  }>

  ['/devtools/run-command']: (reqParams: any, session: SessionData) => Promise<string>
  ['/devtools/processDacDay']: (reqParams: { dacId: string, dayYMD: string, histType: string, unitId?: number }, session: SessionData) => Promise<{}>
  ['/devtools/processDutDay']: (reqParams: { dutId: string, dayYMD: string, histType: string, unitId?: number }, session: SessionData) => Promise<{}>
  ['/devtools/processDamDay']: (reqParams: { damId: string, dayYMD: string, unitId?: number }, session: SessionData) => Promise<{}>
  ['/devtools/processDriDay']: (reqParams: { driId: string, driType: string, driInterval?: number, dayYMD: string }, session: SessionData) => Promise<{}>
  ['/devtools/processDmaDay']: (reqParams: { dmaId: string, dayYMD: string, unitId?: number }, session: SessionData) => Promise<{}>

  ['/devtools/send-email']: (reqParams: { emailBodyHtml: string, subject: string, cc?: string[] }, session: SessionData) => Promise<{}>

  ['/devtools/brokers-monitor-hist-v1']: (reqParams: { dayYMD: string }, session: SessionData) => Promise<{
    commonx: number[] // 0 - 86400
    records: any[]
  }>

  ['/devtools/brokers-monitor-disconnected-devs']: (reqParams: { tsStart: string, tsEnd: string }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/login/impersonate']: (reqParams: {
    fakeProfile?: {
      clients_v2?: {
        CLIENT_ID: number
        PERMS: string
        UNITS?: string|null
      }[]
      PERMS_U?: string
      CLBIND_ID?: number
    }
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    token: string
    user: string,
    name: string,
    lastName: string,
    permissions: UserPermissions,
    prefs: string,
    notifsby: 'email'|'telegram'|'email and telegram',
    phonenb: string,
}>

  ['/login/craft-token']: (reqParams: { userId: string }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    userProfile: {
      token: string,
      user: string,
      name: string,
      lastName: string,
      permissions: UserPermissions,
      prefs: string,
    }
  }>

  ['/login/craft-redirect-to-dash-token']: (reqParams: { topage: string }, session: SessionData) => Promise<{
    rdtoken: string,
    dashUrl: string,
  }>

  ['/login/craft-static-user-token']: (reqParams: { userId: string }, session: SessionData) => Promise<{
    sutoken: string,
  }>

  ['/users/send-tg-number-check']: (reqParams: { USER_ID: string, PHONENB: string }, session: SessionData) => Promise<string>

  ['/users/check-tg-number-code']: (reqParams: { USER_ID: string, TOKEN: string }, session: SessionData) => Promise<string>

  ['/clients/set-unit-supervisors']: (reqParams: { USER_ID: string, UNIT_ID: number, isBatch?: boolean }, session: SessionData) => Promise<string>

  ['/clients/get-unit-supervisors']: (reqParams: { UNIT_ID?: number, UNIT_IDS?: number[] }, session: SessionData) => Promise<{
    list: { USER_ID: string, UNIT_ID: number, EMAIL: string, NOME: string, SOBRENOME: string }[],
  }>

  ['/clients/get-supervisor-units']: (reqParams: { USER_ID: string }, session: SessionData) => Promise<{
    list: number[],
  }>

  ['/clients/clear-unit-supervisors']: (reqParams: { UNIT_ID: number }, session: SessionData) => Promise<string>

  ['/clients/add-client-class']: (reqParams: { CLIENT_ID: number, CLASS_TYPE: string, CLASS_NAME: string }, session: SessionData) => Promise<{
    CLASS_ID: number,
    CLASS_TYPE: string,
    CLASS_NAME: string,
    CLIENT_ID: number
  }>

  ['/clients/get-client-classes']: (reqParams: { CLIENT_ID: number }, session: SessionData) => Promise<{
    list: {
      CLASS_ID: number,
      CLASS_TYPE: string,
      CLASS_NAME: string,
    }[],
  }>

  ['/clients/get-classes-list']: (reqParams: { CLIENT_IDS?: number[] }, session: SessionData) => Promise<{
    list: {
      client: { CLIENT_ID: number, CLIENT_NAME: string },
      class: { CLASS_ID: number, CLASS_TYPE: string, CLASS_NAME: string },
      units: { UNIT_ID: number, UNIT_NAME: string }[]
    }[],
  }>

  ['/clients/edit-client-class']: (reqParams: {
    CLIENT_ID: number,
    CLASS_ID: number,
    CLASS_TYPE: string,
    CLASS_NAME: string,
  }, session: SessionData) => Promise<{
    class: {
      CLASS_ID: number,
      CLASS_TYPE: string,
      CLASS_NAME: string,
    },
    units: {
      UNIT_ID: number,
      UNIT_NAME: string,
    }[],
  }>

  ['/clients/remove-client-class']: (reqParams: { CLIENT_ID: number, CLASS_ID: number }, session: SessionData) => Promise<string>

  ['/clients/set-class-units']: (reqParams: { UNIT_IDS: number[], CLASS_ID: number, CLIENT_ID: number }, session: SessionData) => Promise<string>

  ['/clients/get-class-units']: (reqParams: { CLASS_ID: number, CLIENT_ID: number }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number,
      CLASS_ID: number,
      UNIT_NAME: string,
      UNIT_ID: number,
    }[],
  }>

  ['/log/query-dev-log']: (reqParams: {
    devId: string
    dynamoTable: string
    periodIni: string
    periodFin: string
  }, session: SessionData) => Promise<{
    data: {
      list: {
        devId: string
        ts: string
        topic: string
        payload: any
        userId?: string
      }[],
      continuesAfter: string,
      pars?: {},
    }
  }>

  ['/log/query-ddb-table']: (reqParams: {
    dynamoTable: string
    partName: string
    partValue: string
    sortName: string
    periodIni: string
    periodFin: string
  }, session: SessionData) => Promise<{
    list: any[],
    continuesAfter: string,
    pars?: {},
  }>

  ['/ness/get-meters-list']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      DUT_ID: string,
      UNIT_NAME: string,
      ROOM_NAME: string,
    }[]
  }>
  ['/ness/get-meter-history']: (reqParams: {
    dut_id: string,
    day_YMD: string,
  }, session: SessionData) => Promise<{
    Temperature?: {
        v: number[];
        c: number[];
    };
    Humidity?: {
        v: number[];
        c: number[];
    };
  }>

  ['/send-dut-aut-command']: (reqParams: {
    devId: string
    CMD_TYPE?: string
    IR_ID?: string
  }, session: SessionData) => Promise<{
    success?: boolean
    error?: string
  }>
  ['/write-dut-command-by-ircode']: (reqParams: {
    configs : {
      IR_ID : string,
      CMD_TYPE : string,
    }[],
    targetDutId : string,
  }, session : SessionData) => Promise<{
    success?: boolean,
    error?: string
  }>
  ['/resend-dut-ir-codes']: (reqParams: {
    devId: string
  }, session: SessionData) => Promise<{
    responses: { success?: boolean, error?: string }[]
  }>

  ['/request-dut-aut-config']: (reqParams: {
    devId: string
  }, session: SessionData) => Promise<{
    enabled: boolean,
    setpoint: number
    ctrl_mode: ControlMode
    LTC: number,
    LTI: number,
  }>

  ['/resend-dut-aut-config']: (reqParams: {
    devId: string
  }, session: SessionData) => Promise<{
    enabled: boolean,
    setpoint: number
    ctrl_mode: ControlMode
    LTC: number,
    LTI: number,
  }>

  ['/define-ircode-action']: (reqParams: {
    devId: string
    IR_ID: string
    CMD_TYPE: string
    CMD_DESC: string
    TEMPER: number
  }, session: SessionData) => Promise<string>

  ['/delete-dut-ircode']: (reqParams: {
    devId: string
    IR_ID: string
  }, session: SessionData) => Promise<string>

  ['/disable-dut-aut-commands']: (reqParams: {
    devId: string
    insertFakes: boolean
  }, session: SessionData) => Promise<{
    responses: { success?: boolean, error?: string }[]
  }>

  ['/get-dut-ircodes-list']: (reqParams: {
    devId: string
  }, session: SessionData) => Promise<{
    list: {
      IR_ID: string
      CMD_TYPE: string
      CMD_DESC: string
      TEMPER: number
    }[],
    dutCommandTypes: string[],
  }>

  ['/get-duts-ircodes-list']: (reqParams: {
    devIds: string[]
  }, session: SessionData) => Promise<{[key: string]:{
      list: {
        IR_ID: string
        CMD_TYPE: string
        CMD_DESC: string
        TEMPER: number
      }[],
      dutCommandTypes: string[],
  }}>

  ['/get-dut-ircodes-by-model'] : (reqParams: {
    devId : string,
  }, session : SessionData) => Promise<{
    list : {
      ircodes : {
        DUT_ID : string,
        IR_ID: string
        CMD_TYPE: string
        CMD_DESC: string
        TEMPER: number
      }[],
      dutCommandTypes: string[]
      model : string,
      DUT_ID: string
    }[]
  }>

  ['/dut/get-programming-v3']: (reqParams: { dutId: string }, session: SessionData) => Promise<FullProg_v4>
  ['/dut/set-programming-v3']: (reqParams: { dutId: string } & FullProg_v4, session: SessionData) => Promise<FullProg_v4>
  ['/dut/update-programming']: (reqParams: { dutId: string } & FullProg_v4, session: SessionData) => Promise<FullProg_v4>

  ['/devtools/export-dacs-info']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/devtools/export-duts-info']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/devtools/export-dams-info']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dri/export-chiller-alarms-hist']: (reqParams: {
    DEVICE_CODE: string,
    START_DATE: string,
    END_DATE: string,
    ORDER_BY?: { column: string, desc: boolean }
    filterBy?: { column: string, values: string[] }[]
    columnsToExport: string[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/get-integrations-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    unitIds?: number[]
    supplier?: 'diel'|'ness'|'greenant'|'coolautomation'|'laager'|'water'|'diel-dma'|'energy'|'water-virtual'
    stateIds?: string[],
    cityIds?: string[],
    status?: string[],
  }, session: SessionData) => Promise<{
    list: {
      STATE_ID: number // Estado
      STATE_NAME: string
      CITY_ID: string
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: 'Diel'|'NESS'|'GreenAnt'|'CoolAutomation'|'Laager'
      dataSource: string // fonte de dado (ID-GreenAnt)
      integrId: string
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
    }[],
    outputMsg?: string
  }>

  ['/get-integrations-list/water']: (reqParams: {
    clientIds?: number[]
    unitIds?: number[]
    INCLUDE_INSTALLATION_UNIT?: boolean
    stateIds?: string[],
    cityIds?: string[],
    status?: string[],
  }, session: SessionData) => Promise<{
    list: {
      STATE_ID: number // Estado
      STATE_NAME: string
      CITY_ID: string
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: 'Diel'|'Laager'
      dataSource: string // fonte de dado (ID-GreenAnt)
      integrId: string
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
    }[],
    outputMsg?: string
  }>

  ['/get-integrations-list/energy']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    clientIds?: number[]
    unitIds?: number[]
    stateIds?: string[],
    cityIds?: string[],
    status?: string[],
  }, session: SessionData) => Promise<{
    list: {
      STATE_ID: number // Estado
      STATE_NAME: string
      CITY_ID: string
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: 'Diel'|'GreenAnt'
      dataSource: string // fonte de dado (ID-GreenAnt)
      integrId: string
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
    }[],
    outputMsg?: string
  }>

  ['/get-integrations-list/laager']: (reqParams: {
    clientIds?: number[]
    unitIds?: number[]
    noStatus?: boolean
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      STATE_ID: number // Estado
      STATE_NAME: string
      CITY_ID: string
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: 'Laager'
      dataSource: string // fonte de dado (ID-GreenAnt)
      integrId: string
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
    }[],
    outputMsg?: string
  }>

  ['/get-integrations-list/laager-status']: (reqParams: {
    clientIds?: number[]
    unitIds?: number[]
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      integrId: string
      status: string // status
    }[],
  }>

  ['/get-integration-info']: (reqParams: {
    supplier: 'diel'|'ness'|'greenant'|'coolautomation'|'laager'|'diel-dma'|'water-virtual'
    integrId: string
    unitId?: number
  }, session: SessionData) => Promise<{
    info: {
      STATE_ID: string // Estado
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      establishmentName?: string
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: 'Diel'|'NESS'|'GreenAnt'|'CoolAutomation'|'Laager'
      dataSource: string // fonte de dado (ID-GreenAnt)
      integrId: string
      installationLocation?: string | null
      installationDate?: string | null
      hydrometerModel?: string | null
      totalCapacity?: number | null
      quantityOfReservoirs?: number | null
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
      automatedMachine?: string // máquina automatizada
      DEVICE_ID?: number
      CHILLER_ID?: number
    }
    cardsCfg?: string
    dri?: {
      varsCfg?: {
        application: string,
        protocol?: string,
        worksheetName: string,
        driConfigs: string,
      }[]
      chillerName: string, 
      application: string
      protocol: string
      worksheetName: string
      driConfigs?: {
        protocol?: string,
      }[],
      w_varsList: {
        name: string,
        address: {
          protocol?: string,
          machine?: number
          ip?: string
          id?: number
          function?: number
          address?: number
          values?: number[],
        },
      }[],
      varsList: {
        varId: string
        name: string
        value?: string
        address?: {
          protocol?: string,
          machine?: number
          ip?: string
          id?: number
          function?: number
          address?: number
          value?: string
        }
      }[],
      ecoCfg: {
        ENABLE_ECO: number
        ECO_CFG: string
        ECO_OFST_START: number
        ECO_OFST_END: number
        ECO_INT_TIME: number
        DUT_ID: string
      },
      automationCfg: {
        AUTOMATION_INTERVAL: number | null
      }
    }
    coolautomation?: {
      schedules: {
        days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[],
        isDisabled: boolean
        endActionType: number
        scheduleCategory: number
        dates: unknown[]
        name: string
        powerOnTime: number
        powerOffTime?: number
        operationMode?: number
        setpoint: number
        system?: string
        unit?: string
        units?: string[]
        unitName?: string
        id: string
      }[]
    }
  }>

  ['/get-integration-dri-info']: (reqParams: {
    integrId: string
  }, session: SessionData) => Promise<{
    dri: {
      protocol: string
      varsList: {
        varId: string
        name: string
        value?: string
        address?: {
          protocol?: string,
          machine?: number
          ip?: string
          id?: number
          function?: number
          address?: number
        }
      }[]
    }
  }>

  ['/get-integration-coolautomation-info']: (reqParams: {
    integrId: string
  }, session: SessionData) => Promise<{
    coolautomation: {
      schedules: {
        days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[],
        isDisabled: boolean
        endActionType: number
        scheduleCategory: number
        dates: unknown[]
        name: string
        powerOnTime: number
        powerOffTime?: number
        operationMode?: number
        setpoint: number
        system?: string
        unit?: string
        id: string
      }[]
    }
  }>

  ['/save-integration-info']: (reqParams: {
    supplier: string
    integrId: string
    cardsCfg?: string
    installationLocation?: string | null
    installationDate?: string | null
    hydrometerModel?: string | null
    totalCapacity?: number | null
    quantityOfReservoirs?: number | null
    clientId?: number | null
    unitId?: number | null
  }, session: SessionData) => Promise<{
    info: {
      STATE_ID: string // Estado
      CITY_NAME: string // cidade
      CLIENT_ID: number // Cliente
      CLIENT_NAME: string // Cliente
      UNIT_ID: number // unidade
      UNIT_NAME: string // unidade
      machineName: string // máquina
      roomName: string // ambiente
      vertical: string // vertical (energia, hvac, água)
      supplier: string // Fornecedor (GreenAnt, Ness, Diel)
      dataSource: string // fonte de dado (ID-GreenAnt)
      equipType: string // Tipo (físico, virtual)
      method: string // método (MQTT, api, bucket)
      status: string // status
    }
    cardsCfg?: string
    dri?: {
      protocol: string
      varsList: {
        varId: string
        name: string
        value?: string
        address?: {
          protocol?: string,
          machine?: number
          ip?: string
          id?: number
          function?: number
          address?: number
        }
      }[]
    }
  }>

  ['/get-ness-dashboard-url-for-unit']: (reqParams: {
    unitId: number
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{ url: string }>
  ['/ness-get-overview-data/json']: (reqParams: {
    unitId: number|string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    unitName: string
    dutsList: {
      CLIENT_ID: number
      UNIT_ID: number
      UNIT_NAME: string
      DEV_ID: string
      ROOM_NAME: string
      ISVISIBLE: number
      Temperature?: number
      temprtAlert?: 'low'|'high'|'good'|null
      TUSEMIN?: number
      TUSEMAX?: number
    }[]
    dacsList: {
      CLIENT_ID: number
      H_DATE: string
      DAC_ID: string
      DAC_NAME: string
      H_INDEX: number
      CITY_NAME: string
      STATE_ID: string
      UNIT_NAME: string
      UNIT_ID: number
      capacityKW?: number
    }[],
    machinesHealthNow: { green: number, yellow: number, red: number, orange: number, deactiv: number, others: number },
    machinesHealthBefore: { green: number, yellow: number, red: number, orange: number, deactiv: number, others: number },
  }>

  ['/devtools/broker-servers-status']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      address: string
      payload: any
    }[]
  }>

  ['/clients/add-new-room']: (reqParams: {
    CLIENT_ID: number
    UNIT_ID: number
    ROOM_NAME: string
  }, session: SessionData) => Promise<{
    info: {
      ROOM_ID: number
      CLIENT_ID: number
      UNIT_ID: number
      ROOM_NAME: string
    }
  }>
  ['/clients/get-rooms-list']: (reqParams: {
    clientIds?: number[]
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    list: {
      ROOM_ID: number
      CLIENT_ID: number
      UNIT_ID: number
      ROOM_NAME: string
    }[]
  }>
  ['/clients/edit-room']: (reqParams: {
    ROOM_ID: number
    ROOM_NAME?: string
  }, session: SessionData) => Promise<{
    info: {
      ROOM_ID: number
      CLIENT_ID: number
      UNIT_ID: number
      ROOM_NAME: string
    }
  }>
  ['/clients/set-room-progs-v2']: (reqParams: {
    ROOM_ID: number
    progs: {
      ON: FullProg_v4
      OFF: FullProg_v4
    }
    schedTurn: {
      numDays: number
      datRef: string // "YYYY-MM-DD"
      devs: {
        [devId: string]: ('ON'|'OFF')[]
      }
    }
  }, session: SessionData) => Promise<{
    success: true
    schedTurnStatus: boolean
  }>
  ['/clients/get-room-info-v2']: (reqParams: {
    ROOM_ID: number
  }, session: SessionData) => Promise<{
    info: {
      ROOM_ID: number
      CLIENT_ID: number
      UNIT_ID: number
      ROOM_NAME: string
      progs: null|{
        ON: FullProg_v4
        OFF: FullProg_v4
      }
      schedTurn: null|{
        numDays: number
        datRef: string // "YYYY-MM-DD"
        devs: {
          [devId: string]: ('ON'|'OFF')[]
        }
      }
    }
  }>
  ['/clients/remove-room']: (reqParams: {
    ROOM_ID: number
    UNIT_ID?: number
    CLIENT_ID?: number
  }, session: SessionData) => Promise<{
    count: number
  }>
  ['/clients/add-new-association']: (reqParams: {
    ASSOC_NAME: string,
    UNIT_ID: number,
    CLIENT_ID: number,
    GROUPS: {
      GROUP_ID: number,
      POSITION: number,
    }[],
  }, session: SessionData) => Promise<{
    ASSOC_ID: number;
    ASSOC_NAME: string;
    UNIT_ID: number;
    CLIENT_ID: number;
    GROUPS: {
        ASSOC_ID: number;
        GROUP_ID: number;
        POSITION: number;
        GROUP_NAME: string;
        DUT_ID: string;
        UNIT_ID: number;
        UNIT_NAME: string;
        CITY_NAME: string;
        STATE_ID: string;
        DEV_AUT: string;
    }[];
  }>
  ['/clients/get-associations-list']: (reqParams: {
    CLIENT_ID?: number
    UNIT_ID?: number
  }, session: SessionData) => Promise<{
    list: {
      GROUPS: {
        ASSOC_ID: number;
        GROUP_ID: number;
        POSITION: number;
        GROUP_NAME: string;
        DAM_ID: string;
        DEV_AUT: string;
        DUT_ID: string;
        UNIT_ID: number;
        UNIT_NAME: string;
        CITY_NAME: string;
        STATE_ID: string;
      }[];
      UNIT_ID: number;
      CLIENT_ID: number;
      ASSOC_ID: number;
      ASSOC_NAME: string;
    }[],
  }>
  ['/clients/get-association-info']: (reqParams: {
    ASSOC_ID: number
  }, session: SessionData) => Promise<{
    UNIT_ID: number;
    CLIENT_ID: number;
    ASSOC_ID: number;
    ASSOC_NAME: string;
    GROUPS: {
      ASSOC_ID: number;
      GROUP_ID: number;
      POSITION: number;
      GROUP_NAME: string;
      DEV_AUT: string;
      DUT_ID: string;
      UNIT_ID: number;
      UNIT_NAME: string;
      CITY_NAME: string;
      STATE_ID: string;
    }[]
  }>
  ['/clients/edit-association']: (reqParams: {
    ASSOC_ID: number
    UNIT_ID: number
    CLIENT_ID: number
    ASSOC_NAME?: string
    GROUPS?: { GROUP_ID: number, POSITION: number }[]
  }, session: SessionData) => Promise<{
    UNIT_ID: number;
    CLIENT_ID: number;
    ASSOC_ID: number;
    ASSOC_NAME: string;
    GROUPS: {
      ASSOC_ID: number;
      GROUP_ID: number;
      POSITION: number;
      GROUP_NAME: string;
      DEV_AUT: string;
      DUT_ID: string;
      UNIT_ID: number;
      UNIT_NAME: string;
      CITY_NAME: string;
      STATE_ID: string;
    }[]
  }>
  ['/clients/remove-association']: (reqParams: {
    ASSOC_ID: number
  }, session: SessionData) => Promise<string>
  ['/clients/get-client-units-disp']:(reqParams: {
    CLIENT_ID: number
    UNIT_ID?: number
    startDate: string
    endDate: string
  }, session: SessionData) => Promise<{
    [unitId: number]: {
        clientId: number;
        clientName: string;
        unitId: number;
        unitName: string;
        avgDisp: number;
        dispList: {
            disponibility: number;
            YMD: string;
        }[];
    };
  }>
  ['/clients/get-unit-devs-disp-v2']: (reqParams: {
    UNIT_ID: number
    startDate: string
    endDate: string
  }, session: SessionData) => Promise<{
      [devId: string]: {
          devId: string;
          startDate: string;
          endDate: string;
          clientName: string;
          unitName: string;
          groupName: string;
          roomName: string;
          avgDisp: number;
          dispList: {
              disponibility: number;
              YMD: string;
          }[];
      };
  }>

  ['/clients/multiple-configs-units']: (reqParams: {
    UNITS_IDS: {
      UNIT_ID: number,
      SUPERVISOR_ID: string,
    }[],
    TYPE: 'setStatus' | 'setWeeklyReport' | 'setResponsible'
    SELECTED: string | string[]
  }, session: SessionData) => Promise<string>

  ['/unit/export-real-time']: (reqParams: {
    EXPORTATION: string,
    UNIT_ID: number,
    DATA_MACHINE?: GroupItem[],
    DATA_SISTEM_MACHINE?: AssociationItem[],
    DATA_ENVIRONMENTS?: DutItem[],
    MODE: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/laager/get-meters-list']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      customer_id: string
      address: string
      rf_device_id: number
      meter_serial_number: string
      seal_number: string
      batery_state: string
      valve_status: string
      reading: number
      reading_date: string
      latitude: string
      longitude: string
    }[],
  }>
  ['/laager/associate-meter-to-diel-unit']: (reqParams: { unitId: number, meterId: string|null, changedByUnit?: boolean|null }, session: SessionData) => Promise<string>
  ['/laager/set-meter-info']: (reqParams: {
    meterId: string,
    unitId?: number,
    cardsCfg?: string,
    installationLocation?: string,
    installationDate?: string,
    totalCapacity?: number,
    quantityOfReservoirs?: number,
    hydrometerModel?: string,
    changedByUnit?: boolean,
  }, session: SessionData) => Promise<string>
  ['/laager/get-consumo']: (body: {
    type: string,
    unit_id: string
  }, session: SessionData) => Promise<{
    customer_id: string
    address: string
    rf_device_id: number
    meter_serial_number: string
    seal_number: string
    batery_state: string
    valve_status: string
    reading: number
    reading_date: string
    latitude: string
    longitude: string
  }>
  ['/laager/get-informations']: (body: {
    unit_id: string
  }, session: SessionData) => Promise<{
    module_rf: number
    batery_state: string
    meter_type: string
    current_usage: number
    day_usage: number
    last_reading_date: string
  }>
  ['/laager/get-reading-history']: (body: {
    unit_id: string
    start_date: string
    end_date: string
  }, session: SessionData) => Promise<{
    period_reading: number
    daily_average: number
    predicted: number
    history: {
      information_date: string
      reading: number
    }[]
  }>
  ['/laager/get-usage-history']: (body: {
    unit_id: string
    start_date: string
    end_date: string
  }, session: SessionData) => Promise<{
    period_usage: number
    daily_average: number
    predicted: number
    history: {
      information_date: string
      usage: number
      devId: string,
      estimatedUsage?: boolean
    }[]
  }>
  ['/laager/get-alarms-list']: (body: {
    date: string
  }, session: SessionData) => Promise<{
    list: {
      customer_id: string
      module_id: number
      code: string
      description: string
      triggered_at: string
    }[],
  }>

  ['/vt/set-vt-info']: (reqParams: {
    CLIENT_ID: string
    UNIT_ID: string
    TECNICO_ID: string
    VTDATE: string
    VTTIME: string
    AMBIENTES?: string
    MAQUINAS?: string
    CARACTERISTICA: string[] | string
    // PLANTABAIXA_IMG?: Blob[]
    // AUTORIZACAO_IMG?: Blob[]
    OBSERVACAO?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/vt/update-vt-info']: (reqParams: {
    ID: string
    CLIENT_ID?: string
    UNIT_ID?: string
    TECNICO_ID?: string
    VTDATE?: string
    VTTIME?: string
    AMBIENTES?: string
    MAQUINAS?: string
    CARACTERISTICA: string[] | string
    // PLANTABAIXA_IMG?: Blob[]
    // AUTORIZACAO_IMG?: Blob[]
    OBSERVACAO?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/vt/reschedule-vt']: (reqParams: {
    ID: string
    CLIENT_ID?: string
    UNIT_ID?: string
    TECNICO_ID?: string
    VTDATE?: string
    VTTIME?: string
    AMBIENTES?: string
    MAQUINAS?: string
    CARACTERISTICA: string[] | string
    // PLANTABAIXA_IMG?: Blob[]
    // AUTORIZACAO_IMG?: Blob[]
    OBSERVACAO?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/vt/get-vt-info']: (reqParams: {
    ID: number
  }, session: SessionData) => Promise<{
    ID: number
    CLIENT_ID: number
    UNIT_ID: number
    TECNICO_ID: string
    VTDATE: string
    VTTIME: string
    AMBIENTES?: number
    MAQUINAS?: number
    CARACTERISTICA: number[]
    PLANTABAIXA_IMG?: string[]
    AUTORIZACAO_IMG?: string[]
    OBSERVACAO?: string
    OBSERVACAO_REAGENDAMENTO?: string
    RESPONSAVEL?: string
    CITY_NAME?: string
    CLIENT_NAME?: string
    UNIT_NAME?: string
    UNIT_LAT?: string
    UNIT_LON?: string
    RESPONSAVEL_NOME?: string
    TECNICO_NOME?: string
    TECNICO_PHONE?: string
    CIDADE_TECNICO?: string
  }>

  ['/vt/list-vt-byStatus']: (reqParams: {
    STATUS_ID: number[]
  }, session: SessionData) => Promise<{
    ID: number
    CLIENT_ID: number
    UNIT_ID: number
    TECNICO_ID: string
    VTDATE: string
    VTTIME: string
    AMBIENTES: number
    MAQUINAS: number
    CARACTERISTICA: number[]
    PLANTABAIXA_IMG: string[]
    AUTORIZACAO_IMG: string[]
    OBSERVACAO: string
    OBSERVACAO_REAGENDAMENTO: string
    RESPONSAVEL: string
    CITY_NAME: string
    CLIENT_NAME: string
    UNIT_NAME: string
    UNIT_LAT: string
    UNIT_LON: string
    RESPONSAVEL_NOME: string
    RESPONSAVEL_PHONE: string
    TECNICO_NOME: string
    TECNICO_SOBRENOME: string
    TECNICO_PHONE: string
    CIDADE_TECNICO: string
    STATUS_ID: number
    STATUS: string
  }[]>

  ['/vt/list-vt-caracteristicas']: (reqParams: {
    STATUS_ID: number[]
  }, session: SessionData) => Promise<{
    ID: number
    CHARACTERISTIC: string
  }[]>

  ['/vt/approve-vt']: (reqParams: {
    ID: number
  }, session: SessionData) => Promise<string>

  ['/vt/delete-vt']: (reqParams: {
    ID: number
  }, session: SessionData) => Promise<string>

  ['/vt/technician-vt']: (reqParams: {
    ID: number
  }, session: SessionData) => Promise<{
    NOME: string
    SOBRENOME: string
    EMAIL: string
    RG: string
    TEC_PHONE: string
    COMMENTS: string
    CITY: string
    STATE: string
    CLIENT: string
    CNPJ: string
    CLIENT_PHONE: string
  }>

  ['/vt/pull']: (reqParams: {
    lastPulledAt: number // is a timestamp for the last time the client pulled changes from server (or null if first sync)
    schemaVersion: number // is the current schema version of the local database
    migration?: { from: number, tables: string[], columns: { table: string, columns: string[] }[] } // is an object representing schema changes since last sync (or null if up to date or not supported)
  }, session: SessionData) => Promise<{
    timestamp: number
    changes: {
      visits:{
        created: {
          id: number
          s_id: number
          client_id: number
          unit_id: number
          tecnico_id: string
          vtdate: string
          vttime: string
          ambientes: number
          maquinas: number
          caracteristica: string
          plantabaixa_image: string
          autorizacao_image: string
          observacao: string
          observacao_reagendamento: string
          responsavel: string
          city_name: string
          client_name: string
          unit_name: string
          unit_lat: string
          unit_lon: string
          responsavel_nome: string
          responsavel_phone: string
          tecnico_nome: string
          // TECNICO_SOBRENOME: string
          tecnico_phone: string
          cidade_tecnico: string
          status_id: number
          status: string
        }[],
        updated: any[],
        deleted: any[]
      }
    }
  }>

  ['/vt/push']: (reqParams: {
    lastPulledAt: number // is a timestamp for the last time the client pulled changes from server (or null if first sync)
    changes: { // valid changes object (READ THIS TO UNDERSTAND WHAT IS GOING TO BE INSIDE THIS ONJ -> https://nozbe.github.io/WatermelonDB/Advanced/Sync.html#implementing-your-sync-backend)
      visits: {
        updated: {
          s_id: string
          status_id: number
          data: string
        }[]
      }
    }
  }, session: SessionData) => Promise<{}> // The backend must only return the correct httpStatus, because watermelondb will use it to determine if the synchronization went well or if another synchronization must be done.

  ['/vt/upload-imgs']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/clients/get-distributors']: (reqParams: { CLIENT_ID?: number }, session: SessionData) => Promise<{
    distributors: {
      id: number,
      label: string,
      tag: string
    }[]
  }>

  ['/get-firmware-file/:fwStage/:fwFamily/:fileName']: (reqParams: {
    fwStage: string
    fwFamily: string
    fileName: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/energy/get-hist-infograph']: (reqParams: {
    start_time: string,
    end_time: string,
    intervalMin: number,
    devices: {
      energy_device_id: string
      unit_id?: number
      serial: string
      manufacturer: string
      model: string
      start_time: string
      end_time: string
      formulas?: {
        [key: string]: string
      },
      params?: string[],
    }[]
  }, session: SessionData) => Promise<{
    max_demand?: { value: number, timestamp: string }
    min_demand?: { value: number, timestamp: string }
    avg_demand?: number
    demands?: {
      timestamp: string;
      telemetries: {
        value: number;
        timestamp: string;
      }[];
      value: number;
      devices: {
        devId: string;
        value: number;
      }[];
    }[]
  }>
  ['/energy/get-demand-hist']: (reqParams: {
    START_DATE: string,
    END_DATE: string,
    UNIT_ID: number,
    ELECTRIC_CIRCUIT_IDS: number[]
  }, session: SessionData) => Promise<{
    max_demand?: { value: number, timestamp: string }
    min_demand?: { value: number, timestamp: string }
    avg_demand?: number
    demands?: {
      record_date: string;
      average_demand: number;
      max_demand: number;
      min_demand: number;
    }[]
  }>
  ['/energy/get-hist']: (reqParams: {
    energy_device_id?: string
    unit_id?: number
    serial?: string
    manufacturer?: string
    model?: string
    start_time: string
    end_time: string
    formulas?: {
      [key: string]: string
    },
    params?: string[],
  }, session: SessionData) => Promise<{
    energy_device_id: string
    serial: string
    manufacturer: string
    model: string
    data: {
      v_a?: number,
      v_b?: number,
      v_c?: number,
      v_ab?: number,
      v_bc?: number,
      v_ca?: number,
      i_a?: number,
      i_b?: number,
      i_c?: number,
      pot_at_a?: number,
      pot_at_b?: number,
      pot_at_c?: number,
      pot_ap_a?: number,
      pot_ap_b?: number,
      pot_ap_c?: number,
      pot_re_a?: number,
      pot_re_b?: number,
      pot_re_c?: number,
      v_tri_ln?: number,
      v_tri_ll?: number,
      pot_at_tri?: number,
      pot_ap_tri?: number,
      pot_re_tri?: number,
      demanda_at?: number,
      demanda_ap?: number,
      demanda_med_at?: number,
      en_at_tri?: number,
      en_re_tri?: number,
      fp_a?: number,
      fp_b?: number,
      fp_c?: number,
      fp?: number,
      freq?: number,
      timestamp: string,
    }[]
  }>
  ['/energy/get-stats']: (reqParams: {
    serial: string
    manufacturer: string
    start_time: string
    end_time: string
    stats_interval_hours: number
  }, session: SessionData) => Promise<{
    serial: string
    manufacturer: string
    data: {
      tens_a: {max: number, avg: number, min: number}
      tens_b: {max: number, avg: number, min: number}
      tens_c: {max: number, avg: number, min: number}
      curr_a: {max: number, avg: number, min: number}
      curr_b: {max: number, avg: number, min: number}
      curr_c: {max: number, avg: number, min: number}
      demanda: {max: number, avg: number, min: number}
      energia_ativa_tri: {max: number, avg: number, min: number}
      energia_reativa_tri: {max: number, avg: number, min: number}
      fp: {max: number, avg: number, min: number}
      start_timestamp: string
      end_timestamp: string
    }[]
  }>

  ['/energy/get-energy-info']: (reqParams: {
    SERIAL: string
    MANUFACTURER: string
  }, session: SessionData) => Promise<{
    info: {
      SERIAL: string
      MANUFACTURER: string
      ESTABLISHMENT_NAME?: string
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_ID: string
      CITY_NAME: string
      STATE_NAME: string
      STATE_ID: number
    }
  }>
  ['/energy/get-energy-list']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    filterByNull?: boolean,
    clientId?: number
    clientIds?: number[]
    stateId?: string,
    stateIds?: string[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    list: {
      ELECTRIC_CIRCUIT_ID: number
      ENERGY_DEVICE_ID: string
      SERIAL: string
      MODEL: string
      MANUFACTURER: string
      ESTABLISHMENT_NAME?: string
      CLIENT_ID: number
      CLIENT_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: number
      STATE_NAME: string
    }[]
  }>
  ['/energy/set-energy-info']: (reqParams: {
    ELECTRIC_CIRCUIT_ID?: number,
    ENERGY_DEVICES_INFO_ID?: number,
    SERIAL?: string
    MANUFACTURER: string
    MODEL: string
    DRI_ID?: string
    ESTABLISHMENT_NAME?: string
    DRI_CFG?: {
      driId: string
      application: string
      protocol: string
      modbusBaudRate?: string
      telemetryInterval?: string
      serialMode?: string
      parity?: string
      stopBits?: string
      capacityTc?: string
      worksheetName?: string
    }
    CLIENT_ID?: number | null
    UNIT_ID?: number | null
  }, session: SessionData) => Promise<string>

  ['/energy/set-energy-list-info']: (reqParams: {
    meters: {
      ELECTRIC_CIRCUIT_ID?: number,
      SERIAL?: string
      MANUFACTURER?: string
      MODEL?: string
      DRI_ID?: string
      ESTABLISHMENT_NAME?: string
      DRI_CFG?: {
        driId: string
        application: string
        protocol: string
        modbusBaudRate?: string
        telemetryInterval?: string
        serialMode?: string
        parity?: string
        stopBits?: string
        capacityTc?: string
        worksheetName?: string
      }
    }[],
    CLIENT_ID?: number | null
    UNIT_ID?: number | null
  }, session: SessionData) => Promise<string>

  ['/energy/delete-energy-info']: (reqParams: {
    SERIAL?: string
    MANUFACTURER: string
    DRI_ID?: string
    CLIENT_ID?: number | null
    UNIT_ID?: number | null
  }, session: SessionData) => Promise<string>

  ['/energy/get-energy-combo-opts']: (reqParams: {}, session: SessionData) => Promise<{
    manufacturersList: {
      MANUFACTURER_ID: number,
      NAME: string,
    }[]
    modelsList: {
      MODEL_ID: number,
      MANUFACTURER_ID: number,
      NAME: string,
    }[]
  }>

  ['/invoice/get-invoices']: (reqParams: {
    unit_id: number
    periodStart: string
    periodEnd: string
    baseline_id?: number
  }, session: SessionData) => Promise<{
    invoices: {
      month: string,
      periodFrom: string,
      periodUntil: string,
      totalCharges: number,
      totalMeasured: number,
      percentageTotalCharges: number,
      percentageTotalMeasured: number,
      baselinePrice: number,
      baselineKwh: number,
      percentageBaselinePrice: number,
      percentageBaselineKwh: number
    }[],
    messageError: string,
    maxTotalCharges: number,
    maxTotalMeasured: number,
  }>

  ['/invoice/get-invoice-pdf']: (reqParams: {
    unit_id: number,
    month: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/check-client-invoices-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: {
      UNIT_ID: number
      CONSUMER_UNIT: string
      DISTRIBUTOR_NAME: string
      ADDITIONAL_DISTRIBUTOR_INFO: string
      LOGIN: string
      PASSWORD: string
      LOGIN_EXTRA: string
      BASELINE_TEMPLATE: string
      JANUARY_PRICE: number
      JANUARY_KWH: number
      FEBRUARY_PRICE: number
      FEBRUARY_KWH: number
      MARCH_PRICE: number
      MARCH_KWH: number
      APRIL_PRICE: number
      APRIL_KWH: number
      MAY_PRICE: number
      MAY_KWH: number
      JUNE_PRICE: number
      JUNE_KWH: number
      JULLY_PRICE: number
      JULLY_KWH: number
      AUGUST_PRICE: number
      AUGUST_KWH: number
      SEPTEMBER_PRICE: number
      SEPTEMBER_KWH: number
      OCTOBER_PRICE: number
      OCTOBER_KWH: number
      NOVEMBER_PRICE: number
      NOVEMBER_KWH: number
      DECEMBER_PRICE: number
      DECEMBER_KWH: number
      key: string
      errors: { message: string }[]
    }[]
  }>

  ['/add-client-invoices-batch']: (reqParams: {
    CLIENT_ID: number
    invoices: {
      UNIT_ID: number
      CONSUMER_UNIT: string
      DISTRIBUTOR_NAME: string
      ADDITIONAL_DISTRIBUTOR_INFO: string
      LOGIN: string
      PASSWORD: string
      LOGIN_EXTRA: string
      key: string
      BASELINE_TEMPLATE: string
      JANUARY_PRICE: number
      JANUARY_KWH: number
      FEBRUARY_PRICE: number
      FEBRUARY_KWH: number
      MARCH_PRICE: number
      MARCH_KWH: number
      APRIL_PRICE: number
      APRIL_KWH: number
      MAY_PRICE: number
      MAY_KWH: number
      JUNE_PRICE: number
      JUNE_KWH: number
      JULLY_PRICE: number
      JULLY_KWH: number
      AUGUST_PRICE: number
      AUGUST_KWH: number
      SEPTEMBER_PRICE: number
      SEPTEMBER_KWH: number
      OCTOBER_PRICE: number
      OCTOBER_KWH: number
      NOVEMBER_PRICE: number
      NOVEMBER_KWH: number
      DECEMBER_PRICE: number
      DECEMBER_KWH: number
    }[]
  }, session: SessionData) => Promise<{
    added: {
      key: string
      sendToFourDocs?: boolean
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/clients/add-access-distributor']: (reqParams: {
    UNIT_ID: number
    CLIENT_ID: number
    DISTRIBUTOR_ID?: number|null
    ADDITIONAL_DISTRIBUTOR_INFO?: string|null
    CONSUMER_UNIT?: string|null
    LOGIN?: string|null
    PASSWORD?: string|null
    LOGIN_EXTRA?: string|null
    STATUS?: string|null
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    STATUS: string
  }>

  ['/clients/edit-access-distributor']: (reqParams: {
    UNIT_ID: number
    CLIENT_ID: number
    DISTRIBUTOR_ID?: number|null
    ADDITIONAL_DISTRIBUTOR_INFO?: string|null
    CONSUMER_UNIT?: string|null
    LOGIN?: string|null
    PASSWORD?: string|null
    LOGIN_EXTRA?: string|null
    STATUS?: string|null
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    STATUS: string
  }>

  ['/clients/get-access-distributor-info']: (reqParams: {
    UNIT_ID: number
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    DISTRIBUTOR_ID: number
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    STATUS: string
  }>

  ['/clients/get-baseline-templates']: (reqParams: {}, session: SessionData) => Promise<{
    baselineTemplates: {
      value: number,
      name: string,
      tag: string,
    }[]
  }>

  ['/clients/get-baseline-info']: (reqParams: {BASELINE_ID?: number, UNIT_ID?: number}, session: SessionData) => Promise<{
    UNIT_ID: number,
    BASELINE_ID: number,
    BASELINE_TEMPLATE_ID: number,
    BASELINE_TEMPLATE_TAG: string,
  }>

  ['/clients/add-baseline']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_TEMPLATE_ID: number,
  }, session: SessionData) => Promise<{
    UNIT_ID: number,
    BASELINE_ID: number,
    BASELINE_TEMPLATE_ID: number,
    BASELINE_TEMPLATE_TAG: string,
  }>

  ['/clients/edit-baseline']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
    BASELINE_TEMPLATE_ID: number,
  }, session: SessionData) => Promise<{
    UNIT_ID: number,
    BASELINE_ID: number,
    BASELINE_TEMPLATE_ID: number,
    BASELINE_TEMPLATE_TAG: string,
  }>

  ['/clients/set-baseline-values']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
    baselineValues:{
      BASELINE_MONTH: number,
      BASELINE_KWH: number,
      BASELINE_PRICE: number,
    }[]
  }, session: SessionData) => Promise<{
    BASELINE_ID: number,
  }>

  ['/clients/get-baseline-values']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
  }, session: SessionData) => Promise<{
    BASELINE_MONTH: number,
    BASELINE_PRICE: number,
    BASELINE_KWH: number
  }[]>

  ['/clients/get-baselines-invoice']: (reqParams: {
    CLIENT_ID: number,
    UNIT_ID: number,
    BASELINE_ID: number,
    MONTH: string,
    BASELINE_TEMPLATE_TAG: string,
    QUANTY_DAYS_MONTHS: number,
  }, session: SessionData) => Promise<{
    BASELINE_PRICE: number,
    BASELINE_KWH: number
  }>

  ['/clients/get-client-assets-by-group']: (reqParams: {
    clientIds?: number[],
    unitIds?: number[],
    GROUP_ID: number
  }, session: SessionData) => Promise<{
    GROUP_ID: number,
    GROUP_NAME: string,
    DEV_AUT: string,
    DAM_ID: string,
    DUT_ID: string,
    assets: {
      ASSET_ID: number,
      DAT_ID: string,
      AST_TYPE: string,
      AST_DESC: string,
      DEV_ID: string,
      DEVICE_ID: number|null,
      H_INDEX: number|null,
      AST_ROLE: number,
      AST_ROLE_NAME: string,
      INSTALLATION_DATE: string,
      DAT_INDEX: number,
      MCHN_BRAND: string,
      CAPACITY_PWR: number,
      CAPACITY_UNIT: string,
      FLUID_TYPE: string,
      MCHN_MODEL: string,
      PLACEMENT: string | null,
    }[]
  }>

  ['/clients/get-client-asset']: (reqParams: {
    clientIds?: number[],
    DAT_ID?: string
    ASSET_ID?: number
  }, session: SessionData) => Promise<{
    asset: {
      ASSET_ID: number,
      DAT_ID: string,
      AST_TYPE: string,
      AST_DESC: string,
      DEV_ID: string,
      DEVICE_ID: number|null,
      H_INDEX: number|null,
      AST_ROLE: number,
      AST_ROLE_NAME: string,
      INSTALLATION_DATE: string,
      DAT_INDEX: number,
      MCHN_BRAND: string,
      CAPACITY_PWR: number,
      CAPACITY_UNIT: string,
      FLUID_TYPE: string,
      MCHN_MODEL: string,
    }
  }>
  // rota para o luan rodar o script, rota temporaria
  ['/clients/route-insert-health-dut-duo']: (_reqParams: {}, session: SessionData) => Promise<void>

  ['/clients/get-group-info']: (reqParams: {
    GROUP_ID: number
  }, session: SessionData) => Promise<{
    GROUP_ID: number,
    GROUP_NAME: string,
    UNIT_NAME: string,
    UNIT_ID: number,
    CLIENT_ID: number,
    DAM_DAT_BEGMON: string,
    MODEL: string,
    INSTALLATION_DATE: string,
    AUTOM_ID: string,
    AUTOM_DEVICE_ID?: number,
    FLUID_TYPE: string,
    MCHN_BRAND: string,
  }>

  ['/invoice/get-invoices-overview']: (reqParams: {
    unitIds?: number[]
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    periodStart: string
    periodEnd: string
  }, session: SessionData) => Promise<{
    invoicesTotal: {
      month: string,
      totalCharges: number,
      totalMeasured: number,
      percentageTotalCharges: number,
      percentageTotalMeasured: number,
      percentageInvoices: number,
    }[],
    maxTotalCharges: number,
    maxTotalMeasured: number,
    measurementUnit: string,
    unitsInvoice: {
      unitId: number,
      unitName: string,
      totalCharges: number,
      totalBaselineCharges: number,
      variationCharges: number,
      totalMeasured: number,
      totalBaselineMeasured: number,
      variationMeasured: number,
    }[]
  }>

  ['/clients/get-machines-list']: (reqParams: {
    clientIds?: number[],
    unitIds?: number[],
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    GROUP_ID: number
    GROUP_NAME: string
    DEV_AUT: string | null
    DEV_AUTO: string
    DAM_ID: string
    DUT_ID: string
    UNIT_ID: number
    UNIT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    MODEL: string | null
    INSTALLATION_DATE: string|null
    GROUP_TYPE: string|null
    BRAND: string|null
    FRIGO_CAPACITY: number|null
    FRIGO_CAPACITY_UNIT: string|null
    FLUID_TYPE: string|null
    RATED_POWER: number|null
    DEVS_COUNT: number
    ASSETS_COUNT: number
    MCHN_APPL: string | null
    MACHINE_RATED_POWER: number
    assets: Asset[]
  }[]>

  ['/clients/get-machines-list-overview-v2']: (reqParams: ParamsOverview, session: SessionData) => Promise<{
    count: {
      total: number
      online: number
      offline: number
    },
  }>

  ['/clients/get-all-clients']: (reqParams: {
    FILTER_BY_CLIENT_IDS?: number[]
  }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number
      CLIENT_NAME: string
    }[],
  }>

  ['/clients/get-all-units-by-client']: (reqParams: {
    CLIENT_ID: number
    UNITS_WITH_OTHERS_TIMEZONES?: boolean
    FILTER_BY_UNIT_IDS?: number[]
    FILTER_BY_PRODUCTION_TIMESTAMP_DATE?: string
  }, session: SessionData) => Promise<{
    list: {
      UNIT_ID: number
      UNIT_NAME: string
      CLIENT_NAME: string
      CITY_NAME?: string
      STATE_NAME?: string
      PRODUCTION_TIMESTAMP?: string
      TARIFA_KWH?: number
      CONSTRUCTED_AREA?: number
      CAPACITY_POWER?: number
    }[],
  }>

  ['/four-docs/get-login-data']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      access_points: any[],
      providers: any[]
    }
  }>

  ['/device-simulator/newSimulation']: (reqParams: Simulation, session: SessionData) => Promise<any>
  ['/device-simulator/listSimulations']: (reqParams: {}, session: SessionData) => Promise<any>
  ['/device-simulator/startSimulation']: (reqParams: { machineId: string }, session: SessionData) => Promise<any>
  ['/device-simulator/deleteSimulation']: (reqParams: { machineId: string }, session: SessionData) => Promise<any>

  ['/dut/set-dut-schedules']: (reqParams: {
    CLIENT_ID?: number|null
    UNIT_ID?: number|null
    DUT_ID: string
    NEED_MULT_SCHEDULES: boolean
    schedules: {
      DUT_SCHEDULE_ID?: number
      DELETE: boolean
      SCHEDULE_TITLE: string
      SCHEDULE_STATUS: boolean
      PERMISSION: 'allow'|'forbid'
      BEGIN_TIME: string
      END_TIME: string
      CTRLOPER: ControlMode
      DAYS: {
          mon: boolean
          tue: boolean
          wed: boolean
          thu: boolean
          fri: boolean
          sat: boolean
          sun: boolean
      }
      SETPOINT?: number|null
      LTC?: number|null
      LTI?: number|null
      UPPER_HYSTERESIS?: number|null
      LOWER_HYSTERESIS?: number|null
      SCHEDULE_START_BEHAVIOR?: string|null
      SCHEDULE_END_BEHAVIOR?: string|null
      FORCED_BEHAVIOR?: string|null
      IR_ID_COOL?: string|null
      ACTION_MODE?: string|null
      ACTION_TIME?: number|null
      ACTION_POST_BEHAVIOR?: string|null
    }[]
  }, session: SessionData) => Promise<{schedules: {
      DUT_SCHEDULE_ID?: number
      SCHEDULE_TITLE: string
      SCHEDULE_STATUS: boolean
      BEGIN_TIME: string
      END_TIME: string
      CTRLOPER: ControlMode
      PERMISSION: 'allow'|'forbid'
      DAYS: {
          mon: boolean
          tue: boolean
          wed: boolean
          thu: boolean
          fri: boolean
          sat: boolean
          sun: boolean
      }
      SETPOINT?: number
      LTC?: number
      LTI?: number
      UPPER_HYSTERESIS?: number
      LOWER_HYSTERESIS?: number
      SCHEDULE_START_BEHAVIOR?: string
      SCHEDULE_END_BEHAVIOR?: string
      FORCED_BEHAVIOR?: string
      ACTION_MODE?: string|null
      ACTION_TIME?: number|null
      ACTION_POST_BEHAVIOR?: string|null
  }[]}>

  ['/dut/get-dut-schedules']: (reqParams: {
    CLIENT_ID?: number,
    UNIT_ID?: number,
    DUT_ID: string,
  }, session: SessionData) => Promise<{
    schedules: ScheduleDut[]
  }>

  ['/dut/get-dut-exceptions']: (reqParams: {
    CLIENT_ID?: number,
    UNIT_ID?: number,
    DUT_ID: string,
  }, session: SessionData) => Promise<{
    exceptions: ExceptionDut[]
  }>

  ['/dut/set-temperature-sensors']: (reqParams: {
    devId: string,
    value: number,
    placement: string,
  }, session: SessionData) => Promise<{
    dev_id: string,
  }>

  ['/dut/set-dut-exceptions']: (reqParams: {
    CLIENT_ID: number|null
    UNIT_ID: number|null
    DUT_ID: string
    exceptions: {
      DELETE: boolean
      DUT_EXCEPTION_ID?: number
      EXCEPTION_TITLE: string
      REPEAT_YEARLY: boolean
      EXCEPTION_DATE: string
      BEGIN_TIME: string
      END_TIME: string
      PERMISSION: 'allow'|'forbid'
      EXCEPTION_STATUS_ID: number
      CTRLOPER: ControlMode
      SETPOINT?: number|null
      LTC?: number|null
      LTI?: number|null
      UPPER_HYSTERESIS?: number|null
      LOWER_HYSTERESIS?: number|null
      SCHEDULE_START_BEHAVIOR?: string|null
      SCHEDULE_END_BEHAVIOR?: string|null
      FORCED_BEHAVIOR?: string|null
      IR_ID_COOL?: string|null
      ACTION_MODE?: string|null
      ACTION_TIME?: number|null
      ACTION_POST_BEHAVIOR?: string|null
    }[]
  }, session: SessionData) => Promise<{
    exceptions: {
      DUT_EXCEPTION_ID?: number
      EXCEPTION_TITLE: string
      REPEAT_YEARLY: boolean
      EXCEPTION_DATE: string
      BEGIN_TIME: string
      END_TIME: string
      PERMISSION: 'allow'|'forbid'
      EXCEPTION_STATUS_ID: number
      CTRLOPER: ControlMode
      SETPOINT?: number
      LTC?: number
      LTI?: number
      UPPER_HYSTERESIS?: number
      LOWER_HYSTERESIS?: number
      SCHEDULE_START_BEHAVIOR?: string
      SCHEDULE_END_BEHAVIOR?: string
      FORCED_BEHAVIOR?: string
    }[]
  }>

  ['/dut/get-compatibility-list']: (reqParams: {
    dutIds: string[]
    CTRLOPER?: ControlMode
    FORCED_BEHAVIOR?: string
  }, session: SessionData) => Promise<{
    dutsCompatibility: {
      DUT_ID: string,
      compatible: boolean
    }[]
  }>

  ['/dam/set-local-setpoint']: (reqParams: {
    DAM_ID: string
    SETPOINT: number
  }, session: SessionData) => Promise<{
    DAM_ID: string
    SETPOINT: number
  }>

  ['/check-client-unified-batch']: (reqParams: {
    CLIENT_ID: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    list: (UnifiedBatch&{
      errors: { message: string }[]
    })[]
    tableCols: string[],
    tableColsAdditionalParameters: string[]
  }>

  ['/add-client-unified-batch']: (reqParams: {
    CLIENT_ID: number
    datas: UnifiedBatch[]
  }, session: SessionData, extra:ExtraRouteParams) => Promise<{
    added: {
      key: string
    }[]
    ignored?: {
      key: string
      reason: string
    }[]
  }>

  ['/export-client-unified-batch-input']: (reqParams: {
    clientId: number,
    units: number[],
    typeOfSolutions: string[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/unified/export-unified-example']: (
    reqParams: {},
    session: SessionData,
    extra: ExtraRouteParams
  ) => Promise<BinaryRouteResponse>

  ['/mainservice/notifications/view-notification']: (reqParams: { notificationId: number }, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/mainservice/notifications/view-all-notifications']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<string>

  ['/mainservice/notifications/get-notifications']: (reqParams: {
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
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
      notifications: {
        id: number;
        typeName: string;
        dateSend: string;
        energy?: {
          detections: {
            dateDetection: string;
            unitId: number;
            unitName: string;
            clientName: string;
            consumption: number;
          }[];
          setpoint: number;
          isGreater: boolean;
          isInstantaneous: boolean;
        };
        water?: {
          detections: {
            dateDetection: string;
            unitId: number;
            unitName: string;
            clientName: string;
            consumption: number;
          }[];
          isInstantaneous: boolean;
        };
        machineHealth?: {
          detections: {
            dateDetection: string;
            unitId: number;
            unitName: string;
            clientName: string;
            machineName: string;
            machineId: number;
            assetName: string;
            assetId: number;
            deviceCode: string;
            report: string;
          }[];
          isInstantaneous: boolean;
          healthIndex: number;
          healthIndexName: string;
        };
      }[],
      totalItems: number
    }>

  ['/mainservice/notifications/get-count-notifications']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<number>

  ['/mainservice/get-units-list']: (reqParams: {
    stateIds?: string[]
    cityIds?: string[]
    clientIds?: number[]
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    UNIT_ID: number
    UNIT_NAME: string
  }[]>

  ['/permissions/get-permissions-on-unit']: (reqParams: {
    CLIENT_ID: number
    UNIT_ID: number
  }, session: SessionData) => Promise<{
    canManageDevs: boolean,
    canViewDevs: boolean,
    canChangeDeviceOperation: boolean,
    canManageObservations: boolean,
    canViewObservations: boolean,
    canManageSketches: boolean,
  }>

  ['/devices/get-client-unit']: (reqParams: {
    deviceId: number
  }, session: SessionData) => Promise<{
    clientId: number|null,
    unitId: number|null
  }>

  ['/simcards/get-client-unit']: (reqParams: {
    simcardId: number
  }, session: SessionData) => Promise<{
    clientId: number|null,
    unitId: number|null
  }>

  ['/laager/get-client-unit']: (reqParams: {
    laagerId: number
  }, session: SessionData) => Promise<{
    clientId: number|null,
    unitId: number|null
  }>
  ['/laager/get-history-list']: (reqParams: {
    LAAGER_CODE: string
    FILTER_BY_HISTORY_DATE: string
  }, session: SessionData) => Promise<{
    history: {
      date: string,
      usage: number,
      reading: number,
      readings_per_day: {
          time: string,
          reading: number,
          usage: number,
      }[]
    }[]
  }>

  ['/mainservice/api-registries']: (body: {
    clientId: number,
    clientName: string,
    title: string,
    unitRelations?: {
      unitName: string,
      unitId: number;
    }[];
    notifyCondition: 'HEALTH_INDEX',
    healthStatus: 'RED' | 'RED_OR_ORANGE' | 'NOT_GREEN',
    integrationType: 'GOOGLE' | 'CELSIUS',
    triggerId: string,
    isTest: boolean
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{}>

  ['/mainservice/api-registries/delete-apis']: (reqParams: {
    ids: number[]
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{}>


  ['/mainservice/api-registries/get-apis']: (reqParams: {
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
    page?: number
    limit?: number
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
      apis: {
        ID: number;
        CLIENT_ID: number;
        CLIENT_NAME: string;
        HEALTH_STATUS: string;
        INTEGRATION_TYPE: string;
        ApiUnitRelations: {
          UNIT_ID: number;
        }[];
        NOTIFY_CONDITION: string;
        STATUS: string;
        TITLE: string;
        TRIGGER_ID: number;
        IS_TEST: boolean
      }[];
      totalItems: number;
    }>

    ['/mainservice/api-registries/get-combo-opts']: (reqParams: {}, session: SessionData, extra: ExtraRouteParams) => Promise<{
      CLIENTS: { CLIENT_ID: number; CLIENT_NAME: string }[];
      ApiUnitRelations: { UNIT_ID: number; UNIT_NAME: string }[];
      TITLES: string[];
      TRIGGER_IDS: string[];
    }>

    ['/mainservice/api-registries/update-api']: (
      reqParams: {
        id: number,
        body: Partial<{
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
        }>
      },
      session: SessionData,
      extra: ExtraRouteParams
    ) => Promise<{
      ID: number;
      CLIENT_ID: number;
      CLIENT_NAME: string;
      TITLE: string;
      UNIT_IDS: number[];
      NOTIFY_CONDITION: 'HEALTH_INDEX';
      HEALTH_STATUS: 'RED' | 'RED_OR_ORANGE' | 'NOT_GREEN';
      INTEGRATION_TYPE: 'GOOGLE' | 'CELSIUS';
      TRIGGER_ID: string;
      STATUS: boolean;
    }>

  // []: (reqParams: {}, session: SessionData) => Promise<string>
}

export interface API_private2 {
  ['/automation-overview-card']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    CLIENT_IDS?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    automationStats: {
      automated: { machines: number, powerTR: number },
      notAutomated: { machines: number, powerTR: number },
      dacAutomation: { machines: number, powerTR: number },
      damAutomation: { machines: number, powerTR: number },
      dutAutomation: { machines: number, powerTR: number },
      scheduleOnly: { machines: number, powerTR: number },
      ecoOnly: { machines: number, powerTR: number },
      scheduleAndEco: { machines: number, powerTR: number },
      noEcoNoSched: { machines: number, powerTR: number },
    }
  }>
  ['/health-overview-card']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    atDayYMD?: string
    clientIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
    unitIds?: number[]
  }, session: SessionData) => Promise<{
    health: {
      green: number
      yellow: number
      orange: number
      red: number
      deactiv: number
      others: number
    }
    powerTR: {
      green: number
      yellow: number
      orange: number
      red: number
      deactiv: number
      others: number
    }
  }>
  ['/overview-card-rooms']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    historyOnly?: boolean
    days?: string[]
    clientIds?: number[]
    unitIds?: number[]
    stateIds?: number[]
    cityIds?: string[]
  }, session: SessionData) => Promise<{
    list: {
      day: string
      high: number
      low: number
      good: number
      others: number
      invisible: number
      dutsList?: {
        DEV_ID: string
        ROOM_NAME: string
        TUSEMIN: number
        TUSEMAX: number
        med: number
        max: number
        min: number
        temprtAlert: 'low'|'high'|'good'|null
      }[],
    }[]
    currentData: {
      day: string
      high: number
      low: number
      good: number
      others: number
      invisible: number
      dutsList?: {
        DEV_ID: string
        ROOM_NAME: string
        TUSEMIN: number
        TUSEMAX: number
        tpstats?: { med: number, max: number, min: number }
        temprtAlert: 'low'|'high'|'good'|null,
      }[],
    }
  }>
  ['/overview-rooms-list']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
    stateId?: number,
    stateIds?: number[],
    cityId?: string,
    cityIds?: string[],
    unitId?: number,
    unitIds?: number[],
    SKIP?: number,
    LIMIT?: number,
    includeMeanTemperature?: boolean
    checkQuantiyToMeanTemperature?: boolean
    INCLUDE_INSTALLATION_UNIT?: boolean
  }, session: SessionData) => Promise<{
    list: {
      CLIENT_ID: number
      UNIT_ID: number
      UNIT_NAME: string
      DEV_ID: string
      ROOM_NAME: string
      ISVISIBLE: number
      Temperature?: number
      temprtAlert?: 'low'|'high'|'good'|null
      TUSEMIN?: number
      TUSEMAX?: number
      PLACEMENT?: string
    }[]
    totalItems: number
  }>

  ['/dut/get-day-stats']: (reqParams: {
    devId: string
    dayIni: string
    numDays: number
  }, session: SessionData) => Promise<{
    min?: number
    max?: number
    med?: number
  }>
  ['/dut/get-day-charts-data']: (reqParams: {
    devId: string
    day: string
    selectedParams: string[]
  }, session: SessionData) => Promise<{
    Temperature?: { v: number[], c: number[] }
    Temperature_1?: { v: number[], c: number[] }
    Humidity?: { v: number[], c: number[] }
    eCO2?: { v: number[], c: number[] }
    TVOC?: { v: number[], c: number[] }
    L1?: { v: number[], c: number[] }
    provision_error?: boolean
    daySched?: {
      TUSEMAX: number,
      TUSEMIN: number,
      indexIni: number,
      indexEnd: number,
    },
    hoursOnL1?: number,
    numDeparts?: number,
    hoursOffL1?: number
  }>
  ['/dut/get-usage-per-day']: (reqParams: {
    dutId: string
    datIni: string
    numDays: number
  }, session: SessionData) => Promise<{
    list: {
      numDeparts: number
      hoursOnL1: number
      hoursOffL1: number
      day: string
    }[]
  }>
  ['/dut/get-usage-per-month']: (reqParams: {
    dutId: string,
    datIni: string,
    numMonths: number
  }, session: SessionData) => Promise<{
    list: {
      month: string,
      hoursOnL1: number,
      hoursOffL1: number,
      numDeparts: number
    }[]
  }>
  ['/dut/get-day-consumption']: (reqParams: {
    dutId: string
    day: string
  }, session: SessionData) => Promise<{
    consumption: number[]
  }>
  ['/dut/get-duts-duo-energy-efficiency']: (reqParams: {
    unitId: number,
    dateStart?: string,
    dateEnd?: string,
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      DAC_KW: number
      ASSET_NAME: string
      GROUP_NAME: string
      GROUP_ID: number
      status: string
      CONSUMPTION?: {
        DAT_REPORT: string;
        DAY_HOURS_ON: number;
        meanT: number;
        maxT: number;
        minT: number;
      }[]
    }[]
  }>
  ['/dut/get-day-charts-data-commonX']: (reqParams: {
    devId: string
    day: string
    selectedParams: string[]
    numDays: number
  }, session: SessionData) => Promise<{
    axisInfo: {
      TVOCLimits: [number, number];
      co2Limits: [number, number];
      humLimits: [number, number];
      tempLimits: [number, number];
    };
    Humidity: { y: number[] };
    Temperature: { y: number[] };
    Temperature_1: { y: number[] };
    eCO2: { y: number[] };
    commonX: number[];
    daySched?: {
      TUSEMAX: number,
      TUSEMIN: number,
      indexIni: number,
      indexEnd: number,
    },
  }>
  ['/get-autom-day-charts-data']: (reqParams: {
    devId: string
    day: string
  }, session: SessionData) => Promise<{
    prog: { v: number[], c: number[], labels: string[] }
    Mode: { v: number[], c: number[], labels: string[] }
    State: { v: number[], c: number[], labels: string[] }
    ecoCmd: { v: number[], c: number[], labels: string[] }
    damTemperature: { v: number[], c: number[]; }
    damTemperature_1: { v: number[], c: number[]; }
    provision_error: boolean
    humidity?: { v: number[], c: number[] }
    asTable: {
      c: number[],
      prog: number[],
      Mode: number[],
      State: number[],
      ecoCmd: number[],
      dacsCols: string[]
      dacsRows: number[][]
      labels_State: string[]
    }
    dacsL1: {
      [groupId: string]: {
        [dacId: string]: {
          v: number[];
          c: number[];
          hoursOn?: number;
          periodLcmp?: number;
        }
      }
    }
    dutsTemprt: {
      dutId: string
      Temperature: {
        v: number[];
        c: number[];
      }
      Temperature_1: {
        v: number[];
        c: number[];
      }
      l1: {
        v: number[];
        c: number[];
      }
      daySched: {
        TUSEMAX: number;
        TUSEMIN: number;
        LTI?: number;
        MODE?: string | null;
        ACTION_MODE?: string | null;
        ACTION_POST_BEHAVIOR?: string | null;
        indexIni: number;
        indexEnd: number;
      }
      isDutDuo: boolean;
    }[]
    daySched: {
      type: 'allow' | 'forbid';
      startHM: string;
      endHM: string;
      indexIni: number;
      indexEnd: number;
    }
    dacsInfo: {
      [dacId: string]: {
        DAC_KW: number
      }
    }
    groupsInfo: {
      [groupId: string]: {
        GROUP_NAME: string
      }
    }
    damSelfRefInfo?: {
      MAXIMUM_TEMPERATURE: number;
      MINIMUM_TEMPERATURE: number;
      SETPOINT: number;
    }
    setpointHist?: {
      v: number[],
      c: number[],
      labels: string[]
    }
    unitInfo: { greenAntCons_kWh: number, averageTariff: number }
    automInfo: { FU_NOM: number },
  }>
  ['/dac/get-day-charts-data']: (reqParams: {
    dacId: string
    day: string
    selectedParams: string[]
  }, session: SessionData) => Promise<{
    Lcmp?: { v: number[], c: number[] }
    Levp?: { v: number[], c: number[] }
    Lcut?: { v: number[], c: number[] }
    Psuc?: { v: number[], c: number[] }
    Pliq?: { v: number[], c: number[] }
    Tamb?: { v: number[], c: number[] }
    Tsuc?: { v: number[], c: number[] }
    Tliq?: { v: number[], c: number[] }
    Tsc?: { v: number[], c: number[] }
    Tsh?: { v: number[], c: number[] }
    numDeparts: number
    hoursOn: number
    hoursOff: number
    hoursBlocked: number
    provision_error?: boolean
    faults?: { [faultName : string]: { v: number[], c: number[] } }
  }>
  ['/dac/get-charts-data-common']: (reqParams: {
    dacId: string
    dayYMD: string
    selectedParams: string[]
    numDays?: number
    usePsi?: boolean,
    isFanCoil?: boolean,
    hasAutomation?: boolean,
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: any;
    limts: {
      maxPval: number
      maxTval: number
      minPval: number
      minTval: number
    };
    numDeparts: number[];
  }>
  ['/dac/get-day-consumption']: (reqParams: {
    dacId: string
    day: string
  }, session: SessionData) => Promise<{
    consumption: number[]
    meanT: number[]
    maxT: number[]
    minT: number[]
  }>
  ['/dac/update-history-psuc-virtual']: (reqparams: {
    dacsId: string[],
    dateInit: string,
    dateFinish: string,
    CLIENT_NAME?: string,
    UNIT_ID?: number,
    CITY_ID?: number,
    STATE_NAME?: string,
    last_calculated_date?: string
  }, session: SessionData) => Promise<void>
  ['/dac/get-recent-history']: (reqParams: {
    dacId: string,
    intervalLength: number
  }, session: SessionData) => Promise<{
    data: {
      initialTimestamp: string;
      timeAxis: number[];
      Lcmp?: number[];
      Levp?: number[];
      Lcut?: number[];
      Tamb?: number[];
      Tsuc?: number[];
      Tliq?: number[];
      Psuc?: number[];
      Pliq?: number[];
      Tsh?: number[];
      Tsc?: number[];
    }
  }>
  ['/dac/get-recent-history-v2']: (reqParams: {
    dacId: string,
    intervalLength_s: number
  }, session: SessionData) => Promise<{
    data: {
      initialTimestamp: string;
      timeAxis: number[];
      Lcmp?: number[];
      Levp?: number[];
      Lcut?: number[];
      Tamb?: number[];
      Tsuc?: number[];
      Tliq?: number[];
      Psuc?: number[];
      Pliq?: number[];
      Tsh?: number[];
      Tsc?: number[];
    }
  }>

  ['/dri/get-day-charts-data-common']: (reqParams: {
    driId: string
    dayYMD: string
    selectedParams: string[]
    numDays?: number
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: any;
    limits: {
      maxTval: number
      minTval: number
    };
  }>

  ['/dmt/get-nobreaks-charts-data']: (reqParams: {
    dmtCode: string
    dayYMD: string
    numDays?: number
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: any;
  }>

  ['/dmt/get-utilities-charts-data']: (reqParams: {
    dmtCode: string
    dayYMD: string
    numDays?: number
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: {
      [key: string] : {
        utilityId: number;
        feedback: string;
        timeUsingBattery: string;
        name: string;
        datCode?: string;
        dmtCode: string;
        utilityType: 'Nobreak' | 'Illumination';
        y: number[];
        consumption?: number;
      }
    };
  }>

  ['/dal/get-illuminations-charts-data']: (reqParams: {
    dalCode: string
    dayYMD: string
    numDays?: number
  }, session: SessionData) => Promise<{
    commonX: number[];
    vars: any;
  }>

  ['/get-unit-energy-consumption']: (reqParams: { UNIT_ID: number, CLIENT_ID?: number, day: string }, session: SessionData) => Promise<{
    list: {
      x: number
      y: number
    }[]
  }>
  ['/get-unit-energy-consumption-commonX']: (reqParams: { UNIT_ID: number, CLIENT_ID?: number, day: string, numDays: number }, session: SessionData) => Promise<{
    commonX: number[]
    energyConsumption: { y: number[] };
  }>
  ['/get-unit-energy-consumption-byDay']: (reqParams: {
    UNIT_ID: number,
    CLIENT_ID?: number,
    dayStart: string,
    dayEnd: string,
  }, session: SessionData) => Promise<{
    list: {
      date: string
      consumedEnergy: number
      invoice?: {
        value: number
      }
    }[]
  }>
  ['/get-units-energy-consumption-byDay']: (reqParams: {
    unitIds?: number[],
    clientIds?: number[],
    stateIds?: string[],
    cityIds?: string[],
    dayStart: string,
    numDays: number,
  }, session: SessionData) => Promise<{
    list: {
      unitId: number
      date: string
      consumedEnergy: number
      invoiceValue: number
    }[]
  }>
  ['/analise-integrada-export']: (reqParams: {
    day: string
    dacsTamb: string[]
    dacsL1: string[]
    dutsTemp: string[]
    unitsPower: number[],
    tempInmet: {
      GROUP_ID: string,
      GROUP_NAME: string,
    }[],
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/dac/get-energy-consumption-month']: (reqParams: {
    dacId: string,
    monthIni: string,
    numMonths: number
  }, session: SessionData) => Promise<{
    list: {
      periodYM: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number
    }[]
  }>
  ['/dac/get-usage-per-month']: (reqParams: {
    dacId: string,
    monthIni: string,
    numMonths: number
  }, session: SessionData) => Promise<{
    list: {
      periodYM: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number
    }[]
  }>
  ['/dac/get-usage-per-day']: (reqParams: {
    dacId: string,
    datIni: string,
    numDays: number,
  }, session: SessionData) => Promise<{
    list: {
      day: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number
    }[]
  }>
  ['/dac/get-energy-consumption']: (reqParams: {
    dacId: string,
    datIni: string,
    numDays: number,
  }, session: SessionData) => Promise<{
    list: {
      day: string,
      hoursOn: number,
      energyCons: number,
      hoursOff: number,
      hoursBlocked: number,
      numDeparts: number
    }[]
  }>

  ['/calculate-ecomode-savings']: (reqParams: {
    dacIds: string[]
    dayStart: string
    numDays: number
  }, session: SessionData) => Promise<{
    hoursBlocked: {
      [dacId: string]: {
        [day: string]: number
      }
    }
  }>

  ['/unit-ecomode-savings']: (reqParams: {
    unitId: number
    dayStart: string
    numDays: number
  }, session: SessionData) => Promise<{
    hoursBlocked: {
      [dacId: string]: {
        [day: string]: number
      }
    }
  }>

  ['/unit-automation-savings']: (reqParams: {
    unitId: number
    dayStart: string
    numDays: number
  }, session: SessionData) => Promise<{
    hoursBlocked: {
      [dacId: string]: {
        [day: string]: {
          totalEst: number
        }
      }
    }
  }>
  ['/units-automation-savings']: (reqParams: {
    dayStart: string
    numDays: number
    clientIds?: number[]
    unitIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
  }, session: SessionData) => Promise<{
    units: {
      [unitId: string]: {
        [day: string]: {
          totalEst: number
        }
      }
    }
  }>
  ['/energy-efficiency-overview-card']: (reqParams: {
    INCLUDE_INSTALLATION_UNIT?: boolean
    dayStart: string
    numDays: number
    clientIds?: number[]
    unitIds?: number[]
    stateIds?: string[]
    cityIds?: string[]
  }, session: SessionData) => Promise<{
    savings: { price: number }
    greenAntConsumption: { price: number, kwh: number }
    condenserConsumption: { price: number, kwh: number }
    unhealthyConsumption: { kwh: number }
  }>

  ['/devtools/export-duts-temperatures']: (reqParams: {
    dutsInfo: {
      [k: string]: {
        clientName: string
        unitName: string
        name: string
        work: {
          [k: string]: string
        }
      }
    },
    duts: string[],
    telemetriaFilter: string,
    dayStart: string,
    dayEnd: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/devtools/export-waters-usages']: (reqParams: {
    unitId: number,
    dayStart: string,
    dayEnd: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/devtools/export-duts-mean-temperatures']: (reqParams: { dayStart: string, clientIds: number[] }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>

  ['/get-weather-stations-near-unit']: (body: {
    unitId: number
  }, session: SessionData) => Promise<{
    list: {
      CD_ESTACAO: string
      DC_NOME: string
      DISTANCIA_EM_KM?: string
    }[],
  }>
  ['/get-weather-data-near-unit']: (body: {
    unitId: number
    dayYMD: string
  }, session: SessionData) => Promise<{
    list: {
      CD_ESTACAO: string
      DC_NOME: string
      measures: {
        TEM_INS: string
        timestamp: string
        xH: number
      }[]
    }[]
  }>
  ['/get-weather-data-near-unit-commonX-v2']: (body: {
    unitId: number
    dayYMD: string
    numDays: number
    stations?: string[]
  }, session: SessionData) => Promise<{
    commonX: number[],
    stationsTemps: {
      [key: string]: {
        temperatures: { y: number[] },
        tempLimits: number[],
      }
    }
  }>
  ['/laager/get-daily-usage-history']: (body: {
    unit_id: string
    start_date: string
    end_date: string
  }, session: SessionData) => Promise<{
    period_usage: number
    daily_average?: number
    predicted?: number
    history: {
      information_date: string
      usage: number
      devId: string,
      estimatedUsage?: boolean
      readings_per_day: {
        time: string,
        reading?:number,
        usage:number,
      }[],
    }[]
  }>

  ['/laager/get-meter-mean-history']: (reqParams: {
    meterId: string
  }, session: SessionData) => Promise<{
    day: string
    averageConsumption: number
    consideredDays: number
  }[]>

  ['/dev/command-ota']: (reqParams: {
    devId: string,
    path: string,
  }, session: SessionData) => Promise<string>
  ['/dev/request-firmware-info']: (reqParams: { devId: string }, session: SessionData) => Promise<{
    dev_id: string
    hardware_type: string
    firmware_version: string
  }>
}

export interface API_serviceHealth {
  ['/faults/get-fault-codes']: (reqParams: {}, session: SessionData) => Promise<{
    healthIndexes: {[k:string]:{
      titulo: string
    }}
    possibleCauses: {[k:string]:{text:string}}
    laudos: {text:string, pcauses?:string[], application:string[]}[],
  }>
  ['/dac/get-health-status']: (reqParams: { dacId: string }, session: SessionData) => Promise<{
    healthStatus: {
      H_INDEX: number
      H_DESC: string
      P_CAUSES: string
      fdetected: {
        origin: string
        id: string
        faultName: string
        faultLevel: number
        lastActionTime: number
        lastAction: FaultAction
      }[]
    }
  }>
  ['/dac/save-health-info']: (reqParams: {
    dacId: string
    healthIndex: number
    laudo?: string|null,
    possibleCauses?: string[]|null,
  }, session: SessionData) => Promise<{
    healthStatus: {
      H_INDEX: number
      H_DESC?: string
      P_CAUSES?: string
      fdetected?: {}[]
    }
  }>
  ['/dac/save-observation-info']: (reqParams: {
    dacId: string
    observationDesc?: string
  }, session: SessionData) => Promise<string>
  ['/dac/edit-observation-info']: (reqParams: {
    observationId?: string
    observationDesc?: string
  }, session: SessionData) => Promise<string>

  ['/dac/detected-fault-confirmation']: (reqParams: {
    devId: string
    faultId: string
    action: 'APPROVED'|'REJECTED'|'ERASED'|'RESTABLISHED'
  }, session: SessionData) => Promise<string>
  ['/dev/get-faults']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
    devType?: 'dac' | 'dut'
    devId?: string
  }, session: SessionData) => Promise<{
    list: {
      DEV_ID: string
      UNIT_ID: number
      UNIT_NAME: string
      H_INDEX: number
      H_DESC: string
      CLIENT_NAME: string
      CLIENT_ID: number
      fdetected: {
        [id: string]: {
          id: string
          origin: string
          faultName: string
          faultLevel: number
          lastActionTime: number
          lastAction: FaultAction
          lastDet: number
          lastRiseTS: string
          firstRiseTS: string
        }
      }
    }[]
    expirationLimit?: number
  }>
  ['/get-dacs-faults']: (reqParams: {
    clientId?: number,
    clientIds?: number[],
  }, session: SessionData) => Promise<{
    list: {
      DAC_ID: string
      CITY_ID: string
      CITY_NAME: string
      STATE_ID: string
      GROUP_ID: number
      GROUP_NAME: string
      UNIT_ID: number
      UNIT_NAME: string
      DAC_NAME: string
      H_INDEX: number
      H_DESC: string
      CLIENT_NAME: string
      CLIENT_ID: number
      DAC_COMIS: string
      status: string
      fdetected: {
        [id: string]: {
          id: string
          origin: string
          faultName: string
          faultLevel: number
          lastActionTime: number
          lastAction: FaultAction
          lastDet: number
          lastRiseTS: string
          firstRiseTS: string
        }
      }
    }[]
    expirationLimit?: number
  }>
  ['/export-dacs-faults']: (reqParams: {
    clientIds?: number[],
    unitId?: number,
    hIndex?: number,
    dateBegin?: string,
    status?: string,
  }, session: SessionData, extra: ExtraRouteParams) => Promise<BinaryRouteResponse>
  ['/dac/falha-repentina-detectada-v2']: (reqParams: {
    devId: string,
    timestamp: string,
    fault_id: string,
    name: string,
    gravity: string,
    approval_type: string,
    rise: boolean,
    restab: boolean,
  }, session: SessionData) => Promise<{
    success?: boolean,
    error?: string,
  }>
  ['/dev/falha-repentina-detectada']: (reqParams: {
    devId: string,
    timestamp: string,
    fault_id: string,
    name: string,
    gravity: string,
    approval_type: string,
    rise: boolean,
    restab: boolean,
  }, session: SessionData) => Promise<{
    success?: boolean,
  }>
  ['/dev/get-fr-list-updates']: (reqParams: {
    update_token?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    dacs: {
      DAC_ID: string
      DAC_TYPE: string
      DAC_APPL: string
      FLUID_TYPE: string
      hasAutomation: boolean
      isVrf: boolean
      P0Psuc: boolean
      P1Psuc: boolean
      P0Pliq: boolean
      P1Pliq: boolean
      P0mult: number
      P0ofst: number
      P1mult: number
      P1ofst: number
      T0_T1_T2: string
      ignoreFaults: string
      groupChillerCount: number
      groupId: number
    }[]
    duts: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature: number,
      minTemperature: number,
      groupId: number,
      devId: string
    }[]
    removed_dacs: string[]
    removed_duts: string[]
    update_token: string
  }>
  ['/dev/get-fr-list-updates-v2']: (reqParams: {
    update_token?: string
  }, session: SessionData, extra: ExtraRouteParams) => Promise<{
    dacs: {
      DAC_ID: string
      DAC_TYPE: string
      DAC_APPL: string
      FLUID_TYPE: string
      hasAutomation: boolean
      isVrf: boolean
      P0Psuc: boolean
      P1Psuc: boolean
      P0Pliq: boolean
      P1Pliq: boolean
      P0mult: number
      P0ofst: number
      P1mult: number
      P1ofst: number
      T0_T1_T2: string
      ignoreFaults: string
      groupChillerCount: number
      groupId: number
      virtualL1: boolean
    }[]
    duts_aut: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature?: number,
      minTemperature?: number,
      groupId: number,
      devId: string,
      setpoint: number | null,
      application: string | null,
    }[]
    dutsduo: {
      programming: {
        mon?: DayProg,
        tue?: DayProg,
        wed?: DayProg,
        thu?: DayProg,
        fri?: DayProg,
        sat?: DayProg,
        sun?: DayProg,
        exceptions?: { [date: string] : DayProg }
      },
      maxTemperature?: number,
      minTemperature?: number,
      groupId: number,
      devId: string,
      setpoint: number | null,
      application: string | null,
    }[]
    dams: {
      damId: string;
      dacId: string;
      groupId: number;
    }[]
    removed_dams: string[]
    removed_dacs: string[]
    removed_duts_aut: string[]
    removed_dutsduo: string[]
    update_token: string
  }>
  ['/dac/get-health-hist']: (reqParams: {
    clientIds?: number[],
    clientId?: number,
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    dacId?: string,
    SKIP?: number,
    LIMIT?: number,
    SINCE?: string,
  }, session: SessionData) => Promise<{
    list: {
      devId: string,
      assetId: number,
      date: string,
      DAT_REPORT: number,
      healthIndex: string,
      H_INDEX: number,
      possCauses: string[],
      UNIT_ID: number,
      desc: string,
      changeType: string,
    }[]
  }>
  ['/delete-dac-health-hist']: (reqParams: {
    dacId: string,
    itemsDates?: number[],
    itemDate?: number,
  }, session: SessionData) => Promise<string>
  ['/dac/get-observation']: (reqParams: {
    dacId: string,
    SINCE?: string,
  }, session: SessionData) => Promise<{
    list: {
      dacId: string,
      date: string,
      OBS_DESC: string,
      userId: string,
      observationId: string,
    }[]
  }>
  ['/delete-dac-observation']: (reqParams: {
    dacId: string,
    itemsDates?: number[],
    itemDate?: number,
  }, session: SessionData) => Promise<string>
  ['/dac/get-installation-faults']: (reqParams: {
    devId?: string,
    faultName?: string,
    startTime?: string,
    endTime?: string,
    notifType?: 'Detect' | 'Return',
  }, session: SessionData) => Promise<{
    falhas: {
      [devId : string] : {
        [faultName: string]: {
          fault_name: string,
          dev_id: string,
          fault_time: string,
          notif_type: 'Detect' | 'Return',
        }[]
      }
    },
    dacs: {
      [devId: string]: {
        DAC_ID: string,
        CLIENT_ID: number,
        UNIT_ID: number,
        GROUP_ID: number,
        DAC_APPL: string,
        GROUP_NAME: string,
        UNIT_NAME: string,
        CLIENT_NAME: string,
      }
    }
    success: boolean
  }>
  ['/dac/falha-instalacao-detectada']: (reqParams: {
    devId: string,
    faultName: string,
    faultTime: string,
    notifType: string,
  }, session: SessionData) => Promise<{
    success: boolean,
  }>
  ['/ignore-fault-check']: (reqParams: {
    dev_id: string,
    faultId: string,
    ignore: boolean,
  }, session: SessionData) => Promise<{
    success: boolean
  }>
  ['/dac/get-fr-history']: (reqParams: {
    dev_id?: string,
    start_time?: string,
    end_time?: string,
    fault_id?: string,
  }, session: SessionData) => Promise<{
    history?: {
      detected_fault_id: number,
      timestamp: string,
      dev_id: string,
      rise: boolean,
      approved: boolean | null,
      source: 'Endpoint' | 'FR'
      restab: boolean,
      fault_id: string,
      name: string,
      gravity: string,
      approval_type: string,
      permanence_detected: boolean
    }[],
    error?: string,
  }>
  ['/dac/get-fault-descs']: (reqParams: void, session: SessionData) => Promise<{
    defs: {
      approval_type: string;
      fault_id: string;
      gravity: string;
      name: string;
    }[];
  }>
  ['/dac/enable-faults-dac']: (reqParams: {
    dev_id: string,
  }, session: SessionData) => Promise<{
    list: {
      id: number;
      dev_id: string;
      fault_id: string;
      enabled: boolean;
      description: string;
      user: string;
      client: string,
      unit: string,
      unit_id: number,
      timestamp: string;
    }[];
  }>
  ['/dac/enable-faults']: (reqParams: {
    dev_id: string,
    fault_id: string,
    enabled: boolean,
    description: string,
    user: string,
    client: string,
    unit: string,
    unit_id: number,
  }, session: SessionData) => Promise<{}>
  ['/dac/get-enable-faults-all']: (reqParams: {}, session: SessionData) => Promise<{
    list: {
      id: number;
      dev_id: string;
      fault_id: string;
      enabled: boolean;
      description: string;
      user: string;
      client: string,
      unit: string,
      unit_id: number,
      timestamp: string;
    }[];
  }>
  ['/asset/get-health-status']: (reqParams: { ASSET_ID: number }, session: SessionData) => Promise<{
    healthStatus: {
      H_INDEX: number
      H_DESC: string
      P_CAUSES: string
      H_REP: string
      fdetected: {
        origin: string
        id: string
        faultName: string
        faultLevel: number
        lastActionTime: number
        lastAction: FaultAction
      }[]
    }
  }>
  ['/asset/save-health-info']: (reqParams: {
    assetId: number
    healthIndex: number
    laudo?: string|null,
    possibleCauses?: string[]|null,
  }, session: SessionData) => Promise<{
    healthStatus: {
      H_INDEX: number
      H_DESC?: string
      H_REP: string
      P_CAUSES?: string
      fdetected?: {
        origin: string
        id: string
        faultName: string
        faultLevel: number
        lastActionTime: number
        lastAction: FaultAction
      }[]
    }
  }>
  ['/asset/get-health-hist']: (reqParams: {
    clientIds?: number[],
    clientId?: number,
    unitId?: number,
    unitIds?: number[],
    groupId?: number,
    assetId?: number,
    SKIP?: number,
    LIMIT?: number,
    SINCE?: string,
  }, session: SessionData) => Promise<{
    list: {
      assetId: number,
      devId: string,
      date: string,
      DAT_REPORT: number,
      healthIndex: string,
      H_INDEX: number,
      possCauses: string[],
      UNIT_ID: number,
      desc: string,
      changeType: string,
    }[]
  }>
  ['/asset/list-enabled-faults']: (reqParams: {
    assetId: number,
  }, session: SessionData) => Promise<{
    list: {
      id: number;
      assetId: number;
      dev_id: string;
      fault_id: string;
      enabled: boolean;
      description: string;
      user: string;
      client: string,
      unit: string,
      unit_id: number,
      timestamp: string;
    }[];
  }>
  ['/asset/enable-faults']: (reqParams: {
    assetId: number,
    faultId: string,
    enabled: boolean,
    description: string,
    user: string,
    client: string,
    unit: string,
    unitId: number,
  }, session: SessionData) => Promise<{}>
  ['/asset/delete-health-hist']: (reqParams: {
    assetId: number,
    itemsDates?: number[],
    itemDate?: number,
    healthIndex?: number,
  }, session: SessionData) => Promise<string>
  ['/asset/save-observation-info']: (reqParams: {
    assetId: number
    observationDesc?: string
  }, session: SessionData) => Promise<string>
  ['/asset/edit-observation-info']: (reqParams: {
    observationId: string
    observationDesc?: string
  }, session: SessionData) => Promise<string>
  ['/asset/get-observation']: (reqParams: {
    assetId: number,
    SINCE?: string,
  }, session: SessionData) => Promise<{
    list: {
      devId: string
      assetId: number
      date: string,
      OBS_DESC: string,
      userId: string,
      observationId: string,
    }[]
  }>
  ['/asset/delete-observation']: (reqParams: {
    assetId: number,
    itemsDates?: number[],
    itemDate?: number,
  }, session: SessionData) => Promise<string>

}

export interface API_serviceRealtime {
  ['/dma/set-sampling-period']: (reqParams: {
    dmaId: string,
    samplingPeriod: number
  }, session: SessionData) => Promise<{
    msg: string
  }>

  ['/realtime/devtools/publish_dev_cmd']: (reqParams: { devId: string, payload: {} }, session: SessionData) => Promise<{}>
  ['/realtime/devtools/get_uNotifs']: (reqParams: {}, session: SessionData) => Promise<{}>
  // ['/realtime/devtools/get_damEcoMonitor']: (reqParams: {}, session: SessionData) => Promise<{}>
  ['/realtime/devtools/buildCoolAutNotifs']: (reqParams: {}, session: SessionData) => Promise<{}>
  // ['/realtime/devtools/debug_dam_ecomode']: (reqParams: {}, session: SessionData) => Promise<{}>
}

export type ControlMode = '0_NO_CONTROL'|'1_CONTROL'|'2_SOB_DEMANDA'|'3_BACKUP'|'4_BLOCKED'|'5_BACKUP_CONTROL'|'6_BACKUP_CONTROL_V2'|'7_FORCED'|'8_ECO_2';

export type ProfilePerClient = '[U]'|'[C]'|'[M]'|'[T]'|'[MN]'|'[I]'|'[CP]';

export type FaultAction = 'APPROVED'|'REJECTED'|'ERASED'|'RESTAB_WAITING'|'RESTAB_PENDING'|'RESTABLISHED'|'RESTAB_REJECTED'|'PENDING';

export interface UserPermissions {
  MANAGE_ALL_CLIENTS_AND_DACS?: boolean
  PER_CLIENT: { clientId: number, p: ProfilePerClient[] }[]
  PER_UNIT?: { clientId: number, units: number[], p: ProfilePerClient[] }[]
  ALTER_SYSTEM_PARS?: boolean
  VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS?: boolean
  MANAGE_UNOWNED_DEVS?: boolean
  HEALTH_MANAGEMENT?: boolean
  isUserManut?: boolean
  isParceiroValidador?: boolean
  isAdminSistema?: boolean
  isInstaller?: boolean
}

export interface DayProg {
  permission: 'allow'|'forbid',
  start: string, // '00:00'
  end: string, // '23:59'
  clearProg?: boolean,
}

export interface FullProg_v4 {
  // version: "v4"
  week: {
    mon?: DayProg
    tue?: DayProg
    wed?: DayProg
    thu?: DayProg
    fri?: DayProg
    sat?: DayProg
    sun?: DayProg
  }
  exceptions?: {
    [day: string]: DayProg
  },
  ventTime?: { begin: number, end: number }
  temprtControl?: {
    temperature: number
    LTC: number
    mode: ControlMode
    LTI: number
    hist_sup?: number
    hist_inf?: number
  }
}

export interface ScheduleDut {
  DUT_SCHEDULE_ID?: number
  SCHEDULE_TITLE: string
  SCHEDULE_STATUS: boolean
  BEGIN_TIME: string
  END_TIME: string
  CTRLOPER: ControlMode
  PERMISSION: 'allow'|'forbid'
  DAYS: {
    mon: boolean
    tue: boolean
    wed: boolean
    thu: boolean
    fri: boolean
    sat: boolean
    sun: boolean
  }
  SETPOINT?: number|null
  LTC?: number|null
  LTI?: number|null
  UPPER_HYSTERESIS?: number|null
  LOWER_HYSTERESIS?: number|null
  SCHEDULE_START_BEHAVIOR?: string|null
  SCHEDULE_END_BEHAVIOR?: string|null
  FORCED_BEHAVIOR?: string|null
  IR_ID_COOL?: string|null
  ACTION_MODE?: string|null
  ACTION_TIME?: number|null
  ACTION_POST_BEHAVIOR?: string|null
}

export interface ScheduleDutToMultiple {
  DUT_SCHEDULE_ID: number
  SCHEDULE_STATUS: boolean
  BEGIN_TIME: string
  END_TIME: string
  CTRLOPER: ControlMode
  PERMISSION: 'allow'|'forbid'
  DAYS: {
    mon: boolean
    tue: boolean
    wed: boolean
    thu: boolean
    fri: boolean
    sat: boolean
    sun: boolean
  }
  SETPOINT?: number|null
  LTC?: number|null
  LTI?: number|null
  UPPER_HYSTERESIS?: number|null
  LOWER_HYSTERESIS?: number|null
  SCHEDULE_START_BEHAVIOR?: string|null
  SCHEDULE_END_BEHAVIOR?: string|null
  FORCED_BEHAVIOR?: string|null
  IR_ID_COOL?: string|null
  ACTION_MODE?: string|null
  ACTION_TIME?: number|null
  ACTION_POST_BEHAVIOR?: string|null
  CURRENT_IN_DUT: boolean
  DUT_AUTOMATION_PARAMETERS_ID: number
}

export interface ExceptionDut {
  DUT_EXCEPTION_ID?: number
  EXCEPTION_TITLE: string
  REPEAT_YEARLY: boolean
  EXCEPTION_DATE: string
  BEGIN_TIME: string
  END_TIME: string
  PERMISSION: 'allow'|'forbid'
  EXCEPTION_STATUS_ID: number
  CTRLOPER: ControlMode
  SETPOINT?: number|null
  LTC?: number|null
  LTI?: number|null
  UPPER_HYSTERESIS?: number|null
  LOWER_HYSTERESIS?: number|null
  SCHEDULE_START_BEHAVIOR?: string|null
  SCHEDULE_END_BEHAVIOR?: string|null
  FORCED_BEHAVIOR?: string|null
  IR_ID_COOL?: string|null
  ACTION_MODE?: string|null
  ACTION_TIME?: number|null
  ACTION_POST_BEHAVIOR?: string|null
}

export interface ScheduleDutCache {
  currentOnDut: boolean,
  active?: boolean, // temporário enquanto há script de DUTs Bluefit
  beginHour: string,
  endHour: string,
  mode?: number, // temporário enquanto há script de DUTs Bluefit
  modeTag: ControlMode,
  days: {
    mon: boolean,
    tue: boolean,
    wed: boolean,
    thu: boolean,
    fri: boolean,
    sat: boolean,
    sun: boolean,
  },
  permission: 'allow'|'forbid'
  temperature?: number,
  offset?: number,
  autConfig?: 'IR'|'RELAY'|'DISABLED' // temporário enquanto há script de DUTs Bluefit
  LTC?: number,
  LTI?: number,
  UPPER_HYSTERESIS?: number,
  LOWER_HYSTERESIS?: number,
  SCHEDULE_START_BEHAVIOR?: string,
  SCHEDULE_END_BEHAVIOR?: string,
  FORCED_BEHAVIOR?: string,
  IR_ID_COOL?: string,
  ACTION_MODE?: string,
  ACTION_TIME?: number,
  ACTION_POST_BEHAVIOR?: string|null
}

export interface UnifiedBatch {
  SOLUTION_TYPE: string
  UNIT_NAME: string
  UNIT_ID: string
  UNIT_CODE_CELSIUS: string,
  UNIT_CODE_API: string,
  COUNTRY: string
  STATE_ID: string
  CITY_NAME: string
  TIME_ZONE: string
  CONSTRUCTED_AREA: string
  UNIT_STATUS: string
  LATLONG: string
  ADDRESS: string
  AMOUNT_PEOPLE: string
  ICCID: string
  ACCESSPOINT: string
  MODEM: string
  MACACCESSPOINT: string
  MACREPEATER: string
  SIMCARD_PHOTO1: string
  SIMCARD_PHOTO2: string
  SIMCARD_PHOTO3: string
  SKETCH_1: string
  SKETCH_2: string
  SKETCH_3: string
  SKETCH_4: string
  SKETCH_5: string
  GROUP_ID: string
  GROUP_NAME: string
  INSTALLATION_DATE: string
  MCHN_APPL: string
  GROUP_TYPE: string
  MCHN_BRAND: string
  FLUID_TYPE: string
  MACHINE_RATED_POWER: string
  PHOTO_DEVGROUPS_1: string
  PHOTO_DEVGROUPS_2: string
  PHOTO_DEVGROUPS_3: string
  PHOTO_DEVGROUPS_4: string
  PHOTO_DEVGROUPS_5: string
  DEV_AUTOM_ID: string
  PLACEMENT: string
  SENSORS_DUT_DUO: string
  DAM_INSTALLATION_LOCATION: string
  DAM_PLACEMENT: string
  DAM_T0_POSITION: string
  DAM_T1_POSITION: string
  PHOTO_AUTOM_DEV_1: string
  PHOTO_AUTOM_DEV_2: string
  PHOTO_AUTOM_DEV_3: string
  PHOTO_AUTOM_DEV_4: string
  PHOTO_AUTOM_DEV_5: string
  DUT_ID: string
  PHOTO_DUT_1: string
  PHOTO_DUT_2: string
  PHOTO_DUT_3: string
  PHOTO_DUT_4: string
  PHOTO_DUT_5: string
  ROOM_NAME: string
  RTYPE_NAME: string
  DAT_ID: string
  AST_DESC: string
  AST_ROLE_NAME: string
  MCHN_MODEL: string
  CAPACITY_PWR: string
  // CAPACITY_UNIT: string
  DAC_COP: string
  MCHN_KW: string
  EVAPORATOR_MODEL: string
  INSUFFLATION_SPEED: string
  COMPRESSOR_RLA: string
  EQUIPMENT_POWER: string
  PHOTO_ASSET_1: string
  PHOTO_ASSET_2: string
  PHOTO_ASSET_3: string
  PHOTO_ASSET_4: string
  PHOTO_ASSET_5: string
  DEV_ID: string
  DAC_COMIS: string
  // AUTOM_ENABLE: string
  P0_SENSOR: string
  P0_POSITN: string
  P1_SENSOR: string
  P1_POSITN: string
  // DAC_DESC: string
  PHOTO_DAC_1: string
  PHOTO_DAC_2: string
  PHOTO_DAC_3: string
  PHOTO_DAC_4: string
  PHOTO_DAC_5: string
  ELECTRIC_CIRCUIT_ID: string
  ELECTRIC_CIRCUIT_NAME: string
  ENERGY_DEVICES_INFO_ID: string
  DMA_ID: string
  // WATER_SUPPLIER: string
  HYDROMETER_MODEL: string
  ID_MED_ENERGY: string,
  NUM_SERIE_MED_ENERGY: string,
  MODEL_MED_ENERGY: string,
  CAPACITY_TCA: string,
  INSTALLATION_ELETRICAL_TYPE: string,
  SHIPPING_INTERVAL: string,
  ROOM_VAV: string,
  THERM_MANUF: string,
  THERM_MODEL: string,
  VALVE_MANUF: string,
  VALVE_MODEL: string,
  VALVE_TYPE: string,
  BOX_MANUF: string,
  BOX_MODEL: string,
  FANCOIL_MANUF: string,
  FANCOIL_MODEL: string,
  PHOTO_DRI_1: string,
  PHOTO_DRI_2: string,
  PHOTO_DRI_3: string,
  PHOTO_DRI_4: string,
  PHOTO_DRI_5: string,
  INSTALLATION_LOCATION: string
  WATER_INSTALLATION_DATE: string
  TOTAL_CAPACITY: string
  TOTAL_RESERVOIRS: string
  PHOTO_DMA_1: string
  PHOTO_DMA_2: string
  PHOTO_DMA_3: string
  PHOTO_DMA_4: string
  PHOTO_DMA_5: string
  UTILITY_ID: string,
  UTILITY_NAME: string,
  INSTALLATION_DATE_UTIL: string,
  DISTRIBUTOR: string,
  MODEL: string,
  ENTRY_VOLTAGE: string,
  OUT_VOLTAGE: string,
  POT_NOMINAL: string,
  AUTON_NOMINAL: string,
  INPUT_ELECTRIC_CURRENT: string,
  OUTPUT_ELECTRIC_CURRENT: string,
  NOMINAL_BATTERY_CAPACITY: string,
  GRID_VOLTAGE: string,
  MAINS_CURRENT: string,
  ASSOCIATE_DEV: string,
  ASSOCIATE_DEV_PORT: string,
  FEEDBACK_DAL: string,
  ASSOCIATE_ASSET: string,
  PHOTO_DMT: string,
  PHOTO_DAL: string,
  PHOTO_UTILITY: string,
  ADDITIONAL_PARAMETERS?: { [key: string]: string };
  key: string
}

interface ParamsOverview {
  clientIds?: number[],
  stateIds?: number[],
  cityIds?: string[],
  unitIds?: number[],
  INCLUDE_INSTALLATION_UNIT?: boolean
}

export interface Asset {
  ASSET_ID: number;
  DAT_ID: string | null;
  AST_DESC: string;
  INSTALLATION_LOCATION: string | null;
  AST_TYPE: string | null;
  CAPACITY_PWR: number | null;
  CAPACITY_UNIT: string | null;
  CLIENT_ID: number | null;
  FLUID_TYPE: string | null;
  GROUP_ID: number | null;
  MCHN_APPL: string | null;
  MCHN_BRAND: string | null;
  MCHN_ENV: string | null;
  MCHN_KW: number | null;
  MCHN_MODEL: string | null;
  UNIT_ID: number;
  INSTALLATION_DATE: string | null;
  AST_ROLE: number | null;
  DEV_ID: string | null;
  DEV_CLIENT_ASSET_ID: number | null;
  DAT_INDEX: number | null;
  CHILLER_MODEL_NAME: string | null;
  CHILLER_MODEL_ID: number | null;
  CHILLER_LINE_NAME: string | null;
  CHILLER_LINE_ID: number | null;
  NOMINAL_CAPACITY: number | null;
  NOMINAL_VOLTAGE: number | null;
  NOMINAL_FREQUENCY: number | null;
}

export interface AssetWithStatus extends Asset {
  STATUS?: string | null;
}
