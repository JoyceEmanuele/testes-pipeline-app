/*

Recomenda-se criar o arquivo "configfile.ts" desta forma para garantir que o "configfile_example" esteja sempre atualizado:

import configfile from './configfile_example';
// Altera as propriedades que interessar:
configfile.httpServer = { ... };
configfile.mysqlConfig.password = ...;
export default configfile;

E em produção:

import example from './configfile_example';
const configfile: typeof example = {
  ...
};
export default configfile;

*/

export interface ConfigFile {
  /* Usado para habilitar funções/opreções que só devem ser usadas em produção, por exemplo o envio de emails e de comandos para os dispositivos. */
  /* A ideia é evitar que um desenvolvedor use um backup do banco de dados de produção e envie alertas falsos para os emails dos clientes. */
  isProductionServer: boolean, // false,

  /* Usado para habilitar funções/opreções inseguras que só devem ser usadas em desenvolvimento. */
  isTestServer: boolean, // true,

  /* Usuário principal do dash com as maiores permissões possíveis. */
  /* Este usuário está sempre disponível, mesmo com um banco de dados vazio. */
  frontUser: {
    user: string, // "devmaster",
    password: string, // "devmaster",
    password2?: string, // "devmaster",
  },

  httpServer: {
    port: number, // 8443,
    portListenInternalServices: number, // 46126,
  },
  mysqlConfig: {
    host: string, // "127.0.0.1",
    unixSocket?: string,
    user: string, // "develbackend",
    password: string, // "uniquepassword",
    database: string, // "dashdevelopment",
    port: number, // 3306,
  },
  mongodb: {
    url: string, // "mongodb://127.0.0.1:27017",
    dbname: string, // "dashdevelopment",
  },
  otaConfig: {
    host: string, // "api.dielenergia.com",
    port: number,
    token: string,
  },
  firmwareBucket: {
    name: string, // "firmware.ota.updates",
    region: string, // "us-east-1",
  },
  iotrelay: {
    host: string, // "127.0.0.1",
    port: number, // 29546,
  },
  rusthist: {
    url: string, // "http://127.0.0.1:29547",
    token: string, // "",
  },
  faultsRep: {
    host: string,
    port: number,
  },
  prodApiForwarder: {
    url: string, // "https://api.dielenergia.com",
    user: string, // "",
    password: string, // "secret",
  },
  jwtSecretKey: string, // "secret",
  pwcheckKey: string, // "secret",
  pwHashDb: string, // "secret",
  secretPassphraseTripleDES: string, // "secret",
  frontUrls: {
    base: string // "https://dash.dielenergia.com",
  },
  dacRealtimePath: string, // "https://dash.dielenergia.com/analise/maquina/$DACID$/tempo-real",
  filesBucket: {
    region: string, // "us-east-1",
    name: string, // "develop-dl-dielenergia-com",
    url: string, // "https://develop-dl-dielenergia-com.s3.sa-east-1.amazonaws.com",
    assetImagesBucketPath: string, //"assets_images/",
    devGroupsImagesBucketPath: string, //"dev_groups_images/",
    imagesBucketPath: string, // "dac_images/",
    laagerBucketPath: string, // "laager_images/",
    vtImagesBucketPath: string, // "vt_images/",
    illuminationsImagesBucketPath: string, // "illuminations_images"
    dmtImagesBucketPath: string // "dmt_images/"
    nobreakImagesBucketPath: string // "nobreak_images/"
    dalImagesBucketPath: string, // "dal_images/",
  },
  frontPwResetUrl: string, // "https://dash.dielenergia.com/resetar-senha",
  frontRdToDashUrl: string, // "https://dash.dielenergia.com/login?rdtoken=$RDTOKEN$",
  dielClientId: number, // 1,
  // serversMonitorPort: number, // 46875, // porta em que o API-Server aguarda reports dos outros servidores
  serversMonitor: { // Este nome ficou ruim, na verdade é a API do monitor dos brokers
    baseURL: string, // "http://127.0.0.1:46882",
  },
  deviceSimulatorAPI: string, // "http://127.0.0.1:46883",
  awsConfig: {
    dynamoDbRegion: string, // "us-east-1",
    accessKeyId: string, // "ABCDEFGHIJK",
    secretAccessKey: string, // "ABCDEFGHIJK",
    sessionToken?: string, // "ABCDEFGHIJK",
  },
  googleApi: {
    apikey: string, // "ABCDEF",
  },
  nodemailer: {
    host: string, // "smtp.gmail.com",
    port: number, // 465,
    secure: boolean, // true,
    auth: {
      type: string, // "OAuth2",
      user: string, // "user@domain.com",
      clientId: string, // "xyz.apps.googleusercontent.com",
      clientSecret: string, // "secretpassword",
      refreshToken: string, // "...",
      accessToken: string, // "...",
    }
  },
  ness: {
    dashToken: string, // "123456"
  },
  lsmApi: {
    baseURL: string, // "https://lsm.linksolutions.com.br:8088/",
    username: string, // "user",
    password: string, // "secret",
  },
  greenantApi: {
    url: string, // "https://backend.greenant.com.br/api",
    user: string, // "user@domain.com",
    password: string, // "secretpassword",
  },
  coolautApi: {
    url: string, // "https://api.coolremote.net/api/v2",
    username: string, // "user@domain.com",
    password: string, // "secretpassword",
    appId: string, // "CoolCommercial"
  },
  laagerApi: {
    url: string, // "https://iot.laager.com.br",
    grant_type: string, // "password",
    client_id: string, // "123abc",
    client_secret: string, // "456def",
    username: string, // "user",
    password: string, // "secret",
  },
  invoiceConfig: {
    serverUrl: string //url: 'https://api.dielenergia.com:8001',
    authToken: string, // "123456",
  },
  filesBucketPrivate: {
    region: string, // "us-east-1",
    name: string, // "develop-private-dl-dielenergia-com",
    url: string, // "https://develop-private-dl-dielenergia-com.s3.sa-east-1.amazonaws.com",
    sketchesBucketPath: string, //"units_sketches/",
    reportsBucketPath: string, // "unit_reports/",
    invoicePdfBucketPath: string, // "invoice_pdf/",
    simcardsBucketPath: string, // "simcards/",
  },
  fourDocsApi:{
    url: string //"https://api.4docs.cloud/v2",
    grant_type: string //"client_credentials", 
    username: string // "user",
    password: string // "password"
    monthsForHistory: number // 48
  },  
  debugScriptMultScheduleDut: boolean // false
  debugAlerts: boolean // false
  debugDamsEcoMode: string[]
  metaTelecomApi: {
    userId: string // '12345'
    password: string // 'segredo'
  }
  serviceGateway: {
    privateInternalUrl: string
    publicExternalUrl: string
  }
  inmetApi: {
    token: string // "..."
  },
  chromiumExecutable: string // "chomium"
  APM_ELASTIC: string
  APM_TOKEN: string
  APM_ENV: string
  logUdpPort?: number
  KiteApi: {
    url: string,
    cert: string,
    key: string, 
  }
  mainServiceAPI: string, // "",  
  DEV_EXCLUDE_TIMEZONE: string,
  uploadServiceAPI: string
  mqttBroker: {
    connectionString: string, // 'mqtt://clustermqtt.lan.dielenergia.com:1883'
    username: string,
    password: string,
  },
}

