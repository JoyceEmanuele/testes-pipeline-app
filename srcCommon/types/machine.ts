export type Machine = {
  name: string | undefined,
  user: string | undefined,
  devices: {
    devId: string | undefined,
    shippingFrequency: number,
    measurementFrequency: number,
  }[],
  dynamoSource?: DynamoSource,
  recurrences: {
    duration: string | undefined
    mode: string | undefined
    state: string | undefined
    l1: number
    p0: number
    p1: number
    t0: number
    t1: number
    t2: number
  }[],
  burstData: boolean,
}

export type Simulation = {
  name: string | undefined,
  user: string | undefined,
  dynamoSource?: DynamoSource[],
  dacRecurrences?: {
    duration: string | undefined
    mode: string | undefined
    state: string | undefined
    l1: number
    p0: number
    p1: number
    t0: number
    t1: number
    t2: number
    devId: string | undefined,
    shippingFrequency: number,
    measurementFrequency: number,
  }[],
  dutRecurrences?: {
    duration: string | undefined
    mode: string | undefined
    state: string | undefined
    temperature: number
    temperature_1: number
    humidity: number
    eCO2: number
    tvoc: number
    devId: string | undefined,
    shippingFrequency: number,
    measurementFrequency: number,
  }[],
  damRecurrences?: {
    state: string | undefined
    devId: string | undefined
    mode: string | undefined
    Temperature: number | undefined
    duration: string | undefined
    shippingFrequency: number
    measurementFrequency: number
  }[],
  burstData: boolean,
  syncRecurrences?: boolean,
}

export type DynamoSource = {
  startTime: string,
  endTime: string,
  devId: string
}