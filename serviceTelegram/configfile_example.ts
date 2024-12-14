export interface ConfigFile {
  telegramService: {
    apiId: number, // 1000,
    apiHash: string, // "abcdef",
    myNumber: string, // "+5511...",
    httpPort: number, // 46876,
    sessionString: string, // "...",
  },
}

const configfile: ConfigFile = {
  telegramService: {
    apiId: 1000,
    apiHash: "abcdef",
    myNumber: "+5511900000000",
    httpPort: 46876,
    sessionString: "",
  },
}

export default configfile;
