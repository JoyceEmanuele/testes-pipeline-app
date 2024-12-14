import * as dbRamCache from '../ramCaches/dbRamCache';
import * as damLastTelemetry from '../ramCaches/damLastTelemetry'
import servConfig from "../../configfile";
import { PeriodData } from '../../srcCommon/types';
import { logger } from '../../srcCommon/helpers/logger';
import { DamMessage_EcoMode } from '../../srcCommon/types/devicesCommands'
import { MsgDamEcoProgramming, TelemetryPackRawDUT } from '../../srcCommon/types/devicesMessages'
import * as iotMessageListener from '../../srcCommon/iotMessages/iotMessageListener'
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import sqldb from '../../srcCommon/db'
import { sendDamCommand_eco } from '../../srcCommon/iotMessages/devsCommands';
import * as momentTimezone from 'moment-timezone';

const numberSendingEcoAttempts = 1;

interface TelemetryDUT {
  dev_id: string
  Temperature?: number|null
}

export async function onDutTelemetry (devId: string, payload: TelemetryPackRawDUT, payloadShiftedTs: Date) {
  if (!(payload.Temperature instanceof Array)) {
    return;
  }

  const dams = dbRamCache.tryGetDutDamsRef(devId) || [];
  if (dams.length === 0) {
    return;
  }

  const RTYPE_ID = dbRamCache.tryGetDutRTypeId(devId);
  const rtypeSched: { current: PeriodData, TUSEMIN: number } = (RTYPE_ID && dbRamCache.tryGetRTypeSched(RTYPE_ID)) || { current: null, TUSEMIN: null };
  const dutSched = rtypeSched;

  const damIds: string[] = dams.filter(dam => dam.canSelfReference || (dutSched && dutSched.TUSEMIN != null && dutSched.current)).map(filteredDam => filteredDam.damId);
  if (damIds.length === 0) {
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

    await damEcoMode(damIds, telemetry, dateTimestampTelemetry, rtypeSched);
  }
}

