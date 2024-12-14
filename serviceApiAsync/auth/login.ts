import * as crypto from 'crypto'
import servConfig from '../../configfile'
import * as fs from 'fs'
import * as path from 'path'
import * as sendEmail from '../../srcCommon/extServices/sendEmail'
import * as dielServices from '../../srcCommon/dielServices'
import * as uuid from 'uuid'
import * as httpRouter from '../apiServer/httpRouter'
import { FakeProfile, ProfilePerClient, SessionData, UserPermissions } from '../../srcCommon/types'
import sqldb from '../../srcCommon/db'
import { getPermissions, PROFILECODES } from '../../srcCommon/helpers/permissionControl';
import { getLanguage, t } from '../../srcCommon/helpers/i18nextradution'
import { verifyClient_classicLogin } from '../../srcCommon/helpers/auth'

export function convertUserPermissions(permissions: UserPermissions) {
  const CLIENT_VIEW: number[] = [];
  const CLIENT_MANAGE: number[] = [];
  const PER_CLIENT: { clientId: number, p: ProfilePerClient[], units?: number[] }[] = [];
  for (const clientPerms of permissions.PER_CLIENT) {
    PER_CLIENT.push(clientPerms);
    CLIENT_VIEW.push(clientPerms.clientId);
    if ((clientPerms.p.includes(PROFILECODES.PERCLIENT.AdminCliente)) || (clientPerms.p.includes(PROFILECODES.PERCLIENT.Parceiro)) || (clientPerms.p.includes(PROFILECODES.PERCLIENT.Instalador))) {
      CLIENT_MANAGE.push(clientPerms.clientId);
    }
  }
  return { CLIENT_VIEW, CLIENT_MANAGE, PER_CLIENT };
}

export const createUserDataToFront =  async  (session: SessionData) => {
  const userInfo = await sqldb.DASHUSERS.getUserData_front({ USER: session.user })
  if (!userInfo) throw Error('Could not find informed user').HttpStatus(401).DebugInfo(session)
  const { token } = await dielServices.authInternalApi('/diel-internal/auth/generate-jwt-token', { user: session.user, fakeProfile: session.fakeProfile });

  const { CLIENT_VIEW, CLIENT_MANAGE, PER_CLIENT } = convertUserPermissions(session.permissions);

  return {
    token,
    user: session.user,
    name: userInfo.NOME,
    lastName: userInfo.SOBRENOME,
    phonenb: userInfo.PHONENB,
    notifsby: userInfo.NOTIFSBY,
    isAdmin: session.permissions.isMasterUser, // Descontinuado em 2023-09, deve ser removido no futuro.
    isMasterUser: session.permissions.isMasterUser,
    isTracker: userInfo.TRACKER === '1',
    permissions: {
      ...session.permissions,
      PER_CLIENT,
      CLIENT_VIEW,
      CLIENT_MANAGE,
    },
    prefs: userInfo.PREFS,
    profileSim: session.fakeProfile ? true : undefined,
  }
}

// TODO: salvar tokens de login no redis e na memória

// function authMiddleware (req: express.Request, res: express.Response, next: express.NextFunction) {
//   // logger.info(`Authentication needed for route: ${req.method} ${req.path}`)
//   Promise.resolve().then(async () => {
//     const authHeader = req.get('Authorization')
//     if (!authHeader) { res.status(401).send('No Authorization header'); return }
//     const { authenticatedUser, fakeProfile, extraSessionData } = await dielServices.authInternalApi('/diel-internal/auth/check-auth-header', { authHeader });
//     req.session = await createUserSession(authenticatedUser, fakeProfile);
//     if (extraSessionData) req.extraSessionData = extraSessionData;
//     if (req.session) {
//       next()
//     } else res.status(500).end('Auth error')
//   })
//   .catch((err) => {
//     logger.error(err)
//     if (err.errorCode) {
//       res.status(401).json({
//         errorCode: err.errorCode,
//         errorDebug: err.frontDebug,
//         errorMessage: err.errorMessage || err.message,
//       });
//     } else {
//       res.status(401).send('Auth error')
//     }
//   })
// }

