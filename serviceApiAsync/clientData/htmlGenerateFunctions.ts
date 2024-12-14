import { AssociationItem, DacItem, DatItem, DutItem, GroupItem } from "../../srcCommon/types/exportRealTime"
import * as httpRouter from '../apiServer/httpRouter';
import * as devsLastComm from '../../srcCommon/helpers/devsLastComm';
import { t } from '../../srcCommon/helpers/i18nextradution';
import sqldb from '../../srcCommon/db';
import { SessionData } from "../../srcCommon/types";

const automationOptions = [{
  label: 'Automático',
  value: 'auto',
}, {
  label: 'Manual',
  value: 'manual',
}];
const statusOptions = [{
  label: 'Refrigerar',
  value: 'allow',
}, {
  label: 'Ventilar',
  value: 'onlyfan',
}, {
  label: 'Bloquear',
  value: 'forbid',
}];

export const generateSistemContainerItem = async (association: AssociationItem, listIrCodeDuts: httpRouter.ApiResps['/get-duts-ircodes-list'], setPointList: {[key: string]: number}, language: string, session: SessionData, lastMessages: Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>) => {
  let itemGroups: string = '';
  for (let group of association.GROUPS) {
    itemGroups += await generateHtmlContainerItemMachine(group, listIrCodeDuts, setPointList, language, session, lastMessages);
  }
  return `
  <div
    class="containerArea"
    style="
      display: flex;
      width: 100%;
      gap: 16px;
      row-gap: 35px; 
      margin-top: 10px;
      flex-wrap: wrap;
      border-top: 10px solid rgb(54, 59, 196);
      border-radius: 4px;
      border-left: 1px solid rgba(0, 0, 0, 0.21);
      border-right: 1px solid rgba(0, 0, 0, 0.21);
      border-bottom: 1px solid rgba(0, 0, 0, 0.21);
      padding-bottom: 40px;
      padding-left: 5px;
      padding-right: 5px;
      page-break-after: always;
    "
  >
    <h3 style="font-size: 15px; width: 100%;">${association.ASSOC_NAME}</h3>
    ${itemGroups}
  </div>

  `;
}

export const generateHtmlContainerItemMachine = async (item: GroupItem, listIrCodeDuts: httpRouter.ApiResps['/get-duts-ircodes-list'], setPointList: {[key: string]: number}, language: string, session: SessionData, lastMessages: Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>) => {
  const permission = session.permissions.isAdminSistema || session.permissions.isInstaller || session.permissions.isParceiroValidador;
  const dats = item.dats.filter((dat) => !(item.dacs.some((dac) => dac.DAC_ID === dat.DEV_ID) || item.duts.some((dut) => dut.DEV_ID === dat.DEV_ID) || item.dams.some((dam) => dam.DAM_ID === dat.DEV_ID)));
  const onlyDats = !!(!item.dacs.length && item.dats.length)
  return `
    <div
      class="containerBox"
      style="
        display: flex;
        border-top: 10px solid rgb(54, 59, 196);
        border-radius: 4px;
        margin: 0px 1px 0px 0px;
        justify-content: center;
        min-height: 170px;
      "
    >
      <div
        class="containerBorder"
        style="
          display: flex;
          width: auto;
          border: 1px solid rgba(0, 0, 0, 0.21);
          border-top: 0;
          padding: 7px 7px;
        "
      >
        <div class="infoMachine">
          ${titleArea(item, dats)}
          <div style="display: flex; height: 88%; width: 100%; min-height: 120px; flex-wrap: wrap; row-gap: 16px;">
            ${generateAutCard(item, listIrCodeDuts, setPointList, language, dats, permission, lastMessages)}
            ${await generateMachineCard(item, language, permission, lastMessages)}
            ${generateDatArea(dats, permission, onlyDats)}
          </div>
        </div>
      </div>
    </div>
  `
}

function titleArea(item: GroupItem, dats: DatItem[]) {
  return `
  <div
    class="titleArea"
    style="display: flex; flex-direction: row; width: 100%;"
  >
    <strong
      style="
        border-bottom: 2px solid #dcdcdc;
        font-size: 12px;
        ${verifyAutomToCss(item.DEV_AUT, item, dats)}
      "
    >
      ${item.name}
    </strong>
  </div>
  `;
}

function getIconHeatExhange(diagnostic: string) {
  if (diagnostic === 'unavailable') {
    return '';
  }
  if (diagnostic === 'malfunctioning') {
    return `
    <div
    style="
      background-color: red;
      border-radius: 9px;
      padding: 2px;
      width: 8px;
      height: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    "
  >
    <svg
      width="6px"
      height="6px;"
      viewBox="0 0 18 17"
    >
      <path
        d="M1.26326 2.06602C0.911502 1.71113 0.907553 1.14029 1.25437 0.780563C1.6111 0.410554 2.20187 0.404814 2.56572 0.767823L8.99996 7.18716L15.4342 0.767823C15.798 0.404814 16.3888 0.410554 16.7456 0.780563C17.0924 1.14029 17.0884 1.71113 16.7367 2.06602L10.3571 8.50242L16.7295 14.9093C17.0906 15.2724 17.0895 15.8593 16.727 16.221C16.3647 16.5825 15.7781 16.5825 15.4158 16.221L8.99996 9.82009L2.58416 16.221C2.22183 16.5825 1.63527 16.5825 1.27293 16.221C0.910403 15.8593 0.909271 15.2724 1.2704 14.9093L7.64279 8.50242L1.26326 2.06602Z"
        fill="white"
      />
    </svg>
  </div>
    ` 
  }
  if (diagnostic === 'working-correctly') {
    return `
    <div
    style="
      background-color: green;
      border-radius: 9px;
      padding: 2px;
      width: 8px;
      height: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    "
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24px;"
      height="24px;"
      viewBox="0 0 24 24"
    >
      <path fill="none" d="M0 0h24v24H0z" />
      <path
        fill="white"
        d="M9 16.2L4.8
      12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
      />
    </svg>
  </div>
    `;
  }
  return '';
}

async function getDiacnosticHeatExchange(Tliq: number | undefined, Tsuc: number | undefined, trocador: DacItem) {
  let diagnosis = '';
  const heatInfo =  await sqldb.HEAT_EXCHANGERS.getHeatExchangerById({
    ID: trocador.HEAT_EXCHANGER_ID,
  });
  if ((Tliq !== null && Tsuc !== null) || (Tliq !== undefined && Tsuc !== undefined)) {
    const deltaT = Number((Tliq - Tsuc).toFixed(2));
    if (heatInfo?.DELTA_T_MAX && heatInfo?.DELTA_T_MIN) {
      if (deltaT > heatInfo.DELTA_T_MAX || deltaT < heatInfo.DELTA_T_MIN) {
        diagnosis = 'malfunctioning';
      } else {
        diagnosis = 'working-correctly';
      }
    } else {
      diagnosis = 'unavailable';
    }
  } else {
    diagnosis = 'unavailable';
  }
  return diagnosis;
}

function generateHeatExhangerCard(trocador: DacItem, diagnostic: string, language: string, telemetry: {
  lastTelemetry: {
    timestamp: string;
    Tamb: number;
    Tsuc: number;
    Tliq: number;
    Psuc: number;
    Pliq: number;
    Levp: 0 | 1;
    Lcmp: 0 | 1;
    Lcut: 0 | 1;
    Tsc: number;
    Tsh: number;
    P0raw: number;
    P1raw: number;
};
status: "OFFLINE" | "ONLINE" | "LATE";
lastMessageTS: number;
}) {
  return `
  <div
        class="boxInfoArea"
        style="
        display: flex;
        justify-content: space-between;
        padding-top: 5px;        
        "
      >
      <div 
        style="
          display: flex;
          flex-direction: column;            
          justify-content: space-between;            
          height: 100%;          
        ">
        <div style="width: 100%; flex-wrap: wrap; display: flex;">
        <strong
        style="
          font-size: 10px;
          width: 133.87px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        "
      >
          ${trocador.DAC_NAME}
        </strong>
        ${getIconHeatExhange(diagnostic)}
        </div>
        <strong style="color: #6d6d6d; font-size: 10px;">
          ${trocador.DAC_ID}
        </strong>
        <strong style="font-size: 8px;">${t('retornoAgua', language)}:</strong>
        <span><strong>${telemetry.lastTelemetry?.Tliq ? telemetry?.lastTelemetry.Tliq : '-'}</strong>°C</span>
        <strong style="font-size: 8px;">${t('saidaAgua', language)}:</strong>
        <span><strong>${telemetry.lastTelemetry?.Tsuc ? telemetry?.lastTelemetry.Tsuc : '-'}</strong>°C</span>
        ${svgWifi(trocador.status, trocador.RSSI, null)}
        </div>
      </div>
  
  `;
}