let damEcoMonitor: {
  [damId: string]: {
    sleep_ts?: number,
    sleep_ts_eco_v2?: number,
    sleep_ts_eco_v2_to_cool?: number,
    cmd_state?: string,
    cmd_exp?: number,
    condensersEnabled?: boolean,
    duts: {
      [dutId: string]: {
        telmTS: number
        lastT: number // informação para debug
        accLOW: number
        accAfterCool?: number
      }
    },
    stagesEcoV2?: 'before-setpoint'|'after-LTC'|'after-LTI',
    counterToLog?: number,
  }
} = {};
async function damEcoMode (damIds: string[], tel: TelemetryDUT, shiftedServerTime: Date, dutSched: { TUSEMIN: number }) {
  for (const damId of damIds) {
    try {
      const haveDebug = servConfig.debugDamsEcoMode.includes(damId);
      // O DAM precisa estar com modo eco configurado
      const ecoCfg = dbRamCache.tryGetDamEcoCfg(damId);
      if (haveDebug){
        logger.info(`[LOG ECOMODE DAM] damId: ${damId},
        ecoCfg: ${ecoCfg ? 'sim' : 'não' }`);
      }
      if (!ecoCfg) continue;
      if (ecoCfg.READ_DUT_TEMPERATURE_FROM_BROKER) continue;
      const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(ecoCfg.TIMEZONE_ID);
      const dateNow = momentTimezone().tz(timezoneInfo.timezoneArea);
      // O DAM precisa estar em modo Automático.
      const dam = damLastTelemetry.lastDamTelemetry(damId);

      if (haveDebug){
        logger.info(`[LOG ECOMODE DAM] damId: ${damId},
        dam: ${dam ? 'sim' : 'não' }
        dam.lastTelemetry: ${dam?.lastTelemetry ? 'sim' : 'não' }
        dam.lastTelemetry.Mode: ${dam?.lastTelemetry?.Mode}
        dam.lastMessageTS: ${dam?.lastMessageTS}
        dateNowFormat: ${dateNow.format('YYYY/MM/DD HH:mm:ss')},
        dateNowSubtract: ${dateNow.clone().subtract(10, 'minutes').valueOf()},
        ecoCfg: ${JSON.stringify(ecoCfg)}
      `);
      }

      if (!dam) continue;
      if (!dam.lastTelemetry) continue;
      if (dam.lastTelemetry.Mode !== 'Auto') continue;
      // Só aceitar essa informação se ela tiver sido recebida há menos de 10 minutos.
      if (dam.lastMessageTS <= dateNow.clone().subtract(10, 'minutes').valueOf()) continue; // 10 minutos

      // O modo eco só atua se o DAM estiver dentro do horário de funcionamento.
      const expectedDamState = expectedCurrentDamState(damId, ecoCfg.TIMEZONE_ID);

      if (expectedDamState !== 'allow') continue;

      // Se estiver no novo modo eco, faça sua função e continua para o próximo
      if (ecoCfg.ENABLE_ECO === 2) {
        damEcoModeV2(damId, ecoCfg, tel);
        continue;
      }
      // "alertDataDAM" é usado para gerenciar a sequência de comandos eco enviados para o DAM
      let alertDataDAM = damEcoMonitor[damId]
      if (!alertDataDAM) {
        alertDataDAM = damEcoMonitor[damId] = {
          duts: {},
          counterToLog: 0
        };
      }
      alertDataDAM.counterToLog++;
      // "alertDataDUT" é usado para monitorar quanto tempo a temperatura passa abaixo do limite esperado
      let alertDataDUT = alertDataDAM.duts[tel.dev_id]
      if (!alertDataDUT) {
        alertDataDUT = alertDataDAM.duts[tel.dev_id] = {
          telmTS: null,
          lastT: null,
          accLOW: 0,
        };
      }

      // Se o dash já tiver enviado algum comando eco e o último comando ainda não tiver expirado, considera que o modo eco está em curso.
      const modoEcoEmCurso = dateNow.valueOf() < alertDataDAM.cmd_exp;
      
      // FLEXIBLE ECO COMMAND INTERVAL TIME
      const ecoIntervalTime = ecoCfg.ECO_INT_TIME;

      // delta é o tempo desde a última telemetria deste DUT. Se for muito longo zera o contador e aborta a estratégia por agora.
      let delta = alertDataDUT.telmTS && (shiftedServerTime.getTime() - alertDataDUT.telmTS);

      // Devido a implementação de espera de resposta do comando eco por ate 5 segundos com reenvios de ate 2 tentativas antes de analisar a próxima medição do
      // pacote de telemetria do DUT; há chance de chegar nova telemetria de DUT antes de analisar todas as temperaturas do pacote anterior (caso de haver problema com conexão)
      // o que fará com que a iteração das telemetrias do pacote anterior rodem em paralelo com o pacote novo. Isso acarreta em 'alertDataDUT.accLOW' ser zerado
      // Será descartado avaliação caso seja este o caso (considerado que a diferença pode ser de ate 2 minutos em relação telemetria anterior sem que zere alertDataDUT.accLOW)
      if (delta < 0 && delta > -120000) {
        if (haveDebug){
          logger.info(`[LOG ECOMODE DAM] damId: ${damId},
          contador: ${alertDataDAM.counterToLog.toString()},
          modoEcoEmCurso: ${modoEcoEmCurso.toString()},
          Tlimit: '',
          shiftedServerTime: ${shiftedServerTime.getTime().toString()},
          tel: ${tel.Temperature?.toString()},
          dateNow: ${dateNow.toString()},
          CAN_SELF_REFERENCE: ${ecoCfg.CAN_SELF_REFERENCE},
          SETPOINT: ${ecoCfg.SETPOINT},
          LOWER_HYSTERESIS: ${ecoCfg.LOWER_HYSTERESIS},
          UPPER_HYSTERESIS: ${ecoCfg.UPPER_HYSTERESIS},
          alertDataDAM.cmd_exp: ${alertDataDAM.cmd_exp?.toString()},
          alertDataDAM.sleep_ts: ${alertDataDAM.sleep_ts?.toString()},
          alertDataDUT.accLOW: ${alertDataDUT.accLOW?.toString()},
          delta: ${delta?.toString()}`);
        }
        return;
      }

      alertDataDUT.telmTS = shiftedServerTime.getTime();
      alertDataDUT.lastT = tel.Temperature;
      if (delta >= 0 && delta < ecoIntervalTime * 60 * 1000) {
      } // OK
      else {
        alertDataDUT.accLOW = 0;
        if (haveDebug){
          logger.info(`[LOG ECOMODE DAM] damId: ${damId},
          contador: ${alertDataDAM.counterToLog.toString()},
          modoEcoEmCurso: ${modoEcoEmCurso.toString()},
          Tlimit: '',
          shiftedServerTime: ${shiftedServerTime.getTime().toString()},
          tel: ${tel.Temperature?.toString()},
          dateNow: ${dateNow.format('YYYY/MM/DD HH:mm:ss')},
          CAN_SELF_REFERENCE: ${ecoCfg.CAN_SELF_REFERENCE},
          SETPOINT: ${ecoCfg.SETPOINT},
          LOWER_HYSTERESIS: ${ecoCfg.LOWER_HYSTERESIS},
          UPPER_HYSTERESIS: ${ecoCfg.UPPER_HYSTERESIS},
          alertDataDAM.cmd_exp: ${alertDataDAM.cmd_exp?.toString()},
          alertDataDAM.sleep_ts: ${alertDataDAM.sleep_ts?.toString()},
          alertDataDUT.accLOW: ${alertDataDUT.accLOW?.toString()},
          delta: ${delta?.toString()}`);
        }
        // alertDataDUT.accHIGH = 0;
        continue;
      }

      // Tlimit é o setpoint do modo eco. Pode ser o setpoint de entrada se o modo eco ainda não estiver operando.
      let Tlimit: number;
      // Lógica já existente para os DAMs que não utiliza hystereses
      if (!ecoCfg.CAN_SELF_REFERENCE) {
        Tlimit = dutSched.TUSEMIN + (ecoCfg.ECO_OFST_START || 0);
        // Mas se já estiver operando, soma o offset de saída para se tornar o setpoint de saída do modo eco.
        if ((ecoCfg.ECO_OFST_END) && (alertDataDUT.accLOW > 0) && alertDataDAM.cmd_exp && dateNow.valueOf() < alertDataDAM.cmd_exp) {
            Tlimit += ecoCfg.ECO_OFST_END;
        }
      }
      else {
        Tlimit = ecoCfg.SETPOINT - (ecoCfg.LOWER_HYSTERESIS || 0);

        if (modoEcoEmCurso) {
          Tlimit = ecoCfg.SETPOINT + (ecoCfg.UPPER_HYSTERESIS || 0);
        }
      }

      // Se a temperatura estiver abaixo do setpoint, accLOW contabiliza quanto tempo faz que está abaixo deste setpoint.
      if (tel.Temperature <= Tlimit) {
        alertDataDUT.accLOW += delta;
      }
      else {
        alertDataDUT.accLOW = 0;
      }

      if (haveDebug){
        logger.info(`[LOG ECOMODE DAM] damId: ${damId},
        contador: ${alertDataDAM.counterToLog.toString()},
        modoEcoEmCurso: ${modoEcoEmCurso.toString()},
        Tlimit: ${Tlimit.toString()},
        shiftedServerTime: ${shiftedServerTime.getTime().toString()},
        tel: ${tel.Temperature?.toString()},
        dateNow: ${dateNow.valueOf()},
        CAN_SELF_REFERENCE: ${ecoCfg.CAN_SELF_REFERENCE},
        SETPOINT: ${ecoCfg.SETPOINT},
        LOWER_HYSTERESIS: ${ecoCfg.LOWER_HYSTERESIS},
        UPPER_HYSTERESIS: ${ecoCfg.UPPER_HYSTERESIS},
        alertDataDAM.cmd_exp: ${alertDataDAM.cmd_exp?.toString()},
        alertDataDAM.sleep_ts: ${alertDataDAM.sleep_ts?.toString()},
        alertDataDUT.accLOW: ${alertDataDUT.accLOW?.toString()},
        delta: ${delta?.toString()}`);
      }

      // Se tiver pouco tempo que o dash enviou um comando de modo eco, aguarda mais um pouco antes de enviar um novo comando.
      // sleep_ts indica até quando não é para enviar um novo comando
      if (alertDataDAM.sleep_ts && dateNow.valueOf() < alertDataDAM.sleep_ts) continue;

      // Verifica se a temperatura ficou tempo suficiente abaixo do setpoint para ativar o modo eco.
      if (alertDataDUT.accLOW >= ecoIntervalTime * 60 * 1000) {
        // Está na condição de ativar (ou manter) o modo eco. A estratégia continua depois deste if.
      } else {
        // Ainda não ficou tempo suficiente abaixo do setpoint para iniciar o modo eco, ou a temperatura já subiu ultrapassando o setpoint.
        // Se o modo eco estiver operando, e estiver em uma configuração de 2 estágios e o último comando enviado for de ventilação, envia o...
        // ...comando para reativar somente 1 condensadora. Quando esse comando expirar, o DAM passa para Enabled e a outra condensadora pode ligar.
        if (modoEcoEmCurso && ecoCfg.splitCond && (alertDataDAM.cmd_state === 'onlyfan')) {
          if (ecoCfg.ECO_CFG === 'eco-C1-V') {
            await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 1', alertDataDAM);
          }
          else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
            await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 2', alertDataDAM);
          }
        }
        continue;
      }

      // Daqui para baixo o dash vai enviar um comando de modo eco. Então já definimos (através de sleep_ts) que nos próximos X segundos
      // o dash não vai enviar nenhum outro comando eco.
      // (DAM_ECO_INT_TIME / 2) IN MILISSECONDS

      // Para as configurações em 2 estágios, a temperatura fica abaixo do setpoint por 'ecoIntervalTime' segundos antes de começar o modo eco.
      // Aí uma condensadora é desligada e a estratégia fica nesse modo por mais 'ecoIntervalTime' segundos. Se a temperatura continuar
      // abaixo do setpoint depois desse tempo (2 vezes 'ecoIntervalTime'), a estratégia ativa o segundo estágio que é o modo ventilar.
      const timeForSecondStage = alertDataDUT.accLOW > (ecoIntervalTime * 2) * 60 * 1000;

      if (ecoCfg.ECO_CFG === 'eco-D') {
        await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
      }
      else if (ecoCfg.ECO_CFG === 'eco-V') {
        await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
      }
      else if (ecoCfg.ECO_CFG === 'eco-C1-V') {
        // (DAM_ECO_INT_TIME * 2) IN MILISSECONDS
        if (timeForSecondStage) {
          await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
        } else {
          if (!['disabling', 'forbid', 'onlyfan'].includes(dam.lastTelemetry.State)) {
            await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 1', alertDataDAM);
          }
        }
      }
      else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
        // (DAM_ECO_INT_TIME * 2) IN MILISSECONDS
        if (timeForSecondStage) {
          await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
        } else {
          if (!['disabling', 'forbid', 'onlyfan'].includes(dam.lastTelemetry.State)) {
            await sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 2', alertDataDAM);
          }
        }
      }
    } catch (err) { logger.error(err); }
  }
}

