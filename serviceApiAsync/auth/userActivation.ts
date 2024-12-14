import * as fs from 'fs'
import * as path from 'path'
import { PROFILECODES, getAllowedClientsManageFull, profileDesc } from '../../srcCommon/helpers/permissionControl';
import * as httpRouter from '../apiServer/httpRouter'
import * as sendEmail from '../../srcCommon/extServices/sendEmail'
import sqldb from '../../srcCommon/db'
import { returnActualDate } from '../../srcCommon/helpers/dates';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution';
import { ProfilePerClient, SessionData } from '../../srcCommon/types';
import { usersSetProfiles } from './users';

export async function usersReactivateUser(reqParams: {
  USER: string;
  clientIds: number[];
}, session: SessionData){
  if (!reqParams.USER) {
    throw Error('Invalid parameters, missing "USER"').HttpStatus(400);
  }
  if (session.permissions.isAdminSistema) { 
    // OK, os admins sistema podem desassociar usuários de qualquer cliente.
    // Se um admin sistema remove um usuário, é dos clientes selecionados do front (reqParams.clients).
    return await reactivateUser(reqParams.USER, reqParams.clientIds, session) 
  } 

  // Admins do cliente só conseguem associar o usuário dos clientes que ele gerencia
  // É necessário informar os clientIds que serão associados ao usuário
  if (reqParams.clientIds && reqParams.clientIds.length > 0) { /* OK */ }
  else throw Error('Permission denied!').HttpStatus(403);

  // Verifica se o solicitante é realmente admin das empresas que ele quer reativar do usuário
  const { clientIds: CLIENT_MANAGE } = await getAllowedClientsManageFull(session);
  for (const id of reqParams.clientIds) {
    if (!CLIENT_MANAGE.includes(id)) {
      throw Error('Permission denied!').HttpStatus(403);
    }
  }
  return await reactivateUser(reqParams.USER, reqParams.clientIds, session)
}
httpRouter.privateRoutes['/users/reactivate-user'] = usersReactivateUser;

function checkClientPerms(clientPerms: string) {
  const perms = [] as ProfilePerClient[];
  if (clientPerms.includes('[C]')) { perms.push('[C]'); }
  if (clientPerms.includes('[U]')) { perms.push('[U]'); }
  if (clientPerms.includes('[M]')) { perms.push('[M]'); }
  if (clientPerms.includes('[T]')) { perms.push('[T]'); }
  if (clientPerms.includes('[MN]')) { perms.push('[MN]'); }

  return perms  
}

function checkPermsProfileCodes(perms: string, emailBody: string) {
  if (perms.includes(PROFILECODES.PERUSER.AdminDiel)) emailBody = emailBody.replace(/\$PERMS_U\$/g, profileDesc[PROFILECODES.PERUSER.AdminDiel])
  else if (perms.includes(PROFILECODES.PERUSER.DemoViewAll)) emailBody = emailBody.replace(/\$PERMS_U\$/g, profileDesc[PROFILECODES.PERUSER.DemoViewAll])
  else if (perms.includes(PROFILECODES.PERUSER.Mantenedor)) emailBody = emailBody.replace(/\$PERMS_U\$/g, profileDesc[PROFILECODES.PERUSER.Mantenedor])
  return emailBody
}

export const reactivateUser = async (USER: string, clientIds: number[], session: SessionData) => {
  // Check if user already exists in the system
  const userInfo = await sqldb.DASHUSERS.getUserData_basic({ USER: USER, includeAllUsers: true });  

  // Não precisam informar os clientIds que serão associados ao usuário Admin Sistema
  if (clientIds.length === 0 && (!userInfo.PERMS_U || !userInfo.PERMS_U.includes('[A]'))) { 
    throw Error('Permission denied!').HttpStatus(403);
  }  
  const affectedRows = await sqldb.DASHUSERS.w_ativeUser({USER_ID: USER}, session.user);

  if (!userInfo.PERMS_U || !userInfo.PERMS_U.includes('[A]')) await associateClients(USER,clientIds, session);
  if (userInfo){
    const { subject, emailBody} = await buildEmailReactivateUser(USER, clientIds, userInfo.NOME, userInfo.SOBRENOME, userInfo.EMAIL, userInfo.PERMS_U, userInfo.LAST_ACCESS);
    await sendEmail.simple({user: session.user}, [userInfo.EMAIL], subject, emailBody)
  }
  return 'REACTIVATED' + affectedRows
}

