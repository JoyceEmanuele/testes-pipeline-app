import * as httpRouter from '../apiServer/httpRouter';
import sqldb from '../../srcCommon/db'
import { RateCicleType } from './rateCicles';
import { getPermissionsOnClient, getUserGlobalPermissions } from '../../srcCommon/helpers/permissionControl';

/**
 * @swagger
 * /create-model-rate:
 *   post:
 *     summary: cria modelo de tarifa
 *     description: cria modelo de tarifa
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informacoes do modelo
 *         schema:
 *           type: object
 *           properties:
 *             MODEL_NAME:
 *               type: string
 *               description: nome do modelo
 *             CLIENT_ID:
 *               type: number
 *               description: id do cliente
 *             DISTRIBUTOR_ID:
 *               type: number
 *               description: id do distribuidor
 *             SUBGROUP_ID:
 *               type: number
 *               description: id do sub grupo de taifa
 *             RATEMODALITY_ID:
 *               type: number
 *               description: id da modalidade de tarifa
 *             UNIT_ID:
 *               type: number
 *               description: id da unidade
 *     responses:
 *       200:
 *         description: Modelo criado com sucesso.
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
httpRouter.privateRoutes['/create-model-rate'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }
  // Check required params
  if (!reqParams.MODEL_NAME) throw Error('There was an error!\nInvalid properties. Missing Model name.').HttpStatus(400);
  if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing client_id.').HttpStatus(400);
  if (!reqParams.DISTRIBUTOR_ID) throw Error('There was an error!\nInvalid properties. Missing DISTRIBUTOR.').HttpStatus(400);
  if (!reqParams.RATEMODALITY_ID) throw Error('There was an error!\nInvalid properties. Missing MODALITY.').HttpStatus(400);
  if (!reqParams.SUBGROUP_ID) throw Error('There was an error!\nInvalid properties. Missing SUB_GROUP.').HttpStatus(400);

  await sqldb.RATE_MODELS.w_insert(reqParams)

  return 'Model created';
}

/**
 * @swagger
 * /update-model-rate:
 *   post:
 *     summary: edita modelo de tarifa
 *     description: edita modelo de tarifa existente
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: informacoes do modelo
 *         schema:
 *           type: object
 *           properties:
 *             MODEL_NAME:
 *               type: string
 *               description: nome do modelo
 *             CLIENT_ID:
 *               type: number
 *               description: id do cliente
 *             DISTRIBUTOR_ID:
 *               type: number
 *               description: id do distribuidor
 *             SUBGROUP_ID:
 *               type: number
 *               description: id do sub grupo de taifa
 *             RATEMODALITY_ID:
 *               type: number
 *               description: id da modalidade de tarifa
 *             UNIT_ID:
 *               type: number
 *               description: id da unidade
 *     responses:
 *       200:
 *         description: Modelo criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/update-model-rate'] = async function (reqParams, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  }

  if (!reqParams.MODEL_ID) throw Error('There was an error!\nInvalid properties. Missing MODEL_ID.').HttpStatus(400);

  await sqldb.RATE_MODELS.w_updateModel(reqParams)

  return 'Model updated';
}

/**
 * @swagger
 * /load-model-options:
 *   post:
 *     summary: opcoes de modelo
 *     description: opcoes de modelo
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     responses:
 *       200:
 *         description: Opcoes de modelo tarifa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rateModalities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: nome do item
 *                       value:
 *                         type: number
 *                         description: value do item
 *                 rateGroups:
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: nome do item
 *                       value:
 *                         type: number
 *                         description: value do item
 *                 rateSubGroups:
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: nome do item
 *                       value:
 *                         type: number
 *                         description: value do item
 *                       groupId:
 *                         type: number
 *                         description: id do grupo
 *                 distributors:
 *                   type: array
 *                   items: 
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: nome do item
 *                       value:
 *                          type: number
 *                          description: value do item
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/load-model-options'] = async function (reqParams, session) {
  const perms = await getPermissionsOnClient(session, reqParams.clientId);
  if (!perms.canManageClient) {
    throw Error('Permission denied!').HttpStatus(403);
  }
  const rateModalities = await sqldb.RATE_MODALITY.getRateModalities()
  const rateGroups = await sqldb.RATE_GROUPS.getRateGroups();
  const rateSubGroups = await sqldb.RATE_SUBGROUPS.getSubgroup();
  const distributors = await sqldb.DISTRIBUTORS.getAllDistributors();

  const editModelOptions = {
    rateModalities: rateModalities.map((rate) => ({ name: rate.RATEMODALITY_NAME, value: rate.RATEMODALITY_ID })),
    rateGroups: rateGroups.map((rate) => ({ name: rate.GROUP_NAME, value: rate.RATEGROUP_ID })),
    rateSubGroups: rateSubGroups.map((rate) => ({ name: rate.SUBGROUP_NAME, value: rate.SUBGROUP_ID, groupId: rate.RATEGROUP_ID })),
    distributors: distributors.map((distributor) => ({ name: distributor.DISTRIBUTOR_LABEL, value: distributor.DISTRIBUTOR_ID }))
  };

  return editModelOptions;
}


/**
 * @swagger
 * /get-model-rates:
 *   post:
 *     summary: Listar modelos de um cliente
 *     description: Necessário o cliente, retorna uma lista de objetos de modelos
 *     tags:
 *      - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: id do cliente
 *         schema:
 *           type: object
 *           properties:
 *             CLIENT_ID:
 *               type: number
 *               description: ID do cliente
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Lista de modelos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: 
 *                 type: object
 *                 properties:
 *                   modelName:
 *                     type: number
 *                     description: nome do modelo
 *                   modelId:
 *                     type: number
 *                     description: ID do modelo
 *                   distributorId:
 *                     type: string
 *                     description: ID do distribuidor
 *                   unitId:
 *                     type: string
 *                     description: ID do cliente
 *                   unitName:
 *                     type: number
 *                     description: ID da unidade
 *                   subGroupId:
 *                     type: number
 *                     description: ID do sub grupo de tarifa
 *                   subGroupName:
 *                     type: string
 *                     description: Nome do sub grupo
 *                   rateGroupId:
 *                     type: number
 *                     description: ID do grupo de tarifa
 *                   groupName:
 *                     type: string
 *                     description: Nome do grupo de tarifa
 *                   rateModalityId:
 *                     type: number
 *                     description: Id da modalidade de tarifa
 *                   rateModalityName:
 *                     type: string
 *                     description: Nome da modalidade de tarifa
 *                   distributorTag:
 *                     type: string
 *                     description: Tag do distribuidor
 *                   distributorLabel:
 *                     type: string
 *                     description: Label do distribuidor
 *                   rateCicles:
 *                     type: array
 *                     items: 
 *                       type: object
 *                       properties:
 *                         CICLE_ID:
 *                           type: number
 *                           description: ID do ciclo
 *                         MODEL_ID:
 *                           type: number
 *                           description: ID do modelo
 *                         START_CICLE_DATE:
 *                           type: string
 *                           description: Inicio do ciclo
 *                         END_CICLE_DATE:
 *                           type: string
 *                           description: Fim do ciclo
 *                         ICMS:
 *                           type: number
 *                           description: Valor do ICMS
 *                         PIS:
 *                           type: number
 *                           description: Valor do PIS
 *                         COFINS:
 *                           type: number
 *                           description: Valor do COFINS
 *                         CONVENTIONALRATE_PARAMETERS:
 *                           type: object
 *                           properties:
 *                             RATE_ID:
 *                               type: number
 *                               description: id do parametro convencional
 *                         WHITERATE_PARAMETERS:
 *                           type: object
 *                           properties:
 *                             RATE_PONTA:
 *                               type: string
 *                               description: ponta kwh/R$
 *                             RATE_OUTPONTA:
 *                               type: string
 *                               description: fora ponta kwh/R$
 *                             START_PONTA:
 *                               type: string
 *                               description: horario inicio
 *                             END_PONTA:
 *                               type: string
 *                               description: horario fim
 *                             FIRST_MID_RATE:
 *                               type: string
 *                               description: primeira faixa intermediaria kwh/R$
 *                             START_FIRST_MID_RATE:
 *                               type: string
 *                               description: horario inicio
 *                             END_FIRST_MID_RATE:
 *                               type: string
 *                               description: horario fim
 *                             LAST_MID_RATE:
 *                               type: string
 *                               description: ultima faixa intermediaria kwh/$
 *                             START_LAST_MID_RATE:
 *                               type: string
 *                               description: horario inicio
 *                             END_LAST_MID_RATE:
 *                               type: string
 *                               description: horario fim
 *                    
 *       400:
 *         description: Faltando parâmetros obrigatórios, parâmetros inválidos.
 *       403:
 *         description: Usuario sem permissão para modelos de tarifa.
 *       500:
 *         description: Erro interno do servidor
 */
