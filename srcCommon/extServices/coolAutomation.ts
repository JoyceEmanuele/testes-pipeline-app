import axios, { AxiosResponse, AxiosRequestConfig, AxiosError, Method } from 'axios';
import servConfig from '../../configfile';

import { logger } from '../../srcCommon/helpers/logger';

// https://service.coolremote.net/

interface API {
  ['POST /users/authenticate/']: (body: { username: string, password: string, appId: string }) => {
    success: boolean
    data: {
      token: string
    }
  }

  ['GET /customers']: () => {
    success: boolean
    data: {
      [id: string]: {
        billingModel: number
        prePaidSessionLengthMinutes: number
        prePaidAllocatedSessions: number
        prePaidUsedSessions: number
        enablePowerDistribution: boolean
        enableMgmtAppAccess: boolean
        enableServiceAppAccess: boolean
        enableCommercialAppAccess: boolean
        licensedUnits: number
        smsCounter: number
        enableLanguageSelection: boolean
        enableInstallerRole: boolean
        name: string
        email: string
        contactPerson: string
        phoneNumber: string
        method: number
        id: string
      }
    }
  }

  ['GET /sites']: () => {
    success: true,
    data: {
      [id: string]: {
        devices: string[]
        groups: string[]
        zones: string[]
        users: string[]
        procedures: string[]
        enable: boolean
        basePackageEnabled: boolean
        advancedOperationsPackageEnabled: boolean
        remoteServicePackageEnabled: boolean
        predictiveMaintenancePackageEnabled: boolean
        powerPackageEnabled: boolean
        commercialBasePackageEnabled: boolean
        name: string
        country: string
        city: string
        state: string
        address: string
        postalCode: string
        timezone: string
        managementStatus: number
        serviceStatus: number
        ignoreStatus: boolean
        lat: number
        lon: number
        customer: string
        creatingDate: number
        creator: string
        lastTemperature: number
        lastTemperatureTimestamp: number
        id: string
        units: string[]
      }
    }
  }

  ['GET /systems']: () => {
    success: boolean
    data: {
      [id: string]: {
        pendingAck: boolean
        units: string[]
        powerMeters: unknown[]
        mapping: boolean
        name: string
        device: string
        line: number
        internalId: string
        brandNum: number
        id: string
        operationMode: number
        operationStatus: number
        site: string
        customer: string
        schedules: ScheduleInfo[]
      }
    }
  }

  ['GET /units']: () => {
    success: true,
    data: {
      [id: string]: UnitInfo
    }
  }

  ['GET /units/:unitId']: (reqParams: { unitId: string }) => {
    success: true,
    data: UnitInfo
  }

  ['GET /service-params/systems/:id']: (reqParams: { id: string, startTimeUTC: number, endTimeUTC: number }) => {
    // GET /service-params/systems/611ea2f0675f8c2c17e1c0a3?startTimeUTC=1637550000000&endTimeUTC=1637592270221
    // 2021-11-22T11:44:00-0300
    success: true,
    data: {
      indoors: {
        [id: string]: {
          ranges: {
            [varId: string]: {
              value: string|number
              min: string|number
              max: string|number
            }
          }
          entries: { [varId: string]: string|number, timestamp: number, calculated_mode: number }[]
        }
      }
      outdoors: {
        [id: string]: {
          ranges: {
            [varId: string]: {
              value: string|number
              min: string|number
              max: string|number
            }
          }
          entries: { [varId: string]: string|number }[]
        }
      }
      bsboxes: {}
    }
  }

  ['GET /service-params']: () => {
    success: true,
    data: {
      [id: string]: {
        code: number
        data_unit_of_measurement: string
        title: string
        hvac_param_name: string
        plotable: boolean
        min?: number
        max?: number
        showInGraph?: boolean
        enabledInTriggers?: boolean
        enum?: string
      }
    }
  }

  ['GET /service-params/units/:unitId']: (reqParams: { unitId: string, startTimeUTC: number, endTimeUTC: number, isReduced: boolean }) => {
    success: true,
    data: {
      ranges: {
        [varId: string]: {
          value: string|number
          min: string|number
          max: string|number
        }
      }
      entries: { [varId: string]: string|number, timestamp: number, calculated_mode: number }[]
      current: [{ [varId: string]: string|number }]
    }
  }

  ['GET /systems/:systemId']: (reqParams: { systemId: string }) => {
    success: boolean
    data: {
      id: string // "611ea2f0675f8c2c17e1c0a3"
      name: string // "Mitsubishi electric_1_52"
      // role: {}
      // site: string
      units: string[] // ["611e8ffaf3e520289445d34c"...]
      pendingAck: boolean // false
      powerMeters: string[] // []
      mapping: boolean // false
      device: string // "608159a30129952d7038e03b"
      line: number // 1
      internalId: string // "52"
      brandNum: number // 4
    }
  }

  ['GET /devices/:id']: (reqParams: { id: string }) => {
    success: boolean
    data: {
      units: string[] // ["611e8ffaf3e520289445d347"...]
      systems: [] // []
      serviceSystems: string[] // ["611e8ffaf3e520289445d424"...]
      sensors: [] // []
      isRegistered: boolean // true
      powerMeters: [] // []
      connectionNotificationToleranceMin: number // 4
      disconnectionNotificationToleranceMin: number // 4
      deviceType: number // 1
      serial: string // "283B96004BE1"
      isConnected: boolean // true
      buildDate: string // "Sep 14 2021 16:42:09"
      firmwareVersion: string // "0.9.3C"
      hvacLines: string[] // ["DAIKIN","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED"]
      isPro: boolean // true
      protocolVersion: number // 6
      temperatureScale: number // 1
      hvacLinesExtended: { [id: string]: { brand: string, lineType: number, lineSubType: number } } // {"1":{"brand":"MELCO_MNET","lineType":4,"lineSubType":0},"2":{"brand":"MELCO_MNET","lineType":4,"lineSubType":0}}
      name: string // "283B96004BE1"
      pin: string // "OKR7YTRJA0"
      registrationDate: number // 1629392888975
      site: string // "611e8b8e6c25142b164b10bc"
      updatedAt: string // "2022-01-14T12:57:40.024Z"
      id: string // "608159a30129952d7038e03b"
    }
  }

  ['GET /devices']: () => {
    success: boolean
    data: {
      [id: string]: {
        units: string[] // ["611e8ffaf3e520289445d347"...]
        systems: [] // []
        serviceSystems: string[] // ["611e8ffaf3e520289445d424"...]
        sensors: [] // []
        isRegistered: boolean // true
        powerMeters: [] // []
        connectionNotificationToleranceMin: number // 4
        disconnectionNotificationToleranceMin: number // 4
        deviceType: number // 1
        serial: string // "283B96004BE1"
        isConnected: boolean // true
        buildDate: string // "Sep 14 2021 16:42:09"
        firmwareVersion: string // "0.9.3C"
        hvacLines: string[] // ["DAIKIN","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED","UNUSED"]
        isPro: boolean // true
        protocolVersion: number // 6
        temperatureScale: number // 1
        hvacLinesExtended: { [id: string]: { brand: string, lineType: number, lineSubType: number } } // {"1":{"brand":"MELCO_MNET","lineType":4,"lineSubType":0},"2":{"brand":"MELCO_MNET","lineType":4,"lineSubType":0}}
        name: string // "283B96004BE1"
        pin: string // "OKR7YTRJA0"
        registrationDate: number // 1629392888975
        site: string // "611e8b8e6c25142b164b10bc"
        updatedAt: string // "2022-01-14T12:57:40.024Z"
        id: string // "608159a30129952d7038e03b"
      }
    }
  }

