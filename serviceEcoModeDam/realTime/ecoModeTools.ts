import { PeriodData, TelemetryDUT } from '../../srcCommon/types';
import * as dbRamCache from '../ramCaches/dbRamCache';
import * as damLastTelemetry from '../ramCaches/damLastTelemetry'
import * as automationRefsLoader_sup from '../../srcCommon/helpers/ramcacheLoaders/automationRefsLoader'
import * as damsEcoCfgLoader_sup from '../../srcCommon/helpers/ramcacheLoaders/damsEcoCfgLoader';
import { clone_damEcoMonitor } from './ecoMode';
import { API_Internal } from '../api-internal';

const damEcoDebug: {
  [damId: string]: {
    ecoCfg: Awaited<ReturnType<typeof damsEcoCfgLoader_sup.loadDamsEcoCfg>>[string],
    lastDamTelem: ReturnType<typeof damLastTelemetry.lastDamTelemetry>,
    damSched_current: ReturnType<typeof dbRamCache.tryGetDamSched>['current'],
    damEcoState: ReturnType<typeof clone_damEcoMonitor>[string],
    assocDuts: {
      [dutId: string]: {
        lastDutTmprt: number,
        dutSched_current: Awaited<ReturnType<typeof dbRamCache.tryGetRTypeSched>>['current'],
        TUSEMIN: number,
        proxCmd: string,
      }
    },
  }
} = {};

export async function debugarModoEcoDAM() {
  // Quero saber:
  //  - Quais DAMs estão com o modo eco configurado/ativado.
  //  - Se o DAM está na condição (online, telemetria recente, modo automático, dentro da programação horária, expectedDamState, etc...).
  //  - Se tem DUTs associados, quantos são, se estão online transmitindo, dentro da programação, informando temperatura válida.
  //  - Se algum dos DUTs está informando temperatura abaixo do setpoint de ativação do modo eco.
  //  - Quando foi o último comando eco enviado para o DAM.
  //  - Detalhes de funcionamento como o contador de tempo abaixo da temperatura.

  // A função de debug então precisa:
  //  - Carregar do banco de dados todos os DAMs que estão com modo ECO ativado.
  const damsEcoCfg = await damsEcoCfgLoader_sup.loadDamsEcoCfg();
  //  - Carregar a lista de todos os DUTs associados com algum desses DAMs.
  const { damDutsRef } = await automationRefsLoader_sup.loadAutomationRefs({});

  const damsEcoState = clone_damEcoMonitor();

  for (const [damId, ecoCfg] of Object.entries(damsEcoCfg)) {
    //  - Pegar a última telemetria enviada por cada um desses DAMs e DUTs.
    const lastDamTelem = damLastTelemetry.lastDamTelemetry(damId);
    //  - Listar a programação horária atual (current) de cada um desses dispositivos (não esquecer dos tipos de ambientes).
    const damSched = dbRamCache.tryGetDamSched(damId);

    const damEcoState = damsEcoState[damId] || null;

    damEcoDebug[damId] = {
      damEcoState,
      ecoCfg,
      lastDamTelem,
      damSched_current: damSched?.current || null,
      assocDuts: {},
    };
    const assocDuts = damEcoDebug[damId].assocDuts;

    const assocDutIds = damDutsRef[damId] || [];
    for (const dutId of assocDutIds) {
      const lastDutTmprt = damEcoState.duts[dutId]?.lastT;
      const RTYPE_ID = dbRamCache.tryGetDutRTypeId(dutId) || null;
      const dutSched = (RTYPE_ID && dbRamCache.tryGetRTypeSched(RTYPE_ID)) || null;

      //  - Identificar qual comando deveria enviar na situação atual se chegasse agora uma telemetria igual a anterior. Isso é por DUT.
      let proxCmd: string = "Não tem telemetria de DUT";
      // if (lastDutTelem?.lastTelemetry) {
      //   proxCmd = devEcoMode(lastDutTelem.lastTelemetry, new Date(Date.now() - 3 * 60 * 60 * 1000), dutSched, damId);
      // } else {
      //   proxCmd = "Não tem telemetria de DUT";
      // }

      assocDuts[dutId] = {
        lastDutTmprt,
        dutSched_current: dutSched?.current || null,
        TUSEMIN: dutSched?.TUSEMIN,
        proxCmd,
      };
    }
  }
  //  - Incluir na resposta o horário para comparar com os timestamps.
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300';

  // analisarDebugModoEco(agora);

  return { agora, damEcoDebug };
}