// httpRouter.setAuthMiddleware(authMiddleware)

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autenticação do usuário
 *     description: Autentica o usuário e retorna um token de acesso
 *     tags:
 *       - Login
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de autenticação do usuário
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: Token de acesso
 *               default: ""
 *               required: false
 *             user:
 *               type: string
 *               description: Nome do usuário
 *               default: ""
 *               required: false
 *             password:
 *               type: string
 *               description: Senha do usuário
 *               default: ""
 *               required: false
 *     responses:
 *       200:
 *         description: Token de acesso gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token de acesso gerado
 *                 user:
 *                   type: string
 *                   description: Nome de usuário autenticado
 *                 name:
 *                   type: string
 *                   description: Nome do usuário autenticado
 *                 lastName:
 *                   type: string
 *                   description: Sobrenome do usuário autenticado
 *                 isMasterUser:
 *                   type: boolean
 *                   description: Indica se o usuário tem direitos de master
 *                 permissions:
 *                   type: object
 *                   description: Permissões do usuário
 *                 prefs:
 *                   type: string
 *                   description: Preferências do usuário
 *                 notifsby:
 *                   type: string
 *                   description: Canal de notificação do usuário
 *                 phonenb:
 *                   type: string
 *                   description: Número de telefone do usuário
 *       400:
 *         description: Faltando parâmetros
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno do servidor
 */
export const login = async (reqParams: {
  token?: string;
  user?: string;
  password?: string;
}, _nosession: void) => {
  const session = await verifyClient_classicLogin(reqParams);
  if (!session) throw Error('Could not check credentials!').HttpStatus(500).DebugInfo({reqParams});
  return createUserDataToFront(session);
}

httpRouter.publicRoutes['/login'] = login;

/**
 * @swagger
 * /my-profile:
 *   post:
 *     summary: Informaçoes do meu perfil
 *     description: Verifica o perfil do usuario
 *     tags:
 *       - Login
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Informaçoes do perfil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token de acesso gerado
 *                 user:
 *                   type: string
 *                   description: Nome de usuário autenticado
 *                 name:
 *                   type: string
 *                   description: Nome do usuário autenticado
 *                 lastName:
 *                   type: string
 *                   description: Sobrenome do usuário autenticado
 *                 isMasterUser:
 *                   type: boolean
 *                   description: Indica se o usuário tem direitos de master
 *                 permissions:
 *                   type: object
 *                   description: Permissões do usuário
 *                 prefs:
 *                   type: string
 *                   description: Preferências do usuário
 *                 notifsby:
 *                   type: string
 *                   description: Canal de notificação do usuário
 *                 phonenb:
 *                   type: string
 *                   description: Número de telefone do usuário
 *                 dataToFront?: 
 *                   type: object
 *                   description: Informacoes para o front
 *       401:
 *         description: Usuário não autorizado
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/my-profile'] = async function (_reqParams, session, { req }) {
  const frontUserInfo = await createUserDataToFront(session);
  const dataToFront = req.extraSessionData && req.extraSessionData.dataToFront || undefined;
  return Object.assign(frontUserInfo, { dataToFront });
}

/**
 * @swagger
 * /login/forgot:
 *   post:
 *     summary: Recuperar senha
 *     description: Envia e-mail para o usuário trocar a senha
 *     tags:
 *       - Login
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do usuário
 *         schema:
 *           type: object
 *           properties:
 *             user:
 *               type: string
 *               description: Nome do usuário
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Status do envio do e-mail
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: Status do envio do e-mail
 *       401:
 *         description: Não foi possível encontrar o usuário
 *       500:
 *         description: Erro interno do servidor
 */

export async function loginForgot(reqParams: {
  user: string;
}, _nosession: void) {
  const userId = reqParams.user
  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: userId });
  if (!userInfo) throw Error('Could not find requested user').HttpStatus(401).DebugInfo({userId})
  if (userInfo.EMAIL !== userId) throw Error('Could not get user information').HttpStatus(500).DebugInfo({userId})

  const prefsUser = await sqldb.DASHUSERS.getPrefsUser({ EMAIL: userId });
  const language = getLanguage(prefsUser[0]);

  let token = uuid.v4()
  await sqldb.PWRECOVERTK.w_insert({
    TOKEN: token,
    DAT_ISSUE: new Date().toISOString(),
    EMAIL: userInfo.EMAIL
  })

  if (servConfig.isTestServer) {
    return <any>{ dev: token }; // Used for testing
  }
  if (/^\S+@\S+\.\S+$/.test(userInfo.EMAIL)) {
    const { subject, emailBody } = buildEmailForgotPassword({
      token,
      USER_ID: userId,
      IDIOMA: language
    });
    await sendEmail.simple({ user: '[UNKNOWN]' }, [userInfo.EMAIL], subject, emailBody);
    return 'sent';
  }
  return 'not-sent (email not-valid)';
}

httpRouter.publicRoutes['/login/forgot'] = loginForgot;