  ['GET /me']: () => {
    success: boolean
    data: {
      isAcceptedTOU: boolean, // true
      isExpiring: boolean, // false
      isExpired: boolean, // false
      language: string, // "en"
      alertGroups: [], // []
      googleHome: boolean, // false
      alexa: boolean, // false
      ecobeeStatus: string, // "UNKNOWN"
      nestStatus: string, // "UNKNOWN"
      timeFormat: number, // 0
      dateFormat: number, // 0
      enableMgmtAppAccess: boolean, // true
      enableServiceAppAccess: boolean, // true
      enableCommercialAppAccess: boolean, // true
      profiles: [], // []
      username: string, // "DielEnergia2"
      email: string, // "diel@dielenergia.com"
      permissions: {}, // {"customers":{"611a722d6be1857e875abb93":"customerAdmin"}}
      firstName: string, // "Diel"
      lastName: string, // "Energia"
      phone: string, // "552135460747"
      temperatureScale: number, // 1
      measurementUnits: number, // 1
      customer: string, // "611a722d6be1857e875abb93"
      userLocationsMetadata: [], // []
      id: string, // "611e8cec6c25142b164b1bc5"
    }
  }

  ['GET /services/types']: () => {
    success: boolean
    data: {
      temperatureScale: {"0":"unknown","1":"celsius","2":"fahrenheit"},
      pressureScale: {"1":"kg/cm2","2":"PSI"},
      operationStatuses: {"1":"on","2":"off"},
      // operationModes: {"0":"COOL","1":"HEAT","2":"AUTO","3":"DRY","5":"FAN"},
      operationModesExtended: {"0":"COOL","1":"HEAT","2":"AUTO","3":"DRY","4":"HAUX","5":"FAN","6":"HH","8":"AUTO","9":"BYPS","10":"HTEX","11":"NORM","12":"SLEP","21":"W-HEAT","22":"ECO","23":"HOT-W","24":"ANTI"},
      operationModesWithTemperatures: {"0":{"temperatureLimits":{"1":[10,35],"2":[50,95]},"temperatureColorRange":[200,250]},"1":{"temperatureLimits":{"1":[10,80],"2":[50,176]},"temperatureColorRange":[50,0]},"2":{"temperatureLimits":{"1":[10,80],"2":[50,176]},"temperatureColorRange":[50,200]}},
      fanModes: {"0":"LOW","1":"MEDIUM","2":"HIGH","3":"AUTO","4":"TOP","5":"VERYLOW"},
      swingModes: {"0":"vertical","1":"30","2":"45","3":"60","4":"horizontal","5":"auto","6":"off","7":"on"},
      weekDays: {"Sunday":"Sunday","Monday":"Monday","Tuesday":"Tuesday","Wednesday":"Wednesday","Thursday":"Thursday","Friday":"Friday","Saturday":"Saturday"},
      roles: {"admin":["create","read","update","delete","control","controlOperationModes"],"manager":["create","read","update","control","controlOperationModes"],"editor":["read","update","control","controlOperationModes"],"controller":["read","update","control","controlOperationModes"],"readerCreator":["read","create"],"creator":["create"],"semiController":["read","update","control"],"updater":["read","update"],"reader":["read"],"readerLimited":["read"],"none":[]},
      permissions: {"create":"create","update":"update","read":"read","delete":"delete","control":"control","controlOperationModes":"controlOperationModes"},
      resources: {"accounts":"accounts","users":"users","customers":"customers","sites":"sites","devices":"devices","units":"units","powerMeters":"powerMeters","sensors":"sensors","systems":"systems","groups":"groups","zones":"zones","alertGroups":"alertGroups","schedules":"schedules","invites":"invites","traps":"traps","events":"events","procedures":"procedures","reports":"reports","powerReportSchedules":"powerReportSchedules","subscriptions":"subscriptions","contacts":"contacts","subscriptionPlans":"subscriptionPlans"},
      locks: {"non":0,"unitOperationStatus":1,"unitOperationMode":2,"setpoint":4},
      unitTypes: {"indoor":1,"outdoor":2,"service":3,"bsBox":4,"other":5,"waterHeater":6},
      unitSubTypes: {"0":"common","1":"waterHeater"},
      sensorTypes: {"0":{"name":"Inactive","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":false},"1":{"name":"Sensor Temp","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":true,"measurementUnits":1},"2":{"name":"Humidity","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":true,"measurementUnits":5},"3":{"name":"CO2","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":true,"measurementUnits":2},"4":{"name":"CO","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":true,"measurementUnits":2},"5":{"name":"Binary","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":true,"enableView":true,"measurementUnits":4},"6":{"name":"Digital Input","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":true,"enableView":true,"measurementUnits":4},"7":{"name":"Sensor 0-10v","enableMinMaxSelection":true,"enableMeasurementUnitSelection":true,"enableNormalModeSelection":false,"enableView":true,"valueMin":0,"valueMax":10},"129":{"name":"Digital Output","enableMinMaxSelection":false,"enableMeasurementUnitSelection":false,"enableNormalModeSelection":false,"enableView":true,"measurementUnits":4},"130":{"name":"Analog Output 0-10v","enableMinMaxSelection":true,"enableMeasurementUnitSelection":true,"enableNormalModeSelection":false,"enableView":true,"valueMin":0,"valueMax":100}},
      sensorMeasurementUnits: {"1":{"name":"Temperature","enableSelection":true},"2":{"name":"PPM","enableSelection":true},"3":{"name":"RPM","enableSelection":true},"4":{"name":"Open/Close","enableSelection":false},"5":{"name":"Percent","enableSelection":true}},
      outdoorUnitTasks: {"unknown":0,"master":1,"slave":2},
      systemTypes: ["Heat Pump","Heat Recovery","Cooling Only"],
      hvacBrands: [{"value":8,"type":"UMM Clivet","name":"UMM Clivet","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":2,"type":"TAD_VRF","name":"Tadiran VRF Box","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":3,"type":"LGMV","name":"LG","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":4,"type":"MELCO_MNET","name":"Mitsubishi electric","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":5,"type":"GMV5","name":"Gree","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":1,"type":"DAIKIN","name":"Daikin","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":7,"type":"HITACHI","name":"Hitachi","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":6,"type":"SAMSUNG","name":"Samsung","series":["unknown"],"isWaterHeater":false,"hasBooster":false},{"value":9,"type":"TOSHIBA","name":"Toshiba","isWaterHeater":false,"hasBooster":false},{"value":10,"type":"ALTHERMA","name":" Daikin Air to Water","isWaterHeater":true,"hasBooster":true},{"value":11,"type":"FUJITSU","name":"Fujitsu","isWaterHeater":false,"hasBooster":false},{"value":12,"type":"HAIER_MODBUS","name":"Haier","isWaterHeater":false,"hasBooster":false},{"value":13,"type":"MIDEA","name":"Midea","isWaterHeater":false,"hasBooster":false},{"value":14,"type":"UBC","name":"Petra","isWaterHeater":false,"hasBooster":false},{"value":15,"type":"BIST_INT_LOOP","name":"Midea Air To Water","isWaterHeater":false,"hasBooster":false},{"value":16,"type":"UMM","name":"UMM","isWaterHeater":false,"hasBooster":false},{"value":17,"type":"WELLEA","name":"WELLEA","isWaterHeater":true,"hasBooster":false},{"value":18,"type":"LG","name":"LG","isWaterHeater":false,"hasBooster":false},{"value":19,"type":"M1M2","name":"ME Air to Water","isWaterHeater":true,"hasBooster":true}],
      hvacBrandsSubTypes: {"12":{"0":{"name":"UNUSED"},"1":{"name":"MRV-S2"},"2":{"name":"MRV3-RC"},"3":{"name":"MRV4-C"},"4":{"name":"MRV5"},"5":{"name":"MRV-S"}},"16":{"0":{"name":"UNUSED"},"1":{"name":"CAREL"},"2":{"name":"Greensys GS538"},"3":{"name":"VECO"},"4":{"name":"Airwell ICAMIB"},"5":{"name":"Clivet Eliwell SBA655"},"6":{"name":"Breezart JL204C5"},"7":{"name":"Atlantic ZONE_CONTROL_2_0"},"8":{"name":"Satec EM-13x (PPD)"},"9":{"name":"VERIS H8163-CB (PPD)"},"10":{"name":"Aermec MODU-CONTROL"},"11":{"name":"Heatmiser Edge-HC"},"12":{"name":"Rolbit TAC640/Gree"},"13":{"name":"Climaveneta BMS Interface"},"14":{"name":"Dwyer CDTA/CDTC (Sensors)"},"15":{"name":"Greensys SMT-IO-GS (Sensors)"},"16":{"name":"SmartTemp SMT131"},"17":{"name":"Honeywell E-Mon D-Mon (PPD)"},"18":{"name":"Power Factor RG3-15C/CS/CL/CLS (PPD)"},"19":{"name":"Airwell Wellea"},"20":{"name":"Wiren Board WB-MAP3E/H (PPD)"},"21":{"name":"Schneider Electric SE8300"},"22":{"name":"ZENIT 4300"},"23":{"name":"SMARTRAIL-X835-MID (PPD)"},"24":{"name":"ABB B23/B24 (PPD)"}}},
      proParsingCodes: {"compressor":1,"capacity":2,"systemCapacity":3,"airnetAddress":4,"outdoorError":5,"outdoorExternalTemp":6},
      capacityMeasurementUnitTypes: {"hp":1,"kW":2,"BTU/h":3},
      actionSources: {"user":1,"schedule":2,"homeAutomation":3,"hvac":4,"applicationLogic":5},
      billingModels: {"none":{"value":0,"text":"none"},"prePaid":{"value":1,"text":"prePaid"}},
      customerStatuses: {"closed":{"value":0,"text":"Closed"},"active":{"value":1,"text":"Active"},"freezed":{"value":2,"text":"Suspended"}},
      creationMethods: {"console":{"value":0,"text":"console"},"control":{"value":1,"text":"control"}},
      trapTypes: {"customTelemetry":1,"operationalTelemetry":50,"adminTelemetry":99,"controlAction":201,"serviceAction":202,"commercialAction":203},
      eventTypes: {"unspecified":0,"customTelemetry":1,"deviceDisconnected":2,"cleanFilter":3,"indoorUnitError":4,"outdoorUnitError":5,"unitDisconnected":6,"unitsDisconnected":7,"aggregatedIndoorErrors":8,"deviceHealthLowIstat":9,"deviceHealthLowOstat":10,"deviceHealthLowPstat":11,"deviceHealthLowLqstat":12,"deviceHealthLowSstat":13,"entityHealthLowIstat":14,"entityHealthLowOstat":15,"entityHealthLowPstat":16,"entityHealthLowLqstat":17,"entityHealthLowSstat":18,"entitiesHealthLowIstat":19,"entitiesHealthLowOstat":20,"entitiesHealthLowPstat":21,"entitiesHealthLowLqstat":22,"entitiesHealthLowSstat":23,"delayedDeviceErrors":24,"lowLineQualityError":25,"operationalTelemetry":50,"adminDeviceDisconnected":98,"adminTelemetry":99,"controlAction":201,"serviceAction":202,"commercialAction":203},
      eventStatusTypes: {"open":1,"closed":2,"acknowledged":3},
      eventClearTypes: {"resolved":1,"trapDeleted":2,"trapUpdated":3,"systemDeleted":4,"systemUpdated":5,"recourceWasDeleted":6},
      ppdResolution: {"hour":1,"day":2,"month":3},
      measurementUnitTypes: {"unspecified":0,"temperature":1,"pressure":2},
      languages: {"en":"English","es":"Spanish","fr":"French","de":"German","nl":"Dutch","pt":"Portuguese"},
      serviceParamValueTypes: {"string":1,"integer":2,"float":3},
      procedureRunningModes: {"parallel":1,"serial":2},
      procedureRunningStates: {"stopped":1,"running":2,"paused":3,"initialized":4,"completedSuccess":5,"completedPartialSuccess":6,"completedFailure":7},
      procedureStateCommands: {"start":1,"stop":2,"pause":3,"restart":4},
      procedureStepTypes: {"command":1,"wait":2,"condition":3},
      procedureDeviceCommands: {"setUnitPowerState":1,"setUnitOperationMode":2,"setUnitSetpoint":3,"setUnitFanMode":4,"setUnitSwingMode":5},"procedureConditions":{"unitPowerState":1,"unitOperationMode":2,"unitSetpoint":3,"unitFanMode":4,"unitSwingMode":5,"ambientTemperature":6},"procedureStepResultTypes":{"success":1,"failure":2,"notExecuted":3},"procedureRunResultTypes":{"success":1,"partialSuccess":2,"failure":3,"stopped":4},
      calculatedMode: {"0":"cool","1":"heat","2":"auto","3":"dry","5":"fan","-1":"off"},
      applications: {"all":0,"service":1,"control":2,"management":3,"console":4},
      timeFormat: [{"name":"iso8601_24Hours","text":"24 hours","value":0},{"name":"standard12Hours","text":"12 hours","value":1}],
      dateFormat: [{"name":"startWithDay","text":"DD/MM/YY","value":0},{"name":"startWithMonth","text":"MM/DD/YY","value":1}],
      endActionTypes: {"noAction":{"value":0,"text":"noAction"},"revert":{"value":1,"text":"revert"},"allowAll":{"value":2,"text":"allowAll"},"doNothing":{"value":3,"text":"doNothing"}},
      siteStatuses: {"normal":0,"downgraded":1,"blocked":2},
      subscriptionTemplatesTypes: {"service":0,"management":1},
      devicePackageStatuses: {"unused":0,"used":1},
      deviceTypes: {"1":{"name":"CoolMasterNet","shortName":"CLMN"},"2":{"name":"CoolMasterNetRUS","shortName":"CLMNR"},"3":{"name":"CloudBox","shortName":"CBX"},"4":{"name":"CoolMasterLite","shortName":"CLML"},"5":{"name":"CoolLinkNet","shortName":"CLLN"},"6":{"name":"CoolLinkHub","shortName":"CLLH"},"7":{"name":"DCAHLA","shortName":"DCAHLA"},"8":{"name":"CoolLinkBridge","shortName":"CLLB"},"9":{"name":"CoolLinkOEM","shortName":"CLLOEM"},"10":{"name":"CoolPlug","shortName":"CLP"},"11":{"name":"CoolCast","shortName":"CLC"},"12":{"name":"CoolWYG","shortName":"CLWYG"},"13":{"name":"CoolAD","shortName":"CLAD"},"14":{"name":"Cool_IO","shortName":"CLIO"},"15":{"name":"CX2","shortName":"CX2"}},
      scheduledReportTypes: {"specific":1,"periodic":2},
      powerMeterTypes: {"normal":0,"virtual":1},
      customParameterTypes: {"param":1,"constant":2},
      customParameterOperations: {"=":1,"+":2,"-":3,"/":4,"*":5},
      waterHeaterModes: {"0":"AUTO","1":"HEAT","2":"COOL"},
      waterHeaterOperationStatusesEnum: {"0":"off","1":"on"},
      scheduleCategories: {"weekly":1,"calendar":2},
      changeoverTypes: {"master":1,"majority":2,"average":3},
      entityTypes: {"unit":1,"device":2,"sensor":3,"powerMeter":4,"line":5,"site":6,"customer":7,"system":8,"group":9},
      trapTelemetryCodes: {"sensorValue":"58","powerMeterPower":"59","powerMeterEnergy":"60","lineQualityValue":"61"},
      customerLevelPackagesEnum: {"none":{"value":0,"text":"None"},"some":{"value":1,"text":"Some"},"all":{"value":2,"text":"All"}},
      eventTypeStrings: { [type: string]: string } // {"0":"Unspecified","1":"Anomaly","2":"Device Disconnected","3":"Clean Filter","4":"Indoor Error","5":"Outdoor Error","6":"Unit disconnected","7":"Units disconnected","8":"Multi Indoor Error","9":"Unspecified","10":"Unspecified","11":"Unspecified","12":"Unspecified","13":"Unspecified","14":"Unspecified","15":"Unspecified","16":"Unspecified","17":"Unspecified","18":"Unspecified","19":"Unspecified","20":"Unspecified","21":"Unspecified","22":"Unspecified","23":"Unspecified","24":"Unspecified","25":"Low Line Quality","50":"Anomaly","98":"Admin Device Disconnected","99":"Admin Anomaly","201":"User Logic","202":"User Logic","203":"User Logic"}
    }
  }