async function generateMachineCard(machine: GroupItem, language: string, permission: boolean, lastMessages: Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>) {
  let body: string = '';
  const tam = (machine.dacs.length === 1 && !machine.DEV_AUT) && machine.name.length > 23;
  const dacs_sem_trocador = machine.dacs.filter((e) => e.DAC_APPL !== 'trocador-de-calor' && e.DAC_TYPE !== 'tipo-trocador-de-calor');
  const trocador_calor = machine.dacs.filter((e) => e.DAC_APPL === 'trocador-de-calor' && e.DAC_TYPE === 'tipo-trocador-de-calor');
  if (machine.dacs.length > 0) {
    dacs_sem_trocador.forEach((item, index) =>
      body += `
        <div
          class="boxInfoArea"
          style="
          display: flex;
          justify-content: space-between;
          padding-top: 5px;        
          "
        >
        <div 
          style="
            display: flex;
            flex-direction: column;            
            justify-content: space-between;            
            height: 85%;          
          "> 
          ${infoArea(item, permission)}
          ${healthAreaColor(item.H_INDEX, tam)}
          ${meanUse(item.MEAN_USE, language)}
          ${svgWifi(item.status, item.RSSI, item.Lcmp)}
        </div>
        <div style="margin-left: 10px; ${index !== machine.dacs.length - 1 ? 'margin-right: 44px;': ''}"></div>
      </div>
    `);
    if (trocador_calor.length > 0) {
      const trocador = trocador_calor[trocador_calor.length -1];
      const telemetry = lastMessages.lastDacTelemetry(trocador.DAC_ID);
      const diagnostic = await getDiacnosticHeatExchange(telemetry.lastTelemetry?.Tliq, telemetry.lastTelemetry?.Tsuc, trocador);
      body += generateHeatExhangerCard(trocador, diagnostic, language, telemetry);
    }
  } else {
    body += `
    <div
      class="boxInfoArea"
      style="
      display: flex;
      justify-content: space-between;
      padding-top: 5px; 
      "
    ></div>
    `;
  }
  return body;
}

function dutDuoCard(dutduo: DutItem, item: GroupItem, language: string, tamanho1: boolean) {
  return `
  <div
    style="
      width: ${tamanho1 ? '134px;' : '184px;'}
      padding: 2px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    "
  >
    <div
      style="
        width: 180px;
        padding: 2px;
        display: flex;
        flex-direction: column;
      "
    >
      <strong style="font-size: 10px; width: 133.87px;">
        ${dutduo.ROOM_NAME}
      </strong>
      <strong style="color: #6d6d6d; font-size: 10px;">
        ${item.DEV_AUT}
      </strong>
    </div>
    <div style="display: flex; flex-direction: column;">
      <strong style="font-size: 8px;">${t('tempRetorno', language)}:</strong>
      <span><strong>${dutduo.Temperature? dutduo.Temperature : '-'}</strong>°C</span>
    </div>
    <div style="display: flex; flex-direction: column;">
      <strong style="font-size: 8px;">${t('tempInsuflamento', language)}:</strong>
      <span><strong>${dutduo.Temperature_1? dutduo.Temperature_1 : '-'}</strong>°C</span>
    </div>
    ${svgWifi(dutduo.status, dutduo.RSSI, null)}
  </div>
  `;
}

function generateAutCard(item: GroupItem, listIrCodeDuts: httpRouter.ApiResps['/get-duts-ircodes-list'], setPointList: {[key: string]: number}, language: string, dats: DatItem[], permission: boolean,  lastMessages: Awaited<ReturnType<typeof devsLastComm.loadLastTelemetries>>) {
  if (item.DEV_AUT) {
    const tamanho1 = !dats.length && !item.duts.filter((dut) => dut.DEV_ID !== item.DEV_AUT).length && !item.dacs.length
    let status = null;
    let mode = null;
    if (item.DEV_AUT.startsWith("DUT")) {
      status = lastMessages.lastDutTelemetry(item.DEV_AUT)?.status || 'OFFLINE';
      const dutduo = item.duts?.find((dut) => dut.DEV_ID === item.DEV_AUT);
      if (dutduo?.PLACEMENT === 'DUO') {
        return dutDuoCard(dutduo, item, language, tamanho1);
      }
    } else {
      status = statusOptions.find((option) => option.value === item.dam?.State?.toLowerCase())?.label;
      mode = automationOptions.find((option) => option.value === item.dam?.Mode?.toLowerCase())?.label;
    }
    return `
      <div
        style="
          width: ${tamanho1 ? '134px;' : '184px;'}
          padding: 2px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        "
      >
        ${titleAutInfo(item, language, permission)}
        ${!item.DEV_AUT.startsWith('DUT') ? firstItemAutom(language, mode) : setPointDut(listIrCodeDuts, item, setPointList)}
        ${secondItemAutom(status, mode, item)}
      </div>
    `;
  }
  return '';
}

function ehRefr_preItem(item: {
  IR_ID: string;
  CMD_TYPE: string;
  CMD_DESC: string;
  TEMPER: number;
}, desc: string, t2: string) {
  return !!((item.CMD_TYPE === 'AC_COOL') || desc.includes('COOL') || desc.includes('REFR') || desc.includes('SET') || desc.match(/\bLIG/) || desc.match(/\bON/)) || (item.CMD_DESC && item.CMD_DESC === t2);
}

function identificadoItem(avaliacao: string, M: string, T: string) {
  return ((avaliacao === 'OK') && `${M}${(M === 'AC_COOL') ? (':' + T) : ''}`) || null;
}

function MItem(desc: string, ehDesl: boolean, ehVent: boolean, ehRefr: boolean) {
  return (desc.startsWith('FAKE') ? 'FAKE' : [ehDesl && 'AC_OFF', ehVent && 'AC_FAN', ehRefr && 'AC_COOL'].filter((x) => x).join(';')) || '?';
}

function identifyDutIrCommands(dutIrCmds: {
  IR_ID: string;
  CMD_TYPE: string;
  CMD_DESC: string;
  TEMPER: number;
}[]) {
  return dutIrCmds.map((item) => {
    const desc = (item.CMD_DESC || '').toUpperCase();
    const t1 = (item.TEMPER == null) ? null : String(item.TEMPER);
    const t2 = (desc.match(/(\d+)/g) || []).join(';') || null;
    const T = (t1 === t2) ? t1 : [t1, t2].filter((x) => x).join(';');
    const ehDesl = !!((item.CMD_TYPE === 'AC_OFF') || desc.includes('DESL') || desc.includes('OFF'));
    const ehVent = !!((item.CMD_TYPE === 'AC_FAN') || desc.includes('VENT') || desc.includes('FAN'));
    const ehRefr_pre = ehRefr_preItem(item, desc, t2);
    const ehRefr = ehRefr_pre || !!(T && (!ehDesl) && (!ehVent));
    const M = MItem(desc, ehDesl, ehVent, ehRefr);
    let avaliacao = '';
    if (((M === 'AC_OFF') || (M === 'AC_FAN')) || ((M === 'AC_COOL') && T && (T.length === 2))) { avaliacao = 'OK'; }
    const identificado = identificadoItem(avaliacao, M, T);
    // identificado = 'AC_OFF' ou 'AC_FAN' ou 'AC_COOL:21' ...
    return { ...item, cmdName: identificado };
  }) || null;
}

