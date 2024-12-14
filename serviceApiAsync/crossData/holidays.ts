import * as httpRouter from '../apiServer/httpRouter'
import sqldb from '../../srcCommon/db'

/**
 * @swagger
 * /get-holidays-list:
 *   get:
 *     summary: Lista de feriados
 *     description: Retorna uma lista de feriados entre a data atual e um ano à frente
 *     tags:
 *       - Feriados
 *     security:
 *      - Bearer: []
 *     responses:
 *       200:
 *         description: Lista de feriados obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   description: Lista de feriados
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do feriado
 *                       name:
 *                         type: string
 *                         description: Nome do feriado
 *                       date:
 *                         type: string
 *                         description: Data do feriado no formato YYYY-MM-DD
 *                       type:
 *                         type: string
 *                         description: Tipo do feriado
 *                       createdAt:
 *                         type: string
 *                         description: Data de criação do feriado no formato ISO 8601
 *                       updatedAt:
 *                         type: string
 *                         description: Data de atualização do feriado no formato ISO 8601
 *       401:
 *         description: Token de autorização inválido ou expirado
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/get-holidays-list'] = async function (reqParams, session) {
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const nextYear = new Date(today.getTime());
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  const list = await sqldb.FERIADOS.getList({
    datStart: today.toISOString().substr(0, 10),
    datEndExc: nextYear.toISOString().substr(0, 10),
  });
  return { list }
}