  ['GET /services/service-param-types']: () => {
    success: boolean
    data: {
      lineQualityCategories: {"0":"Non-operational","1":"Bad","2":"Unstable","3":"Good","4":"Ideal"},
      genericOnOff: {"0":"OFF","1":"ON"},
      unitOperationModes: {"0":"COOL","1":"HEAT","2":"AUTO","3":"DRY","5":"FAN"},
      unitOperationStatuses: {"1":"ON","2":"OFF"},
      unitFanModes: {"0":"LOW","1":"MEDIUM","2":"HIGH","3":"AUTO","4":"TOP"},
      unitSwingModes: {"0":"VERTICAL","1":"30 DEG","2":"45 DEG","3":"60 DEG","4":"HORIZONTAL","5":"AUTO","6":"OFF","7":"ON"},
      althermaOperationModes: {"0":"AUTO","1":"HEAT","2":"COOL"},
      althermaActiveOperationModes: {"1":"HEATING","2":"COOLING"},
      althermaWeatherDependentModes: {"0":"FIXED","1":"WEATHER DEPENDENT","2":"FIXED + SCHEDULER","3":"WEATHER DEPENDENT + SCHEDULER"},
      samsungOperationMode: {"0":"STOP","1":"SAFETY","2":"NORMAL","3":"BALANCE","4":"RECOVERY","5":"DEICE","6":"COMPDOWN","7":"PROHIBIT","8":"LINEJIG","9":"PCBJIG","10":"TEST","11":"CHARGE","12":"PUMPDOWN","13":"PUMPOUT","14":"VACCUM","15":"CALORYJIG","16":"PUMPDOWNSTOP","17":"SUBSTOP","18":"CHECKPIPE","19":"CHECKREF","20":"FPTJIG","21":"NONSTOP_HEAT_COOL_CHANGE","22":"AUTO_INSPECT","23":"ELECTRIC_DISCHARGE","24":"SPLIT_DEICE","25":"INVETER_CHECK","26":"NONSTOP_DEICE","27":"REM_TEST","28":"RATING","29":"PC_TEST","30":"PUMPDOWN_THERMOOFF","31":"3PHASE_TEST","32":"SMARTINSTALL_TEST","33":"DEICE_PERFORMANCE_TEST","34":"INVERTER_FAN_PBA_CHECK","35":"AUTO_PIPE_PAIRING","36":"AUTO_CHARGE"},
      // "SAMSUNG_10368":{"0":"STOP","1":"SAFETY","2":"NORMAL","3":"BALANCE","4":"RECOVERY","5":"DEICE","6":"COMPDOWN","7":"PROHIBIT","8":"LINEJIG","9":"PCBJIG","10":"TEST","11":"CHARGE","12":"PUMPDOWN","13":"PUMPOUT","14":"VACCUM","15":"CALORYJIG","16":"PUMPDOWNSTOP","17":"SUBSTOP","18":"CHECKPIPE","19":"CHECKREF","20":"FPTJIG","21":"NONSTOP_HEAT_COOL_CHANGE","22":"AUTO_INSPECT","23":"ELECTRIC_DISCHARGE","24":"SPLIT_DEICE","25":"INVETER_CHECK","26":"NONSTOP_DEICE","27":"REM_TEST","28":"RATING","29":"PC_TEST","30":"PUMPDOWN_THERMOOFF","31":"3PHASE_TEST","32":"SMARTINSTALL_TEST","33":"DEICE_PERFORMANCE_TEST","34":"INVERTER_FAN_PBA_CHECK","35":"AUTO_PIPE_PAIRING","36":"AUTO_CHARGE"},
      // "SAMSUNG_10369":{"0":"Undefined","1":"Cool","2":"Heat","3":"CoolMain","4":"HeatMain"},
      // "SAMSUNG_10386":{"0":"Not Completed","1":"Completed"},"ALTHERMA_14602":{"0":"Fixed","1":"Weather Dependent","2":"Fixed +Scheduler","3":"Weather Dependent +Scheduler"},"ALTHERMA_14614":{"1":"Heating","2":"Cooling"},"ALTHERMA_14594":{"0":"Auto","1":"Heat","2":"Cool"},"HITACHI_65":{"0":"Stopping","1":"Operating","3":"Test","4":"Force R","51":"Force S"},"HITACHI_66":{"0":"Stop","2":"Setback","7":"Heating","8":"Cooling","9":"Thermo stand-by","12":"Defrost","13":"Fan","14":"Dry","15":"Ventilation","18":"Flame","32":"Auto","44":"Auto (Heating)","45":"Auto (Cooling)","51":"Force Stop","52":"Defrost stand-by","53":"Night P","96":"Setback (Cooling)","97":"Setback (Heating)","98":"Auto","105":"Pump stand-by","106":"Retry","107":"Error Stop","108":"Emergency stop","109":"Liquid flood back","144":"Heating","145":"Heating ECO","146":"Hot Water","147":"Anti-freeze","148":"Cooling"},"HITACHI_67":{"0":"Stop","3":"Silent","4":"Lo","5":"Mid2","6":"Mid1","7":"Hi"},"HITACHI_4266":{"1":"Heat Main(Lo)","2":"Cool Main(Lo)","8":"Cool Main(Hi)","10":"Heat Main(Hi)"},"HITACHI_4233":{"0":"Usual","4":"Driver IC Error, Over Current","8":"Moment Over Current","9":"Usually accelerating","12":"High Fin Temperature","13":"Usually slowing down","16":"Electron Thermal Activation","17":"Usually steading","20":"Insufficient Voltage","24":"Excessive Voltage","25":"Slowdown by Overcurrent","28":"Transmitting Abnormal","36":"Instantaneous Picking","44":"Micro-Computer Reset","48":"Start Error","52":"Abnormal Speed","56":"Abnormal Position Sensing","60":"Drive Prohibition Area","64":"FAN-Control Retry","68":"Control Abnormality"},"HITACHI_4227":{"0":"Stop","1":"Heat","2":"Cool","3":"C&H","4":"Def","5":"Def","6":"Def","7":"Def"},"HITACHI_4226":{"0":"SW Off","1":"Th. Off","2":"Pump Down","3":"SW On","4":"StartCmp","5":"Start After def","6":"StartRun1","7":"StartRun2","8":"Normal","9":"Oil Return","10":"Def1Stnby","11":"Def2Stnby","12":"P Diff Cntrl","13":"Defrost"},"HITACHI_4231":{"0":"Usual","4":"IPM Error, Over Current","8":"Moment Over Current","9":"Usually accelerating","12":"High Fin Temperature","13":"Usually slowing down","16":"Electron Thermal Activation","17":"Usually steading","20":"Insufficient Voltage","21":"After the over-load during the acceleration","24":"Excessive Voltage","25":"After the over-load during the slowdown","28":"Transmitting Abnormal","29":"After the over-load during the steady","32":"Current Sensor Abnormal","33":"Unbalance of Voltage","36":"Instantaneous Picking","37":"Lost of Voltage","44":"Micro-Computer Reset","48":"Ground Short Detection","52":"Lost of phase Abnormality","60":"Stop of INV"},"HITACHI_4228":{"0":"--","1":"Enf. Decre.","2":"Ban Incre.","3":"Ban Decre.","4":"Enf. Incre."},"MELCO_4161":{"0":"ON","1":"OFF"},"MELCO_5182":{"0":"50","1":"60"},"MELCO_4185":{"0":"-","1":"Low","2":"Middle","3":"High"},"MELCO_5135":{"0":"Stop","1":"Error","2":"Ordinary","3":"Qj Change","4":"Defrost","5":"Warm up","6":"OFF","7":"Oil R.H.","8":"Oil R.L.","9":"Unif.Oil","10":"Initial","11":"Ordinary","12":"Ref.Rec.","13":"Oil Rec.","14":"C.Ref.Rec.","15":"H.Ref.Rec","16":"Oil R.L.","17":"Initial Operation","18":"Restriction of Ice Usage in Cooling","19":"Surplus Ref.Rec.H.","20":"Ref.Rec.(Cool)","21":"Test Run","22":"ON","23":"Surplus Ref.Rec.C.","24":"Pipe Cleaning","25":"Ordinary"},"MELCO_5134":{"1":"Cooling","2":"C.Only","3":"C.Main","4":"Heating","5":"H.Only","6":"H.Main","7":"Stop","8":"Fan","9":"A.Cool","10":"A.Heat","11":"Ventilation","13":"Dehumidify","14":"Night P","16":"C.Storage","17":"Combination Cool","18":"Cool Using Ice Storage Unit","19":"Storage","20":"Heat Using Storage Unit","21":"Stop","22":"Stand by","23":"Defrost","24":"Demand","25":"Combination Cool","26":"Cool Using Ice Storage Unit","27":"Normal Cool","28":"Heat Using Storage Unit","29":"Normal Heat","30":"Combination Heat","31":"Cool with Ice Storage","32":"Building Frame Storage Cool","33":"Building Frame Storage Heat","34":"Non-Comp ON","35":"Comp ON"},"GMV5_13439":{"0":"None","1":"Module 1","2":"Module 2","3":"Module 3","4":"Module 4"},"GMV5_13438":{"0":"None","1":"Compressor 1","2":"Compressor 2"},"GMV5_13436":{"0":"Reset","1":"Sampling","2":"Wait","3":"Input","4":"Locate","5":"Start","6":"Running"},"GMV5_13437":{"0":"None","1":"Fan 1","2":"Fan 2"},"GMV5_13435":{"0":"Stop","1":"Running","2":"Fault"},"GMV5_13362":{"0":"Null","1":"Master","2":"Slave 1","3":"Slave 2","4":"Slave 3"},"GMV5_13360":{"1":"None","2":"Compressor","3":"Fan","4":"Module"},"GMV5_13356":{"0":"Null","1":"Refrigerant recovery","2":"Refrigerant recovery completed"},"GMV5_13355":{"1":"Indoor regrigerant","2":"Module refrigerant"},"GMV5_13347":{"1":"Cool only","2":"Heating only","3":"Cooling and heating","4":"Fan only"},"GMV5_13353":{"0":"Null","1":"Mode0","2":"Mode1","3":"Mode2","4":"Mode3","5":"Mode4","6":"Mode5","7":"Mode6","8":"Mode7","9":"Mode8","10":"Mode9","11":"Mode10","12":"Mode11","13":"Mode12"},"GMV5_13400":{"0":"Null","1":"Power off","2":"Cooling","3":"Drying","4":"Fan only","5":"Heating","6":"Master cooling","7":"Master heating","8":"Complete heat recovery"},"GMV5_13422":{"0":"Single phase","1":"Three phase"},"GMV5_13399":{"0":"Continous heating","1":"Non-continous heating"},"GMV5_13361":{"0":"Null","1":"Power-off enabled","2":"Power-off disabled","3":"First-on priority","4":"Priority given to cooling","5":"Priority given to heating"},"GMV5_13357":{"1":"Comfort","2":"Energy saving"},"GMV5_13364":{"0":"Null","1":"No emergency","2":"Fan1 error","3":"Fan2 error","4":"All fans have errors"},"GMV5_13382":{"0":"Null","1":"0 static pressure","2":"Static pressure1","3":"Static pressure2","4":"Static pressure3","5":"Static pressure4"},"GMV5_13363":{"0":"Null","1":"PG motor","16":"DC motor","17":"Tap motor"},"GMV5_13344":{"0":"Null","1":"R410A"},"GMV5_13314":{"0":"Null","1":"100~115V","2":"200~240V","9":"50Hz 100~115V","10":"50Hz 200~240V","17":"60Hz 100~115V","18":"60Hz 200~240V","25":"??50Hz?60Hz, 100~115V","26":"??50Hz?60Hz, 200~240V"},"MELCO_41":{"0":"Stopping","16":"Extra Low","64":"Low","128":"Hi","160":"Extra Hi","192":"Extra Hi"},"MELCO_42":{"0":"Stopping","16":"Extra Low","64":"Low","128":"Hi","160":"Extra Hi","192":"Extra Hi"},"MELCO_44":{"0":"Stop","12":"Defrost","13":"Fan","34":"C.O.ON","35":"H.O.ON","36":"C.H.ON","37":"C.O.OFF","38":"H.O.OFF","39":"C.H.OFF","46":"Cool ON","47":"Heat ON","48":"Cool OFF","49":"Heat OFF","84":"Dehumidification ON","95":"Dehumidification OFF","101":"Reheat ON","102":"Reheat OFF","131":"Error","132":"Error"},"MELCO_43":{"0":"Stop","1":"Run","5":"Stand by","6":"Prohibit","10":"ON","12":"Defrost","19":"Frost","41":"Pre.H.","42":"Heater","43":"Raising","53":"Interlocked operation","54":"Delayed operation","131":"Error"},"TOSHIBA_16390":{"2":"Stop","3":"Stop","4":"Auto","5":"Auto","6":"High","7":"High","8":"Med","9":"Med","10":"Low","11":"Low","12":"Ultra Low","13":"Ultra Low"},"TOSHIBA_16386":{"0":"1-way","1":"4-way","2":"2-way","3":"1-way","4":"C-Duct","5":"S-Duct","6":"H-Duct","7":"U-Ceiling","8":"High wall","9":"Kitchen","10":"F-Cabinet","11":"F-Concealed","12":"F-8/10","13":"F-Standing","14":"Compact","15":"SSD","16":"Fresh-D","17":"Fresh-F","18":"Console","19":"Ice","26":"H-Duct","27":"PAC-F","28":"PAC-D","29":"V-AHU","30":"V-AHU","31":"RoofTop","32":"RoofTop","50":"A2A","51":"A2A","52":"A2A","53":"A2A","55":"RA","56":"RA","60":"M-HWM","61":"M-HWM","62":"H-HWM","63":"M-HWM","65":"Large-PAC","66":"Large-PAC","67":"Large-PAC"},"TOSHIBA_16385":{"0":"Normal","1":"Fresh","2":"Fresh","3":"Fresh"},"HAIER_18462":{"0":"Indoor","1":"WallMaounted","2":"Fresh","3":"AllHeat","4":"Indoor","5":"Indoor","6":"Indoor","7":"Indoor","8":"Board","9":"Board","10":"Board","11":"Board","12":"Board","13":"Board","14":"Board","15":"Board"},"HAIER_18742":{"0":"Off","1":"Cool","2":"Heat","3":"Auto"},"HAIER_18750":{"0":"Stop","1":"Error","2":"Stop","3":"Start","4":"Normal","5":"RtnOil","6":"Defrost","7":"EquOil","8":"PumpDn","9":"LqdSeal","10":"Reserv","11":"Reserv","12":"Reserv","13":"Reserv","14":"Reserv","15":"Reserv"},"DAIKIN_1366":{"0":"OFF","1":"DEMAND1","2":"DEMAND2","3":"DEMAND3"},"LG_9040":{"0":"OFF","1":"COOL","2":"HEAT","3":"OFF"},"ALTHERMA_INST_GENERAL_ENABLED_DISABLED":{"0":"Disabled","1":"Enabled"},"ALTHERMA_INST_GENERAL_INCREASE_AROUND_0C":{"0":"No","1":"increase 2°C, span 4°C","2":"increase 4°C, span 4°C","3":"increase 2°C, span 8°C","4":"increase 4°C, span 8°C"},"ALTHERMA_INST_GENERAL_SETPOINT_MODE":{"0":"Fixed","1":"WD heating, fixed cooling","2":"Weather dependent"},"ALTHERMA_INST_GENERAL_EMITTER_TYPE":{"0":"Underfloor heating","1":"Fancoil unit","2":"Radiator"},"ALTHERMA_INST_GENERAL_CONTROL":{"0":"LWT control","1":"Ext RT control","2":"RT control"},"ALTHERMA_INST_GENERAL_THERMOSTAT_TYPE":{"0":"-","1":"1 contact","2":"2 contacts"},"ALTHERMA_INST_GENERAL_NO_YES":{"0":"No","1":"Yes"},"ALTHERMA_INST_7_02":{"0":"1 LWT zone","1":"2 LWT zones"},"ALTHERMA_INST_F_0D":{"0":"Continuous","1":"Sample","2":"Request"},"ALTHERMA_INST_E_02":{"0":"Reversible (*6)","1":"Heating only (*7)"},"ALTHERMA_INST_4_9__F_00":{"0":"Restricted","1":"Allowed"},"ALTHERMA_INST_6_0D":{"0":"Reheat only","1":"Reheat + sched.","2":"Scheduled only"},"ALTHERMA_INST_2_00":{"0":"Each day","1":"Monday","2":"Tuesday","3":"Wednesday","4":"Thursday","5":"Friday","6":"Saturday","7":"Sunday"},"ALTHERMA_INST_E_03":{"2":"3V (*1)","3":"6V (*2)","4":"9W (*3)"},"ALTHERMA_INST_9_1__7_02":{"0":"Single zone","1":"Dual zone"},"ALTHERMA_INST_9_1__4_0A":{"0":"1 (*1)","1":"1/1+2 (*2) (*3)","2":"1/2","3":"1/2 + 1/1+2 in emergency"},"ALTHERMA_INST_9_2_1__E_05__E_06__E_07":{"0":"No DHW (*4)","2":"EKHW (*4)","3":"Integrated (*5)","7":"EKHWP (*4)"},"ALTHERMA_INST_D_02":{"0":"No","1":"Secondary rtrn","2":"Disinf. Shunt"},"ALTHERMA_INST_BACKUP_HEATER_CONFIG":{"0":"1 (*1)","1":"1/1+2 (*2) (*3)","2":"1/2","3":"1/2 + 1/1+2 in emergency"},"ALTHERMA_INST_5_00":{"0":"Allowed","1":"Not allowed"},"ALTHERMA_INST_4_00":{"0":"Disabled","1":"Enabled","2":"Only DHW"},"ALTHERMA_INST_4_03":{"0":"Restricted","1":"Allowed","2":"Overlap","3":"Compressor off","4":"Legionella only"},"ALTHERMA_INST_4_06":{"0":"Manual","1":"Automatic"},"ALTHERMA_INST_4_04":{"0":"Intermittent","1":"Continuous","2":"Off"},"ALTHERMA_INST_D_01":{"0":"No","1":"Active open","2":"Active closed","3":"Safety thermostat"},"ALTHERMA_INST_D_00":{"0":"None","1":"BSH only","2":"BUH only","3":"All heaters"},"ALTHERMA_INST_D_05":{"0":"Forced off","1":"As normal"},"ALTHERMA_INST_4_08":{"0":"No limitation","1":"Continuous","2":"Digital inputs"},"ALTHERMA_INST_4_09":{"0":"Current","1":"Power"},"ALTHERMA_INST_GLOBAL_ELECTRICITY_METER":{"0":"No","1":"0,1 pulse/kWh","2":"1 pulse/kWh","3":"10 pulse/kWh","4":"100 pulse/kWh","5":"1000 pulse/kWh"},"ALTHERMA_INST_C_08":{"0":"No","1":"Outdoor sensor","2":"Room sensor"},"ALTHERMA_INST_1_0A":{"0":"No averaging","1":"12 hours","2":"24 hours","3":"48 hours","4":"72 hours"},"ALTHERMA_INST_C_02":{"0":"No","1":"Bivalent"},"ALTHERMA_INST_7_05":{"0":"Very high","1":"High","2":"Medium","3":"Low","4":"Very low"},"ALTHERMA_INST_C_09":{"0":"Normally open","1":"Normally closed"},"ALTHERMA_INST_9_4_1":{"0":"OFF","1":"Quiet","2":"More quiet","3":"Most quiet","4":"Automatic"},"ALTHERMA_INST_9_1__E_05_E_06_E_07":{"0":"No DHW (*4)","2":"EKHW (*4)","3":"Integrated (*5)","7":"EKHWP (*4)"},"ALTHERMA_INST_5_0D":{"0":"230V, 1~ (*1) (*2)","1":"230V, 3~ (*2)","2":"400V, 3~ (*3)"},"ALTHERMA_INST_4_01":{"0":"None","1":"BSH","2":"BUH"},"ALTHERMA_INST_C_00":{"0":"Solar priority","1":"Heat pump priority"},"ALTHERMA_INST_D_04":{"0":"No","1":"Pwr consmp ctrl"},"ALTHERMA_INST_E_05":{"0":"No (*4)","1":"Yes (*5)"},
      // "ALTHERMA_INST_E_07":{"0":"EKHW (*4)","1":"Integrated (*5)","5":"EKHWP (*4)"},
      // "ECODAN_22020":{"0":"Heating room temp","1":"Heating flow temp","2":"Heating compensation curve","4":"Cooling flow temp"},
      // "ECODAN_22025":{"0":"Normal","1":"Eco"},
      // "ECODAN_22029":{"0":"Standard","1":"Large"}
    }
  }