function analisarDebugModoEco(agora: string) {
  let ts_agora = new Date(agora).getTime();
  console.log(`dam_id\tdamLastTs\tdamLastMode\tdamLastState\tdutsIds\tdutsTemps\tdamEcoCmd_state\tdamEcoCmd_exp\tecoStatus`);
  for (const [dam_id, ecoInfo] of Object.entries(damEcoDebug)) {
    let tempo_damTelm = '';
    try {
      const ts_damTelm = ecoInfo.lastDamTelem?.lastTelemetry?.timestamp && new Date(ecoInfo.lastDamTelem?.lastTelemetry?.timestamp + '-0300').getTime();
      if (ts_damTelm) tempo_damTelm = ` [${Math.round((ts_agora - ts_damTelm) / 1000)}s]`
    } catch(err) {}
    let tempo_ecoExp = '';
    try {
      const ts_ecoExp = ecoInfo.damEcoState?.cmd_exp && new Date(ecoInfo.damEcoState?.cmd_exp).getTime();
      if (ts_ecoExp) tempo_ecoExp = ` [${Math.round((ts_agora - ts_ecoExp) / 1000)}s]`
    } catch(err) {}

    const damLastTs = ecoInfo.lastDamTelem?.lastTelemetry?.timestamp || '-';
    const damLastMode = ecoInfo.lastDamTelem?.lastTelemetry?.Mode || '-';
    const damLastState = ecoInfo.lastDamTelem?.lastTelemetry?.State || '-';
    const damEcoCmd_state = ecoInfo.damEcoState?.cmd_state || '-';
    const damEcoCmd_exp = ecoInfo.damEcoState?.cmd_exp && (new Date(ecoInfo.damEcoState?.cmd_exp).toLocaleString()) || '-';
    const dutsIds = Object.entries(ecoInfo.assocDuts || {}).map(([dut_id, dutEco]) => dut_id).map(x => x || '-').join(', ');
    const dutsTemps = Object.entries(ecoInfo.assocDuts || {}).map(([dut_id, dutEco]) => dutEco.lastDutTmprt).map(x => x || '-').join(', ');
    const ecoStatus = dutsIds ? Object.entries(ecoInfo.assocDuts || {}).map(([dut_id, dutEco]) => dutEco.proxCmd).map(x => x || '-').join(', ') : 'Não tem DUT associado';
    console.log(`${dam_id}\t${damLastTs+tempo_damTelm}\t${damLastMode}\t${damLastState}\t${dutsIds}\t${dutsTemps}\t${damEcoCmd_state}\t${damEcoCmd_exp+tempo_ecoExp}\t${ecoStatus}`);
  }
}

function devEcoMode (tel: TelemetryDUT, shiftedServerTime: Date, dutSched: { current: PeriodData, TUSEMIN: number }, damId: string): string {
  try {
    if (tel.Temperature == null) return 'Temperatura DUT null';
    if (!dutSched) return 'DUT sem programação horária';
    if (!dutSched.current) return 'DUT sem programação current';
  
    const damEcoDbg = damEcoDebug[damId];
    const permitido = damEcoDbg.ecoCfg.CAN_SELF_REFERENCE || dutSched.TUSEMIN != null;
    if (!permitido) return 'Não tem TREF';
  
    return damEcoMode(damId, tel, shiftedServerTime, dutSched);
  } catch(err) {
    return String(err || 'ERRO');
  }
}

