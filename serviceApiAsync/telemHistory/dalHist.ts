import sqldb from '../../srcCommon/db'
import { API_private2 } from '../../srcCommon/types/api-private'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl'
import { mergeVarsCommomX, parseCompressedChartData, processReceivedHistoryDAL } from '../../srcCommon/helpers/chartDataFormats'
import { getDaysList_YMD } from '../../srcCommon/helpers/dates';
import { processDalDay } from '../dayCompilers/dal';

const getCompiledDaysData = async (days: string[], devCode: string, user: string) => {
  // seleciona dados para cada dia do range
  async function compileData (day: string) {
    const dalDayProcessed = await processDalDay({ motivo: `/dal/get-illuminations-charts-data P1 ${user}`, dalCode: devCode, day });
    return {
      Relays: dalDayProcessed?.Relays,
      Feedback: dalDayProcessed?.Feedback,
      provision_error: dalDayProcessed?.provision_error
    }
  }
  let compiledData = await Promise.all(days.map(day => compileData(day)));
  compiledData = compiledData.filter((x) => x != null);

  let datas = [] as {[key: string]: {v: number[], c: number[]}[] | boolean}[];
  compiledData.forEach(data => {
    data && datas.push(
    {
      Relays: data.Relays?.map((value) => parseCompressedChartData(value)) || undefined,
      Feedback: data.Feedback?.map((value) => parseCompressedChartData(value)) || undefined,
      provision_error: data.provision_error,
    })
  }
  )

  return datas;
}

/**
 * @swagger
 * /dal/get-illuminations-charts-data:
 *   post:
 *     summary: Índice de Uso do DAL/Iluminação
 *     description: Retorna o índice de uso do DAL com uma mesma quantidade de pontos em cada tipo de dados em um intervalo de datas
 *     tags:
 *      - DalHist
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Parâmetros
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dalCode:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Código do dispositivo DAL
 *             dayYMD:
 *               required: true
 *               type: string
 *               default: ""
 *               description: Data inicial para o filtro YYYY-MM-DD
 *             numDays:
 *                required: false
 *                type: number
 *                default: null
 *                description: Quantidade de dias a ser filtrado
 *     responses:
 *       200:
 *         description: Ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commonX:
 *                   type: array
 *                   items:
 *                     type: number
 *                 vars:
 *                   type: any
 *       403:
 *         description: Sem autorização
 *       500:
 *         description: Erro interno do servidor
 */
export const getDayChartsData: API_private2['/dal/get-illuminations-charts-data'] = async function (reqParams, session) {
  // # Verifica permissão
  const devCode = reqParams.dalCode
  if (!devCode) throw Error('Invalid parameters! Missing dalCode').HttpStatus(400)
  const dalInf = await sqldb.DALS.getBasicInfo({ DAL_CODE: devCode });
  if (!dalInf) throw Error('DAL não encontrado').HttpStatus(400)
  const perms = await getPermissionsOnUnit(session, dalInf.CLIENT_ID, dalInf.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  if (reqParams.numDays === undefined) throw Error('Missing numDays');

  const days = getDaysList_YMD(reqParams.dayYMD, reqParams.numDays);
  const datas = await getCompiledDaysData(days, devCode, session.user);

  // Calcula todos valores de pontos X em horas para os dados recebidos
  let parsedGraphData = datas.map((data, i)=> processReceivedHistoryDAL(data, i));

  let vars = {
    Relays: [], Feedback: []
  } as {[key: string] : {x: number , y?: number, L?: number }[][]};

  parsedGraphData?.forEach(data => {
    data.parsedGraphData.Relays.forEach((data, index) => {
      if (!vars.Relays[index]) { vars.Relays[index] = []; }
      vars.Relays[index] = vars.Relays[index].concat(data);
    });
    data.parsedGraphData.Feedback.forEach((data, index) => {
      if (!vars.Feedback[index]) { vars.Feedback[index] = []; }
      vars.Feedback[index] = vars.Feedback[index].concat(data);
    });
  });

  let cAux = [] as any[];
  let vAux = [] as any[];
  let LAux = [] as any[];
  let varList = [] as any[];

  const relaysLength = vars.Relays.length;
  const feedbackLength = vars.Feedback.length;

  for (const property in vars) {
    if (vars.hasOwnProperty(property)) {
      vars[property].forEach((dataList: {x: number , y?: number, L?: number }[]) => {
          dataList.forEach((data: {x: number , y?: number, L?: number }) => {
            cAux.push(data.x);
            LAux.push(data.L);
            vAux.push(data.y);
          })

          varList.push({c: cAux, v: vAux, L: LAux});
          cAux = []; LAux = []; vAux = [];
        }
      )
    }
  }

  const list = mergeVarsCommomX(varList, reqParams.numDays) as {c: number[], vs: number[][], L: number[][]};

  return {
    commonX: list.c,
    vars: {
      Relays: list.vs.slice(0, relaysLength),
      Feedback: list.vs.slice(list.vs.length - feedbackLength, list.vs.length),
    }
  }
}