  ['GET /lines']: () => {
    success: boolean
    data: {
      // {"611e8ffaf3e520289445d32d":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d32d","device":"608159a30129952d7038e03b","id":1,"brand":4,"__v":0,"systems":["611ea2f0675f8c2c17e1c0a3","611ea2f0675f8c2c17e1c09a","611ea2f0675f8c2c17e1c0af","611ea2f0675f8c2c17e1c0a9","611ea2f0675f8c2c17e1c0b8","611ea2f0675f8c2c17e1c0be"],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d333":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d333","device":"608159a30129952d7038e03b","id":3,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d336":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d336","device":"608159a30129952d7038e03b","id":4,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d33a":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d33a","device":"608159a30129952d7038e03b","id":5,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d33d":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d33d","device":"608159a30129952d7038e03b","id":6,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d340":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d340","device":"608159a30129952d7038e03b","id":7,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"611e8ffaf3e520289445d343":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"611e8ffaf3e520289445d343","device":"608159a30129952d7038e03b","id":8,"brand":999,"__v":0,"systems":[],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"},"6130bedb6e731c4b3ccce2b1":{"subBrand":0,"isMapping":false,"mappingTotal":0,"mappingCurrent":0,"_id":"6130bedb6e731c4b3ccce2b1","device":"608159a30129952d7038e03b","id":2,"brand":4,"__v":0,"systems":["6154b4ad181a4301e3bb15ed","6154b4ad181a4301e3bb15f6","6154b4ad181a4301e3bb15fc"],"site":"611e8b8e6c25142b164b10bc","customer":"611a722d6be1857e875abb93"}}
    }
  }

