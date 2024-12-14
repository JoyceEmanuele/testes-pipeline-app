import * as fs from 'node:fs'
import * as crypto from 'node:crypto'
import * as path from 'node:path'
import * as sendEmail from '../../srcCommon/extServices/sendEmail'
import sqldb from '../../srcCommon/db'
import * as eventWarn from '../../srcCommon/helpers/eventWarn'
import configfile from '../../configfile'
import { admLogger, logger } from '../../srcCommon/helpers/logger';
import * as s3Helper from '../../srcCommon/s3/connectS3';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { UnitDbInfo, createNormNames, deleteDirectory, generateUnitReport, getWeekReportPeriod } from '../../srcCommon/unitReport/healthReport'

interface UserDbInfo {
  NOME: string
  SOBRENOME: string
  EMAIL: string
  UNITREP?: string
  UNITREPFILT?: string
  CLIENT_ID?: number
  CLIENT_NAME: string
  selectedUnits?: number[]
}
interface ClientUsersUnits {
  users: UserDbInfo[]
  units: UnitDbInfo[]
}

export async function taskPreviewReports() {
  try {
    const clients = await listRequiredReports()
    const { unitsWithError } = await generateRequiredReports(clients);
    if (unitsWithError.length > 0) {
      admLogger(`Houve problema na geração do relatório semanal para ${unitsWithError.length} unidades.`);
    }
  } catch (err) {
    logger.error(err);
    admLogger('Houve erro na geração de relatórios semanais!');
  }
}

export async function taskGenerateSendReports() {
  try {
    const clients = await listRequiredReports()
    const { unitsWithError } = await generateRequiredReports(clients);
    if (unitsWithError.length > 0) {
      admLogger(`Houve problema na geração do relatório semanal para ${unitsWithError.length} unidades.`);
    }
    const { success, errors } = await sendReportsByEmail(clients);
    admLogger(`Geração e envio dos relatórios semanais concluída. ${success} com sucesso e ${errors} erros.`);
  } catch (err) {
    logger.error(err);
    admLogger('Houve erro na geração de relatórios semanais!');
  }
}

export async function listRequiredReports (overrideUsers?: UserDbInfo[]) {
  const { periodEnd } = getWeekReportPeriod()

  // Buscar no banco todos os usuários que optaram por receber o relatório
  let usersList: UserDbInfo[] = overrideUsers || (await sqldb.DASHUSERS.getUsersRequiringUnitsReport());

  // Remover os que não têm email válido
  usersList = usersList.filter(user => (/^\S+@\S+\.\S+$/).test(user.EMAIL))

  // Agrupar por cliente
  const clients: {[k:string]:ClientUsersUnits} = {}
  for (const user of usersList) {
    // relatório apenas para CASAS BAHIA e CINEMARK
    if(![153, 137].some((client_id) => client_id === user.CLIENT_ID)) continue;
    if (!clients[user.CLIENT_ID]) {
      clients[user.CLIENT_ID] = { users: [], units: [] };
    }
    const userInfo = Object.assign(user, { selectedUnits: <number[]>null })
    clients[user.CLIENT_ID].users.push(userInfo)
    if (userInfo.UNITREPFILT && userInfo.UNITREPFILT.startsWith('UNITS:')) {
      userInfo.selectedUnits = userInfo.UNITREPFILT.substring('UNITS:'.length).split(',').filter(x => !!x).map(x => Number(x))
      if (userInfo.selectedUnits.length === 0) userInfo.selectedUnits = null
    }
  }

  // Pega o primeiro cliente, cria uma pasta com o ID dele e busca a lista das unidades
  for (const clientIdS of Object.keys(clients)) {
    const clientIdN = Number(clientIdS);
    if (!clientIdN) throw Error('Invalid clientId').HttpStatus(500);
    const pathClientReps = path.join(process.cwd(), 'reportgen', `Client_${clientIdS}`)
    const pathHash = crypto.createHmac("md5","ddiel").update(`${periodEnd}_Client_${clientIdS}`).digest('hex').substring(0, 8);
    const rows = await sqldb.CLUNITS.listRequiredReports({ clientId: clientIdN });
    const normNames = createNormNames(rows);
    const unitsList: UnitDbInfo[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.CLIENT_ID !== clientIdN) throw Error('Invalid unit client').HttpStatus(500);
      const normName = normNames[i];
      const fileNameNoExt = `Unidade ${normName} - ${periodEnd}`.replace(/[^0-9a-zA-Z]+/g, '_');
      const pathUnitRepNoExt = path.join(pathClientReps, fileNameNoExt);
      const s3Key = path.join(configfile.filesBucketPrivate.reportsBucketPath, `${periodEnd}_Client_${clientIdS}_${pathHash}`, `${fileNameNoExt}.pdf`);
      const unit: UnitDbInfo = {
        UNIT_NAME: row.UNIT_NAME,
        UNIT_ID: row.UNIT_ID,
        CLIENT_NAME: row.CLIENT_NAME,
        CLIENT_ID: row.CLIENT_ID,
        STATE_ID: row.STATE_ID,
        CITY_NAME: row.CITY_NAME,
        pathUnitRepNoExt,
        pathClientReps,
        s3Key,
        pdfGenerated: false,
      }
      unitsList.push(unit);
    }
    clients[clientIdS].units = unitsList
  }

  return clients
}