const configfile: ConfigFile = {
  isProductionServer: false,
  isTestServer: true,
  frontUser: {
    user: "ABCDE",
    password: "ABCDE"
  },
  httpServer: {
    port: 1,
    portListenInternalServices: 1,
  },
  mysqlConfig: {
    host: "ABCDE",
    user: "ABCDE",
    password: "ABCDE",
    database: "ABCDE",
    port: 1
  },
  mongodb: {
    url: "ABCDE",
    dbname: "ABCDE"
  },
  otaConfig: {
    host: "ABCDE",
    port: 0,
    token: "ABCDE"
  },
  firmwareBucket: {
    name: "ABCDE",
    region: "ABCDE",
  },
  iotrelay: {
    host: "ABCDE",
    port: 0
  },
  rusthist: {
    url: "ABCDE",
    token: "ABCDE"
  },
  faultsRep: {
    host: "ABCDE",
    port: 1
  },
  prodApiForwarder: {
    url: "ABCDE",
    user: "ABCDE",
    password: "ABCDE"
  },
  jwtSecretKey: "ABCDE",
  pwcheckKey: "ABCDE",
  pwHashDb: "ABCDE",
  secretPassphraseTripleDES: "ABCDE",
  frontUrls: {
    base: "ABCDE"
  },
  dacRealtimePath: "ABCDE",
  filesBucket: {
    region: "ABCDE",
    name: "ABCDE",
    url: "ABCDE",
    imagesBucketPath: "ABCDE",
    assetImagesBucketPath: "ABCDE",
    devGroupsImagesBucketPath: "ABCDE",
    laagerBucketPath: "ABCDE",
    vtImagesBucketPath: "ABCDE",
    illuminationsImagesBucketPath: "ABCDE",
    dmtImagesBucketPath: "ABCDE",
    nobreakImagesBucketPath: "ABCDE",
    dalImagesBucketPath:"ABCDE" ,
  },
  frontPwResetUrl: "ABCDE",
  frontRdToDashUrl: "ABCDE",
  dielClientId: 0,
  serversMonitor: {
    baseURL: "ABCDE"
  },
  deviceSimulatorAPI: "ABCDE",
  awsConfig: {
    dynamoDbRegion: "ABCDE",
    accessKeyId: "ABCDE",
    secretAccessKey: "ABCDE",
    sessionToken: "ABCDE"
  },
  googleApi: {
    apikey: "ABCDE"
  },
  nodemailer: {
    host: "ABCDE",
    port: 1,
    secure: true,
    auth: {
      type: "ABCDE",
      user: "ABCDE",
      clientId: "ABCDE",
      clientSecret: "ABCDE",
      refreshToken: "ABCDE",
      accessToken: "ABCDE"
    }
  },
  ness: {
    dashToken: "ABCDE"
  },
  lsmApi: {
    baseURL: "ABCDE",
    username: "ABCDE",
    password: "ABCDE"
  },
  greenantApi: {
    url: "ABCDE",
    user: "ABCDE",
    password: "ABCDE"
  },
  coolautApi: {
    url: "ABCDE",
    username: "ABCDE",
    password: "ABCDE",
    appId: "ABCDE"
  },
  laagerApi: {
    url: "ABCDE",
    grant_type: "ABCDE",
    client_id: "ABCDE",
    client_secret: "ABCDE",
    username: "ABCDE",
    password: "ABCDE"
  },
  invoiceConfig: {
    serverUrl: "ABCDE",
    authToken: "ABCDE",
  },
  filesBucketPrivate: {
    region: "ABCDE",
    name: "ABCDE",
    url: "ABCDE",
    sketchesBucketPath: "ABCDE",
    reportsBucketPath: "ABCDE",
    invoicePdfBucketPath: "ABCDE",
    simcardsBucketPath: "ABCDE", // "simcards/",
  },
  fourDocsApi: {
    url: "ABCDE",
    grant_type: "ABCDE", 
    username: "ABCDE",
    password: "ABCDE",
    monthsForHistory: 1,
  },
  debugScriptMultScheduleDut: false,
  debugAlerts: false,
  debugDamsEcoMode: [],
  metaTelecomApi: {
    userId: "ABCDE",
    password: "ABCDE",
  },
  serviceGateway: {
    privateInternalUrl: "ABCDE",
    publicExternalUrl: "ABCDE",
  },
  inmetApi: {
    token: "ABCDE",
  },
  chromiumExecutable: "chomium",
  APM_ELASTIC: 'ABCDE',
  APM_TOKEN: 'ABCDE',
  APM_ENV: 'production',
  KiteApi: {
    url: 'ABCDEasdadasdasdasdasd',
    cert: 'ASDASFAFSDFSDFSDFS',
    key: 'ASDASFSDFDSFSDF', 
  },
  mainServiceAPI: "ABCDE",
  DEV_EXCLUDE_TIMEZONE: '',
  uploadServiceAPI: "ABCDE",
  mqttBroker: {
    connectionString: "ABCDE", // 'mqtt://clustermqtt.lan.dielenergia.com:1883'
    username: "ABCDE",
    password: "ABCDE",
  },
};

export default configfile;