function setPointDut(listIrCodeDuts: httpRouter.ApiResps['/get-duts-ircodes-list'], item: GroupItem, setPointList: {[key: string]: number}) {
  let setPoint = 21;
  if (setPointList[item.DEV_AUT] && listIrCodeDuts[item.DEV_AUT]) {
    const { list: irCodeDuts } = listIrCodeDuts[item.DEV_AUT];
    const dutIrCommands = identifyDutIrCommands(irCodeDuts);
    const tempDefault = setPointList[item.DEV_AUT] || dutIrCommands?.filter((command) => {
      const cmdSetpoint = Number(command?.cmdName?.split(':')[1]) || null;
      if (cmdSetpoint != null) return command;
      return {}
    })
      .map((command) => (
        {
          IR_ID: command.IR_ID,
          CMD_NAME: command?.cmdName,
          CMD_TYPE: command?.CMD_TYPE,
          TEMPER: Number(command?.cmdName?.split(':')[1]),
        }
      ))
      .find((item) => item.CMD_TYPE === 'AC_COOL')?.TEMPER;
    setPoint = tempDefault || 21; 
  }
  return `
  <div
    class="bottomDUT"
    style="display: flex; flex-direction: column; gap: 5px;"
  >
    <strong style="font-size: 8px;"> Setpoint: </strong>
    <div
      style="display: flex; gap: 5px; align-items: center;"
    >
    <div
      style="
        background-color: ${setPoint ? '#5AB365' : 'grey'};
        width: 15px;
        height: 15px;
        border-radius: 3px;
        margin-left: 2px;
      "
    ></div>
      <p style="font-size: 10px; margin: 5px 0px;">${`${setPoint} º C`}</p>
    </div>
  </div>
  `;
}

function firstItemAutom(language: string, escrever?: string) {
  return `
  <div>
    <strong style="font-size: 8px;">${t('modo', language)}:</strong>
    ${buttonDrop({ escrever })}
  </div>
  `;
}

function secondItemAutom(status: "ONLINE" | "OFFLINE" | "LATE" | string, mode: string, item: GroupItem) {
  const escrever = item.DEV_AUT.startsWith("DUT") ? '' : status;
  return `
  <div>
    <strong style="font-size: 8px; ${status !== 'ONLINE' ? 'color: #cdcdcd' : ''}">Status:</strong>
    <div style="display: flex; gap: 5px;">
      ${buttonDrop({ status, mode, escrever })}
      ${svgClock({ status })}
    </div>
  </div>
  `;
}

function titleAutInfo(item: GroupItem, language: string, permission: boolean) {
  return `
  <div
    style="
      width: 186px;
      padding: 2px;
      display: flex;
      flex-direction: column;
    "
  >
    <strong style="font-size: 10px; width: 133.87px;">
      ${t('automacao', language)}
    </strong>
    <strong style="color: #6d6d6d; font-size: 10px;">
      ${ permission ? item.DEV_AUT : ''}
    </strong>
  </div>
  `
}

function returnColorOfMachine(health: number) {
  switch (health) {
    case 25: return '#DC0E01';
    case 50: return '#FF5C00';
    case 75: return '#FDB400';
    case 100: return '#58CC00';
    case 4: return '#555555';
    case 2: return '#ABB0B4';
    default: return '#ABB0B4';
  }
}

function generateDatArea(dats: DatItem[], permission: boolean, onlyDats: boolean) {
  let datArea = '';
  dats.forEach((dat, index) => {
    datArea += `
    <div
      class="boxInfoArea"
      style="
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        margin-left: ${ onlyDats && index === 0 ? '0px' : '40px'};
        min-height: 140px;
        width: 147px;
        row-gap: 16px;
      "
    >
      <div
        class="infoArea"
        style="display: flex; flex-direction: column;"
      >
        <strong
          style="
            font-size: 10px;
            width: 147px;
            text-overflow: ellipsis;
            word-wrap: unset;
            white-space: nowrap;
            overflow: hidden;
            margin: 4px 0px;
          "
        >
          ${dat.AST_DESC}
        </strong>
        <strong style="color: #6d6d6d; margin: 2px 0px; font-size: 8px;">
          ${permission ? dat.DAT_ID || '<div style="height: 8px; width: 20px;"></div>' : '<div style="height: 8px; width: 20px;"></div>'}
        </strong>
      </div>
      <div style="opacity: 0.4; font-size: 8px;">
        Este <strong>Ativo</strong> não é monitorado <br /> remotamente pela Diel Energia.
      </div>
    </div>
    `;
  })
  return datArea;
}

function svgClock({ status }: { status: "ONLINE" | "OFFLINE" | "LATE" | string }) {
  return `
    <div class="iconClock">
      <svg
        width="20"
        height="20"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 29C22.732 29 29 22.732 29 15C29 7.26801 22.732 1 15 1C7.26801 1 1 7.26801 1 15C1 22.732 7.26801 29 15 29Z"
          stroke=${status === "ONLINE" ? "#363BC4" : '#cdcdcd'}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        <path
          d="M15 7V15L19 19"
          stroke=${status === "ONLINE" ? "#363BC4" : '#cdcdcd'}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
    </div>
  `;
}

type TButtonDrop = {
  escrever?: string,
  status?: "ONLINE" | "OFFLINE" | "LATE" | string,
  mode?: string,
}

function buttonDrop({ escrever, status, mode }: TButtonDrop) {
  return `
  <div
    style="
      border: 1px solid gray;
      width: 60%;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px;
      box-sizing: border-box;
    "
  >
    <span style="color: ${status !== "ONLINE" || mode !== 'Manual' ? '#cdcdcd' : '#202370'}; font-size: 8px;">${escrever || ''}</span>
    <svg
      style="margin-right: 5px;"
      class="sc-bYSBpT bQAwkd"
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.59 0.589996L6 5.17L1.41 0.589996L0 2L6 8L12 2L10.59 0.589996Z"
        fill=${status !== "ONLINE" || mode !== 'Manual' ? '#cdcdcd' : '#202370'}
      ></path>
    </svg>
  </div>
  `;
}

