export default {
  publicApiHttps: {
    listenPort: 8445,
    disableTls: true,
    publicCert: "./certs/fake_server_certificate.pem",
    privateKey: "./certs/fake_server_private_key.pem",
    clientsCaCert: null as string, // "./certs/OTA/chain.dielenergia.crt.pem",
  },
  publicHttp: {
    listenPort: 8002,
    certbotHost: '127.0.0.1',
    certbotPort: 8180,
  },
  internalApi: {
    listenPort: 46101,
  },
  dieldevDefaultLink: "https://dash.dielenergia.com/analise/dispositivo/$DEVID$/informacoes",
  dieldevLinks: {
    ['/DAL0']: "https://doc.clickup.com/30921681/p/h/xfmyh-8067/6e918633b8b9e0f",
    ['/DMT1']: "https://doc.clickup.com/30921681/p/h/xfmyh-7703/5f4c8e16b8d4e0e",
    ['/DMA0']: "https://doc.clickup.com/30921681/p/h/xfmyh-7863/5a809bd8726ec6c",
    ['/DME0']: "https://doc.clickup.com/30921681/p/h/xfmyh-7923/a70b2b73c4e062c",
    ['/DUT3']: "https://doc.clickup.com/30921681/p/h/xfmyh-8167/ac5a9bceb951251",
    ['/DAM3']: "https://doc.clickup.com/30921681/p/h/xfmyh-8187/ea5239c817eea35",
    ['/DAC4']: "https://doc.clickup.com/30921681/p/h/xfmyh-8207/e355a9bb8760e92",
    ['/ytb']:  "https://youtu.be/XCV6GiA9mew",
    ['/spt']:  "https://api.whatsapp.com/send?phone=5521975933367",
  } as {
    [path: string]: string,
  },
  publicServices: {
    "api-async": { host: "127.0.0.1", port: 46122 },
    "health":    { host: "127.0.0.1", port: 46120 },
    "swdocs":    { host: "127.0.0.1", port: 46124 },
    "realtime":  { host: "127.0.0.1", port: 46130 },
  },
  internalServices: {
    'auth':      { prefix: "/diel-internal/auth/",      host: "127.0.0.1", port: 46121 },
    'health':    { prefix: "/diel-internal/health/",    host: "127.0.0.1", port: 46123 },
    'telegram':  { prefix: "/diel-internal/telegram/",  host: "127.0.0.1", port: 46876 },
    'api-async': { prefix: "/diel-internal/api-async/", host: "127.0.0.1", port: 46128 },
    'realtime':  { prefix: "/diel-internal/realtime/",  host: "127.0.0.1", port: 46129 },
    'bgtasks':   { prefix: "/diel-internal/bgtasks/",   host: "127.0.0.1", port: 46131 },
    'ecomodedam': { prefix: "/diel-internal/serviceEcoModeDam/",   host: "127.0.0.1", port: 46134 },
    'driautomation': { prefix: "/diel-internal/serviceDriAutomation/",   host: "127.0.0.1", port: 46135 },
  },
};
