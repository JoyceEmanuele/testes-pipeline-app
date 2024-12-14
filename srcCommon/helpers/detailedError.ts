export interface ErrorDetails {
  httpStatus: number
  // debugInfoToLog?: any
}

export default function detailedError(messageToUser: string, httpStatus: number) {
  const detailedError: ErrorDetails = {
    httpStatus
  };
  return Object.assign(new Error(messageToUser), { detailedError });
}