  ['GET /applications/site-management']: () => {
    success: boolean
    data: {
      [siteId: string]: {
      }
    }
  }

  ['GET /systems/:systemId/units']: (reqParams: { systemId: string }) => { // get system units
    success: boolean
    data: {
      [unitId: string]: UnitInfo
    }
  }

  ['GET /devices/:deviceId/units']: (reqParams: { deviceId: string }) => { // get device units
    success: boolean
    data: {
      [unitId: string]: UnitInfo
    }
  }

  ['PUT /systems/:systemId/controls/modes']: (reqParams: { systemId: string, mode: number }) => { // set system active operation mode for all units
    success: boolean
    data: null
  }

  ['PUT /units/:unitId/controls/setpoints']: (reqParams: { unitId: string, setpoint: number }) => { // set unit temperature setpoint
    success: boolean
    data: null
  }

  ['PUT /units/:unitId/controls/operation-modes']: (reqParams: { unitId: string, operationMode: string }) => { // set unit operation mode
    success: boolean
    data: null
  }

  ['PUT /units/:unitId/controls/fan-modes']: (reqParams: { unitId: string, fanMode: number }) => { // set unit fan mode
    success: boolean
    data: null
  }

  ['PUT /units/:unitId/controls/swing-modes']: (reqParams: { unitId: string, swingMode: number }) => { // set unit swing mode
    success: boolean
    data: null
  }

