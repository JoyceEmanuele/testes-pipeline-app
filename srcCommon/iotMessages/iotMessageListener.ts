import {
  TelemetryDAM,
  TelemetryDutAut,
  TelemetryDAL,
  WSListener,
  WSListenerPack,
} from "../types"
import {
  ControlMsgDAC,
  ControlMsgDAL,
  ControlMsgDAM,
  ControlMsgDEV,
  ControlMsgDMA,
  ControlMsgDMT,
  ControlMsgDRI,
  ControlMsgDUT,
} from '../types/devicesMessages'
import { logger } from '../helpers/logger';

let listenersDacControl: WSListener<ControlMsgDAC>[] = []
export function waitForDacControl (checker: (payload: ControlMsgDAC) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDAC> = {}
  const listener: WSListener<ControlMsgDAC> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDacControl.push(listener)
  return listener
}
export function dacControlReceived (payload: ControlMsgDAC): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDacControl.length) {
    let foundFinished = false
    for (const listener of listenersDacControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDacControl = listenersDacControl.filter(listener => !listener.pack.finished)
  }
}


let listenersDamControl: WSListener<ControlMsgDAM>[] = []
export function waitForDamControl (checker: (payload: ControlMsgDAM) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDAM> = {}
  const listener: WSListener<ControlMsgDAM> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDamControl.push(listener)
  return listener
}
export function damControlReceived (payload: ControlMsgDAM): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDamControl.length) {
    let foundFinished = false
    for (const listener of listenersDamControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDamControl = listenersDamControl.filter(listener => !listener.pack.finished)
  }
}


let listenersDamTelemetry: WSListener<TelemetryDAM>[] = []
export function waitForDamTelemetry (checker: (payload: TelemetryDAM) => boolean, timeout: number) {
  const pack: WSListenerPack<TelemetryDAM> = {}
  const listener: WSListener<TelemetryDAM> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDamTelemetry.push(listener)
  return listener
}
export function damTelemetryReceived (telemetry: TelemetryDAM): void {
  if (listenersDamTelemetry.length) {
    let foundFinished = false
    for (const listener of listenersDamTelemetry) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(telemetry)) {
          listener.pack.finished = true; listener.pack.resolve(telemetry); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDamTelemetry = listenersDamTelemetry.filter(listener => !listener.pack.finished)
  }
}


let listenersDutControl: WSListener<ControlMsgDUT>[] = []
export function waitForDutControl (checker: (payload: ControlMsgDUT) => boolean, timeout: number) {
  // if (['DUT303238299', 'DUT302232087', 'DUT302232234'].includes(subscribeDevId)) logger.info(`DBG-DUO-P03 ${subscribeDevId}`);
  const pack: WSListenerPack<ControlMsgDUT> = {}
  const listener: WSListener<ControlMsgDUT> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDutControl.push(listener)
  return listener
}
export function dutControlReceived (payload: ControlMsgDUT): void {
  if (payload?.dev_id === 'DUT303238299' || payload?.dev_id === 'DUT302232087' || payload?.dev_id === 'DUT302232234') logger.info(`DBG-DUO-P04 ${listenersDutControl.length} ${JSON.stringify(payload)}`);
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDutControl.length) {
    let foundFinished = false
    for (const listener of listenersDutControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDutControl = listenersDutControl.filter(listener => !listener.pack.finished)
  }
}


let listenersDutAutTelemetry: WSListener<TelemetryDutAut>[] = []
export function waitForDutTelemetry (checker: (payload: TelemetryDutAut) => boolean, timeout: number) {
  const pack: WSListenerPack<TelemetryDutAut> = {}
  const listener: WSListener<TelemetryDutAut> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDutAutTelemetry.push(listener)
  return listener
}
export function dutAutTelemetryReceived (telemetry: TelemetryDutAut): void {
  if (listenersDutAutTelemetry.length) {
    let foundFinished = false
    for (const listener of listenersDutAutTelemetry) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(telemetry)) {
          listener.pack.finished = true; listener.pack.resolve(telemetry); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDutAutTelemetry = listenersDutAutTelemetry.filter(listener => !listener.pack.finished)
  }
}