function statusOnlineWifi(status: string, RSSI: number, Lcmp: number) {
  if (RSSI > -50) {
    return `
    <div style="display: flex; gap: 5px;">
      ${Lcmp ? onOfBottom(Lcmp) :  ''}
      <div class="sc-grRLdG fMECqy">
        <svg width="12" height="19" viewBox="0 0 25 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.9277 7.11941C23.7885 7.11991 23.6505 7.09178 23.5218 7.03665C23.3931 6.98152 23.2761 6.90048 23.1777 6.79819C21.7738 5.34027 20.1071 4.18378 18.2728 3.39475C16.4385 2.60573 14.4725 2.19962 12.487 2.19962C10.5016 2.19962 8.53558 2.60573 6.70127 3.39475C4.86696 4.18378 3.20027 5.34027 1.79637 6.79819C1.59685 6.99889 1.32941 7.11018 1.05165 7.10809C0.773881 7.106 0.508021 6.9907 0.311329 6.78702C0.114637 6.58334 0.00285237 6.30759 5.38334e-05 6.01915C-0.0027447 5.73072 0.103666 5.45268 0.296366 5.24493C1.89707 3.58212 3.79756 2.26307 5.88926 1.36314C7.98097 0.463198 10.2229 0 12.487 0C14.7512 0 16.9931 0.463198 19.0848 1.36314C21.1765 2.26307 23.077 3.58212 24.6777 5.24493C24.8248 5.39901 24.9247 5.59481 24.9649 5.80771C25.0051 6.02061 24.9838 6.2411 24.9036 6.44144C24.8235 6.64179 24.6881 6.81305 24.5144 6.93368C24.3408 7.05431 24.1366 7.11893 23.9277 7.11941Z" fill="#363BC4"></path><path d="M4.31284 10.5161C4.10341 10.5156 3.89882 10.4507 3.72492 10.3295C3.55101 10.2083 3.4156 10.0363 3.33579 9.83528C3.25598 9.63421 3.23536 9.41309 3.27653 9.19985C3.31769 8.98661 3.4188 8.79083 3.56708 8.63724C5.93272 6.18079 9.14114 4.80078 12.4866 4.80078C15.832 4.80078 19.0404 6.18079 21.4061 8.63724C21.605 8.84438 21.7165 9.1251 21.7161 9.41763C21.7157 9.71016 21.6034 9.99055 21.4039 10.1971C21.2045 10.4037 20.9341 10.5195 20.6524 10.5191C20.3707 10.5187 20.1007 10.4021 19.9018 10.1949C17.934 8.15494 15.2671 7.0092 12.4866 7.0092C9.70604 7.0092 7.03913 8.15494 5.07132 10.1949C4.8694 10.402 4.59664 10.5175 4.31284 10.5161Z" fill="#363BC4"></path><path d="M17.3892 13.9085C17.2499 13.909 17.112 13.8809 16.9833 13.8257C16.8545 13.7706 16.7376 13.6896 16.6392 13.5873C15.5378 12.4437 14.0441 11.8012 12.4866 11.8012C10.9292 11.8012 9.43546 12.4437 8.3341 13.5873C8.13519 13.7938 7.8654 13.9099 7.5841 13.9099C7.30279 13.9099 7.03301 13.7938 6.8341 13.5873C6.63519 13.3807 6.52344 13.1006 6.52344 12.8084C6.52344 12.5163 6.63519 12.2362 6.8341 12.0296C8.33513 10.4765 10.3677 9.60449 12.4866 9.60449C14.6056 9.60449 16.6381 10.4765 18.1392 12.0296C18.2877 12.1835 18.3889 12.3797 18.4299 12.5933C18.471 12.8069 18.45 13.0284 18.3697 13.2297C18.2893 13.4309 18.1533 13.6029 17.9787 13.7237C17.8041 13.8446 17.599 13.9089 17.3892 13.9085Z" fill="#363BC4"></path><path d="M12.4868 19C12.2058 19 11.9361 18.8845 11.7368 18.6788L10.1055 16.9803C10.0059 16.8791 9.92682 16.7583 9.87282 16.6249C9.81883 16.4915 9.79102 16.3483 9.79102 16.2037C9.79102 16.059 9.81883 15.9158 9.87282 15.7824C9.92682 15.6491 10.0059 15.5282 10.1055 15.427C10.7399 14.7767 11.5954 14.4121 12.4868 14.4121C13.3782 14.4121 14.2338 14.7767 14.8682 15.427C14.9677 15.5282 15.0468 15.6491 15.1008 15.7824C15.1548 15.9158 15.1826 16.059 15.1826 16.2037C15.1826 16.3483 15.1548 16.4915 15.1008 16.6249C15.0468 16.7583 14.9677 16.8791 14.8682 16.9803L13.2368 18.6788C13.0375 18.8845 12.7679 19 12.4868 19Z" fill="#363BC4"></path></svg>
      </div>
    </div>
    `;
  }
  if (RSSI > -60) {
    return `
    <div style="display: flex; gap: 5px;">
      ${Lcmp ? onOfBottom(Lcmp) :  ''}
      <div class="sc-ctDIWD bfhEVC">
        <svg width="12" height="19" viewBox="0 0 25 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.9277 7.11941C23.7885 7.11991 23.6505 7.09178 23.5218 7.03665C23.3931 6.98152 23.2761 6.90048 23.1777 6.79819C21.7738 5.34027 20.1071 4.18378 18.2728 3.39475C16.4385 2.60573 14.4725 2.19962 12.487 2.19962C10.5016 2.19962 8.53558 2.60573 6.70127 3.39475C4.86696 4.18378 3.20027 5.34027 1.79637 6.79819C1.59685 6.99889 1.32941 7.11018 1.05165 7.10809C0.773881 7.106 0.508021 6.9907 0.311329 6.78702C0.114637 6.58334 0.00285237 6.30759 5.38334e-05 6.01915C-0.0027447 5.73072 0.103666 5.45268 0.296366 5.24493C1.89707 3.58212 3.79756 2.26307 5.88926 1.36314C7.98097 0.463198 10.2229 0 12.487 0C14.7512 0 16.9931 0.463198 19.0848 1.36314C21.1765 2.26307 23.077 3.58212 24.6777 5.24493C24.8248 5.39901 24.9247 5.59481 24.9649 5.80771C25.0051 6.02061 24.9838 6.2411 24.9036 6.44144C24.8235 6.64179 24.6881 6.81305 24.5144 6.93368C24.3408 7.05431 24.1366 7.11893 23.9277 7.11941Z" fill="#E6E1E1"></path><path d="M4.31284 10.5161C4.10341 10.5156 3.89882 10.4507 3.72492 10.3295C3.55101 10.2083 3.4156 10.0363 3.33579 9.83528C3.25598 9.63421 3.23536 9.41309 3.27653 9.19985C3.31769 8.98661 3.4188 8.79083 3.56708 8.63724C5.93272 6.18079 9.14114 4.80078 12.4866 4.80078C15.832 4.80078 19.0404 6.18079 21.4061 8.63724C21.605 8.84438 21.7165 9.1251 21.7161 9.41763C21.7157 9.71016 21.6034 9.99055 21.4039 10.1971C21.2045 10.4037 20.9341 10.5195 20.6524 10.5191C20.3707 10.5187 20.1007 10.4021 19.9018 10.1949C17.934 8.15494 15.2671 7.0092 12.4866 7.0092C9.70604 7.0092 7.03913 8.15494 5.07132 10.1949C4.8694 10.402 4.59664 10.5175 4.31284 10.5161Z" fill="#E6E1E1"></path><path d="M17.3892 13.9085C17.2499 13.909 17.112 13.8809 16.9833 13.8257C16.8545 13.7706 16.7376 13.6896 16.6392 13.5873C15.5378 12.4437 14.0441 11.8012 12.4866 11.8012C10.9292 11.8012 9.43546 12.4437 8.3341 13.5873C8.13519 13.7938 7.8654 13.9099 7.5841 13.9099C7.30279 13.9099 7.03301 13.7938 6.8341 13.5873C6.63519 13.3807 6.52344 13.1006 6.52344 12.8084C6.52344 12.5163 6.63519 12.2362 6.8341 12.0296C8.33513 10.4765 10.3677 9.60449 12.4866 9.60449C14.6056 9.60449 16.6381 10.4765 18.1392 12.0296C18.2877 12.1835 18.3889 12.3797 18.4299 12.5933C18.471 12.8069 18.45 13.0284 18.3697 13.2297C18.2893 13.4309 18.1533 13.6029 17.9787 13.7237C17.8041 13.8446 17.599 13.9089 17.3892 13.9085Z" fill="#363BC4"></path><path d="M12.4868 19C12.2058 19 11.9361 18.8845 11.7368 18.6788L10.1055 16.9803C10.0059 16.8791 9.92682 16.7583 9.87282 16.6249C9.81883 16.4915 9.79102 16.3483 9.79102 16.2037C9.79102 16.059 9.81883 15.9158 9.87282 15.7824C9.92682 15.6491 10.0059 15.5282 10.1055 15.427C10.7399 14.7767 11.5954 14.4121 12.4868 14.4121C13.3782 14.4121 14.2338 14.7767 14.8682 15.427C14.9677 15.5282 15.0468 15.6491 15.1008 15.7824C15.1548 15.9158 15.1826 16.059 15.1826 16.2037C15.1826 16.3483 15.1548 16.4915 15.1008 16.6249C15.0468 16.7583 14.9677 16.8791 14.8682 16.9803L13.2368 18.6788C13.0375 18.8845 12.7679 19 12.4868 19Z" fill="#363BC4"></path></svg>
      </div>
    </div>  
    `
  }
  if (RSSI > -70) {
    return `
  <div style="display: flex; gap: 5px;">
    ${Lcmp ? onOfBottom(Lcmp) :  ''}
    <div class="sc-ctDIWD bfhEVC">
      <svg width="12" height="19" viewBox="0 0 25 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.9277 7.11941C23.7885 7.11991 23.6505 7.09178 23.5218 7.03665C23.3931 6.98152 23.2761 6.90048 23.1777 6.79819C21.7738 5.34027 20.1071 4.18378 18.2728 3.39475C16.4385 2.60573 14.4725 2.19962 12.487 2.19962C10.5016 2.19962 8.53558 2.60573 6.70127 3.39475C4.86696 4.18378 3.20027 5.34027 1.79637 6.79819C1.59685 6.99889 1.32941 7.11018 1.05165 7.10809C0.773881 7.106 0.508021 6.9907 0.311329 6.78702C0.114637 6.58334 0.00285237 6.30759 5.38334e-05 6.01915C-0.0027447 5.73072 0.103666 5.45268 0.296366 5.24493C1.89707 3.58212 3.79756 2.26307 5.88926 1.36314C7.98097 0.463198 10.2229 0 12.487 0C14.7512 0 16.9931 0.463198 19.0848 1.36314C21.1765 2.26307 23.077 3.58212 24.6777 5.24493C24.8248 5.39901 24.9247 5.59481 24.9649 5.80771C25.0051 6.02061 24.9838 6.2411 24.9036 6.44144C24.8235 6.64179 24.6881 6.81305 24.5144 6.93368C24.3408 7.05431 24.1366 7.11893 23.9277 7.11941Z" fill="#E6E1E1"></path><path d="M4.31284 10.5161C4.10341 10.5156 3.89882 10.4507 3.72492 10.3295C3.55101 10.2083 3.4156 10.0363 3.33579 9.83528C3.25598 9.63421 3.23536 9.41309 3.27653 9.19985C3.31769 8.98661 3.4188 8.79083 3.56708 8.63724C5.93272 6.18079 9.14114 4.80078 12.4866 4.80078C15.832 4.80078 19.0404 6.18079 21.4061 8.63724C21.605 8.84438 21.7165 9.1251 21.7161 9.41763C21.7157 9.71016 21.6034 9.99055 21.4039 10.1971C21.2045 10.4037 20.9341 10.5195 20.6524 10.5191C20.3707 10.5187 20.1007 10.4021 19.9018 10.1949C17.934 8.15494 15.2671 7.0092 12.4866 7.0092C9.70604 7.0092 7.03913 8.15494 5.07132 10.1949C4.8694 10.402 4.59664 10.5175 4.31284 10.5161Z" fill="#E6E1E1"></path><path d="M17.3892 13.9085C17.2499 13.909 17.112 13.8809 16.9833 13.8257C16.8545 13.7706 16.7376 13.6896 16.6392 13.5873C15.5378 12.4437 14.0441 11.8012 12.4866 11.8012C10.9292 11.8012 9.43546 12.4437 8.3341 13.5873C8.13519 13.7938 7.8654 13.9099 7.5841 13.9099C7.30279 13.9099 7.03301 13.7938 6.8341 13.5873C6.63519 13.3807 6.52344 13.1006 6.52344 12.8084C6.52344 12.5163 6.63519 12.2362 6.8341 12.0296C8.33513 10.4765 10.3677 9.60449 12.4866 9.60449C14.6056 9.60449 16.6381 10.4765 18.1392 12.0296C18.2877 12.1835 18.3889 12.3797 18.4299 12.5933C18.471 12.8069 18.45 13.0284 18.3697 13.2297C18.2893 13.4309 18.1533 13.6029 17.9787 13.7237C17.8041 13.8446 17.599 13.9089 17.3892 13.9085Z" fill="#E6E1E1"></path><path d="M12.4868 19C12.2058 19 11.9361 18.8845 11.7368 18.6788L10.1055 16.9803C10.0059 16.8791 9.92682 16.7583 9.87282 16.6249C9.81883 16.4915 9.79102 16.3483 9.79102 16.2037C9.79102 16.059 9.81883 15.9158 9.87282 15.7824C9.92682 15.6491 10.0059 15.5282 10.1055 15.427C10.7399 14.7767 11.5954 14.4121 12.4868 14.4121C13.3782 14.4121 14.2338 14.7767 14.8682 15.427C14.9677 15.5282 15.0468 15.6491 15.1008 15.7824C15.1548 15.9158 15.1826 16.059 15.1826 16.2037C15.1826 16.3483 15.1548 16.4915 15.1008 16.6249C15.0468 16.7583 14.9677 16.8791 14.8682 16.9803L13.2368 18.6788C13.0375 18.8845 12.7679 19 12.4868 19Z" fill="#363BC4"></path></svg>
    </div>
  </div>
  `
  }
  return `
    <div style="display: flex; gap: 5px;">
      ${onOfBottom(Lcmp)}
      <div class="sc-ctDIWD bfhEVC">
        <svg width="12" height="19" viewBox="0 0 25 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.9277 7.11941C23.7885 7.11991 23.6505 7.09178 23.5218 7.03665C23.3931 6.98152 23.2761 6.90048 23.1777 6.79819C21.7738 5.34027 20.1071 4.18378 18.2728 3.39475C16.4385 2.60573 14.4725 2.19962 12.487 2.19962C10.5016 2.19962 8.53558 2.60573 6.70127 3.39475C4.86696 4.18378 3.20027 5.34027 1.79637 6.79819C1.59685 6.99889 1.32941 7.11018 1.05165 7.10809C0.773881 7.106 0.508021 6.9907 0.311329 6.78702C0.114637 6.58334 0.00285237 6.30759 5.38334e-05 6.01915C-0.0027447 5.73072 0.103666 5.45268 0.296366 5.24493C1.89707 3.58212 3.79756 2.26307 5.88926 1.36314C7.98097 0.463198 10.2229 0 12.487 0C14.7512 0 16.9931 0.463198 19.0848 1.36314C21.1765 2.26307 23.077 3.58212 24.6777 5.24493C24.8248 5.39901 24.9247 5.59481 24.9649 5.80771C25.0051 6.02061 24.9838 6.2411 24.9036 6.44144C24.8235 6.64179 24.6881 6.81305 24.5144 6.93368C24.3408 7.05431 24.1366 7.11893 23.9277 7.11941Z" fill="#E6E1E1"></path><path d="M4.31284 10.5161C4.10341 10.5156 3.89882 10.4507 3.72492 10.3295C3.55101 10.2083 3.4156 10.0363 3.33579 9.83528C3.25598 9.63421 3.23536 9.41309 3.27653 9.19985C3.31769 8.98661 3.4188 8.79083 3.56708 8.63724C5.93272 6.18079 9.14114 4.80078 12.4866 4.80078C15.832 4.80078 19.0404 6.18079 21.4061 8.63724C21.605 8.84438 21.7165 9.1251 21.7161 9.41763C21.7157 9.71016 21.6034 9.99055 21.4039 10.1971C21.2045 10.4037 20.9341 10.5195 20.6524 10.5191C20.3707 10.5187 20.1007 10.4021 19.9018 10.1949C17.934 8.15494 15.2671 7.0092 12.4866 7.0092C9.70604 7.0092 7.03913 8.15494 5.07132 10.1949C4.8694 10.402 4.59664 10.5175 4.31284 10.5161Z" fill="#E6E1E1"></path><path d="M17.3892 13.9085C17.2499 13.909 17.112 13.8809 16.9833 13.8257C16.8545 13.7706 16.7376 13.6896 16.6392 13.5873C15.5378 12.4437 14.0441 11.8012 12.4866 11.8012C10.9292 11.8012 9.43546 12.4437 8.3341 13.5873C8.13519 13.7938 7.8654 13.9099 7.5841 13.9099C7.30279 13.9099 7.03301 13.7938 6.8341 13.5873C6.63519 13.3807 6.52344 13.1006 6.52344 12.8084C6.52344 12.5163 6.63519 12.2362 6.8341 12.0296C8.33513 10.4765 10.3677 9.60449 12.4866 9.60449C14.6056 9.60449 16.6381 10.4765 18.1392 12.0296C18.2877 12.1835 18.3889 12.3797 18.4299 12.5933C18.471 12.8069 18.45 13.0284 18.3697 13.2297C18.2893 13.4309 18.1533 13.6029 17.9787 13.7237C17.8041 13.8446 17.599 13.9089 17.3892 13.9085Z" fill="#363BC4"></path><path d="M12.4868 19C12.2058 19 11.9361 18.8845 11.7368 18.6788L10.1055 16.9803C10.0059 16.8791 9.92682 16.7583 9.87282 16.6249C9.81883 16.4915 9.79102 16.3483 9.79102 16.2037C9.79102 16.059 9.81883 15.9158 9.87282 15.7824C9.92682 15.6491 10.0059 15.5282 10.1055 15.427C10.7399 14.7767 11.5954 14.4121 12.4868 14.4121C13.3782 14.4121 14.2338 14.7767 14.8682 15.427C14.9677 15.5282 15.0468 15.6491 15.1008 15.7824C15.1548 15.9158 15.1826 16.059 15.1826 16.2037C15.1826 16.3483 15.1548 16.4915 15.1008 16.6249C15.0468 16.7583 14.9677 16.8791 14.8682 16.9803L13.2368 18.6788C13.0375 18.8845 12.7679 19 12.4868 19Z" fill="#363BC4"></path></svg>
      </div>
    </div>
  `;
}

