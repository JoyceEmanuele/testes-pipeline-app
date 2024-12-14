import * as dbRamCache from '../ramCaches/dbRamCache';
import { PeriodData } from '../../srcCommon/types';
import { logger } from '../../srcCommon/helpers/logger';
import { sendDriCommand } from '../../srcCommon/dri/driInfo';
import { TelemetryPackRawDUT } from '../../srcCommon/types/devicesMessages';
import * as momentTimezone from 'moment-timezone';
import { DriConfig } from '../../srcCommon/helpers/ramcacheLoaders/drisCfgLoader';

const weekDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface TelemetryDUT {
  dev_id: string
  Temperature?: number|null
}

export async function onDutTelemetry (devId: string, payload: TelemetryPackRawDUT, payloadShiftedTs: Date) {
  if (!(payload.Temperature instanceof Array)) {
    return;
  }

  const driIds = dbRamCache.tryGetDutDrisRef(devId) || [];
  if (driIds.length === 0) {
    return;
  }

  const RTYPE_ID = dbRamCache.tryGetDutRTypeId(devId);
  const rtypeSched: { current: PeriodData, TUSEMIN: number } = (RTYPE_ID && dbRamCache.tryGetRTypeSched(RTYPE_ID)) || { current: null, TUSEMIN: null };
  const dutSched = rtypeSched;

  if (!dutSched || !dutSched.current || dutSched.TUSEMIN == null) {
    return;
  }

  const telLen = payload.Temperature.length;
  const samplingTime = (payload.samplingTime && Number(payload.samplingTime)) || 5; // de quantos em quantos segundos o firmware lê os sensores e insere nos vetores.
  for (let i = 0; i < telLen; i++) {
    const remainingSteps = telLen - 1 - i;
    let timestampTelemetryFormated;
    let dateTimestampTelemetry;
    if (payloadShiftedTs) {
      const ith_timestampD = momentTimezone(payloadShiftedTs);
      ith_timestampD.subtract(remainingSteps * samplingTime, 'seconds');
      timestampTelemetryFormated = ith_timestampD.format('YYYY-MM-DD HH:mm:ss');
      dateTimestampTelemetry = new Date(timestampTelemetryFormated);
    }


    const telemetry: TelemetryDUT = {
      dev_id: devId,
      Temperature: payload.Temperature && payload.Temperature[i],
    };
    if (telemetry.Temperature == null) continue;

    driEcoMode(driIds, telemetry, dateTimestampTelemetry, dutSched);
  }
}

let driEcoMonitor: {
  [driId: string]: {
    sleep_ts?: number,
    cmd_state?: string,
    cmd_exp?: number,
    runningEco?: boolean,
    duts: {
      [dutId: string]: {
        telmTS: number
        accLOW: number
      }
    }
  }
} = {};

export function getDriEcoMonitor(driId: string) {
  return driEcoMonitor[driId];
}

