export type ControlMode = '0_NO_CONTROL'|'1_CONTROL'|'2_SOB_DEMANDA'|'3_BACKUP'|'4_BLOCKED'|'5_BACKUP_CONTROL'|'6_BACKUP_CONTROL_V2'|'7_FORCED'|'8_ECO_2';

export function operatesEcoMode (CTRLOPER: null|ControlMode) {
  return ['1_CONTROL', '2_SOB_DEMANDA', '3_BACKUP', '4_BLOCKED', '5_BACKUP_CONTROL', '6_BACKUP_CONTROL_V2', '7_FORCED', '8_ECO_2'].includes(CTRLOPER);
}