function damEcoModeV2 (damId: string, ecoCfg: ReturnType<typeof dbRamCache.tryGetDamEcoCfg>, tel: TelemetryDUT) {
  try {

    // Foi decidido que nesta primeira versão para testes estes parâmetros serão fixos, 
    // mas futuramente deverão ser parametrizaveis. Indicam quanto tempo aguardar para chaveamento (bloquear ou liberar segunda condensadora) de acordo com temperatura em relação ao setpointSup
    const minutesCanBlockCondenser = 3;
    const minutesAllowOtherCondenser = 3;
    const timeAllowOtherCondenser = Date.now() + minutesAllowOtherCondenser * 60 * 1000;

    // "alertDataDAM" é usado para gerenciar a sequência de comandos eco enviados para o DAM
    let alertDataDAM = damEcoMonitor[damId]
    if (!alertDataDAM) {
      alertDataDAM = damEcoMonitor[damId] = {
        duts: {},
        condensersEnabled: false,
      };
    }

    // "alertDataDUT" é usado para monitorar quanto tempo a temperatura passa abaixo do limite esperado
    let alertDataDUT = alertDataDAM.duts[tel.dev_id]
    if (!alertDataDUT) {
      alertDataDUT = alertDataDAM.duts[tel.dev_id] = {
        telmTS: null,
        lastT: null,
        accLOW: 0,
        accAfterCool: 0,
      };
    }

    const ecoCommandToday = Date.now() < alertDataDAM.cmd_exp;
    // Se modo eco não está em curso ainda ou se estagio anterior era antes de atingir setpoint, verifica se deve ventilar ou manter desligado até atingir setpoint
    if (((!ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'after-LTC') || alertDataDAM.stagesEcoV2 === 'before-setpoint') && ecoCfg.SETPOINT > tel.Temperature){
      alertDataDAM.condensersEnabled = false;
      if (ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-ventilate'){
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
      }
      // No DAC o parâmetro SCHEDULE_START_BEHAVIOR será sempre null, já que DAC mandamos apenas o comando de Disabled para bloquear condensadoras
      // mas não afeta a evaporadora, sendo um comando equivalente há Ventilation do DAM
      else if ((ecoCfg.SCHEDULE_START_BEHAVIOR == null || ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-off')) {
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
      }
      alertDataDAM.stagesEcoV2 = 'before-setpoint';
      return;
    }

    // Se modo eco ainda não está em curso (temperatura ja iniciou acima do setpoint) ou estagio anterior foi de antes do setpoint, mas temperatura ultrapassou Setpoint sem ultrapassar LTC
    // deve iniciar ventilação
    if (((!ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'after-LTC') || alertDataDAM.stagesEcoV2 === 'before-setpoint') && ecoCfg.SETPOINT <= tel.Temperature && tel.Temperature < ecoCfg.LTC) {
      alertDataDAM.condensersEnabled = false;
      if (ecoCfg.ECO_CFG === 'eco-D') {
        // Caso seja DAC, será passado comando de Disabled para ventilar
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
      }
      else{
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
      }
      alertDataDAM.stagesEcoV2 = 'before-setpoint';
      return;
    }

    // Tempo de intervalo para poder validar temperatura em relação ao setpoint + histereses, exceto para quando temperatura está circundando o 
    // setpoint superior, já que os parâmetros de tempo de controlar bloqueio/liberação das condensadores são separados
    const ecoIntervalTime = ecoCfg.ECO_INT_TIME;

    // Se temperatura ultrapassou LTC, envia comando para desativar uma das condensadoras
    // com base na configuração, ou o dispositivo esperará tempo do ultimo comando expirar para começar a resfriar
    if (ecoCfg.LTC <= tel.Temperature) {
      alertDataDAM.sleep_ts_eco_v2_to_cool = timeAllowOtherCondenser;
      // Se o modo eco estiver operando, e estiver em uma configuração de 2 estágios e o último comando enviado for de ventilação, envia o...
      // ...comando para reativar somente 1 condensadora. Quando esse comando expirar, o DAM passa para Enabled e a outra condensadora pode ligar.
      alertDataDAM.condensersEnabled = false;
      if (ecoCommandToday && ecoCfg.splitCond && (alertDataDAM.cmd_state === 'onlyfan')) {
        if (ecoCfg.ECO_CFG === 'eco-C1-V') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 1', alertDataDAM, minutesAllowOtherCondenser);
        }
        else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 2', alertDataDAM, minutesAllowOtherCondenser);
        }
      }

      // Indica que de agora em diante está no contexto de ter atingido o LTC
      alertDataDAM.stagesEcoV2 = 'after-LTC';

      return;
    }

    // Condições acima serão feitas apenas ate atingir LTC. A partir daí, começa estratégia de chaveamentos para otimizar temperatura na faixa do setpoint com o mínimo de tempo possível
    // das condensadoras desligadas, e validações de setpoint + histereses.

    // Devido histeresis, valores de setpoint são diferentes para considerar temperatura acima e abaixo;
    const setpointSup = ecoCfg.SETPOINT + ecoCfg.UPPER_HYSTERESIS;
    const setpointInf = ecoCfg.SETPOINT - ecoCfg.LOWER_HYSTERESIS;

    // Intervalo de tempo atual em relação ao tempo que a máquina passaria para enabled, para controlarmos se já passou tempo mínimo de bloquear uma das condensadoras
    alertDataDUT.accAfterCool = Date.now() - alertDataDAM.sleep_ts_eco_v2_to_cool;
    alertDataDAM.condensersEnabled = alertDataDAM.condensersEnabled || alertDataDUT.accAfterCool > 0 && tel.Temperature >= setpointSup;
    
    // Estratégia para chaveamento entre as duas condensadoras:
    // Se depois que começou a resfriar já abaixou temperatura entre setpoints e passou tempo o bastante depois que ligou duas condensadoras, pode bloquear uma das condensadoras
    // ou se falta um minuto para segunda condensadora ligar, mas ainda está abaixo de setpointsup, pode continuar com apenas uma condensadora
    if (
        alertDataDAM.cmd_state === 'eco' && 
        (
          (
            alertDataDUT.accAfterCool <= 0 && 
            (Math.abs(alertDataDUT.accAfterCool) < 1 * 60 * 1000 && tel.Temperature < setpointSup && tel.Temperature >= setpointInf)
          ) || 
          alertDataDUT.accAfterCool > (minutesCanBlockCondenser * 60 * 1000)
        ) && 
        tel.Temperature < setpointSup && tel.Temperature >= setpointInf) 
    {
      alertDataDAM.sleep_ts_eco_v2_to_cool = timeAllowOtherCondenser;

      // Se é reenvio, pode manter o tempo de validação de histerese como estava, mas caso seja alteração pois uma das condensadoras havia passado para enabled
      // é necessário atualizar o tempo
      if (alertDataDAM.condensersEnabled) {
        alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
      }
      alertDataDAM.condensersEnabled = false;
      if (ecoCfg.ECO_CFG === 'eco-C1-V') {
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 1', alertDataDAM, minutesAllowOtherCondenser);
      }
      else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 2', alertDataDAM, minutesAllowOtherCondenser);
      }
      return;
    }

    // Se ultrapassou tempo de intervalo para verificar histereses, valida temperatura em relação à setpoint + histerese para definir comando
    if (!alertDataDAM.sleep_ts_eco_v2 || (alertDataDAM.sleep_ts_eco_v2 && Date.now() >= alertDataDAM.sleep_ts_eco_v2)) {
      // Se acima, e diferença em relação ao setpoint for maior que histerese superior, liga uma das condensadoras conforme parametrização
      // Se último comando foi eco, então é tratado na estratégia de chavemaneto
      if (tel.Temperature >= setpointSup && alertDataDAM.cmd_state !== 'eco') {
        alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
        alertDataDAM.sleep_ts_eco_v2_to_cool = timeAllowOtherCondenser;
        alertDataDAM.condensersEnabled = false;
        if (ecoCfg.ECO_CFG === 'eco-C1-V') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 1', alertDataDAM, minutesAllowOtherCondenser);
        }
        else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Condenser 2', alertDataDAM, minutesAllowOtherCondenser);
        }
        return;
      }
      // Se abaixo do setpoint, e diferença em relação ao setpoint for maior que histerese inferior, realiza ventilação
      // exceto se havia ligado a segunda condensadora, neste caso deve aguardar tempo mínimo de desligar condensadoras
      else if (tel.Temperature <= setpointInf && (!alertDataDAM.condensersEnabled || (alertDataDAM.condensersEnabled && alertDataDUT.accAfterCool > (minutesCanBlockCondenser * 60 * 1000)))) {
        alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
        alertDataDAM.condensersEnabled = false;
        if (ecoCfg.ECO_CFG === 'eco-D') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
        }
        else if (ecoCfg.ECO_CFG === 'eco-V' || ecoCfg.ECO_CFG === 'eco-C1-V' ||ecoCfg.ECO_CFG === 'eco-C2-V') {
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
        }
        return;
      }
      // Caso última mudança de estado expirou, e temperatura está entre os setpoints inferior e superior, mantem o último estado
      // portanto sem alterar sleep_ts_eco_v2
      else if (tel.Temperature < setpointSup && tel.Temperature > setpointInf) {
        alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
        if (alertDataDAM.cmd_state === 'forbid') {          
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
        }
        else if (alertDataDAM.cmd_state === 'onlyfan'){
          sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
        }
        // Para comando de eco, é feito tratamento na estratégia de chaveamento
        return;
      }
    }

    // Caso tenha começado o modo eco, não esteja no primeiro estágio e temperatura caiu abaixo do LTI, desliga ou ventila mesmo que não tenha finalizado
    // programação horária
    if (ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'before-setpoint' && tel.Temperature < ecoCfg.LTI) {
      if (ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-ventilate'){
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Ventilation', alertDataDAM);
        alertDataDAM.stagesEcoV2 = 'after-LTI';
      }
      // No DAC o parâmetro SCHEDULE_START_BEHAVIOR será sempre null, já que DAC mandamos apenas o comando de Disabled para bloquear condensadoras
      // mas não afeta a evaporadora, sendo um comando equivalente há Ventilation do DAM
      else if (ecoCfg.SCHEDULE_START_BEHAVIOR == null || ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-off') {
        sendEcoCmdToDev(damId, ecoCfg.TIMEZONE_ID, 'Disabled', alertDataDAM);
        alertDataDAM.stagesEcoV2 = 'after-LTI';
      }
      return;
    }

  } catch (err) { logger.error(err); }
}

