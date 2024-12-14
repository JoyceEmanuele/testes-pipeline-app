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
  otaConfig: {
    host: string, // "api.dielenergia.com",
    port: number, // 443,
    token: string, // "abc123", // Um token de autorização já que o endpoint de download de firmware é público
  },
  firmwareBucket: {
    name: string, // "firmware.ota.updates",
    region: string, // "us-east-1",
  },
  mqttBroker: {
    connectionString: string, // 'mqtt://clustermqtt.lan.dielenergia.com:1883'
    username: string,
    password: string,
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
  DEV_EXCLUDE_TIMEZONE: string
  uploadServiceAPI: string, // "",
}

const configfile: ConfigFile = {
  isProductionServer: false,
  isTestServer: true,
  frontUser: {
    user: "devmaster",
    password: "devmaster"
  },
  httpServer: {
    port: 8443,
    portListenInternalServices: 46126,
  },
  mysqlConfig: {
    host: "127.0.0.1",
    user: "develbackend",
    password: "uniquepassword",
    database: "dashdevelopment",
    port: 3306
  },
  otaConfig: {
    host: "api.dielenergia.com",
    port: 443,
    token: "abc123"
  },
  firmwareBucket: {
    name: "firmware.ota.updates",
    region: "us-east-1",
  },
  mqttBroker: {
    connectionString: 'mqtt://127.0.0.1:1883',
    username: 'dashserver',
    password: 'segredo',
  },
  rusthist: {
    url: "http://127.0.0.1:29547",
    token: ""
  },
  faultsRep: {
    host: "127.0.0.1",
    port: 18913
  },
  prodApiForwarder: {
    url: "https://api.dielenergia.com",
    user: "",
    password: "secret"
  },
  jwtSecretKey: "secret",
  pwcheckKey: "secret",
  pwHashDb: "secret",
  secretPassphraseTripleDES: "secret",
  frontUrls: {
    base: "https://dash.dielenergia.com"
  },
  dacRealtimePath: "https://dash.dielenergia.com/analise/maquina/$DACID$/tempo-real",
  filesBucket: {
    region: "us-east-1",
    name: "develop-dl-dielenergia-com",
    url: "https://develop-dl-dielenergia-com.s3.sa-east-1.amazonaws.com",
    imagesBucketPath: "dac_images/",
    assetImagesBucketPath: "assets_images/",
    devGroupsImagesBucketPath: "dev_groups_images/",
    laagerBucketPath: "laager_images/",
    vtImagesBucketPath: "vt_images/",
    illuminationsImagesBucketPath: "illuminations_images/",
    dmtImagesBucketPath: "dmt_images/",
    nobreakImagesBucketPath: "nobreak_images/",
    dalImagesBucketPath: "dal_images/",
  },
  frontPwResetUrl: "https://dash.dielenergia.com/resetar-senha",
  frontRdToDashUrl: "https://dash.dielenergia.com/login?rdtoken=$RDTOKEN$",
  dielClientId: 1,
  // serversMonitorPort: 46875,
  serversMonitor: {
    baseURL: "http://127.0.0.1:46882",
  },
  deviceSimulatorAPI: "http://127.0.0.1:46883",
  awsConfig: {
    dynamoDbRegion: "us-east-1",
    accessKeyId: "ABCDEFGHIJK",
    secretAccessKey: "ABCDEFGHIJK",
    sessionToken: "ABCDEFGHIJK"
  },
  googleApi: {
    apikey: "ABCDEF"
  },
  nodemailer: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: "user@domain.com",
      clientId: "xyz.apps.googleusercontent.com",
      clientSecret: "secretpassword",
      refreshToken: "...",
      accessToken: "..."
    }
  },
  ness: {
    dashToken: "123456"
  },
  lsmApi: {
    baseURL: "https://lsm.linksolutions.com.br:8088/",
    username: "user",
    password: "secret"
  },
  greenantApi: {
    url: "https://backend.greenant.com.br/api",
    user: "user@domain.com",
    password: "secretpassword"
  },
  coolautApi: {
    url: "https://api.coolremote.net/api/v2",
    username: "user@domain.com",
    password: "secretpassword",
    appId: "CoolCommercial"
  },
  laagerApi: {
    url: "https://iot.laager.com.br",
    grant_type: "password",
    client_id: "123abc",
    client_secret: "456def",
    username: "user",
    password: "secret"
  },
  invoiceConfig: {
    serverUrl: 'https://api.dielenergia.com:8001',
    authToken: "1ceec747-9056-4bce-850e-9738608bb6e4",
  },
  filesBucketPrivate: {
    region: "us-east-1",
    name: "develop-private-dl-dielenergia-com",
    url: "https://develop-private-dl-dielenergia-com.s3.sa-east-1.amazonaws.com",
    sketchesBucketPath: "units_sketches/",
    reportsBucketPath: "unit_reports/",
    invoicePdfBucketPath: "invoice_pdf/",
    simcardsBucketPath: "simcards/",
  },
  fourDocsApi: {
    url: "https://api.4docs.cloud/v2",
    grant_type: "client_credentials", 
    username: "user",
    password: "password",
    monthsForHistory: 48,
  },
  debugScriptMultScheduleDut: false,
  debugAlerts: false,
  debugDamsEcoMode: [],
  metaTelecomApi: {
    userId: '12345',
    password: 'segredo',
  },
  serviceGateway: {
    privateInternalUrl: 'http://127.0.0.1:46101/',
    publicExternalUrl: 'http://127.0.0.1:8002/',
  },
  inmetApi: {
    token: "...",
  },
  chromiumExecutable: "chomium",
  APM_ELASTIC: 'https://elastic-qa.dielenergia.com:8201',
  APM_TOKEN: 'apmagentdash',
  APM_ENV: 'production',
  KiteApi: {
    url: 'https://kiteplatform-api.telefonica.com:8010/services/REST/GlobalM2M',
    cert: 'certs/Customer_certificate.cer',
    key: 'certs/Customer_certificate.key', 
  },
  mainServiceAPI: 'http://127.0.0.1:3003',
  DEV_EXCLUDE_TIMEZONE: '',
  uploadServiceAPI: 'http://127.0.0.1:3004',
};

export default configfile;