export function buildEmailForgotPassword(info: {
  token: string
  USER_ID: string
  IDIOMA: "pt" | "en"
}) {
  if(!info.IDIOMA) {
    info.IDIOMA = 'pt'
  }

  const link = `${servConfig.frontPwResetUrl}?user=${encodeURIComponent(info.USER_ID)}&token=${info.token}` // req.get('Origin')
  let emailBody = fs.readFileSync(path.resolve('./assets/EsqueciSenha_v2.html'), 'utf-8')
  emailBody = emailBody
    .replace(/\#CLIQUE_NO_LINK\#/g, t('cliqueNoLinkRedefinirSenha', info.IDIOMA))
    .replace(/\#REDEFINIR_SENHA\#/g, t('redefinirSenha', info.IDIOMA))
    .replace(/\#DUVIDAS_OU_SUGESTOES\#/g, t('duvidasOuSugestoes', info.IDIOMA))
    .replace(/\#OBRIGADO\#/g, t('obrigado', info.IDIOMA))
    .replace(/\#EQUIPE\#/g, t('equipe', info.IDIOMA))
    .replace(/\#PARA_DUVIDAS\#/g, t('paraDuvidas', info.IDIOMA))
    .replace(/\#CONTATAR_EM\#/g, t('contatarEm', info.IDIOMA))
    .replace(/\#CASO_DE_URGENCIA\#/g, t('casoDeUrgencia', info.IDIOMA))
    .replace(/\#ONDE_ESTAMOS\#/g, t('ondeEstamos', info.IDIOMA))
    .replace(/\#REDEFINICAO_DE_SENHA\#/g, t('redefinicaoDeSenha', info.IDIOMA))
    .split('$LINK$').join(link)
    .split('$USER$').join(info.USER_ID)
  // `Acesse o link para redefinir a sua senha:<br><a href="${link}">${link}</a>`
  const subject = 'Redefinição de senha - Plataforma Celsius 360';
  return { subject, emailBody };
}

/**
 * @swagger
 * /login/reset:
 *   post:
 *     summary: Resetar senha
 *     description: Atualizar senha no banco de dados
 *     tags:
 *       - Login
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do usuário
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: token gerado pela rota 'login/forgot'
 *               default: ""
 *               required: true
 *             pass:
 *               type: string
 *               description: nova senha
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Senha resetada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios ou usuário não permitido
 *       401:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.publicRoutes['/login/reset'] = async function (reqParams, nosession) {
  if (!reqParams.token) throw Error('Invalid parameters').HttpStatus(400).DebugInfo({reqParams})
  if (!reqParams.pass) throw Error('Invalid parameters').HttpStatus(400).DebugInfo({reqParams})
  if (reqParams.token.length !== 36) throw Error('Invalid parameters').HttpStatus(400).DebugInfo({reqParams})

  const now = new Date()
  const minDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const maxDate = now.toISOString()
  await sqldb.PWRECOVERTK.w_deleteOldTokens({ minDate, maxDate })

  const tokenInfo = await sqldb.PWRECOVERTK.getTokenData({ TOKEN: reqParams.token });
  if (!tokenInfo) {
    // logger.info({ sentence, token, results})
    throw Error('Invalid recover info').HttpStatus(400)
  }

  const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: tokenInfo.EMAIL })
  if (!userInfo) throw Error('Could not find informed user').HttpStatus(401).DebugInfo(tokenInfo)
  const userClients = await sqldb.USERSCLIENTS.getUserClients({ userId: tokenInfo.EMAIL });

  const permissions = getPermissions({
    userPerms: userInfo.PERMS_U,
    CLBIND_ID: userInfo.CLBIND_ID,
    CLBIND_ENABLED: userInfo.CLBIND_ENABLED,
    CLBIND_PERMS_C: userInfo.CLBIND_PERMS_C,
  }, userClients);
  if (permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
  else if (!userClients.length) throw Error('User not allowed').HttpStatus(400).DebugInfo({ userClients, tokenInfo })

  await sqldb.PWRECOVERTK.w_deleteFromUser({ EMAIL: tokenInfo.EMAIL });

  const pwhash = createPasswordHashDb(reqParams.pass);
  const { affectedRows } = await sqldb.DASHUSERS.w_updateUser({
    PASSWORD: pwhash,
    EMAIL: tokenInfo.EMAIL,
  }, tokenInfo.EMAIL)
  return 'UPDATED ' + affectedRows
}

/**
 * @swagger
 * /login/impersonate:
 *   post:
 *     summary: Personificar uma sessão do usuário
 *     description: Personificar uma sessão de usuário com um perfil falso e privilégios de administrador
 *     tags:
 *      - Login
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: fakeProfile
 *         in: body
 *         description: Perfil de usuário falso
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             clients_v2:
 *               required: false
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   CLIENT_ID:
 *                     type: number
 *                     default: null
 *                   PERMS:
 *                     type: string
 *                     default: ""
 *                   UNITS:
 *                     type: string
 *                     required: false
 *                     default: ""
 *               description: Clientes do usuário
 *             PERMS_U:
 *               type: string
 *               description: Permissões do Usuário
 *               default: ""
 *               required: false
 *             CLBIND_ID:
 *               type: number
 *               description: Client binding id
 *               default: null
 *               required: false
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token do usuário
 *                 user:
 *                   type: string
 *                   description: Usuário
 *                 name:
 *                   type: string
 *                   description: Nome do Usuário
 *                 lastName:
 *                   type: string
 *                   description: Sobrenome do Usuário
 *                 isMasterUser:
 *                   type: boolean
 *                   description: Indica se o usuário tem direitos de master
 *                 permissions:
 *                   type: object
 *                   description: Permissões do usuário
 *                 prefs:
 *                   type: string
 *                   description: Preferências do usuário
 *                 notifsby:
 *                   type: string
 *                   description: Preferências de notificação
 *                   enum: [email, telegram, email and telegram]
 *                 phonenb:
 *                   type: string
 *                   description: Telefone do Usuário
 *       401:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/login/impersonate'] = async function (reqParams, _session, { req }) {
  const realUserSession = req.realUserSession || req.session;
  if (!realUserSession.permissions.isAdminSistema) throw Error('Not allowed').HttpStatus(403);
  let fakeProfile: FakeProfile = reqParams.fakeProfile;
  if ((reqParams as any).clients && !fakeProfile) { // Adicionado em 2023-02 por compatibilidade
    fakeProfile = { clients: (reqParams as any).clients };
  }
  const authHeader = req.get('Authorization');
  const { fakeProfileSession } = await dielServices.authInternalApi('/diel-internal/auth/impersonate', {
    authHeader: authHeader,
    fakeProfile: fakeProfile || null,
  });
  const frontUserInfo = await createUserDataToFront(fakeProfileSession);
  return frontUserInfo;
}

/**
 * @swagger
 * /login/craft-token:
 *   post:
 *     summary: Gera token do usuário
 *     description: Através do userId o token do usuário é gerado
 *     tags:
 *       - Login
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do usuário
 *         schema:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               description: Id do usuário
 *               default: "" 
 *               required: true
 *     responses:
 *       200:
 *         description: Status do envio do e-mail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token de acesso gerado
 *                 user:
 *                   type: string
 *                   description: Nome de usuário autenticado
 *                 name:
 *                   type: string
 *                   description: Nome do usuário autenticado
 *                 lastName:
 *                   type: string
 *                   description: Sobrenome do usuário autenticado
 *                 isMasterUser:
 *                   type: boolean
 *                   description: Indica se o usuário tem direitos de master
 *                 permissions:
 *                   type: object
 *                   description: Permissões do usuário
 *                 prefs:
 *                   type: string
 *                   description: Preferências do usuário
 *       400:
 *         description: Faltando parâmetros obrigatórios
 *       403:
 *         description: Sem permissão para criar token
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/login/craft-token'] = async function (reqParams, session, { req }) {
  if (!session.permissions.isAdminSistema) throw Error('Not allowed').HttpStatus(403);
  if (!session.permissions.isMasterUser) throw Error('Not allowed').HttpStatus(403);
  if (!reqParams.userId) throw Error('Missing userId').HttpStatus(400);
  const authHeader = req.get('Authorization');
  const { userSession } = await dielServices.authInternalApi('/diel-internal/auth/craft-token', {
    authHeader: authHeader,
    userId: reqParams.userId,
  });
  const userProfile = await createUserDataToFront(userSession);
  return { userProfile };
}

export function createPasswordHashDb (plainPassword: string) {
  if (!plainPassword) throw Error('Invalid password').HttpStatus(400);
  if (typeof(plainPassword) !== 'string') throw Error('Invalid password type').HttpStatus(500);
  if (!(plainPassword.length >= 4)) throw Error('Invalid password').HttpStatus(400);
  const pwhash = '{V1}' + crypto.createHmac('sha256', servConfig.pwHashDb).update(plainPassword).digest('hex').toUpperCase();
  return pwhash;
}