  ['PUT /units/:unitId/controls/operation-statuses']: (reqParams: { unitId: string, operationStatus: number }) => { // set unit switch mode
    success: boolean
    data: null
  }

  ['GET /devices/:deviceId/systems']: (reqParams: { deviceId: string }) => {
    success: boolean
    data: {
      [systemId: string]: {
        pendingAck: boolean // true
        units: string[] // ["6154b46c181a4301e3baf517"...]
        powerMeters: string[] // []
        mapping: boolean // false
        name: string // "Mitsubishi electric_1_52"
        device: string // "608159a30129952d7038e03b"
        line: number // 1
        internalId: string // "52"
        brandNum: number // 4
        capacity: number // 0
        capacityMeasurementUnits: number // 1
        series: string // ""
        type: string // ""
        updatedAt: string // "2022-01-19T17:32:32.746Z"
        id: string // "611ea2f0675f8c2c17e1c0a9"
      },
    }
  }

  ['GET /systems/:systemId/schedules']: (reqParams: { systemId: string }) => {
    success: boolean
    data: {
      [schedId: string]: ScheduleInfo
    }
  }

  ['GET /customers/:customerId/schedules']: (reqParams: { customerId: string }) => {
    success: boolean
    data: {
      [schedId: string]: ScheduleInfo
    }
  }