function svgWifi(status: string, RSSI: number, Lcmp: number) {
  if (status === 'OFFLINE' || !status) {
    return `
    <div class="icon">
      <svg
        width="12"
        height="19"
        viewBox="0 0 25 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M23.9277 7.11941C23.7885 7.11991 23.6505 7.09178 23.5218 7.03665C23.3931 6.98152 23.2761 6.90048 23.1777 6.79819C21.7738 5.34027 20.1071 4.18378 18.2728 3.39475C16.4385 2.60573 14.4725 2.19962 12.487 2.19962C10.5016 2.19962 8.53558 2.60573 6.70127 3.39475C4.86696 4.18378 3.20027 5.34027 1.79637 6.79819C1.59685 6.99889 1.32941 7.11018 1.05165 7.10809C0.773881 7.106 0.508021 6.9907 0.311329 6.78702C0.114637 6.58334 0.00285237 6.30759 5.38334e-05 6.01915C-0.0027447 5.73072 0.103666 5.45268 0.296366 5.24493C1.89707 3.58212 3.79756 2.26307 5.88926 1.36314C7.98097 0.463198 10.2229 0 12.487 0C14.7512 0 16.9931 0.463198 19.0848 1.36314C21.1765 2.26307 23.077 3.58212 24.6777 5.24493C24.8248 5.39901 24.9247 5.59481 24.9649 5.80771C25.0051 6.02061 24.9838 6.2411 24.9036 6.44144C24.8235 6.64179 24.6881 6.81305 24.5144 6.93368C24.3408 7.05431 24.1366 7.11893 23.9277 7.11941Z"
          fill="#E6E1E1"
        ></path>
        <path
          d="M4.31284 10.5161C4.10341 10.5156 3.89882 10.4507 3.72492 10.3295C3.55101 10.2083 3.4156 10.0363 3.33579 9.83528C3.25598 9.63421 3.23536 9.41309 3.27653 9.19985C3.31769 8.98661 3.4188 8.79083 3.56708 8.63724C5.93272 6.18079 9.14114 4.80078 12.4866 4.80078C15.832 4.80078 19.0404 6.18079 21.4061 8.63724C21.605 8.84438 21.7165 9.1251 21.7161 9.41763C21.7157 9.71016 21.6034 9.99055 21.4039 10.1971C21.2045 10.4037 20.9341 10.5195 20.6524 10.5191C20.3707 10.5187 20.1007 10.4021 19.9018 10.1949C17.934 8.15494 15.2671 7.0092 12.4866 7.0092C9.70604 7.0092 7.03913 8.15494 5.07132 10.1949C4.8694 10.402 4.59664 10.5175 4.31284 10.5161Z"
          fill="#E6E1E1"
        ></path>
        <path
          d="M17.3892 13.9085C17.2499 13.909 17.112 13.8809 16.9833 13.8257C16.8545 13.7706 16.7376 13.6896 16.6392 13.5873C15.5378 12.4437 14.0441 11.8012 12.4866 11.8012C10.9292 11.8012 9.43546 12.4437 8.3341 13.5873C8.13519 13.7938 7.8654 13.9099 7.5841 13.9099C7.30279 13.9099 7.03301 13.7938 6.8341 13.5873C6.63519 13.3807 6.52344 13.1006 6.52344 12.8084C6.52344 12.5163 6.63519 12.2362 6.8341 12.0296C8.33513 10.4765 10.3677 9.60449 12.4866 9.60449C14.6056 9.60449 16.6381 10.4765 18.1392 12.0296C18.2877 12.1835 18.3889 12.3797 18.4299 12.5933C18.471 12.8069 18.45 13.0284 18.3697 13.2297C18.2893 13.4309 18.1533 13.6029 17.9787 13.7237C17.8041 13.8446 17.599 13.9089 17.3892 13.9085Z"
          fill="#E6E1E1"
        ></path>
        <path
          d="M12.4868 19C12.2058 19 11.9361 18.8845 11.7368 18.6788L10.1055 16.9803C10.0059 16.8791 9.92682 16.7583 9.87282 16.6249C9.81883 16.4915 9.79102 16.3483 9.79102 16.2037C9.79102 16.059 9.81883 15.9158 9.87282 15.7824C9.92682 15.6491 10.0059 15.5282 10.1055 15.427C10.7399 14.7767 11.5954 14.4121 12.4868 14.4121C13.3782 14.4121 14.2338 14.7767 14.8682 15.427C14.9677 15.5282 15.0468 15.6491 15.1008 15.7824C15.1548 15.9158 15.1826 16.059 15.1826 16.2037C15.1826 16.3483 15.1548 16.4915 15.1008 16.6249C15.0468 16.7583 14.9677 16.8791 14.8682 16.9803L13.2368 18.6788C13.0375 18.8845 12.7679 19 12.4868 19Z"
          fill="#E6E1E1"
        ></path>
        <path
          d="M25 14C25 16.7614 22.7614 19 20 19C17.2386 19 15 16.7614 15 14C15 11.2386 17.2386 9 20 9C22.7614 9 25 11.2386 25 14Z"
          fill="#8B8B8B"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M17.5048 11.5048C17.7782 11.2315 18.2214 11.2315 18.4948 11.5048L22.4948 15.5048C22.7681 15.7782 22.7681 16.2214 22.4948 16.4948C22.2214 16.7681 21.7782 16.7681 21.5048 16.4948L17.5048 12.4948C17.2315 12.2214 17.2315 11.7782 17.5048 11.5048Z"
          fill="white"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M22.4952 11.5048C22.7685 11.7782 22.7685 12.2214 22.4952 12.4948L18.4952 16.4948C18.2218 16.7681 17.7786 16.7681 17.5052 16.4948C17.2319 16.2214 17.2319 15.7782 17.5052 15.5048L21.5052 11.5048C21.7786 11.2315 22.2218 11.2315 22.4952 11.5048Z"
          fill="white"
        ></path>
      </svg>
    </div>
  `;
  }
  if (RSSI != null && RSSI < 0 && status === 'ONLINE') {
   return statusOnlineWifi(status, RSSI, Lcmp);
  }
  return `
    <div class="icon">
    </div>
  `;
}