const convState = {
  'Disabled': 'forbid',
  'Ventilation': 'onlyfan',
  'Condenser 1': 'eco',
  'Condenser 2': 'eco',
}
async function sendEcoCmdToDev (damId: string, timezoneId: number, ecoState: keyof typeof convState, alertDataDAM: (typeof damEcoMonitor)[''], durationEcoV2?: number) {
  const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(timezoneId);
  const ts = momentTimezone().tz(timezoneInfo.timezoneArea);
  const ecoCfg = dbRamCache.tryGetDamEcoCfg(damId);
  const ecoIntervalTime = ecoCfg.ECO_INT_TIME;

  // No modo Eco v2, nem sempre o tempo de duration dos comandos será o mesmo que o parâmetro ECO_INT_TIME (para a propriedade cmd_exp será sempre o ECO_INT_TIME)
  const timeDuration = durationEcoV2 ? Math.max(durationEcoV2, 3) : Math.max(ecoIntervalTime, 3);

  const successfulySended = await setEcoMode(damId, ecoState, timeDuration, timezoneId, '[SYSTEM]');

  // Se não recebeu confirmação de envio nas três tentativas, não atualiza expiração do comando para próxima iteração considerar que pode tentar enviar novamente
  if (successfulySended) {
    // (DAM_ECO_INT_TIME / 3) IN MILISSECONDS
    alertDataDAM.sleep_ts = (ts.valueOf() + (ecoIntervalTime / 3) * 60 * 1000);

    alertDataDAM.cmd_state = convState[ecoState];
    // DAM ECO INT TIME IN MILISSECONDS
    alertDataDAM.cmd_exp = ts.valueOf() + Math.max(ecoIntervalTime, 3) * 60 * 1000;
  }
}