httpRouter.privateRoutes['/get-model-rates'] = async function (reqParams, session) {
  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (!perms.canManageClient) {
    throw Error('Acesso negado').HttpStatus(403);
  }
    if (!reqParams.CLIENT_ID) throw Error('There was an error!\nInvalid properties. Missing client_id.').HttpStatus(400);

    const { CLIENT_ID } = reqParams;

    const foundModels = await sqldb.RATE_MODELS.getRateModels({ CLIENT_ID })

    if (!foundModels) throw Error('There was an error!\nNo models found.').HttpStatus(400);

    const models = [];

    for(const model of foundModels) {
      const rateCicles: RateCicleType[] = [];
      const rateCiclesPrev = await sqldb.RATE_CICLES.getRateCicles({ MODEL_ID: model.MODEL_ID });

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

      models.push({
        modelName: model.MODEL_NAME,
        modelId: model.MODEL_ID,
        distributorId: model.DISTRIBUTOR_ID,
        subGroupId: model.SUBGROUP_ID,
        subGroupName: model.SUBGROUP_NAME,
        rateGroupId: model.RATEGROUP_ID,
        groupName: model.GROUP_NAME,
        rateModalityId: model.RATEMODALITY_ID,
        rateModalityName: model.RATEMODALITY_NAME,
        distributorTag: model.DISTRIBUTOR_TAG,
        distributorLabel: model.DISTRIBUTOR_LABEL,
        rateCicles,
      })
    }

    return models;
}