  ['GET /units/:unitId/schedules']: (reqParams: { unitId: string }) => {
    success: boolean
    data: {
      [schedId: string]: ScheduleInfo&{ powerOffTime: number }
    }
  }

  ['GET /sites/:siteId']: (reqParams: { siteId: string }) => {
    success: boolean
    data: {
      devices: string[]
      groups: []
      zones: []
      users: []
      procedures: []
      enable: boolean
      basePackageEnabled: boolean
      advancedOperationsPackageEnabled: boolean
      remoteServicePackageEnabled: boolean
      predictiveMaintenancePackageEnabled: boolean
      powerPackageEnabled: boolean
      commercialBasePackageEnabled: boolean
      enableAirQuality: boolean
      name: string
      country: string
      city: string
      state: string
      address: string
      postalCode: string
      timezone: string
      managementStatus: number
      serviceStatus: number
      ignoreStatus: boolean
      lat: number
      lon: number
      customer: string
      creatingDate: number
      creator: string
      lastTemperature: number
      lastTemperatureTimestamp: number
      id: string
      units: string[]
    }
  }

  ["GET /sites/:siteId/groups"]: (reqParams: { siteId: string }) => {
    success: boolean
    data: GroupsInfo,
  }

  ["GET /sites/:siteId/units"]: (reqParams: { siteId: string }) => {
    success: boolean
    data: {
      [unitId: string]: UnitInfo
    }
  }

  ["POST /schedules/units/:unitId"]: (reqParams: { unitId: string }&ScheduleInfo2) => {
    success: boolean
    data: ScheduleInfo
  }

  ["PUT /schedules/:scheduleId"]: (reqParams: { scheduleId: string }&ScheduleInfo2) => {
    success: boolean
    data: ScheduleInfo
  }

  ["GET /schedules/:scheduleId"]: (reqParams: { scheduleId: string }) => {
    success: boolean
    data: ScheduleInfo
  }

  ["DELETE /schedules/:scheduleId"]: (reqParams: { scheduleId: string }) => {
    success: boolean
    data: null
  }

  ["GET /events"]: (reqParams: { type: number, startTime: number, endTime: number, status?: number[] }) => { // ?startTime=1649602800000&endTime=1649926799000&type=1  // ?type=1&status=1&status=3
    success: boolean
    data: {
      [id: string]: {
        resources: { id: string, name: string }[] // [{"id":"62503e881d25cc3864e9dba4","name":"L1.037"}], [{"id":"60e4759e012995318356aa7c","name":"283B960200D8"}]
        acknowledgedTimestamp: number // 0
        customer: string // "611a722d6be1857e875abb93"
        site: string // "6216e2b7d87c341d88179254"
        system: string|null // null
        device: string // "60e47686012995260666969f"
        status: number // 1, 2
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
      }
    }
  }

  ["GET /alert-groups"]: () => {
    success: boolean
    data: {
      [id: string]: {
        traps: unknown[] // []
        logicTraps: unknown[] // []
        sites: string[] // ["611e8b8e6c25142b164b10bc"]
        users: unknown[] // []
        contacts: { contact: string, sendEmail: true, sendSms: false }[] // [{"contact": "615ed6206db4b201780c18d4","sendEmail": true,"sendSms": false}]
        name: string // "default_all_on"
        enable: boolean // false
        deviceDisconnectedEnable: boolean // true
        lowLineQualityEnable: boolean // true
        cleanFilterEnable: boolean // false
        indoorUnitErrorEnable: boolean // false
        outdoorUnitErrorEnable: boolean // false
        unitDisconnectedEnable: boolean // true
        allUserTrapsEnable: boolean // true
        deviceHealthLowIstat: boolean // true
        deviceHealthLowOstat: boolean // true
        deviceHealthLowPstat: boolean // true
        deviceHealthLowLqstat: boolean // true
        deviceHealthLowSstat: boolean // true
        entityHealthLowIstat: boolean // true
        entityHealthLowOstat: boolean // true
        entityHealthLowPstat: boolean // true
        entityHealthLowLqstat: boolean // true
        entityHealthLowSstat: boolean // true
        customer: string // "611a722d6be1857e875abb93"
        user: string // "60dc42530129952a1f429615"
        id: string // "611a722e6be1857e875abb98"
      }
    }
  }

  ["GET /services/error-codes"]: () => {
    success: boolean
    data: {
      errorCodeTypes: {
        [type: string]: { // "4"
          [code: string]: string // "2503": "Drain sensor (Thd) fault"
        }
      }
    }
  }
}

interface ScheduleInfo2 {
  isDisabled?: boolean
  name?: string
  powerOnTime?: number
  powerOffTime?: number
  setpoint?: null|number
  scheduleCategory?: 1
  days?: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
}

interface ScheduleInfo {
  days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[]
  units: string[]
  group?: string
  groups: unknown[]
  isDisabled: boolean
  enableOnoff: boolean
  enableMode: boolean
  enableSetpoint: boolean
  enableOnState: boolean
  enableCoolMode: boolean
  enableHeatMode: boolean
  enableAutoMode: boolean
  wrcEnableOnoff: boolean
  wrcEnableMode: boolean
  wrcEnableSetpoint: boolean
  wrcEnableOnState: boolean
  wrcEnableCoolMode: boolean
  wrcEnableHeatMode: boolean
  wrcEnableAutoMode: boolean
  endActionType: number
  eWrcEnableOnoff: boolean
  eWrcEnableMode: boolean
  eWrcEnableSetpoint: boolean
  eWrcEnableCoolMode: boolean
  eWrcEnableHeatMode: boolean
  eWrcEnableAutoMode: boolean
  eWrcDisable: boolean
  startHappened: boolean
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
}