export const associateClients = async (USER: string, clientIds: number[],session: SessionData) => {
  const clientsAssociates = await sqldb.USERSCLIENTS.getUserClients({ userId: USER });
  const clientIdsAssociates = [] as number[]
  clientsAssociates.forEach((clientPerm)=>{
    clientIdsAssociates.push(clientPerm.CLIENT_ID)
  })
  const usersClients = await sqldb.USERSCLIENTS.getList({
    userId: USER,
    clientIds: clientIds,
  }, { includeClientName: true });  
  const clients_v2 = [] as { clientId: number, p: ProfilePerClient[]|null, units?: number[] }[];

  if(usersClients){
    usersClients.forEach((client) => {
      const perms = checkClientPerms(client.PERMS) 
      
      clients_v2.push({
        clientId: client.CLIENT_ID,
        p: perms,
        units: undefined,
      });
    }); 
  } 
  
  await disassociateClients(USER, clientIdsAssociates, session)

  return usersSetProfiles({
    userId: USER,
    clients_v2: clients_v2,
  }, session);
}

export const disassociateClients = async (USER: string, clientIds: number[], session: SessionData) => {
  const clients_v2 = [] as {
    clientId: number
    p: ('[U]'|'[C]'|'[M]'|'[T]')[] | null
    units?: number[]|null
  }[];

  for (const clientId of clientIds) {
    clients_v2.push({ clientId, p: null });
  }
  return usersSetProfiles({
    userId: USER,
    clients_v2,
  }, session)
}

export const buildEmailReactivateUser = async (USER: string, CLIENT_IDS: number[], nome: string, sobrenome: string, email: string, perms: string, lastAccess: string) => {
  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: USER })
  const language = getLanguage(prefsUser[0]) 

  let emailBody = fs.readFileSync(path.resolve('./assets/NotificacaoReativado.html'), 'utf-8')
  emailBody = emailBody
  .replace(/\$DATE_TIME\$/g, returnActualDate(false, language))
  .replace(/\$NOME\$/g, nome)
  .replace(/\$SOBRENOME\$/g, sobrenome)
  .replace(/\$EMAIL\$/g, email)
  .replace(/\$LAST_ACCESS\$/g, lastAccess || t('semInformacao', language))
  .replace(/\#NOTIFICACAO\#/g, t('notificacao.notificacao', language))
  .replace(/\#OLA\#/g, t('ola', language))
  .replace(/\#VERIFICAMOS_QUE_USUARIO\#/g, t('verificamosQueUsuario', language))
  .replace(/\#FOI_REATIVADO_RECENTEMENTE\#/g, t('foiReativadoRecentemente', language))
  .replace(/\#NOME\#/g, t('nome', language))
  .replace(/\#EMAIL\#/g, t('email', language))
  .replace(/\#PERFIL\#/g, t('perfil', language))
  .replace(/\#ULTIMO_ACESSO\#/g, t('ultimoAcesso', language))
  .replace(/\#ATENCIOSAMENTE\#/g, t('atenciosamente', language))
  .replace(/\#EQUIPE\#/g, t('equipe', language))
  .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', language))
  .replace(/\#CONTATAR_EM\#/g, t('contatarEm', language))
  .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', language))
  .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', language))
  
  const usersClients = await sqldb.USERSCLIENTS.getUserClients({
    userId: USER
  });

  if (perms) emailBody = checkPermsProfileCodes(perms, emailBody)  
  else {
    const perfis: Set<string> = new Set();
    const userClients = usersClients.filter(x => x.USER_ID === USER);

    userClients.forEach(row => {
      if (row.PERMS && row.PERMS.includes(PROFILECODES.PERCLIENT.AdminCliente)) {
        perfis.add(profileDesc[PROFILECODES.PERCLIENT.AdminCliente]);
      } else if (row.PERMS && row.PERMS.includes(PROFILECODES.PERCLIENT.Tecnico)) {
        perfis.add(profileDesc[PROFILECODES.PERCLIENT.Tecnico]);
      } 
      else {
        perfis.add(profileDesc[PROFILECODES.PERCLIENT.UsuarioBasico]);
      }
    });

    if (perfis.size === 1) emailBody = emailBody.replace(/\$PERMS_U\$/g, perfis.values().next().value);
    else if (perfis.size > 1) emailBody = emailBody.replace(/\$PERMS_U\$/g, '(variado)');
  }

  const subject = "Usuário Reativado - Plataforma Celsius 360";
  return { subject, emailBody};
}