function damEcoMode (damId: string, tel: TelemetryDUT, shiftedServerTime: Date, dutSched: { TUSEMIN: number }): string {
  const damEcoDbg = damEcoDebug[damId];

  // O DAM precisa estar com modo eco configurado
  const ecoCfg = damEcoDbg.ecoCfg;
  if (!ecoCfg) return 'Não tem ecoCfg para o DAM';

  const dateNow = Date.now();
  // O DAM precisa estar em modo Automático.
  const damLastComm = damEcoDbg.lastDamTelem;
  if (!damLastComm) return 'Não tem lastComm para o DAM';
  if (!damLastComm.lastTelemetry) return 'Não tem lastComm.lastTelemetry para o DAM';
  if (damLastComm.lastTelemetry.Mode !== 'Auto') return 'O DAM não está no modo Auto';
  // Só aceitar essa informação se ela tiver sido recebida há menos de 10 minutos.
  if (!(damLastComm.lastMessageTS > (dateNow - (10 * 60 * 1000)))) return 'A última telemetria do DAM é antiga'; // 10 minutos

  // O modo eco só atua se o DAM estiver dentro do horário de funcionamento.
  const expectedDamState = expectedCurrentDamState(damId);

  if (expectedDamState !== 'allow') return 'O DAM não está em allow';

  // "alertDataDAM" é usado para gerenciar a sequência de comandos eco enviados para o DAM
  let alertDataDAM = damEcoDbg.damEcoState;
  if (!alertDataDAM) {
    return 'Não tem alertData para o DAM';
  }

  // "alertDataDUT" é usado para monitorar quanto tempo a temperatura passa abaixo do limite esperado
  let alertDataDUT = alertDataDAM.duts[tel.dev_id]
  if (!alertDataDUT) {
    return 'Não tem alertData para o DUT';
  }

  // Se estiver no novo modo eco, faça sua função e continua para o próximo
  if (ecoCfg.ENABLE_ECO === 2) {
    return damEcoModeV2(damId, tel);
  }

  // Se o dash já tiver enviado algum comando eco e o último comando ainda não tiver expirado, considera que o modo eco está em curso.
  const modoEcoEmCurso = dateNow < alertDataDAM.cmd_exp;
  
  // FLEXIBLE ECO COMMAND INTERVAL TIME
  const ecoIntervalTime = ecoCfg.ECO_INT_TIME;

  // delta é o tempo desde a última telemetria deste DUT. Se for muito longo zera o contador e aborta a estratégia por agora.
  let delta = alertDataDUT.telmTS && (shiftedServerTime.getTime() - alertDataDUT.telmTS);
  // alertDataDUT.telmTS = shiftedServerTime.getTime();
  if (delta > 0 && delta < ecoIntervalTime * 60 * 1000) {
  } // OK
  else {
    // alertDataDUT.accLOW = 0;
    // alertDataDUT.accHIGH = 0;
    return 'Intervalo entre telemetrias de DUT muito grande';
  }

  // Tlimit é o setpoint do modo eco. Pode ser o setpoint de entrada se o modo eco ainda não estiver operando.
  let Tlimit: number;
  // Lógica já existente para os DAMs que não utiliza hystereses
  if (!ecoCfg.CAN_SELF_REFERENCE) {
    Tlimit = dutSched.TUSEMIN + (ecoCfg.ECO_OFST_START || 0);
    // Mas se já estiver operando, soma o offset de saída para se tornar o setpoint de saída do modo eco.
    if ((ecoCfg.ECO_OFST_END) && (alertDataDUT.accLOW > 0) && alertDataDAM.cmd_exp && dateNow < alertDataDAM.cmd_exp) {
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
    // alertDataDUT.accLOW += delta;
  }
  else {
    // alertDataDUT.accLOW = 0;
    return 'A temperatura não está abaixo do limite';
  }

  // Se tiver pouco tempo que o dash enviou um comando de modo eco, aguarda mais um pouco antes de enviar um novo comando.
  // sleep_ts indica até quando não é para enviar um novo comando
  if (alertDataDAM.sleep_ts && dateNow < alertDataDAM.sleep_ts) return 'Dentro da pausa entre comandos';

  // Verifica se a temperatura ficou tempo suficiente abaixo do setpoint para ativar o modo eco.
  if (alertDataDUT.accLOW >= ecoIntervalTime * 60 * 1000) {
    // Está na condição de ativar (ou manter) o modo eco. A estratégia continua depois deste if.
  } else {
    // Ainda não ficou tempo suficiente abaixo do setpoint para iniciar o modo eco, ou a temperatura já subiu ultrapassando o setpoint.
    // Se o modo eco estiver operando, e estiver em uma configuração de 2 estágios e o último comando enviado for de ventilação, envia o...
    // ...comando para reativar somente 1 condensadora. Quando esse comando expirar, o DAM passa para Enabled e a outra condensadora pode ligar.
    if (modoEcoEmCurso && ecoCfg.splitCond && (alertDataDAM.cmd_state === 'onlyfan')) {
      if (ecoCfg.ECO_CFG === 'eco-C1-V') {
        return 'Condenser 1';
      }
      else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
        return 'Condenser 2';
      }
    }
    return 'Ainda não deu tempo de ativar a estratégia';
  }

  // Daqui para baixo o dash vai enviar um comando de modo eco. Então já definimos (através de sleep_ts) que nos próximos X segundos
  // o dash não vai enviar nenhum outro comando eco.
  // (DAM_ECO_INT_TIME / 2) IN MILISSECONDS
  // alertDataDAM.sleep_ts = dateNow + (ecoIntervalTime / 2) * 60 * 1000;

  // Para as configurações em 2 estágios, a temperatura fica abaixo do setpoint por 'ecoIntervalTime' segundos antes de começar o modo eco.
  // Aí uma condensadora é desligada e a estratégia fica nesse modo por mais 'ecoIntervalTime' segundos. Se a temperatura continuar
  // abaixo do setpoint depois desse tempo (2 vezes 'ecoIntervalTime'), a estratégia ativa o segundo estágio que é o modo ventilar.
  const timeForSecondStage = alertDataDUT.accLOW > (ecoIntervalTime * 2) * 60 * 1000;

  if (ecoCfg.ECO_CFG === 'eco-D') {
    return 'Disabled';
  }
  else if (ecoCfg.ECO_CFG === 'eco-V') {
    return 'Ventilation';
  }
  else if (ecoCfg.ECO_CFG === 'eco-C1-V') {
    // (DAM_ECO_INT_TIME * 2) IN MILISSECONDS
    if (timeForSecondStage) {
      return 'Ventilation';
    } else {
      if (!['disabling', 'forbid', 'onlyfan'].includes(damLastComm.lastTelemetry.State)) {
        return 'Condenser 1';
      }
    }
  }
  else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
    // (DAM_ECO_INT_TIME * 2) IN MILISSECONDS
    if (timeForSecondStage) {
      return 'Ventilation';
    } else {
      if (!['disabling', 'forbid', 'onlyfan'].includes(damLastComm.lastTelemetry.State)) {
        return 'Condenser 2';
      }
    }
  }
  return 'Deveria mas não enviou comando';
}