interface UnitInfo {
  activeFanMode: number // 4
  activeOperationMode: number // 0
  activeOperationStatus: number // 2
  activeSetpoint: number // 24
  activeSwingMode: number // 4
  address: string // "052"
  airnet: null|number // 0
  ambientTemperature: number // 16.2
  brand: number // 4
  capacity: number // 0
  capacityMeasurementUnits: number // 1
  compressors?: unknown[] // []
  controlUnit?: string // "c154b4ad187a4301e3bb15dd"
  createdAt?: string // "2022-01-24T16:34:02.587Z"
  customer?: string
  dataAddress: string // "30303131"
  device: string // "c154b4ad187a4301e3bb15dd"
  deviceSerial: string // "283B96004BE1"
  eWrcDisable: boolean // false
  eWrcEnableAutoMode: boolean // false
  eWrcEnableCoolMode: boolean // false
  eWrcEnableHeatMode: boolean // false
  eWrcEnableMode: boolean // false
  eWrcEnableOnoff: boolean // false
  eWrcEnableSetpoint: boolean // false
  eWrcTemperatureLimits: {} // {"0":[0,24],"1":[20,32],"2":[0,32]} // {"0":{"1":[0,24],"2":[32,75]},"1":{"1":[20,32],"2":[68,90]},"2":{"1":[0,32],"2":[32,90]}}
  enableAutoMode: boolean // true, false
  enableCoolMode: boolean // true, false
  enableHeatMode: boolean // true, false
  enableMode: boolean // false
  enableOnState: boolean // false
  enableOnoff: boolean // false
  enableSetpoint: boolean // false
  filter: boolean // false
  flags: number // 0
  groups: unknown[] // []
  heaterTempControl?: number // 3
  id: string // "c154b4ad187a4301e3bb15dd"
  internalId: string // "283B96004BE1:30303131"
  isConnected: boolean // true
  isHeaterBooster: boolean // false
  isVisible: boolean // true
  lastPowerConsumption?: number // 0
  line: number // 1
  maxPowerConsumption?: number // 0
  message: string // "OK  "
  model: null|string // ""
  name: string // "ODU L1.052"
  otherUnits: string[] // ["c154b4ad187a4301e3bb15dd"]
  privateId: string // "002"
  schedules: string[] // []
  serialNumber: null|string // ""
  serviceUnits: string[] // ["c154b4ad187a4301e3bb15dd"]
  site: string // "c154b4ad187a4301e3bb15dd"
  subType: number // 0
  supportedFanModes: number[] // [0,1,2,3,4]
  supportedOperationModes: number[] // [0,1,2,3,5]
  supportedOperationStatuses: number[] // [1,2]
  supportedSwingModes: number[] // [0,1,2,3,4]
  system: string // "c154b4ad187a4301e3bb15dd"
  systemNumber: string // "52"
  task?: number // 0, 1
  temperatureLimits: {} // {"0":{"1":[0,24],"2":[32,75]},"1":{"1":[20,32],"2":[68,90]},"2":{"1":[0,32],"2":[32,90]}} // {"0":[0,24],"1":[20,32],"2":[0,32]}
  temperatureLimitsObj?: {} // {"0":[0,24],"1":[20,32],"2":[0,32]}
  timerWorkingMinutes?: number // 0
  type: number // 1, 3, 2
  unitSettingsEWrcSchedules: unknown[] // []
  unitSettingsSchedules: unknown[] // []
  updatedAt: string // "2022-01-26T13:34:52.199Z"
  workingHours: number // 1212.5
  workingMinutes: number // 14
  zones: unknown[] // []
}

interface GroupsInfo {
  [groupId: string]: {
    units: string[],
    sensors: string[],
    schedules: string[],
    name: string,
    type: string,
    description: string,
    customer: string,
    site: string,
    id: string
  },
}

// type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export type ApiResps = {
  [Route in keyof API]: ReturnType<API[Route]>;
};
// type ApiResps2 = {
//   [Route in keyof API]: ReturnType<API[Route]>['data'];
// };
export type ApiParams = {
  [Route in keyof API]: Parameters<API[Route]>[0];
};

function checkAxiosError (err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request;
    if (err.response) {
      delete err.response.request;
      delete err.response.config;
    }
    logger.error(err);
    throw Error('erro ao buscar informações da CoolAutomation').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_COOLAUT_HTTP' });
  }
  throw err;
}

function paramReplacer (path: string, values: { [k:string]: any }): string {
  if (!values) return path;
  path = path.replace(/\:(\w+)/g, (_txt, key) => {
    const encoded = encodeURIComponent(String(values[key]));
    delete values[key];
    return encoded;
  });
  return path;
}

async function apiReq<Key extends keyof API> (auth: string|null, route: Key, body?: { [k: string]: string|number|boolean|Array<string|number|boolean> }): Promise<AxiosResponse<ApiResps[Key]>> {
  const [method, path] = route.split(' ');
  const config: AxiosRequestConfig = {
    method: method as Method,
    baseURL: servConfig.coolautApi.url,
    url: path,
    headers: {},
    data: body,
  };
  if (body) {
    config.url = paramReplacer(path, body);
    if (method === 'GET') {
      const queryPars = Object.entries(body).map(([key, val]) => {
        if (val instanceof Array) {
          return val.map(val2 => `${encodeURIComponent(key)}=${encodeURIComponent(val2)}`).join('&');
        }
        else return`${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
      }).join('&');
      if (queryPars) config.url += ('?' + queryPars);
      config.data = body = undefined;
    }
  }
  if (auth) config.headers['x-access-token'] = auth;
  if (body) config.headers['Content-Type'] = 'application/json; charset=UTF-8';
  return axios.request(config)
    .catch(checkAxiosError);
}

const tokenKeeper = {
  token: null as null|string,
  runningRequest: null as null|Promise<string>,
}
async function privateApiReq<Key extends keyof API> (route: Key, body?: {}) {
  try {
    if (!tokenKeeper.token) {
      tokenKeeper.token = await authenticateDiel();
    }
    return apiReq(tokenKeeper.token, route, body)
    .catch(async (err) => {
      logger.error(err);

      const errA = err as AxiosError;
      if (errA && errA.isAxiosError && errA.response && (errA.response.status === 401)) {
        logger.error(`CoolAutomation token invalid, trying to get a new one`);
        tokenKeeper.token = await authenticateDiel();
        return apiReq(tokenKeeper.token, route, body); // try again with the new token
      }
      throw err;
    })
  } catch (err) {
    logger.error(err);
    return checkAxiosError(err);
  }
}

export async function coolAutomationApi<Key extends keyof API>(path: Key, body?: ApiParams[Key]): Promise<ApiResps[Key]['data']> {
  const responseAxios = await privateApiReq(path, body);
  const responseBody = responseAxios.data;
  if (!responseBody.success) throw Error('Falha ao obter dados da CoolAutomation');
  return responseBody.data;
}

async function authenticateDiel () {
  if (!tokenKeeper.runningRequest) {
    tokenKeeper.runningRequest = Promise.resolve().then(async () => {
      const response = await apiReq(null, 'POST /users/authenticate/', {
        username: servConfig.coolautApi.username,
        password: servConfig.coolautApi.password,
        appId: servConfig.coolautApi.appId,
      });
      if (response.data.success && response.data.data && response.data.data.token) {
        return response.data.data.token;
      } else {
        throw Error('erro ao autenticar na CoolAutomation').HttpStatus(500).DebugInfo({ errorCode: 'EXT_API_COOLAUT_AUTH' });
      }
    });
  }
  try {
    const token = await tokenKeeper.runningRequest;
    tokenKeeper.runningRequest = null;
    return token;
  } catch (err) {
    logger.error(err);
    tokenKeeper.runningRequest = null;
    throw err;
  }
}