export async function generateRequiredReports (clients: {[k:string]:ClientUsersUnits}): Promise<{ unitsWithError: number[] }> {
  // logger.info('DBG', Object.keys(clients))
  const unitsWithError: number[] = [];
  for (const clientIdS of Object.keys(clients)) {
    const clientIdN = Number(clientIdS);
    if (!clientIdN) throw Error('Invalid clientId').HttpStatus(500);
    const pathClientReps = path.join(process.cwd(), 'reportgen', `Client_${clientIdN}`)
    if (fs.existsSync(pathClientReps)) {
      await deleteDirectory(pathClientReps);
    }
    for (const unit of clients[clientIdS].units) {
      const { UNIT_ID: unitId, pathUnitRepNoExt, s3Key, pathClientReps: pathClientRepsUnit } = unit
      if (unit.CLIENT_ID !== clientIdN) throw Error('Invalid unit client').HttpStatus(500);

      // Para cada unidade, solicita a geração do PDF, move o arquivo para a pasta do cliente com o nome Unidade_ID.pdf
      // logger.info('DBG 249')
      let outInfo: Awaited<ReturnType<typeof generateUnitReport>>;
      for (let retry = 0; retry < 3; retry++) {
        try {
          outInfo = await generateUnitReport({ clientId: clientIdN, unitId, pathUnitRepNoExt, pathClientReps: pathClientRepsUnit });
          break;
        } catch(err) {
          logger.error(err);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      if (!outInfo) {
        logger.error(`Relatório não gerado para o CLIENT_ID ${clientIdS} e UNIT_ID ${unitId}`);
        unitsWithError.push(unitId);
        continue;
      }
      if (outInfo.CLIENT_ID !== clientIdN) throw Error('Invalid result client').HttpStatus(500);
      if (outInfo.UNIT_ID !== unit.UNIT_ID) throw Error('Invalid result unit').HttpStatus(500);
      unit.dacs = outInfo.dacs;
      unit.duts = outInfo.duts;
      unit.dams = outInfo.dams;

      if (configfile.isProductionServer) {
        // file : { fieldname, originalname, name, encoding, mimetype, path, extension, size, truncated, buffer }
        await s3Helper.uploadUnitReport(s3Key, fs.createReadStream(`${pathUnitRepNoExt}.pdf`))
        .catch((perr) => { logger.error("Error uploading data (S3):"); logger.error(perr); })
      }
      unit.pdfGenerated = true;
    }
  }
  return { unitsWithError };
}

export async function sendReportsByEmail (clients: {[k:string]:ClientUsersUnits}, restrictEmail?: { onlyTo?: string[], ignore?: string[], reqUser: string }): Promise<{ success: number, errors: number }> {
  logger.info({message: 'Iniciando envio de relatórios por email', client_length: clients.length});
  
  const { periodIni, periodEnd } = getWeekReportPeriod()
  const usersReports: {
    [userId: string]: {
      userName: string,
      userEmail: string,
      clientNames: string[]
      pdfsList: string[]
      units: UnitDbInfo[]
    }
  } = {};
  for (const clientId of Object.keys(clients)) {
    const units = clients[clientId].units.filter(unit => unit.pdfGenerated && fs.existsSync(`${unit.pathUnitRepNoExt}.pdf`))
    let users = clients[clientId].users

    logger.info({message: 'Cliente e unidades com PDFs disponíveis e usuários para notificar', units_length: units.length, users});

    if (!configfile.isProductionServer) {
      logger.info({message: 'Configfile de desenvolvimento'});
      users = [{ NOME: 'Carlos', SOBRENOME: 'Langoni', EMAIL: 'carlos.langoni@dielenergia.com', CLIENT_NAME: clients[clientId].users[0].CLIENT_NAME }]
    }
    if (units.length && users.length) {
      for (const user of users) {
        let unitsList = units.filter(unit => (user.selectedUnits == null || user.selectedUnits.includes(unit.UNIT_ID)));
        let pdfsList = unitsList.map(unit => `${unit.pathUnitRepNoExt}.pdf`)
        if (!pdfsList.length) continue;
        if (!usersReports[user.EMAIL]) {
          usersReports[user.EMAIL] = {
            userName: `${user.NOME || ''} ${user.SOBRENOME || ''}`.trim() || user.EMAIL,
            userEmail: user.EMAIL,
            clientNames: [],
            units: [],
            pdfsList: [],
          }
          logger.info({message: 'Adicionando usuário ao relatório', user: user.EMAIL});
        }
        const userReps = usersReports[user.EMAIL];
        if (!userReps.clientNames.includes(user.CLIENT_NAME)) {
          userReps.clientNames.push(user.CLIENT_NAME);
        }
        userReps.units = userReps.units.concat(unitsList);
        userReps.pdfsList = userReps.pdfsList.concat(pdfsList);
      }
    }
  }

  let success = 0;
  let errors = 0;
  for (const user of Object.values(usersReports)) {
    const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: user.userEmail });
    const language = getLanguage(prefsUser[0]);

    if (restrictEmail) {
      if (restrictEmail.onlyTo && !restrictEmail.onlyTo.includes(user.userEmail)) continue;
      if (restrictEmail.ignore && restrictEmail.ignore.includes(user.userEmail)) continue;
    }

    const units = user.units.map((unit) => {
      let skippedGreen = 0;
      let skippedGrey = 0;
      const dacs = unit.dacs.filter((dac) => {
        if (!['1', '2', '3', 'disab'].includes(String(dac.HLEVEL))) {
          if (String(dac.HLEVEL) === '4') {
            skippedGreen += 1;
          } else {
            skippedGrey += 1;
          }
          return false;
        }
        return true;
      });

      let missingsNote = '';
      if (skippedGreen > 0) {
        dacs.push({
          MACHINE_NAME: `${skippedGreen} ${t('maquina', language)}${(skippedGreen === 1) ? '' : 's'} ${t('operandoCorretamente', language)}`,
          DAC_ID: '',
          HLEVEL: '4',
        });
      }
      if (skippedGrey > 0) {
        dacs.push({
          MACHINE_NAME: `${skippedGrey} ${t('maquina', language)}${(skippedGrey === 1) ? '' : 's'} ${t('semInformacoes', language)}`,
          DAC_ID: '',
          HLEVEL: '0',
        });
      }

      return { ...unit, dacs, missingsNote };
    });

    const emailBody = buildEmailBody({
      userName: user.userName,
      datBeg: `${periodIni.substring(8,10)}/${periodIni.substring(5,7)}/${periodIni.substring(0,4)}`,
      datEnd: `${periodEnd.substring(8,10)}/${periodEnd.substring(5,7)}/${periodEnd.substring(0,4)}`,
      units,
      language,
    });
    const requester = (restrictEmail && restrictEmail.reqUser) || '[SYSTEM]';

    logger.info({message: 'Enviando email para o usuário', user: user.userEmail});

    await sendEmail.simple({ user: requester }, [user.userEmail], `DAC - ${t('relatorioSemanal', language)}`, emailBody)
    .then(() => { 
      success++; 
      logger.info({message: 'Email enviado com sucesso', user: user.userEmail});
    })
    .catch(async (err) => {
      logger.error(`Não foi enviado email`, JSON.stringify(user.userEmail), JSON.stringify(user.userName), err);
      eventWarn.typedWarn('EMAIL_SEND', String(err && err.message || err));
      errors++;
      await new Promise((r) => { setTimeout(r, 60 * 1000); })
    });
    await new Promise((r) => { setTimeout(r, 3 * 1000); })
  }

  return { success, errors };
}

