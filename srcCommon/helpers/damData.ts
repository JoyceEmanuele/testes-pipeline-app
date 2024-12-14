import { TelemetryDAM } from '../types'
import { TelemetryRawDAM } from '../types/devicesMessages'

export function processRawTelemetry (payload: TelemetryRawDAM) {
  const telemetry: TelemetryDAM = {
    dev_id: payload.dev_id,
    timestamp: payload.timestamp,
    Mode: null,
    State: null,
    Temperature: null,
    Temperature_1: null,
  }

  telemetry.Mode = (((payload.Mode === 'Auto') || (payload.Mode === 'Manual') || (payload.Mode === 'Local')) ? payload.Mode : null)
  telemetry.Temperature = payload.Temperature;
  telemetry.Temperature_1 = payload.Temperature_1;
  if (payload.State === 'Enabled') telemetry.State = 'allow';
  else if (payload.State === 'Disabled') telemetry.State = 'forbid';
  else if (payload.State === 'Ventilation') telemetry.State = 'onlyfan';
  else if (payload.State === 'Enabling') telemetry.State = 'enabling';
  else if (payload.State === 'Disabling') telemetry.State = 'disabling';
  else if (payload.State === 'Condenser 1') telemetry.State = 'eco';
  else if (payload.State === 'Condenser 2') telemetry.State = 'eco';
  else if (payload.State === 'THERMOSTAT') telemetry.State = 'thermostat';
  // else if (payload.State === 'Enabling') telemetry.State = '...allow';
  // else if (payload.State === 'Disabling') telemetry.State = '...forbid';
  // else if (payload.State === 'Condenser 1') telemetry.State = 'eco-c1';
  // else if (payload.State === 'Condenser 2') telemetry.State = 'eco-c2';
  // else if (payload.State === 'Enabling Condenser 1') telemetry.State = '...eco-c1';
  // else if (payload.State === 'Enabling Condenser 2') telemetry.State = '...eco-c2';
  // else if (payload.State === 'Starting Ventilation') telemetry.State = '...onlyfan';
  else telemetry.State = payload.State || null;

  return telemetry
}