export function ecoStateExpected (devId: string) {
  if (!devId) return null;
  if (damEcoMonitor[devId]) {
    const ecoData_DAM = damEcoMonitor[devId];
    if (!ecoData_DAM.cmd_exp) return null;
    if (Date.now() > ecoData_DAM.cmd_exp) { return null; }
    return ecoData_DAM.cmd_state;
  }
  // if (dutAutEcoMonitor[devId]) {
  //   const ecoData_DUT = dutAutEcoMonitor[devId];
  //   if (!ecoData_DUT.cmd_exp) return null;
  //   if (Date.now() > ecoData_DUT.cmd_exp) { return null; }
  //   return ecoData_DUT.cmd_state;
  // }
  return null;
}

const ecoModeCfgs = {
  ['eco-D']: {
    description: 'Desligar',
  },
  ['eco-V']: {
    description: 'Ventilar',
  },
  ['eco-C1-V']: {
    description: 'Desligar condensadora 2 por 5 minutos, depois ventilar',
  },
  ['eco-C2-V']: {
    description: 'Desligar condensadora 1 por 5 minutos, depois ventilar',
  },
}

// httpRouter.privateRoutes['/get-ecomode-configs'] = async function (reqParams, session) {
// }

async function setEcoMode (devId: string, mode: DamMessage_EcoMode['eco-programming']['command'], duration: number, timezoneId: number, userId: string) {
  const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(timezoneId);
  const command: DamMessage_EcoMode = {
    "eco-programming": {
      start: momentTimezone().tz(timezoneInfo.timezoneArea).format('YYYY-MM-DDTHH:mm:ss'),
      duration,
      command: mode,
    }
  };

  const resultSendDamEcoCheckResponse = await sendDamEcoCheckResponse(devId, command, timezoneId, userId)
  if (!resultSendDamEcoCheckResponse) {
    return false;
  }
  sqldb.ECOCMDHIST.w_insertUpdate({
    devId,
    ts: momentTimezone().tz(timezoneInfo.timezoneArea).format('YYYY-MM-DDTHH:mm:ss'),
    duration,
    mode,
  }).catch((err) => {
    logger.error('UNHANDLED_SQL', err);
    eventWarn.typedWarn('UNHANDLED_SQL', String(err));
  });
  
  return true;
}

