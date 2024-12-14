import * as httpRouter from '../apiServer/httpRouter';
import sqldb from '../../srcCommon/db'
import { getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';

export type RateCicleType = {
  CICLE_ID: number
  MODEL_ID: number
  START_CICLE_DATE : string
  END_CICLE_DATE: string
  PIS: number
  VIGENCYCICLE: boolean
  COFINS: number
  ICMS: number
  CONVENTIONALRATE_PARAMETERS?: {
    RATE: string
    CONVENTIONALRATE_ID: number,
  }
  WHITERATE_PARAMETERS?: {
    WHITERATE_ID: number,
    RATE_PONTA: string,
    RATE_OUTPONTA: string,
    START_PONTA: string,
    END_PONTA: string,
    FIRST_MID_RATE: string,
    START_FIRST_MID_RATE: string,
    END_FIRST_MID_RATE: string, 
    LAST_MID_RATE?: string,
    START_LAST_MID_RATE: string,
    END_LAST_MID_RATE: string,
  }
}

/**
 * @swagger
 * /get-rate-cicles:
 *   post:
 *     summary: Listar ciclos
 *     description: Necessário o model_id, retorna uma lista de objetos de ciclos
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: modelo id
 *         schema:
 *           type: object
 *           properties:
 *             MODEL_ID:
 *               type: number
 *               description: ID do modelo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de ciclos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: 
 *                 type: object
 *                 properties:
 *                   CICLE_ID:
 *                     type: number
 *                     description: id do ciclo
 *                   MODEL_ID:
 *                     type: number
 *                     description: id do modelo
 *                   START_CICLE_DATE:
 *                     type: string
 *                     description: data inicio ciclo
 *                   END_CICLE_DATE:
 *                     type: string
 *                     description: data final ciclo
 *                   PIS:
 *                     type: number
 *                     description: valor do PIS
 *                   COFINS:
 *                     type: number
 *                     description: valor do COFINS
 *                   ICMS:
 *                     type: number
 *                     description: valor do ICMS
 *                   VIGENCYCICLE:
 *                     type: boolean
 *                     description: boolean ciclo atual
 *                   CONVENTIONALRATE_PARAMETERS:
 *                     type: object
 *                     properties:
 *                       RATE_ID:
 *                         type: number
 *                         description: id do parametro convencional
 *                   WHITERATE_PARAMETERS:
 *                     type: object
 *                     properties:
 *                       RATE_PONTA:
 *                         type: string
 *                         description: ponta kwh/R$
 *                       RATE_OUTPONTA:
 *                         type: string
 *                         description: fora ponta kwh/R$
 *                       START_PONTA:
 *                         type: string
 *                         description: horario inicio
 *                       END_PONTA:
 *                         type: string
 *                         description: horario fim
 *                       FIRST_MID_RATE:
 *                         type: string
 *                         description: primeira faixa intermediaria kwh/R$
 *                       START_FIRST_MID_RATE:
 *                         type: string
 *                         description: horario inicio
 *                       END_FIRST_MID_RATE:
 *                         type: string
 *                         description: horario fim
 *                       LAST_MID_RATE:
 *                         type: string
 *                         description: ultima faixa intermediaria kwh/$
 *                       START_LAST_MID_RATE:
 *                         type: string
 *                         description: horario inicio
 *                       END_LAST_MID_RATE:
 *                         type: string
 *                         description: horario fim
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/get-rate-cicles'] = async function ({ MODEL_ID }, session) { 
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!MODEL_ID) throw Error('There was an error!\n Missing model id').HttpStatus(400);

  const rateCicles: RateCicleType[] = [];
  const rateCiclesPrev = await sqldb.RATE_CICLES.getRateCicles({ MODEL_ID })

  for (const cicle of rateCiclesPrev) {
    let conventionalRate;
    let whiteRate;

    if (cicle.CONVENTIONALRATE_ID) {
      const conventionalRatePrev = await sqldb.CONVENTIONALRATE_PARAMETERS.getConventionalRateParameters({ CONVENTIONALRATE_ID: cicle.CONVENTIONALRATE_ID });
      conventionalRate = conventionalRatePrev;
    }
    if (cicle.WHITERATE_ID) {
      const whiteRatePrev = await sqldb.WHITERATE_PARAMETERS.getWhiteRateParameters({ WHITERATE_ID: cicle.WHITERATE_ID });
      whiteRate = whiteRatePrev;
    }

    rateCicles.push({
      CICLE_ID: cicle.CICLE_ID,
      MODEL_ID: cicle.MODEL_ID,
      START_CICLE_DATE: cicle.START_CICLE_DATE,
      END_CICLE_DATE: cicle.END_CICLE_DATE,
      PIS: cicle.PIS,
      COFINS: cicle.COFINS,
      ICMS: cicle.ICMS,
      CONVENTIONALRATE_PARAMETERS: conventionalRate,
      WHITERATE_PARAMETERS: whiteRate,
      VIGENCYCICLE: cicle.VIGENCYCICLE

    })
  }
  
  return rateCicles;
}

/**
 * @swagger
 * /get-rate-cicle:
 *   post:
 *     summary: retornar ciclo
 *     description: Necessário o ciclo, retorna ciclo correspondente
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: ciclo id
 *         schema:
 *           type: object
 *           properties:
 *             CICLE_ID:
 *               type: number
 *               description: ID do ciclo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: ciclo de modelo de tarifa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 CICLE_ID:
 *                   type: number
 *                   description: id do ciclo
 *                 MODEL_ID:
 *                   type: number
 *                   description: id do modelo
 *                 START_CICLE_DATE:
 *                   type: string
 *                   description: data inicio ciclo
 *                 END_CICLE_DATE:
 *                   type: string
 *                   description: data final ciclo
 *                 PIS:
 *                   type: number
 *                   description: valor do PIS
 *                 COFINS:
 *                   type: number
 *                   description: valor do COFINS
 *                 ICMS:
 *                   type: number
 *                   description: valor do ICMS
 *                 VIGENCYCICLE:
 *                   type: boolean
 *                   description: boolean ciclo atual
 *                 CONVENTIONALRATE_PARAMETERS:
 *                   type: object
 *                   properties:
 *                     RATE_ID:
 *                       type: number
 *                       description: id do parametro convencional
 *                 WHITERATE_PARAMETERS:
 *                   type: object
 *                   properties:
 *                     RATE_PONTA:
 *                       type: string
 *                       description: ponta kwh/R$
 *                     RATE_OUTPONTA:
 *                       type: string
 *                       description: fora ponta kwh/R$
 *                     START_PONTA:
 *                       type: string
 *                       description: horario inicio
 *                     END_PONTA:
 *                       type: string
 *                       description: horario fim
 *                     FIRST_MID_RATE:
 *                       type: string
 *                       description: primeira faixa intermediaria kwh/R$
 *                     START_FIRST_MID_RATE:
 *                       type: string
 *                       description: horario inicio
 *                     END_FIRST_MID_RATE:
 *                       type: string
 *                       description: horario fim
 *                     LAST_MID_RATE:
 *                       type: string
 *                       description: ultima faixa intermediaria kwh/$
 *                     START_LAST_MID_RATE:
 *                       type: string
 *                       description: horario inicio
 *                     END_LAST_MID_RATE:
 *                       type: string
 *                       description: horario fim
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/get-rate-cicle'] = async function ({ CICLE_ID }, session) { 
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  if (!CICLE_ID) throw Error('There was an error!\n Missing cicle id').HttpStatus(400);

  const rateCiclesPrev = await sqldb.RATE_CICLES.getRateCicleById({ CICLE_ID })

  let conventionalRate;
  let whiteRate;

  if (rateCiclesPrev.CONVENTIONALRATE_ID) {
    const conventionalRatePrev = await sqldb.CONVENTIONALRATE_PARAMETERS.getConventionalRateParameters({ CONVENTIONALRATE_ID: rateCiclesPrev.CONVENTIONALRATE_ID });
    conventionalRate = conventionalRatePrev;
  }
  if (rateCiclesPrev.WHITERATE_ID) {
    const whiteRatePrev = await sqldb.WHITERATE_PARAMETERS.getWhiteRateParameters({ WHITERATE_ID: rateCiclesPrev.WHITERATE_ID });
    whiteRate = whiteRatePrev;
  }

  const rateCicle = {
    MODEL_ID: rateCiclesPrev.MODEL_ID,
    START_CICLE_DATE: rateCiclesPrev.START_CICLE_DATE,
    END_CICLE_DATE: rateCiclesPrev.END_CICLE_DATE,
    PIS: rateCiclesPrev.PIS,
    COFINS: rateCiclesPrev.COFINS,
    ICMS: rateCiclesPrev.ICMS,
    CONVENTIONALRATE_PARAMETERS: conventionalRate,
    WHITERATE_PARAMETERS: whiteRate,
    VIGENCYCICLE: rateCiclesPrev.VIGENCYCICLE
    
  }
  
  return rateCicle;
}
/**
 * @swagger
 * /create-rate-cicle:
 *   post:
 *     summary: criar ciclo
 *     description: cria novo ciclo de tarifa
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informacoes do ciclo
 *         schema:
 *           type: object
 *           properties:
 *             CICLE_ID:
 *               type: number
 *               description: id do ciclo
 *             MODEL_ID:
 *               type: number
 *               description: id do modelo
 *             START_CICLE_DATE:
 *               type: string
 *               description: data inicio ciclo
 *             END_CICLE_DATE:
 *               type: string
 *               description: data final ciclo
 *             PIS:
 *               type: number
 *               description: valor do PIS
 *             COFINS:
 *               type: number
 *               description: valor do COFINS
 *             ICMS:
 *               type: number
 *               description: valor do ICMS
 *             VIGENCYCICLE:
 *               type: boolean
 *               description: boolean ciclo atual
 *             CONVENTIONALRATE_PARAMETERS:
 *               type: object
 *               properties:
 *                 RATE_ID:
 *                   type: number
 *                   description: id do parametro convencional
 *             WHITERATE_PARAMETERS:
 *               type: object
 *               properties:
 *                 RATE_PONTA:
 *                   type: string
 *                   description: ponta kwh/R$
 *                 RATE_OUTPONTA:
 *                   type: string
 *                   description: fora ponta kwh/R$
 *                 START_PONTA:
 *                   type: string
 *                   description: horario inicio
 *                 END_PONTA:
 *                   type: string
 *                   description: horario fim
 *                 FIRST_MID_RATE:
 *                   type: string
 *                   description: primeira faixa intermediaria kwh/R$
 *                 START_FIRST_MID_RATE:
 *                   type: string
 *                   description: horario inicio
 *                 END_FIRST_MID_RATE:
 *                   type: string
 *                   description: horario fim
 *                 LAST_MID_RATE:
 *                   type: string
 *                   description: ultima faixa intermediaria kwh/$
 *                 START_LAST_MID_RATE:
 *                   type: string
 *                   description: horario inicio
 *                 END_LAST_MID_RATE:
 *                   type: string
 *                   description: horario fim
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *                    
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/create-rate-cicle'] = async function (reqParams, session) {
  // Check required 
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }

  if (!reqParams.COFINS) throw Error('There was an error!\nInvalid properties. Missing COFINS.').HttpStatus(400);
  if (!reqParams.ICMS) throw Error('There was an error!\nInvalid properties. Missing ICMS.').HttpStatus(400);
  if (!reqParams.PIS) throw Error('There was an error!\nInvalid properties. Missing PIS.').HttpStatus(400);
  if (!reqParams.START_CICLE_DATE) throw Error('There was an error!\nInvalid properties. Missing START_CICLE_DATE.').HttpStatus(400);

  let conventionalId;
  let whiteRateId;

  const { END_CICLE_DATE } = reqParams;

  if(reqParams.CONVENTIONALRATE_PARAMETERS) {
    const { insertId } = await sqldb.CONVENTIONALRATE_PARAMETERS.w_insert(reqParams.CONVENTIONALRATE_PARAMETERS)
    conventionalId = insertId;
  }

  if(reqParams.WHITERATE_PARAMETERS) {
    const { insertId } = await sqldb.WHITERATE_PARAMETERS.w_insert(reqParams.WHITERATE_PARAMETERS)
    whiteRateId = insertId;
  }

  await sqldb.RATE_CICLES.w_insert({
    MODEL_ID: reqParams.MODEL_ID,
    START_CICLE_DATE: reqParams.START_CICLE_DATE,
    END_CICLE_DATE: reqParams.END_CICLE_DATE,
    PIS: reqParams.PIS,
    COFINS: reqParams.COFINS,
    ICMS: reqParams.ICMS,
    CONVENTIONALRATE_ID: conventionalId,
    WHITERATE_ID: whiteRateId,
    VIGENCYCICLE: checkVigencyCicle(END_CICLE_DATE),
    })


  return 'Cicle created';
}

/**
 * @swagger
 * /update-rate-cicle:
 *   post:
 *     summary: editar ciclo
 *     description: editar ciclo existente
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informacoes do ciclo
 *         schema:
 *           type: object
 *           properties:
 *             CICLE_ID:
 *               type: number
 *               description: id do ciclo
 *             MODEL_ID:
 *               type: number
 *               description: id do modelo
 *             START_CICLE_DATE:
 *               type: string
 *               description: data inicio ciclo
 *             END_CICLE_DATE:
 *               type: string
 *               description: data final ciclo
 *             PIS:
 *               type: number
 *               description: valor do PIS
 *             COFINS:
 *               type: number
 *               description: valor do COFINS
 *             ICMS:
 *               type: number
 *               description: valor do ICMS
 *             VIGENCYCICLE:
 *               type: boolean
 *               description: boolean ciclo atual
 *             CONVENTIONALRATE_PARAMETERS:
 *               type: object
 *               properties:
 *                 RATE_ID:
 *                   type: number
 *                   description: id do parametro convencional
 *             WHITERATE_PARAMETERS:
 *               type: object
 *               properties:
 *                 RATE_PONTA:
 *                   type: string
 *                   description: ponta kwh/R$
 *                 RATE_OUTPONTA:
 *                   type: string
 *                   description: fora ponta kwh/R$
 *                 START_PONTA:
 *                   type: string
 *                   description: horario inicio
 *                 END_PONTA:
 *                   type: string
 *                   description: horario fim
 *                 FIRST_MID_RATE:
 *                   type: string
 *                   description: primeira faixa intermediaria kwh/R$
 *                 START_FIRST_MID_RATE:
 *                   type: string
 *                   description: horario inicio
 *                 END_FIRST_MID_RATE:
 *                   type: string
 *                   description: horario fim
 *                 LAST_MID_RATE:
 *                   type: string
 *                   description: ultima faixa intermediaria kwh/$
 *                 START_LAST_MID_RATE:
 *                   type: string
 *                   description: horario inicio
 *                 END_LAST_MID_RATE:
 *                   type: string
 *                   description: horario fim
 *     responses:
 *       200:
 *         description: ciclo editado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *                    
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/update-rate-cicle'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }

  const { CICLE_ID } = reqParams;

  const rateCicle = await sqldb.RATE_CICLES.getRateCicleById({ CICLE_ID })

  await sqldb.RATE_CICLES.w_updateCicle({ 
    CICLE_ID,
    MODEL_ID: reqParams.MODEL_ID,
    START_CICLE_DATE : reqParams.START_CICLE_DATE,
    END_CICLE_DATE: reqParams.END_CICLE_DATE,
    PIS: reqParams.PIS,
    COFINS: reqParams.COFINS,
    ICMS: reqParams.ICMS,
    VIGENCYCICLE: checkVigencyCicle(reqParams.END_CICLE_DATE),
  })

  if (rateCicle.CONVENTIONALRATE_ID && reqParams.CONVENTIONALRATE_PARAMETERS?.RATE) {
    await sqldb.CONVENTIONALRATE_PARAMETERS.w_updateConventionalRateParameter({ CONVENTIONALRATE_ID: rateCicle.CONVENTIONALRATE_ID, RATE: reqParams.CONVENTIONALRATE_PARAMETERS.RATE })
  }
  if (rateCicle.WHITERATE_ID && reqParams.WHITERATE_PARAMETERS) {
    await sqldb.WHITERATE_PARAMETERS.w_updateWhiteParameter({ WHITERATE_ID: rateCicle.WHITERATE_ID, ...reqParams.WHITERATE_PARAMETERS})
  } 
  
  return 'Cicle updated';
}

/**
 * @swagger
 * delete-rate-cicle:
 *   post:
 *     summary: Deletar ciclo de tarifa
 *     description: deletar ciclo de tarifa atráves do ID
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do ciclo
 *         schema:
 *           type: object
 *           properties:
 *             CICLE_ID:
 *               type: number
 *               description: ID do ciclo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Ciclo deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/delete-rate-cicle'] = async function ({ CICLE_ID }, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }

  const { CONVENTIONALRATE_ID, WHITERATE_ID } = await sqldb.RATE_CICLES.getRateCicleById({ CICLE_ID })

  await sqldb.RATE_CICLES.w_deleteRow({ CICLE_ID })

  if (CONVENTIONALRATE_ID) {
    await sqldb.CONVENTIONALRATE_PARAMETERS.w_deleteRow({ CONVENTIONALRATE_ID })
  }

  if (WHITERATE_ID) {
    await sqldb.WHITERATE_PARAMETERS.w_deleteRow({ WHITERATE_ID })
  }

  return 'cicle deleted';
}

function checkVigencyCicle(data: string) {
  const inicialDate = data.split('/')
  const finalDate = `${inicialDate[1]}/${inicialDate[0]}/${inicialDate[2]}`
  const msec = new Date(finalDate).getTime() - new Date().getTime();

  return msec >= 0 ?  true : false;
}