function driEcoMode (driIds: string[], tel: TelemetryDUT, shiftedServerTime: Date, dutSched: { TUSEMIN: number }) {
  for (const driId of driIds) {
    try {
      // O DRI precisa estar com modo eco configurado
      const driCfg = dbRamCache.tryGetDriCfg(driId);

      if (!driCfg?.ecoModeCfg?.ENABLE_ECO) continue;
      const ecoCfg = driCfg.ecoModeCfg;

      // // O modo eco só atua se o DRI estiver dentro do horário de funcionamento e não existir exceção cadastrada.
      const formattedDate = shiftedServerTime.toISOString().split('T')[0].split('-').reverse().join('/');
      const exceptions = driCfg.driScheds?.filter((sched) => (
        sched.EXCEPTION_DATE && sched.ACTIVE === '1'
        && sched.EXCEPTION_REPEAT_YEARLY === '1'
          ? sched.EXCEPTION_DATE.substring(0, 5) === formattedDate.substring(0, 5)
          : sched.EXCEPTION_DATE === formattedDate
      ));
      if (exceptions && exceptions.length) continue;
      const currentDay = weekDay[shiftedServerTime.getUTCDay()];
      const currentHours = `${momentTimezone(shiftedServerTime).utc().hours()}:${momentTimezone(shiftedServerTime).utc().minutes()}`;
      const currentScheds = driCfg.driScheds?.filter((sched) => (
        JSON.parse(sched.DAYS)[currentDay]
        && sched.ACTIVE === '1'
        && sched.OPERATION === '1'
        && currentHours > sched.BEGIN_TIME
        && currentHours < sched.END_TIME
      ));
      if (!currentScheds || currentScheds.length === 0) continue;

      // "alertDataDRI" é usado para gerenciar a sequência de comandos eco enviados para o DRI
      let alertDataDRI = driEcoMonitor[driId]
      if (!alertDataDRI) {
        alertDataDRI = driEcoMonitor[driId] = {
          duts: {}
        };
      }

      // "alertDataDUT" é usado para monitorar quanto tempo a temperatura passa abaixo do limite esperado
      let alertDataDUT = alertDataDRI.duts[tel.dev_id]
      if (!alertDataDUT) {
        alertDataDUT = alertDataDRI.duts[tel.dev_id] = {
          telmTS: null,
          accLOW: 0,
        };
      }

      // delta é o tempo desde a última telemetria deste DUT. Se for muito longo zera o contador e aborta a estratégia por agora.
      let delta = alertDataDUT.telmTS && (shiftedServerTime.getTime() - alertDataDUT.telmTS);
      alertDataDUT.telmTS = shiftedServerTime.getTime();
      if (delta >= 0 && delta < 120000) {
      } // OK
      else {
        alertDataDUT.accLOW = 0;
        continue;
      }

      // Tlimit é o setpoint do modo eco. Pode ser o setpoint de entrada se o modo eco ainda não estiver operando.
      let Tlimit = dutSched.TUSEMIN + (ecoCfg.ECO_OFST_START || 0);
      // Mas se já estiver operando, soma o offset de saída para se tornar o setpoint de saída do modo eco.
      if (ecoCfg.ECO_OFST_END && (alertDataDUT.accLOW > 0)) {
        Tlimit += ecoCfg.ECO_OFST_END;
      }

      // Se a temperatura estiver abaixo do setpoint, accLOW contabiliza quanto tempo faz que está abaixo deste setpoint.
      if (tel.Temperature <= Tlimit) {
        alertDataDUT.accLOW += delta;
      }
      else {
        alertDataDUT.accLOW = 0;
        // continue;
      }

      // FLEXIBLE ECO COMMAND INTERVAL TIME
      const ecoIntervalTime = ecoCfg.ECO_INT_TIME;
      const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(driCfg.TIMEZONE_ID);
      const dateWithTimezone = momentTimezone().tz(timezoneInfo.timezoneArea);
      // Se tiver pouco tempo que o dash enviou um comando de modo eco, aguarda mais um pouco antes de enviar um novo comando.
      // sleep_ts indica até quando não é para enviar um novo comando
      if (alertDataDRI.sleep_ts && dateWithTimezone.valueOf() < alertDataDRI.sleep_ts) continue;

      // Verifica se a temperatura ficou tempo suficiente abaixo do setpoint para ativar o modo eco.
      if (alertDataDUT.accLOW >= ecoIntervalTime * 60 * 1000) {
        // Está na condição de ativar (ou manter) o modo eco. A estratégia continua depois deste if.
      } else {
        // Ainda não ficou tempo suficiente abaixo do setpoint para iniciar o modo eco, ou a temperatura já subiu ultrapassando o setpoint.
        // Se o modo eco estiver operando, significa que a temperatura subiu ultrapassando o setpoint, logo deve-se refrigerar o ambiente para buscar o setpoint.

        // Comando para DRI refrigerar, no setpoint do modo eco (Tlimit);
        if (alertDataDRI.runningEco) {
          sendDriCommand(driId, driCfg, 'setpoint', Tlimit.toString(), '[SYSTEM][ECO]');
          alertDataDRI.runningEco = false;
        }
        continue;
      }

      // Daqui para baixo o dash vai enviar um comando de modo eco. Então já definimos (através de sleep_ts) que nos próximos X segundos
      // o dash não vai enviar nenhum outro comando eco.
      // (ECO_INT_TIME / 2) IN MILISSECONDS
      alertDataDRI.sleep_ts = dateWithTimezone.valueOf() + (ecoIntervalTime / 2) * 60 * 1000;

      // Para as configurações em 1 estágio (DRI), a temperatura fica abaixo do setpoint por 'ecoIntervalTime' segundos antes de começar o modo eco.
      // Após esse período, a estratégia ativa ou o modo ventilar ou desliga a máquina, a depender da configuração do modo ECO.
      if (ecoCfg.ECO_CFG === 'eco-D') {
        sendEcoCmdToDri(driId, driCfg, 'Disabled', alertDataDRI);
      }
      else if (ecoCfg.ECO_CFG === 'eco-V') {
        sendEcoCmdToDri(driId, driCfg, 'Ventilation', alertDataDRI);
      }

    } catch (err) { logger.error(err); }
  }
}

function sendEcoCmdToDri (driId: string, driCfg: DriConfig, ecoState: string, alertDataDRI: (typeof driEcoMonitor)['']) {
  const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(driCfg.TIMEZONE_ID);
  const ts = momentTimezone().tz(timezoneInfo.timezoneArea);
  const ecoIntervalTime = driCfg.ecoModeCfg.ENABLE_ECO;
  // (ECO_INT_TIME / 2) IN MILISSECONDS
  alertDataDRI.sleep_ts = (ts.valueOf() + (ecoIntervalTime / 2) * 60 * 1000);
  alertDataDRI.cmd_state = ecoState;
  alertDataDRI.runningEco = true;
  // Envia comando para o DRI
  if (ecoState === 'Disabled') sendDriCommand(driId, driCfg, 'on/off', 'OFF', '[SYSTEM][ECO]');
  if (ecoState === 'Ventilation') sendDriCommand(driId, driCfg, 'mode', 'FAN', '[SYSTEM][ECO]');
}
