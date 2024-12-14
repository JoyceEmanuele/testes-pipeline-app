import sqldb from '../../db';

export async function loadDamsEcoCfg() {
  const list = await sqldb.DAMS.getListBasic({});

  const damsEcoCfg: {
    [damId: string]: {
      ENABLE_ECO: number
      ENABLE_ECO_LOCAL: number
      ECO_CFG: string
      ECO_OFST_START: number
      ECO_OFST_END: number
      ECO_INT_TIME: number
      SCHEDULE_START_BEHAVIOR: string
      SETPOINT: number
      LTC: number
      LTI: number
      UPPER_HYSTERESIS: number
      LOWER_HYSTERESIS: number
      SELF_REFERENCE: number
      MINIMUM_TEMPERATURE: number
      MAXIMUM_TEMPERATURE: number
      CAN_SELF_REFERENCE: number
      splitCond: boolean
      PLACEMENT: string
      TIMEZONE_ID: number
      READ_DUT_TEMPERATURE_FROM_BROKER: boolean
    }
  } = {};

  for (const row of list) {
    if (!row.ENABLE_ECO) continue;
    if (!row.ECO_CFG) continue;
    damsEcoCfg[row.DAM_ID] = {
      ENABLE_ECO: row.ENABLE_ECO,
      ENABLE_ECO_LOCAL: sendRowOrZero(row.ENABLE_ECO_LOCAL),
      ECO_CFG: row.ECO_CFG,
      ECO_OFST_START: sendRowOrZero(row.ECO_OFST_START),
      ECO_OFST_END: sendRowOrZero(row.ECO_OFST_END),
      ECO_INT_TIME: row.ECO_INT_TIME || 5,
      SCHEDULE_START_BEHAVIOR: row.SCHEDULE_START_BEHAVIOR,
      SETPOINT: sendRowOrZero(row.SETPOINT),
      LTC: sendRowOrZero(row.LTC),
      LTI: sendRowOrZero(row.LTI),
      UPPER_HYSTERESIS: sendRowOrZero(row.UPPER_HYSTERESIS),
      LOWER_HYSTERESIS: sendRowOrZero(row.LOWER_HYSTERESIS),
      SELF_REFERENCE: sendRowOrZero(row.SELF_REFERENCE),
      MINIMUM_TEMPERATURE: sendRowOrZero(row.MINIMUM_TEMPERATURE),
      MAXIMUM_TEMPERATURE: sendRowOrZero(row.MAXIMUM_TEMPERATURE),
      CAN_SELF_REFERENCE: sendRowOrZero(row.CAN_SELF_REFERENCE),
      splitCond: ['eco-C1-V', 'eco-C2-V'].includes(row.ECO_CFG),
      PLACEMENT: row.PLACEMENT || '',
      TIMEZONE_ID: row.TIMEZONE_ID,
      READ_DUT_TEMPERATURE_FROM_BROKER: row.READ_DUT_TEMPERATURE_FROM_BROKER === 1,
    };
  }

  return damsEcoCfg;
}

function sendRowOrZero(row: number) {
  return row || 0;  
}
