import { TelemetryDutAut } from '../types'
import { TelemetryPackRawDutAut } from '../types/devicesMessages'

export function processRawTelemetry_AUT (payload: TelemetryPackRawDutAut): TelemetryDutAut {
  const telemetry: TelemetryDutAut = {
    Mode: null,
    State: null,
  }

  telemetry.Mode = (((payload.Mode === 'Auto') || (payload.Mode === 'AUTO')) ? 'Auto' : null);
  if (payload.State === 'Enabled') telemetry.State = 'allow';
  else if (payload.State === 'Disabled') telemetry.State = 'forbid';
  else if (payload.State === 'Ventilation') telemetry.State = 'onlyfan';
  else telemetry.State = null

  return telemetry
}