interface UnitReportData {
  userName: string
  datBeg: string
  datEnd: string
  units: (UnitDbInfo & { missingsNote: string })[]
  language: 'pt' | 'en'
}
const temperatureLevelColors: { [k: string]: string } = {
  high: 'red',
  low: 'blue',
  good: 'green',
  neutral: 'grey',
};
function buildEmailBody(emailBodyData: UnitReportData) {
  let emailBodyFull = fs.readFileSync(path.resolve('./assets/RelatorioSemanalR2.html'), 'utf-8')
  const [
    bp_head,
    bp_unit1,
    bp_dacRow,
    bp_unit2,
    bp_dutRow,
    bp_unit3,
    bp_damRow,
    bp_unit4,
    bp_end,
  ] = emailBodyFull.split('<!-- SPLIT -->');

  let emailBody = bp_head
    .replace(/\$NOME_USUARIO\$/g, emailBodyData.userName)
    .replace(/\$DAT_INI\$/g, emailBodyData.datBeg)
    .replace(/\$DAT_FIN\$/g, emailBodyData.datEnd)
    .replace('#RELATORIO_SEMANAL#', t('relatorioSemanal', emailBodyData.language ))
    .replace('#OLA#', t('ola', emailBodyData.language))
    .replace('#AQUI_ESTA_SEU_RELATORIO_SEMANAL#', t('aquiEstaSeuRelatorioSemanal', emailBodyData.language))
    .replace('#DE#', t('de', emailBodyData.language))
    .replace(/#A#/g, t('a', emailBodyData.language))
    .replace('#AS_UNIDADES_RELACIONADAS#', t('asUnidadeRelacionadasSaoSeguintes', emailBodyData.language))
    .replace('#CIDADE#', t('cidade', emailBodyData.language))
    .replace('#UNIDADE#', t('unidade', emailBodyData.language))
    .replace('#SAUDE_DAS_MAQUINAS#', t('saudeDasMaquinas', emailBodyData.language))
    .replace('#TEMPERATURA_MEDIA_SEMANAL#', t('temperaturaMediaSemanal', emailBodyData.language))
    .replace('#AUTOMACAO#', t('automacao', emailBodyData.language))

  for (const unit of emailBodyData.units) {
    const NOME_UNIDADE = unit.UNIT_NAME;
    const LINK_PDF_UNIDADE = `${configfile.frontUrls.base}/analise/unidades/download-relatorio-de-unidade?key=${unit.s3Key}`;
    // if (!pdfsList) {
    //   NOME_UNIDADE = `<a href="${configfile.filesBucket.url}/${unit.s3Key}">${unit.UNIT_NAME}</a>`;
    // }

    emailBody += bp_unit1
      .replace(/\$CITY\$/g, unit.CITY_NAME)
      .replace(/\$STATE\$/g, unit.STATE_ID)
      .replace('$NOME_UNIDADE$', NOME_UNIDADE)
      .replace('$LINK_PDF_UNIDADE$', LINK_PDF_UNIDADE);
    for (const dac of unit.dacs) {
      emailBody += bp_dacRow
        .split('$HLEVEL$').join(dac.HLEVEL)
        .replace('$TEXTO_DAC$', `${dac.MACHINE_NAME || dac.DAC_ID}`);
    }
    emailBody += bp_unit2
      .replace('$MISSING_MACHINES_NOTE$', unit.missingsNote || '');
    for (const dut of unit.duts) {
      const T_COLOR = temperatureLevelColors[dut.T_LEVEL] || 'grey';
      emailBody += bp_dutRow
        .replace('$ROOM_NAME$', dut.ROOM_NAME || dut.DEV_ID)
        .split('$T_LEVEL$').join(dut.T_LEVEL)
        .split('$T_COLOR$').join(T_COLOR)
        .replace('$T_MED$', dut.T_MED);
    }
    emailBody += bp_unit3;
    for (const dam of unit.dams) {
      emailBody += bp_damRow.replace('$TEXTO_DAM$', `${dam.MACHINE_NAME || dam.DAM_ID}`)
    }
    emailBody += bp_unit4;
  }

  emailBody += bp_end
    .replace('#ACOMPANHE_EM_TEMPO_REAL#', t('acompanheEmTempoReal', emailBodyData.language))
    .replace('#ATENCIOSAMENTE#', t('atenciosamente', emailBodyData.language))
    .replace('#TEAM#', t('equipe', emailBodyData.language))
    .replace('#PARA_DUVIDAS#', t('paraDuvidas', emailBodyData.language))
    .replace('#CONTATAR_EM#', t('contatarEm', emailBodyData.language))
    .replace('#CASO_DE_URGENCIA#', t('casoDeUrgencia', emailBodyData.language))
    .replace('#ONDE_ESTAMOS#', t('ondeEstamos', emailBodyData.language))

  return emailBody;
}