function verifyAutomToCss(autom: string, group: GroupItem, dats: DatItem[]) {
  const automCount = autom ? 1 : 0;
  const dacs = group.dacs.length;
  const total = dacs + dats.length + automCount;
  return `
  width: ${total * 150}px;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: ${total > 1 ? '1' : '2'};
  overflow: hidden;
  -webkit-box-orient: vertical;
  `;
}

function healthAreaColor(health: number, tam: boolean) {
  return `
  <div
    class="healthArea"
    style="
      width: 100%;
      justify-content: center;
      display: flex;
      margin: ${tam ? '10px 0px 10px 0px;' : '18px 0px 10px 0px;'};
    "
  >
    <div
      style="
        background-color: ${returnColorOfMachine(health)};
        padding: 3px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
      "
    >
      ${getSvgHealthIcon(health)}
    </div>
  </div>
  `;
}

function getSvgHealthIcon(health: number) {
  switch (health) {
    case 25: return `
    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="UrgentMaintenance">
      <path
        d="M19.795 4.32335C19.6931 3.91608 19.1855 3.77433 18.8888 4.07121L16.4794 6.48071C15.9443 7.01554 15.0769 7.01554 14.5419 6.48071L13.4364 5.37518C12.9014 4.84019 12.9014 3.97281 13.4364 3.43773L15.8166 1.05755C16.1154 0.758708 15.97 0.246207 15.5587 0.149891C14.9954 0.0182788 14.4001 -0.0303087 13.7862 0.0186878C11.1473 0.229234 8.71853 2.70364 8.55429 5.3459C8.49208 6.34804 8.69457 7.29541 9.08912 8.13461L0.666045 15.3729C0.287201 15.6984 0.0223238 16.001 0.00134277 16.5C-0.0198836 16.999 0.204667 17.6497 0.554637 18.006L1.98208 19.4596C2.33544 19.8196 2.82337 20.0153 3.3276 19.9991C3.83188 19.9827 4.30623 19.7563 4.63579 19.3745L11.9316 10.9214C12.7462 11.285 13.6579 11.4704 14.6206 11.4104C17.2807 11.2444 19.7556 8.79615 19.9493 6.13814C19.9951 5.50847 19.9387 4.89871 19.795 4.32335Z"
        fill="white"
      />
    </svg>`;
    case 50: return `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="IminentRisk">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.32 9.37H19.23C19.09 9.37 18.99 9.26 18.93 9.11C18.8943 9.05491 18.8753 8.99066 18.8753 8.925C18.8753 8.85934 18.8943 8.79509 18.93 8.74L19.74 8C19.8987 7.8473 20.0249 7.66401 20.1108 7.4612C20.1968 7.25839 20.2407 7.04027 20.24 6.82C20.2398 6.59839 20.1955 6.37905 20.1096 6.17474C20.0238 5.97043 19.8981 5.78526 19.74 5.63L18.4 4.26C18.2448 4.10368 18.0602 3.97962 17.8568 3.89497C17.6534 3.81031 17.4353 3.76672 17.215 3.76672C16.9947 3.76672 16.7766 3.81031 16.5732 3.89497C16.3698 3.97962 16.1852 4.10368 16.03 4.26L15.26 5C15.1988 5.0392 15.1277 5.06004 15.055 5.06004C14.9823 5.06004 14.9112 5.0392 14.85 5C14.7896 4.97748 14.7369 4.93827 14.6979 4.88692C14.659 4.83558 14.6354 4.77422 14.63 4.71V3.68C14.6302 3.24297 14.4601 2.82306 14.1557 2.50939C13.8514 2.19573 13.4368 2.01301 13 2H11.06C10.6135 1.99999 10.1852 2.17667 9.86851 2.49145C9.55186 2.80623 9.37264 3.23352 9.37 3.68V4.77C9.37 4.91 9.26 5.01 9.11 5.07C9.05491 5.10573 8.99066 5.12474 8.925 5.12474C8.85934 5.12474 8.79509 5.10573 8.74 5.07L8 4.26C7.68328 3.94517 7.25653 3.76586 6.81 3.76C6.58991 3.76043 6.37212 3.80489 6.16947 3.89076C5.96682 3.97663 5.7834 4.10217 5.63 4.26L4.26 5.6C4.09911 5.75571 3.97118 5.94219 3.88381 6.14834C3.79644 6.35449 3.75142 6.5761 3.75142 6.8C3.75142 7.0239 3.79644 7.24551 3.88381 7.45166C3.97118 7.65781 4.09911 7.84429 4.26 8L5 8.74C5.0392 8.80119 5.06004 8.87233 5.06004 8.945C5.06004 9.01767 5.0392 9.08881 5 9.15C4.97748 9.21038 4.93827 9.26313 4.88692 9.30208C4.83558 9.34103 4.77422 9.36458 4.71 9.37H3.68C3.23444 9.37 2.80712 9.547 2.49206 9.86206C2.177 10.1771 2 10.6044 2 11.05V12.94C1.99999 13.3865 2.17667 13.8148 2.49145 14.1315C2.80623 14.4481 3.23352 14.6274 3.68 14.63H4.77C4.91 14.63 5.01 14.74 5.07 14.89C5.10573 14.9451 5.12474 15.0093 5.12474 15.075C5.12474 15.1407 5.10573 15.2049 5.07 15.26L4.26 16C3.94517 16.3167 3.76586 16.7435 3.76 17.19C3.75966 17.4117 3.80372 17.6312 3.8896 17.8356C3.97547 18.04 4.10142 18.2251 4.26 18.38L5.6 19.74C5.75522 19.8963 5.93984 20.0204 6.14322 20.105C6.34659 20.1897 6.56471 20.2333 6.785 20.2333C7.00529 20.2333 7.22341 20.1897 7.42678 20.105C7.63016 20.0204 7.81478 19.8963 7.97 19.74L8.74 19C8.80119 18.9608 8.87233 18.94 8.945 18.94C9.01767 18.94 9.08881 18.9608 9.15 19C9.21038 19.0225 9.26313 19.0617 9.30208 19.1131C9.34103 19.1644 9.36458 19.2258 9.37 19.29V20.38C9.38555 20.8151 9.56939 21.2271 9.88278 21.5293C10.1962 21.8315 10.6146 22.0003 11.05 22H12.94C13.3865 22 13.8148 21.8233 14.1315 21.5086C14.4481 21.1938 14.6274 20.7665 14.63 20.32V19.23C14.63 19.09 14.74 18.99 14.89 18.93C14.9451 18.8943 15.0093 18.8753 15.075 18.8753C15.1407 18.8753 15.2049 18.8943 15.26 18.93L16.02 19.7C16.3367 20.0148 16.7635 20.1941 17.21 20.2C17.4301 20.1996 17.6479 20.1551 17.8505 20.0692C18.0532 19.9834 18.2366 19.8578 18.39 19.7L19.73 18.36C19.8863 18.2048 20.0104 18.0202 20.095 17.8168C20.1797 17.6134 20.2233 17.3953 20.2233 17.175C20.2233 16.9547 20.1797 16.7366 20.095 16.5332C20.0104 16.3298 19.8863 16.1452 19.73 15.99L19 15.26C18.9643 15.2049 18.9453 15.1407 18.9453 15.075C18.9453 15.0093 18.9643 14.9451 19 14.89C19.0225 14.8296 19.0617 14.7769 19.1131 14.7379C19.1644 14.699 19.2258 14.6754 19.29 14.67H20.38C20.8134 14.6545 21.2239 14.4721 21.5259 14.1608C21.8278 13.8496 21.9977 13.4336 22 13V11.06C22 10.6135 21.8233 10.1852 21.5086 9.86851C21.1938 9.55186 20.7665 9.37264 20.32 9.37ZM11 16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16ZM11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V13C13 13.2652 12.8946 13.5196 12.7071 13.7071C12.5196 13.8946 12.2652 14 12 14C11.7348 14 11.4804 13.8946 11.2929 13.7071C11.1054 13.5196 11 13.2652 11 13V9C11 8.73478 11.1054 8.48043 11.2929 8.29289Z"
        fill="white"
      />
    </svg>
    `;
    case 75: return `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="OutOfSpecificationIcon">
      <path
        d="M22.5601 16.2999L14.8901 3.57994C14.58 3.09475 14.1527 2.69546 13.6476 2.41888C13.1425 2.14229 12.5759 1.99731 12.0001 1.99731C11.4243 1.99731 10.8577 2.14229 10.3526 2.41888C9.84755 2.69546 9.42024 3.09475 9.1101 3.57994L1.4401 16.2999C1.16915 16.7516 1.02189 17.2666 1.01311 17.7932C1.00434 18.3199 1.13436 18.8395 1.3901 19.2999C1.68578 19.8182 2.11376 20.2487 2.6303 20.5474C3.14684 20.846 3.73343 21.0022 4.3301 20.9999H19.6701C20.2629 21.0063 20.8468 20.8561 21.363 20.5647C21.8792 20.2732 22.3093 19.8508 22.6101 19.3399C22.8734 18.8747 23.0075 18.3476 22.9987 17.8131C22.9899 17.2787 22.8385 16.7563 22.5601 16.2999ZM12.0001 16.9999C11.8023 16.9999 11.609 16.9413 11.4445 16.8314C11.2801 16.7215 11.1519 16.5653 11.0762 16.3826C11.0005 16.1999 10.9807 15.9988 11.0193 15.8048C11.0579 15.6109 11.1531 15.4327 11.293 15.2928C11.4328 15.153 11.611 15.0577 11.805 15.0192C11.999 14.9806 12.2001 15.0004 12.3828 15.0761C12.5655 15.1517 12.7217 15.2799 12.8316 15.4444C12.9415 15.6088 13.0001 15.8022 13.0001 15.9999C13.0001 16.2652 12.8947 16.5195 12.7072 16.707C12.5197 16.8946 12.2653 16.9999 12.0001 16.9999ZM13.0001 12.9999C13.0001 13.2652 12.8947 13.5195 12.7072 13.707C12.5197 13.8946 12.2653 13.9999 12.0001 13.9999C11.7349 13.9999 11.4805 13.8946 11.293 13.707C11.1055 13.5195 11.0001 13.2652 11.0001 12.9999V8.99994C11.0001 8.73472 11.1055 8.48037 11.293 8.29283C11.4805 8.1053 11.7349 7.99994 12.0001 7.99994C12.2653 7.99994 12.5197 8.1053 12.7072 8.29283C12.8947 8.48037 13.0001 8.73472 13.0001 8.99994V12.9999Z"
        fill="white"
      />
    </svg>
    `;
    case 100: return `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="OperatingCorrectly">
      <path
        d="M12 2C10.0222 2 8.08879 2.58649 6.4443 3.6853C4.79981 4.78412 3.51809 6.3459 2.76121 8.17317C2.00433 10.0004 1.8063 12.0111 2.19215 13.9509C2.578 15.8907 3.53041 17.6725 4.92894 19.0711C6.32746 20.4696 8.10929 21.422 10.0491 21.8079C11.9889 22.1937 13.9996 21.9957 15.8268 21.2388C17.6541 20.4819 19.2159 19.2002 20.3147 17.5557C21.4135 15.9112 22 13.9778 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7363 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2ZM16.3 9.61L11.73 15.61C11.6368 15.731 11.5172 15.8291 11.3803 15.8967C11.2433 15.9643 11.0927 15.9996 10.94 16C10.7881 16.0008 10.638 15.967 10.5011 15.9012C10.3643 15.8353 10.2442 15.7392 10.15 15.62L7.71 12.51C7.62924 12.4063 7.5697 12.2876 7.53479 12.1609C7.49988 12.0341 7.49027 11.9017 7.50652 11.7713C7.52277 11.6408 7.56456 11.5148 7.6295 11.4005C7.69444 11.2862 7.78126 11.1858 7.885 11.105C8.09453 10.9419 8.36026 10.8687 8.62375 10.9015C8.75421 10.9178 8.8802 10.9596 8.99452 11.0245C9.10884 11.0894 9.20924 11.1763 9.29 11.28L10.92 13.36L14.7 8.36C14.7801 8.25494 14.8801 8.16669 14.9943 8.10029C15.1086 8.03388 15.2347 7.99062 15.3657 7.97298C15.4966 7.95534 15.6297 7.96365 15.7574 7.99746C15.8851 8.03126 16.0049 8.08989 16.11 8.17C16.2151 8.25011 16.3033 8.35012 16.3697 8.46433C16.4361 8.57855 16.4794 8.70472 16.497 8.83565C16.5147 8.96658 16.5063 9.0997 16.4725 9.22742C16.4387 9.35514 16.3801 9.47494 16.3 9.58V9.61Z"
        fill="white"
      />
    </svg>
    `;
    case 4: return `
    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="HealthDisabled">
      <path
        fill="white"
        d="M 9.8552859,0.00110613 C 15.42883,-0.08078487 19.936943,4.3956999 19.999334,9.87673 20.062864,15.459362 15.572476,19.950667 10.10103,19.999589 4.5633609,20.049079 0.0984989,15.620594 0.0016489,10.191324 -0.0988181,4.5637402 4.4056059,0.06938643 9.8552859,0.00110613 Z M 3.8871069,5.6895266 c -1.806848,2.378203 -2.126967,6.5438534 0.702418,9.4902684 2.924888,3.04582 7.2295831,2.813969 9.7234621,0.935981 C 10.837977,12.640643 7.3619019,9.164446 3.8871069,5.6895266 Z M 16.11487,14.311242 C 18.079826,11.689347 18.18235,7.2363287 14.949254,4.3762017 11.933329,1.7081507 7.8874229,2.1934061 5.6932439,3.8896714 9.1666229,7.363031 12.641349,10.837669 16.11487,14.311242 Z"
      />
    </svg>
    `;
    default: return `
    <svg width="10" height="10" viewBox="-2 -2 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="UnknownHealth">
      <path
        fill="white"
        d="m 9.9234938,16.303637 q 0,-2.042512 0.4960392,-3.25343 0.496037,-1.210917 1.809081,-2.378067 1.327634,-1.1817393 1.765314,-1.9112087 0.437682,-0.7440579 0.437682,-1.5610627 0,-2.465604 -2.275943,-2.465604 -1.079613,0 -1.736134,0.6711109 Q 9.7775998,6.0618981 9.7484198,7.2290479 H 5.5175024 Q 5.5466843,4.4424768 7.3119955,2.8668246 9.091899,1.2911723 12.155667,1.2911723 q 3.092948,0 4.799904,1.5027053 1.706957,1.488117 1.706957,4.2163295 0,1.2400968 -0.554396,2.3488894 -0.554397,1.0942025 -1.940386,2.4364245 l -1.18174,1.123382 q -1.108792,1.065024 -1.269276,2.494782 l -0.05836,0.889952 z m -0.423092,4.478938 q 0,-0.977489 0.6565212,-1.604832 0.671112,-0.641931 1.706956,-0.641931 1.035846,0 1.692369,0.641931 0.671111,0.627343 0.671111,1.604832 0,0.962898 -0.656521,1.590242 -0.641934,0.627342 -1.706959,0.627342 -1.065023,0 -1.721544,-0.627342 -0.6419332,-0.627344 -0.6419332,-1.590242 z"
      />
    </svg>
    `;
  }
}