function damEcoModeV2 (damId: string, tel: TelemetryDUT): string {
  const damEcoDbg = damEcoDebug[damId];
  const ecoCfg = damEcoDbg.ecoCfg;
  let alertDataDAM = damEcoDbg.damEcoState;
  let alertDataDUT = alertDataDAM.duts[tel.dev_id]


  // Foi decidido que nesta primeira versão para testes estes parâmetros serão fixos, 
  // mas futuramente deverão ser parametrizaveis. Indicam quanto tempo aguardar para chaveamento (bloquear ou liberar segunda condensadora) de acordo com temperatura em relação ao setpointSup
  const minutesCanBlockCondenser = 3;
  const minutesAllowOtherCondenser = 3;
  const timeAllowOtherCondenser = Date.now() + minutesAllowOtherCondenser * 60 * 1000;

  const ecoCommandToday = Date.now() < alertDataDAM.cmd_exp;
  // Se modo eco não está em curso ainda ou se estagio anterior era antes de atingir setpoint, verifica se deve ventilar ou manter desligado até atingir setpoint
  if (((!ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'after-LTC') || alertDataDAM.stagesEcoV2 === 'before-setpoint') && ecoCfg.SETPOINT > tel.Temperature){
    alertDataDAM.condensersEnabled = false;
    if (ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-ventilate'){
      return 'Ventilation';
    }
    // No DAC o parâmetro SCHEDULE_START_BEHAVIOR será sempre null, já que DAC mandamos apenas o comando de Disabled para bloquear condensadoras
    // mas não afeta a evaporadora, sendo um comando equivalente há Ventilation do DAM
    else if ((ecoCfg.SCHEDULE_START_BEHAVIOR == null || ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-off')) {
      return 'Disabled';
    }
    // alertDataDAM.stagesEcoV2 = 'before-setpoint';
    return `Não enviou v2 mas está em before-setpoint`;
  }

  // Se modo eco ainda não está em curso (temperatura ja iniciou acima do setpoint) ou estagio anterior foi de antes do setpoint, mas temperatura ultrapassou Setpoint sem ultrapassar LTC
  // deve iniciar ventilação
  if (((!ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'after-LTC') || alertDataDAM.stagesEcoV2 === 'before-setpoint') && ecoCfg.SETPOINT <= tel.Temperature && tel.Temperature < ecoCfg.LTC) {
    alertDataDAM.condensersEnabled = false;
    if (ecoCfg.ECO_CFG === 'eco-D') {
      // Caso seja DAC, será passado comando de Disabled para ventilar
      return 'Disabled';
    }
    else{
      return 'Ventilation';
    }
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
        return 'Condenser 1';
      }
      else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
        return 'Condenser 2';
      }
    }

    // Indica que de agora em diante está no contexto de ter atingido o LTC
    alertDataDAM.stagesEcoV2 = 'after-LTC';

    return `Não enviou v2 mas está em after-LTC`;
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
      return 'Condenser 1';
    }
    else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
      return 'Condenser 2';
    }
    return `Não enviou v2, L356`;
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
        return 'Condenser 1';
      }
      else if (ecoCfg.ECO_CFG === 'eco-C2-V') {
        return 'Condenser 2';
      }
      return `Não enviou v2, L373`;
    }
    // Se abaixo do setpoint, e diferença em relação ao setpoint for maior que histerese inferior, realiza ventilação
    // exceto se havia ligado a segunda condensadora, neste caso deve aguardar tempo mínimo de desligar condensadoras
    else if (tel.Temperature <= setpointInf && (!alertDataDAM.condensersEnabled || (alertDataDAM.condensersEnabled && alertDataDUT.accAfterCool > (minutesCanBlockCondenser * 60 * 1000)))) {
      alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
      alertDataDAM.condensersEnabled = false;
      if (ecoCfg.ECO_CFG === 'eco-D') {
        return 'Disabled';
      }
      else if (ecoCfg.ECO_CFG === 'eco-V' || ecoCfg.ECO_CFG === 'eco-C1-V' ||ecoCfg.ECO_CFG === 'eco-C2-V') {
        return 'Ventilation';
      }
      return `Não enviou v2, L386`;
    }
    // Caso última mudança de estado expirou, e temperatura está entre os setpoints inferior e superior, mantem o último estado
    // portanto sem alterar sleep_ts_eco_v2
    else if (tel.Temperature < setpointSup && tel.Temperature > setpointInf) {
      alertDataDAM.sleep_ts_eco_v2 = Date.now() + ecoIntervalTime * 60 * 1000;
      if (alertDataDAM.cmd_state === 'forbid') {          
        return 'Disabled';
      }
      else if (alertDataDAM.cmd_state === 'onlyfan'){
        return 'Ventilation';
      }
      // Para comando de eco, é feito tratamento na estratégia de chaveamento
      return `Não enviou v2, L399`;
    }
  }

  // Caso tenha começado o modo eco, não esteja no primeiro estágio e temperatura caiu abaixo do LTI, desliga ou ventila mesmo que não tenha finalizado
  // programação horária
  if (ecoCommandToday && alertDataDAM.stagesEcoV2 !== 'before-setpoint' && tel.Temperature < ecoCfg.LTI) {
    if (ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-ventilate'){
      return 'Ventilation';
      alertDataDAM.stagesEcoV2 = 'after-LTI';
    }
    // No DAC o parâmetro SCHEDULE_START_BEHAVIOR será sempre null, já que DAC mandamos apenas o comando de Disabled para bloquear condensadoras
    // mas não afeta a evaporadora, sendo um comando equivalente há Ventilation do DAM
    else if (ecoCfg.SCHEDULE_START_BEHAVIOR == null || ecoCfg.SCHEDULE_START_BEHAVIOR === 'schedule-start-behavior-off') {
      return 'Disabled';
      alertDataDAM.stagesEcoV2 = 'after-LTI';
    }
    return `Não enviou v2, L416`;
  }

  return `Não enviou v2, L419`;
}

function expectedCurrentDamState (damId: string): 'allow'|'forbid' {
  const damEcoDbg = damEcoDebug[damId];
  const damSched_current = damEcoDbg.damSched_current;
  if (!damSched_current) return null;

  const nowShifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const index = nowShifted.getUTCHours() * 60 + nowShifted.getUTCMinutes();
  const inside = (index >= damSched_current.indexIni) && (index <= damSched_current.indexEnd);
  // TODO: consider ventilation time

  if (damSched_current.permission === 'allow') {
    return inside ? 'allow' : 'forbid';
  }
  if (damSched_current.permission === 'forbid') {
    return inside ? 'forbid' : 'allow';
  }

  return null;
}

export const get_damEcoMonitor: API_Internal['/diel-internal/serviceEcoModeDam/get_damEcoMonitor'] = async function () {
  // if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  return clone_damEcoMonitor();
}

export const debug_dam_ecomode: API_Internal['/diel-internal/serviceEcoModeDam/debug_dam_ecomode'] = async function () {
  // if (!session.permissions.isAdminSistema) throw Error('Permission denied!').HttpStatus(403);
  return await debugarModoEcoDAM();
}
