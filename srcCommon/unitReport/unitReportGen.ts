import { consumptionColorArray, rgbBezierInterpolation } from './consGrad'
import * as fs from 'fs'
import * as path from 'path'
import servconfig from '../../configfile';
import { t } from '../../srcCommon/helpers/i18nextradution' 

const levelsColors: {[k:string]:string} = {
  '0': '#ABB0B4',
  '1': '#DC0E01',
  '2': '#FF5C00',
  '3': '#FDB400',
  '4': '#58CC00',
  'disab': '#555555',
}

export function unitReportGen2 (unit: {
  CLIENT_NAME: string
  PERIOD: string
  CITY_STATE: string
  UNIT_NAME: string
  NUMDEVS: string
  CONSUMO_GREENANT: number
  TARIFA_KWH: number
  daysList: string[]
  duts: {
    ROOM_NAME: string
    DEV_ID: string
    RTYPE_NAME: string
    T_RANGE: string
    T_LEVEL: string
    T_MED: string
    T_MAX: string
    T_MIN: string
  }[]
  dacs: {
    MACHINE_NAME: string
    DAC_ID: string
    MACHINE_KW: number
    HLEVEL: string
    LEVEL_DESC: string
    LAUDO: string
    POSS_CAUSES: string
    DAC_NAME: string
    CONSUMO_KWH: number
    USAGE_HISTORY: { hoursOnText: string, hoursOnPerc: string }[]
  }[]
}, idioma: string, emailBodyFull?: string) {
  emailBodyFull = emailBodyFull || fs.readFileSync(path.resolve('./assets/RelatorioUnidade.html'), 'utf-8')
  const [
    bp_head,
    bp_ambStart,
    bp_ambRow,
    bp_ambEnd,
    bp_machineStart,
    bp_dacRow,
    bp_machineEnd,
    bp_enrgStart,
    bp_enrgHeadDay,
    bp_enrgHeadEnd,
    bp_enrgRowStart,
    bp_enrgRowDay,
    bp_enrgRowEnd,
    bp_enrgEnd,
    bp_end,
  ] = emailBodyFull.split('<!-- SPLIT -->');
  let reportBody = bp_head
    .replace('#RELATORIO_MONITORAMENTO#', t('relatorioMonitoramento', idioma))
    .replace('#CLIENTE#', t('cliente', idioma))
    .replace('#UNIDADE#', t('unidade', idioma))
    .replace('#PERIODO#', t('periodo', idioma))
    .replace('#NUM_DE_MONITORES#', t('numDeMonitores', idioma))
    .replace('#LOCALIZACAO#', t('localizacao', idioma))
    .replace('$CLIENT_NAME$', unit.CLIENT_NAME)
    .replace('$PERIOD$', unit.PERIOD)
    .replace('$CITY_STATE$', unit.CITY_STATE)
    .replace('$UNIT_NAME$', unit.UNIT_NAME)
    .replace('$NUMDEVS$', unit.NUMDEVS || '0');

  let ambStart = bp_ambStart
    .replace("#AMBIENTES#", t('ambientes', idioma))
    .replace("#AMBIENTE#", t('ambiente', idioma))
    .replace("#TIPO_DE_AMBIENTE#", t('tipoAmbiente', idioma))
    .replace("#LIMITES#", t('limites', idioma))
    .replace("#MEDIAS#", t('medias', idioma))
    .replace("#MINIMA#", t('minima', idioma))
    .replace("#MAXIMA#", t('maxima', idioma))


  if (unit.duts && unit.duts.length) {
    reportBody += ambStart;
    for (const dut of unit.duts) {
      reportBody += bp_ambRow
        .replace('$ROOM_NAME$', dut.ROOM_NAME || '-')
        .replace('$DUT_ID$', dut.DEV_ID)
        .replace('$RTYPE_NAME$', dut.RTYPE_NAME || '-')
        .replace('$T_RANGE$', dut.T_RANGE)
        .replace('$T_LEVEL$', dut.T_LEVEL)
        .replace('$T_MED$', dut.T_MED)
        .replace('$T_MAX$', dut.T_MAX)
        .replace('$T_MIN$', dut.T_MIN);
    }
    reportBody += bp_ambEnd;
  }

  if (unit.dacs && unit.dacs.length > 0) {
    reportBody += bp_machineStart
      .replace('#MAQUINAS#', t('maquinas', idioma))
      .replace('#MAQUINA#', t('maquina', idioma))
      .replace('#DISPOSITIVO#', t('dispositivo', idioma))
      .replace('#SAUDE#', t('saude', idioma))
      .replace('#POSSIVEIS_CAUSAS#', t('possiveisCausas', idioma))
      .replace('#TAG_DA_MAQUINA#', t('tagDaMaquina', idioma))

    let skippedGreen = 0;
    let skippedGrey = 0;
    for (const dac of unit.dacs) {
      if (!['1', '2', '3'].includes(String(dac.HLEVEL))) {
        if (String(dac.HLEVEL) === '4') {
          skippedGreen += 1;
        } else {
          skippedGrey += 1;
        }
        continue;
      }
      const HLEVEL_COLOR = levelsColors[String(dac.HLEVEL)] || '#181842';
      const DAC_LINK = servconfig.dacRealtimePath.replace('$DACID$', dac.DAC_ID);
  
      reportBody += bp_dacRow
        .replace('$GROUP_NAME$', dac.MACHINE_NAME)
        .replace('$DAC_ID$', dac.DAC_ID)
        .replace('$DAC_LINK$', DAC_LINK)
        .replace('$HLEVEL$', dac.HLEVEL)
        .replace('$HLEVEL_COLOR$', HLEVEL_COLOR)
        .replace('$LEVEL_DESC$', dac.LEVEL_DESC)
        .replace('$POSS_CAUSES$', [dac.LAUDO, dac.POSS_CAUSES].filter(x => !!x).join(': <br> ') || '&nbsp;')
        .replace('$DAC_NAME$', dac.DAC_NAME);
    }

    let missingsTags;
    {
      let missingsNote = '';
      if (skippedGreen > 0) {
        if (missingsNote.length > 0) missingsNote += ' e ';
        missingsNote += `${skippedGreen} ${t('maquina', idioma)}${(skippedGreen === 1) ? '' : 's'} ${t('operandoCorretamente', idioma)}`;
      }
      if (skippedGrey > 0) {
        if (missingsNote.length > 0) missingsNote += ' e ';
        missingsNote += `${skippedGrey} ${t('maquina', idioma)}${(skippedGrey === 1) ? '' : 's'} ${t('semInformações', idioma)}`;
      }
      if ((skippedGreen + skippedGrey) > 0) {
        if ((skippedGreen + skippedGrey) === 1) missingsNote += ` ${t('naoFoiIncluidaNestaLista', idioma)}.`;
        else missingsNote += ` ${t('naoForamIncluidasNestaLista', idioma)}.`;
      }
      if (missingsNote.length > 0) missingsNote = `<div style="margin-top: 7px; font-size: 80%;">* ${missingsNote}</div>`;

      const MISSINGMACHINES_TEXT_GREEN = `<b>${skippedGreen} ${t('maquina', idioma)}${(skippedGreen === 1) ? '' : 's'}</b> ${t('operandoCorretamente', idioma)}`;
      const MISSINGMACHINES_TEXT_GREY = `<b>${skippedGrey} ${t('maquina', idioma)}${(skippedGrey === 1) ? '' : 's'}</b> ${t('semInformacoes', idioma)}`;
      const MISSINGMACHINES_TEXT_TITLE = `<b>${t('nao', idioma)} ${((skippedGreen + skippedGrey) === 1) ? t('está incluso', idioma) : t('estão inclusos', idioma)} ${t('nesta listagem', idioma)}:</b>`;

      const MISSINGMACHINES_STYLE_WRAP = ((skippedGreen + skippedGrey) === 0) ? ' display: none; ' : '';
      const MISSINGMACHINES_STYLE_GREEN = (skippedGreen === 0) ? ' display: none; ' : '';
      const MISSINGMACHINES_STYLE_GREY = (skippedGrey === 0) ? ' display: none; ' : '';

      missingsTags = {
        MISSINGMACHINES_STYLE_WRAP,
        MISSINGMACHINES_TEXT_TITLE,
        MISSINGMACHINES_STYLE_GREEN,
        MISSINGMACHINES_TEXT_GREEN,
        MISSINGMACHINES_STYLE_GREY,
        MISSINGMACHINES_TEXT_GREY,
        MISSING_MACHINES_NOTE: missingsNote,
      };
    }

    reportBody += bp_machineEnd
      .replace('$MISSINGMACHINES_STYLE_WRAP$', missingsTags.MISSINGMACHINES_STYLE_WRAP || '')
      .replace('$MISSINGMACHINES_TEXT_TITLE$', missingsTags.MISSINGMACHINES_TEXT_TITLE || '')
      .replace('$MISSINGMACHINES_STYLE_GREEN$', missingsTags.MISSINGMACHINES_STYLE_GREEN || '')
      .replace('$MISSINGMACHINES_TEXT_GREEN$', missingsTags.MISSINGMACHINES_TEXT_GREEN || '')
      .replace('$MISSINGMACHINES_STYLE_GREY$', missingsTags.MISSINGMACHINES_STYLE_GREY || '')
      .replace('$MISSINGMACHINES_TEXT_GREY$', missingsTags.MISSINGMACHINES_TEXT_GREY || '')
      .replace('$MISSING_MACHINES_NOTE$', missingsTags.MISSING_MACHINES_NOTE || '');

    const sortedDacs = unit.dacs.sort(compareConsumption);
    const gradColorArray = consumptionColorArray();
    reportBody += bp_enrgStart
      .replace('#ANALISE_ENERGETICA#', t('analiseEnergetica', idioma))
      .replace('#POTENCIA#', t('potencia', idioma))
      .replace('#CONSUMO#', t('consumo', idioma))
      .replace('#MAQUINA#', t('maquina', idioma));

    for (const day of unit.daysList) {
      reportBody += bp_enrgHeadDay.replace('$DIA$', day);
    }
    reportBody += bp_enrgHeadEnd
      .replace('#CONSUMO#', t('consumo', idioma))
  
    let maxCons = null;
    let minCons = null;
    for (const dac of sortedDacs) {
      if (dac.CONSUMO_KWH != null) {
        if (maxCons == null || dac.CONSUMO_KWH > maxCons) {
          maxCons = dac.CONSUMO_KWH;
        }
        if (minCons == null || dac.CONSUMO_KWH < minCons) {
          minCons = dac.CONSUMO_KWH;
        }
      }
    }
    const deltaCons = maxCons ? (maxCons - minCons) : 0;
  
    let consumoAcUnidade = 0;
    for (const dac of sortedDacs) {
      // logger.info('DBG 412', dac);
      const GRAD_COLOR = rgbBezierInterpolation(gradColorArray, (deltaCons && dac.CONSUMO_KWH) ? ((dac.CONSUMO_KWH - minCons) / deltaCons) : 0);
      reportBody += bp_enrgRowStart
        .replace('$GROUP_NAME$', dac.MACHINE_NAME)
        .replace('$POTENCIA$', (dac.MACHINE_KW || '-').toString());
      
        for (const dayUse of dac.USAGE_HISTORY) {
        reportBody += bp_enrgRowDay
          .replace('$DAY_HOURS$', dayUse.hoursOnText)
          .replace('$DAY_PERC$', dayUse.hoursOnPerc);
      }
      reportBody += bp_enrgRowEnd
        .replace('$GRAD_COLOR$', GRAD_COLOR)
        .replace('$CONSUMO_KWH$', (dac.CONSUMO_KWH || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
  
      consumoAcUnidade += (dac.CONSUMO_KWH || 0);
    }
  
    const linhaConsumo = `<div class="linha-consumo"><span class="titulo-consumo">$TITULO$:</span> <span class="dado-consumo">$VALOR$</span></div>`;
    let LINHAS_CONSUMO = '';
  
    LINHAS_CONSUMO += linhaConsumo
      .replace('$TITULO$', t('consumoComRefrigeracao', idioma))
      .replace('$VALOR$', `${consumoAcUnidade.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kWh`);
    if (unit.CONSUMO_GREENANT) {
      LINHAS_CONSUMO += linhaConsumo
        .replace('$TITULO$', t('consumoTotal', idioma))
        .replace('$VALOR$', `${unit.CONSUMO_GREENANT.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kWh`);
      }
    if (unit.TARIFA_KWH) {
      LINHAS_CONSUMO += linhaConsumo
        .replace('$TITULO$', `${t('faturaSemanal', idioma)} (R$) – ${t('refrigeracao', idioma)}`)
        .replace('$VALOR$', `R$ ${(consumoAcUnidade * unit.TARIFA_KWH).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`);
    }
    if (unit.TARIFA_KWH && unit.CONSUMO_GREENANT) {
      LINHAS_CONSUMO += linhaConsumo
        .replace('$TITULO$', `${t('faturaSemanal', idioma)} (R$) – ${t('total', idioma)}`)
        .replace('$VALOR$', `R$ ${(unit.CONSUMO_GREENANT * unit.TARIFA_KWH).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`);
    }
    if (unit.TARIFA_KWH) {
      LINHAS_CONSUMO += linhaConsumo
        .replace('$TITULO$', t('faturaMediaAdotada', idioma))
        .replace('$VALOR$', `R$${(unit.TARIFA_KWH).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}kwh`);
    }
  
    if (unit.CONSUMO_GREENANT) {
      let value = consumoAcUnidade / unit.CONSUMO_GREENANT * 100;
  
      let TEXT = '';
      if (typeof value === 'number') {
        value = Math.round(Math.max(0, Math.min(100, value || 0)));
        TEXT = `${value}%`;
      } else {
        value = 0;
      }
  
      const X = Math.round(50 + 50 * Math.cos((value / 100 * 2 + 0.5) * Math.PI)).toString();
      const Y = Math.round(50 - 50 * Math.sin((value / 100 * 2 + 0.5) * Math.PI)).toString();
      const BIGARC_A = value >= 50 ? '1' : '0';
      const BIGARC_B = value >= 50 ? '0' : '1';
  
      reportBody += bp_enrgEnd
        .replace('#CONSUMO#', t('consumo', idioma))
        .replace('$HIDE_CHART$', '')
        .replace('#REFRIGERACAO#', t('refrigeracao', idioma))
        .replace('#TOTAL#', t('total', idioma))
        .replace('$BIGARC_B$', BIGARC_B)
        .replace('$X_B$', (value <= 0) ? '49.99999' : X)
        .replace('$Y_B$', Y)
        .replace('$BIGARC_A$', BIGARC_A)
        .replace('$X_A$', (value >= 100) ? '50.00001' : X)
        .replace('$Y_A$', Y)
        .replace('$TEXT$', TEXT)
        .replace('$LINHAS_CONSUMO$', LINHAS_CONSUMO);
    } else {
      reportBody += bp_enrgEnd
        .replace('$HIDE_CHART$', 'display: none;')
        .replace('$BIGARC_B$', '0')
        .replace('$X_B$', '50')
        .replace('$Y_B$', '100')
        .replace('$BIGARC_A$', '0')
        .replace('$X_A$', '50')
        .replace('$Y_A$', '100')
        .replace('$TEXT$', '')
        .replace('$LINHAS_CONSUMO$', LINHAS_CONSUMO);
    }
  }

  reportBody += bp_end;

  return reportBody;
}

function compareConsumption (a: { CONSUMO_KWH: number }, b: { CONSUMO_KWH: number }) {
  if (a.CONSUMO_KWH > b.CONSUMO_KWH) return -1;
  if (a.CONSUMO_KWH < b.CONSUMO_KWH) return 1;
  if ((a.CONSUMO_KWH) && (!b.CONSUMO_KWH)) return -1;
  if ((!a.CONSUMO_KWH) && (b.CONSUMO_KWH)) return 1;
  return 0;
}
