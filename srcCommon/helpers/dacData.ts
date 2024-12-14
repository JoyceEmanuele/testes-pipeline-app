import { DacHwCfg } from '../types';
import jsonTryParse from './jsonTryParse';

export function hasRelay (dacId: string) {
  return (dacId > 'DAC3') && (dacId < 'DAC9');
}

function parseHwCfgPressure(freshData: {
  P0_MULT_QUAD?: number,
  P0_MULT_LIN?: number,
  P1_MULT_QUAD?: number,
  P1_MULT_LIN?: number
  P0_OFST? : number,
  P1_OFST? : number,
  P0_POSITN: string,
  P1_POSITN? : string,
}) {
  return {
    P0multQuad: Number(freshData.P0_MULT_QUAD ?? NaN),
    P0multLin: Number(freshData.P0_MULT_LIN ?? NaN),
    P1multQuad: Number(freshData.P1_MULT_QUAD ?? NaN),
    P1multLin: Number(freshData.P1_MULT_LIN ?? NaN),
    P0ofst: Number(freshData.P0_OFST ?? NaN),
    P1ofst: Number(freshData.P1_OFST ?? NaN),
    P0Psuc: (freshData.P0_POSITN === 'Psuc'),
    P0Pliq: (freshData.P0_POSITN === 'Pliq'),
    P1Psuc: (freshData.P1_POSITN === 'Psuc'),
    P1Pliq: (freshData.P1_POSITN === 'Pliq'),
  };
}

function parseTemperatureSensorOrdering(tlist: string[]) {
  if ((tlist instanceof Array) && (tlist.length === 3)) {
    // Fancoil:
    // Temperatura de ar de entrada: T0/Tamb
    // Temperatura de saída de água: T1/Tsuc
    // Temperatura entrada de água: T2/Tliq
    const allowed = [null, 'Tamb', 'Tsuc', 'Tliq'];
    if (allowed.includes(tlist[0]) && allowed.includes(tlist[1]) && allowed.includes(tlist[2])) {
      return {
        T0: tlist[0],
        T1: tlist[1],
        T2: tlist[2],
      };
    }
  }
  return null;
}

export function dacHwCfg (devId: string, freshData: {
  FLUID_TYPE: string
  DAC_APPL: string
  DAC_TYPE: string
  P0_MULT_QUAD: number
  P0_MULT_LIN: number
  P0_OFST: number
  P1_MULT_QUAD: number
  P1_MULT_LIN: number
  P1_OFST: number
  P0_POSITN: string
  P1_POSITN: string
  P0_SENSOR: string
  P1_SENSOR: string
  T0_T1_T2: string
  DAM_DISABLED: number
  SELECTED_L1_SIM?: string
}, dev?: DacHwCfg) {
  dev = Object.assign(dev || {}, {
    isVrf: (freshData.DAC_TYPE === 'vrf') || (freshData.DAC_TYPE === 'split-inverter') || (freshData.DAC_TYPE === 'splitao-inverter'),
    calculate_L1_fancoil: (freshData.DAC_APPL === 'fancoil') && (freshData.SELECTED_L1_SIM === 'fancoil'),
    FLUID_TYPE: freshData.FLUID_TYPE,
    P0multQuad: 0,
    P0multLin: NaN,
    P0ofst: NaN,
    P1multQuad: 0,
    P1multLin: NaN,
    P1ofst: NaN,
    P0Psuc: false,
    P0Pliq: false,
    P1Psuc: false,
    P1Pliq: false,
    TsensRename: null,
    hasRelay: hasRelay(devId),
    hasAutomation: (freshData.DAM_DISABLED === 0),
    DAC_APPL: freshData.DAC_APPL,
    DAC_TYPE: freshData.DAC_TYPE,
    simulateL1: freshData.SELECTED_L1_SIM === 'virtual',
  })
  dev = Object.assign(dev, parseHwCfgPressure(freshData));
  if (freshData.T0_T1_T2) {
    const Tlist = jsonTryParse<[string,string,string]>(freshData.T0_T1_T2);
    dev.TsensRename = parseTemperatureSensorOrdering(Tlist);
  }
  let psucSensor = "";
  if (dev.P0Psuc) {
    psucSensor = freshData.P0_SENSOR;
  }
  else if (dev.P1Psuc) {
    psucSensor = freshData.P1_SENSOR;
  }
  const hasl1Offset = ["PWS_A1B1000_LG23106","Sensor-Breno","HollyKell","ADD_SPT-001_REFAT","ADD_SPT-001",].includes(psucSensor);
  dev.L1CalcCfg = { psucOffset: hasl1Offset ? -1 : 0 }
  return dev;
}
