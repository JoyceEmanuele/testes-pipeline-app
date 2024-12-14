export interface ApiInternal {
  '/diel-internal/telegram/send-message-to': (reqParams: {
    phoneNumber: string
    msgText: string
  }) => {
    success: true
  }
  '/diel-internal/telegram/send-message-to-multiple': (reqParams: {
    phoneNumbers: string[]
    msgText: string
  }) => {
    success: true
  }
  '/health_check': (reqParams: {}) => string
}

export type ApiInternalParams = {
  [Route in keyof ApiInternal]: Parameters<ApiInternal[Route]>[0];
};

type ApiInternalResps = {
  [Route in keyof ApiInternal]: Awaited<ReturnType<ApiInternal[Route]>>;
};

export type API_Internal = {
  [Route in keyof ApiInternal]: (reqParams: ApiInternalParams[Route]) => Promise<ApiInternalResps[Route]>;
};