/**
 * @swagger
 * /delete-model-rate:
 *   post:
 *     summary: Deletar modelo de tarifa
 *     description: deletar modelo de tarifa atráves do ID
 *     tags:
 *       - Modelos de Tarifa
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados do modelo
 *         schema:
 *           type: object
 *           properties:
 *             MODEL_ID:
 *               type: number
 *               description: ID do Modelo
 *               default: ""
 *               required: true
 *     responses:
 *       200:
 *         description: Modelo deletado com sucesso
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

httpRouter.privateRoutes['/delete-model-rate'] = async function (reqParams: { MODEL_ID: number }, session) {
  const perms = getUserGlobalPermissions(session);
  if (!perms.manageAllClientsUnitsAndDevs) {
    throw Error('Acesso negado').HttpStatus(403);
  } 
  
  if (!reqParams.MODEL_ID) throw Error('There was an error!\nInvalid properties. Missing model_id').HttpStatus(400);

  const { MODEL_ID } = reqParams;
  const rateCicles = await sqldb.RATE_CICLES.getRateCicles({ MODEL_ID })

  if (rateCicles) {
    for (const cicle of rateCicles) {
      await sqldb.RATE_CICLES.w_deleteRow({ CICLE_ID: cicle.CICLE_ID })
    }
  }

  await sqldb.RATE_MODELS.w_deleteRow({ MODEL_ID })

  return 'Model deleted';
}