async function sendDamEcoCheckResponse(devId: string, command: DamMessage_EcoMode, timezoneId: number, userId: string) {
  // Realiza tentativa de envio
  const haveDebug = servConfig.debugDamsEcoMode.includes(devId);
  const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(timezoneId);
  for (let attempt = 0; attempt < numberSendingEcoAttempts; attempt++) {
    try {
      command['eco-programming'].start = momentTimezone().tz(timezoneInfo.timezoneArea).format('YYYY-MM-DDTHH:mm:ss'); // Start ser a hora da iteração de agora;
      if (haveDebug) {
        logger.info(`[DAM ECO] Tentativa ${attempt + 1} de envio comando eco para o dispositivo ${devId}: ${JSON.stringify(command)}`);
      }
      const promise = iotMessageListener.waitForDamControl((message) => {
        if (!message) return false;
        if (message.dev_id !== devId) return false;
        message = message as MsgDamEcoProgramming;
        if (message.message_type !== 'eco_programming') return false;
        return true;
      }, 5000);
      sendDamCommand_eco(devId, command, userId);

      const result = (await promise) as MsgDamEcoProgramming;
      break;
    }
    catch (err){
      logger.info(`[DAM ECO] Não obteve resposta na tentativa ${attempt + 1} de envio comando eco para o dispositivo ${devId}: ${JSON.stringify(command)}`);
      if (attempt === (numberSendingEcoAttempts - 1)) {
        logger.error({
          message: `[DAM_ECO_ERR] Erro ao enviar comando eco para o dispositivo ${devId}: ${JSON.stringify(command)}`,
          devId: devId,
          err: `${err && (err as Error).message || 'DAM_ECO_ERR'}`
        });
        return false;
      }
    }
  }

  return true;
}
function expectedCurrentDamState (damId: string, timezoneId: number): 'allow'|'forbid' {
  const damSched = dbRamCache.tryGetDamSched(damId);
  if (!damSched) return null;
  if (!damSched.current) return null;
  const timezoneInfo = dbRamCache.tryGetTableInfoTimezone(timezoneId);

  const nowShifted = momentTimezone().tz(timezoneInfo.timezoneArea);
  const index = nowShifted.hours() * 60 + nowShifted.minutes();
  const inside = (index >= damSched.current.indexIni) && (index <= damSched.current.indexEnd);
  // TODO: consider ventilation time

  if (damSched.current.permission === 'allow') {
    return inside ? 'allow' : 'forbid';
  }
  if (damSched.current.permission === 'forbid') {
    return inside ? 'forbid' : 'allow';
  }

  return null;
}

export function clone_damEcoMonitor() {
  return JSON.parse(JSON.stringify(damEcoMonitor)) as typeof damEcoMonitor;
}