let listenersDriControl: WSListener<ControlMsgDRI>[] = []
export function waitForDriControl (checker: (payload: ControlMsgDRI) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDRI> = {}
  const listener: WSListener<ControlMsgDRI> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDriControl.push(listener)
  return listener
}
export function driControlReceived (payload: ControlMsgDRI): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDriControl.length) {
    let foundFinished = false
    for (const listener of listenersDriControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDriControl = listenersDriControl.filter(listener => !listener.pack.finished)
  }
}


let listenersDevControl: WSListener<ControlMsgDEV>[] = []
export function waitForDevControl (checker: (payload: ControlMsgDEV) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDEV> = {}
  const listener: WSListener<ControlMsgDEV> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDevControl.push(listener)
  return listener
}
export function devControlReceived (payload: ControlMsgDEV): void {
  if (listenersDevControl.length) {
    let foundFinished = false
    for (const listener of listenersDevControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDevControl = listenersDevControl.filter(listener => !listener.pack.finished)
  }
}


let listenersDmaControl: WSListener<ControlMsgDMA>[] = []
export function waitForDmaControl (checker: (payload: ControlMsgDMA) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDMA> = {}
  const listener: WSListener<ControlMsgDMA> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDmaControl.push(listener)
  return listener
}

export function dmaControlReceived (payload: ControlMsgDMA): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDmaControl.length) {
    let foundFinished = false
    for (const listener of listenersDmaControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDmaControl = listenersDmaControl.filter(listener => !listener.pack.finished)
  }
}

let listenersDmtControl: WSListener<ControlMsgDMT>[] = []
export function waitForDmtControl (checker: (payload: ControlMsgDMT) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDMT> = {}
  const listener: WSListener<ControlMsgDMT> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDmtControl.push(listener)
  return listener
}

export function dmtControlReceived (payload: ControlMsgDMT): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDmtControl.length) {
    let foundFinished = false
    for (const listener of listenersDmtControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDmtControl = listenersDmtControl.filter(listener => !listener.pack.finished)
  }
}

let listenersDalTelemetry: WSListener<TelemetryDAL>[] = []
export function waitForDalTelemetry (checker: (payload: TelemetryDAL) => boolean, timeout: number) {
  const pack: WSListenerPack<TelemetryDAL> = {}
  const listener: WSListener<TelemetryDAL> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDalTelemetry.push(listener)
  return listener
}
export function dalTelemetryReceived (telemetry: TelemetryDAL): void {
  if (listenersDalTelemetry.length) {
    let foundFinished = false
    for (const listener of listenersDalTelemetry) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(telemetry)) {
          listener.pack.finished = true; listener.pack.resolve(telemetry); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDalTelemetry = listenersDalTelemetry.filter(listener => !listener.pack.finished)
  }
}

let listenersDalControl: WSListener<ControlMsgDAL>[] = []
export function waitForDalControl (checker: (payload: ControlMsgDAL) => boolean, timeout: number) {
  const pack: WSListenerPack<ControlMsgDAL> = {}
  const listener: WSListener<ControlMsgDAL> = new Promise(function (resolve, reject) {
    pack.resolve = resolve
    pack.reject = reject
    pack.checker = checker
    pack.timedOut = () => { if (!pack.finished) { pack.finished = true; pack.reject(Error('Timeout waiting for DEV response').Details(400, { errorCode: 'WAIT_DEV_TIMEOUT' })) } }
    setTimeout(pack.timedOut, timeout)
  })
  listener.pack = pack
  listenersDalControl.push(listener)
  return listener
}
export function dalControlReceived (payload: ControlMsgDAL): void {
  devControlReceived(payload as ControlMsgDEV);
  if (listenersDalControl.length) {
    let foundFinished = false
    for (const listener of listenersDalControl) {
      if (listener.pack.finished) { foundFinished = true; continue }
      try {
        if (listener.pack.checker(payload)) {
          listener.pack.finished = true; listener.pack.resolve(payload); foundFinished = true
        }
      } catch (error) { logger.error(error); listener.pack.finished = true; listener.pack.reject(error); foundFinished = true }
    }
    if (foundFinished) listenersDalControl = listenersDalControl.filter(listener => !listener.pack.finished)
  }
}
