export default {
  httpPortListenInternalServices: 46129,
  httpPortListenExternalUsers: 46130,
  devicesReadOnlyMode: false,
  publicWebSocket: {
    listenPort: 46132,
    disableTls: true,
    publicCert: "~/cert/api.fullchain.pem",
    privateKey: "~/cert/api.privkey.pem",
  },
  gwHost: '127.0.0.1',
  gwPort: 46101,
}