function infoArea(item: DacItem, permission: boolean) {
  return `
  <div
    class="infoArea"
    style="display: flex; flex-direction: column;
    "
  >
    <strong 
      style="
        font-size: 10px;
        width: 133.87px;
        text-overflow: ellipsis;
        word-wrap: unset;
        white-space: nowrap;
        overflow: hidden;
      "
    >
      ${item.DAC_NAME}
    </strong>
    <strong style="color: #6d6d6d; font-size: 8px; margin: 2px 0px;">
      ${permission ? item.DAC_ID : ''}
    </strong>
    ${
      (permission && item.DAT_ID) ?
    `<strong style="color: #6d6d6d; font-size: 8px; margin: 4px 0px;">
      ${item.DAT_ID}
    </strong>` : '<div style="height: 8px; padding: 4px 0px;"></div>'
    }
  </div>
  `;
}

function meanUse(meanUse: string, language: string) {
  return `
  <div class="useArea">
    <strong style="font-size: 8px;">${t('usoMedio', language)}: </strong>
    <span style="font-size: 8px;">${`${meanUse || '00:00'}h`}</span>
  </div>
  `;
}

function onOfBottom(Lcmp?: number) {
  return `
  <div
    style="
      display: flex;
      border: 1px solid ${Lcmp === 1? 'green' : 'red'};
      border-radius: 5px;
      align-items: center;
      box-sizing: border-box;
      padding: 0px 15px;
      color: ${Lcmp === 1? 'green' : 'red'};
    "
  >
    <span style="font-size: 10px;">${['DESLIGADO', 'LIGADO'][Lcmp]}</span>
  </div>
  `;
}