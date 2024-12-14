import * as sqldb from '../connectSql'
import { saveOperationLog, OperationLogData } from '../dbModifLog'
import { dbLogger } from '../../../srcCommon/helpers/logger'

/* @IFHELPER:FUNC addVisitaTecnica = INSERT
  FROM VISITATECNICA
  FIELD VISITATECNICA.CLIENT_ID
  FIELD VISITATECNICA.UNIT_ID
  FIELD VISITATECNICA.TECNICO_ID
  FIELD VISITATECNICA.RESPONSAVEL
  FIELD VISITATECNICA.VTDATE
  FIELD VISITATECNICA.VTTIME
  FIELD VISITATECNICA.CARACTERISTICA
  FIELD VISITATECNICA.VTUPDATE
  FIELD [[IFOWNPROP {:AMBIENTES}]] VISITATECNICA.AMBIENTES
  FIELD [[IFOWNPROP {:MAQUINAS}]] VISITATECNICA.MAQUINAS
  FIELD [[IFOWNPROP {:PLANTABAIXA_IMG}]] VISITATECNICA.PLANTABAIXA_IMG
  FIELD [[IFOWNPROP {:AUTORIZACAO_IMG}]] VISITATECNICA.AUTORIZACAO_IMG
  FIELD [[IFOWNPROP {:OBSERVACAO}]] VISITATECNICA.OBSERVACAO
*/
export async function w_addVisitaTecnica (qPars: {
  CLIENT_ID: number,
  UNIT_ID: number,
  TECNICO_ID: string,
  RESPONSAVEL: string,
  VTDATE: string,
  VTTIME: string,
  CARACTERISTICA: string,
  VTUPDATE: number,
  AMBIENTES?: number,
  MAQUINAS?: number,
  PLANTABAIXA_IMG?: string,
  AUTORIZACAO_IMG?: string,
  OBSERVACAO?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  fields.push('CLIENT_ID')
  fields.push('UNIT_ID')
  fields.push('TECNICO_ID')
  fields.push('RESPONSAVEL')
  fields.push('VTDATE')
  fields.push('VTTIME')
  fields.push('CARACTERISTICA')
  fields.push('VTUPDATE')
  if (qPars.AMBIENTES !== undefined) { fields.push('AMBIENTES') }
  if (qPars.MAQUINAS !== undefined) { fields.push('MAQUINAS') }
  if (qPars.PLANTABAIXA_IMG !== undefined) { fields.push('PLANTABAIXA_IMG') }
  if (qPars.AUTORIZACAO_IMG !== undefined) { fields.push('AUTORIZACAO_IMG') }
  if (qPars.OBSERVACAO !== undefined) { fields.push('OBSERVACAO') }

  const sentence = `INSERT INTO VISITATECNICA (${fields.join(', ')}) VALUES (:${fields.join(', :')})`

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC updateVisitaTecnica = UPDATE
  PARAM ID: {VISITATECNICA.ID}
  FROM VISITATECNICA
  FIELD [[IFOWNPROP {:CLIENT_ID}]]       VISITATECNICA.CLIENT_ID
  FIELD [[IFOWNPROP {:UNIT_ID}]]         VISITATECNICA.UNIT_ID
  FIELD [[IFOWNPROP {:STATUS_ID}]]       VISITATECNICA.STATUS_ID
  FIELD [[IFOWNPROP {:TECNICO_ID}]]      VISITATECNICA.TECNICO_ID
  FIELD [[IFOWNPROP {:VTDATE}]]          VISITATECNICA.VTDATE
  FIELD [[IFOWNPROP {:VTTIME}]]          VISITATECNICA.VTTIME
  FIELD [[IFOWNPROP {:AMBIENTES}]]       VISITATECNICA.AMBIENTES
  FIELD [[IFOWNPROP {:MAQUINAS}]]        VISITATECNICA.MAQUINAS
  FIELD [[IFOWNPROP {:CARACTERISTICA}]]  VISITATECNICA.CARACTERISTICA
  FIELD [[IFOWNPROP {:PLANTABAIXA_IMG}]] VISITATECNICA.PLANTABAIXA_IMG
  FIELD [[IFOWNPROP {:AUTORIZACAO_IMG}]] VISITATECNICA.AUTORIZACAO_IMG
  FIELD [[IFOWNPROP {:OBSERVACAO}]]      VISITATECNICA.OBSERVACAO
  FIELD [[IFOWNPROP {:OBSERVACAO_REAGENDAMENTO}]]      VISITATECNICA.OBSERVACAO_REAGENDAMENTO
  FIELD [[IFOWNPROP {:RESPONSAVEL}]]      VISITATECNICA.RESPONSAVEL
  FIELD [[IFOWNPROP {:VTDELETED}]]      VISITATECNICA.VTDELETED
  CONSTFIELD VTUPDATE = ${new Date().getTime()}
*/
export async function w_updateVisitaTecnica (qPars: {
  ID: number,
  CLIENT_ID?: number,
  UNIT_ID?: number,
  STATUS_ID?: number,
  TECNICO_ID?: string,
  VTDATE?: string,
  VTTIME?: string,
  AMBIENTES?: number,
  MAQUINAS?: number,
  CARACTERISTICA?: string,
  PLANTABAIXA_IMG?: string,
  AUTORIZACAO_IMG?: string,
  OBSERVACAO?: string,
  OBSERVACAO_REAGENDAMENTO?: string,
  RESPONSAVEL?: string,
  VTDELETED?: string
}, operationLogData: OperationLogData) {
  const fields: string[] = []
  if (qPars.CLIENT_ID !== undefined && qPars.CLIENT_ID !== null) { fields.push('CLIENT_ID = :CLIENT_ID') }
  if (qPars.UNIT_ID !== undefined && qPars.UNIT_ID !== null) { fields.push('UNIT_ID = :UNIT_ID') }
  if (qPars.STATUS_ID !== undefined && qPars.STATUS_ID !== null) { fields.push('STATUS_ID = :STATUS_ID') }
  if (qPars.TECNICO_ID !== undefined && qPars.TECNICO_ID !== null) { fields.push('TECNICO_ID = :TECNICO_ID') }
  if (qPars.VTDATE !== undefined && qPars.VTDATE !== null) { fields.push('VTDATE = :VTDATE') }
  if (qPars.VTTIME !== undefined && qPars.VTTIME !== null) { fields.push('VTTIME = :VTTIME') }
  if (qPars.AMBIENTES !== undefined && qPars.AMBIENTES !== null) { fields.push('AMBIENTES = :AMBIENTES') }
  if (qPars.MAQUINAS !== undefined && qPars.MAQUINAS !== null) { fields.push('MAQUINAS = :MAQUINAS') }
  if (qPars.CARACTERISTICA !== undefined && qPars.CARACTERISTICA !== null) { fields.push('CARACTERISTICA = :CARACTERISTICA') }
  if (qPars.PLANTABAIXA_IMG !== undefined && qPars.PLANTABAIXA_IMG !== null) { fields.push('PLANTABAIXA_IMG = :PLANTABAIXA_IMG') }
  if (qPars.AUTORIZACAO_IMG !== undefined && qPars.AUTORIZACAO_IMG !== null) { fields.push('AUTORIZACAO_IMG = :AUTORIZACAO_IMG') }
  if (qPars.OBSERVACAO !== undefined && qPars.OBSERVACAO !== null) { fields.push('OBSERVACAO = :OBSERVACAO') }
  if (qPars.OBSERVACAO_REAGENDAMENTO !== undefined && qPars.OBSERVACAO_REAGENDAMENTO !== null) { fields.push('OBSERVACAO_REAGENDAMENTO = :OBSERVACAO_REAGENDAMENTO') }
  if (qPars.RESPONSAVEL !== undefined && qPars.RESPONSAVEL !== null) { fields.push('RESPONSAVEL = :RESPONSAVEL') }
  if (qPars.VTDELETED !== undefined && qPars.VTDELETED !== null) { fields.push('VTDELETED = :VTDELETED') }
  if (!fields.length) throw Error('No fields to update').HttpStatus(500).DebugInfo({ qPars })

  fields.push(`VTUPDATE = ${new Date().getTime()}`)

  const sentence = `UPDATE VISITATECNICA SET ${fields.join(', ')} WHERE ID = :ID`

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteVisitaTecnica = DELETE
  PARAM ID: {VISITATECNICA.ID}
  FROM VISITATECNICA
  WHERE {VISITATECNICA.ID} = {:ID}
*/
export async function w_deleteVisitaTecnica (qPars: { ID: number }, delChecks: {
  VTENVIRONMENTS: true,
  VTMACHINES: true,
  VTENERGIES?: true,
  VTWATERMEASURERS?: true,
  VTDRTS?: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VISITATECNICA WHERE VISITATECNICA.ID = :ID`;

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getTecnico = SELECT ROW
  PARAM ID: {VISITATECNICA.ID}

  FROM VISITATECNICA
  INNER JOIN (DASHUSERS.EMAIL = VISITATECNICA.TECNICO_ID)
  INNER JOIN (CITY.CITY_ID = DASHUSERS.CITY_ID)
  INNER JOIN (CITY.STATE_ID = STATEREGION.ID)
  INNER JOIN (USERSCLIENTS.USER_ID = VISITATECNICA.TECNICO_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)

  SELECT DASHUSERS.NOME
  SELECT DASHUSERS.SOBRENOME
  SELECT DASHUSERS.EMAIL
  SELECT DASHUSERS.RG
  SELECT DASHUSERS.PHONENB AS TEC_PHONE
  SELECT DASHUSERS.COMMENTS
  SELECT CITY.NAME AS CITY
  SELECT STATEREGION.FULL_NAME AS STATE
  SELECT CLIENTS.NAME AS CLIENT
  SELECT CLIENTS.CNPJ
  SELECT CLIENTS.PHONE AS CLIENT_PHONE

  WHERE {VISITATECNICA.ID} = {:ID}
*/
export function getTecnico (qPars: { ID: number }) {
  let sentence = `
    SELECT
      DASHUSERS.NOME,
      DASHUSERS.SOBRENOME,
      DASHUSERS.EMAIL,
      DASHUSERS.RG,
      DASHUSERS.PHONENB AS TEC_PHONE,
      DASHUSERS.COMMENTS,
      CITY.NAME AS CITY,
      STATEREGION.NAME AS STATE,
      CLIENTS.NAME AS CLIENT,
      CLIENTS.CNPJ,
      CLIENTS.PHONE AS CLIENT_PHONE
  `
  sentence += `
    FROM
      VISITATECNICA
      INNER JOIN DASHUSERS ON (DASHUSERS.EMAIL = VISITATECNICA.TECNICO_ID AND DASHUSERS.IS_ACTIVE = '1')
      INNER JOIN CITY ON (CITY.CITY_ID = DASHUSERS.CITY_ID)
      LEFT JOIN STATEREGION ON (STATEREGION.ID = CITY.STATE_ID)
      INNER JOIN USERSCLIENTS ON (USERSCLIENTS.USER_ID = VISITATECNICA.TECNICO_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = USERSCLIENTS.CLIENT_ID)
  `

  sentence += ` WHERE VISITATECNICA.ID = :ID `

  return sqldb.querySingle<{
    NOME: string
    SOBRENOME: string
    EMAIL: string
    RG: string
    TEC_PHONE: string
    COMMENTS: string
    CITY: string
    STATE: string
    CLIENT: string
    CNPJ: string
    CLIENT_PHONE: string
  }>(sentence, qPars)
}

// var now = new Date();
// var todayUTC = new Date(
//   Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
// );
// conditions.push(
//   `VISITATECNICA.VTDATE = '${todayUTC.toISOString().slice(0, 10)}'`
// );

/* @IFHELPER:FUNC getVisitaTecnica = SELECT LIST
  PARAM ID?: {VISITATECNICA.ID}
  PARAM STATUS_ID?: {VISITATECNICA.STATUS_ID}[]
  PARAM USER?: {DASHUSERS.EMAIL}
  PARAM VTDATE?: {VISITATECNICA.VTDATE}
  PARAM VTDATE_ABOVE?: {VISITATECNICA.VTDATE}
  PARAM VTUPDATE?: {VISITATECNICA.VTUPDATE}
  PARAM VTDELETED?: {VISITATECNICA.VTDELETED}
  PARAM VTDELETED_DATE_UNDER?: {VISITATECNICA.VTUPDATE}

  FROM VISITATECNICA
  INNER JOIN (VTSTATUS.ID = VISITATECNICA.STATUS_ID)
  INNER JOIN (CLUNITS.UNIT_ID = VISITATECNICA.UNIT_ID)
  INNER JOIN (CLIENTS.CLIENT_ID = VISITATECNICA.CLIENT_ID)
  INNER JOIN AS UC (CITY.CITY_ID = CLUNITS.CITY_ID)
  INNER JOIN AS R (DASHUSERS.EMAIL = VISITATECNICA.RESPONSAVEL)
  INNER JOIN AS T (DASHUSERS.EMAIL = VISITATECNICA.TECNICO_ID)
  LEFT JOIN AS TC (CITY.CITY_ID = T.CITY_ID)

  SELECT VISITATECNICA.ID
  SELECT VISITATECNICA.CLIENT_ID
  SELECT VISITATECNICA.UNIT_ID
  SELECT VISITATECNICA.TECNICO_ID
  SELECT VISITATECNICA.STATUS_ID
  SELECT VISITATECNICA.VTDATE
  SELECT VISITATECNICA.VTTIME
  SELECT VISITATECNICA.AMBIENTES
  SELECT VISITATECNICA.MAQUINAS
  SELECT VISITATECNICA.CARACTERISTICA
  SELECT VISITATECNICA.PLANTABAIXA_IMG
  SELECT VISITATECNICA.AUTORIZACAO_IMG
  SELECT VISITATECNICA.OBSERVACAO
  SELECT VISITATECNICA.OBSERVACAO_REAGENDAMENTO
  SELECT VISITATECNICA.RESPONSAVEL
  SELECT UC.NAME AS CITY_NAME
  SELECT CLIENTS.NAME AS CLIENT_NAME
  SELECT CLUNITS.UNIT_NAME
  SELECT CLUNITS.LAT AS UNIT_LAT
  SELECT CLUNITS.LON AS UNIT_LON
  SELECT R.NOME AS RESPONSAVEL_NOME
  SELECT R.PHONENB AS RESPONSAVEL_PHONE
  SELECT T.NOME AS TECNICO_NOME
  SELECT T.SOBRENOME AS TECNICO_SOBRENOME
  SELECT T.PHONENB AS TECNICO_PHONE
  SELECT TC.NAME AS CIDADE_TECNICO
  SELECT VTSTATUS.STATUS
  SELECT VISITATECNICA.VTUPDATE

  WHERE [[IFJS {:ID}]] {VISITATECNICA.ID} = {:ID}
  WHERE [[IFJS {:STATUS_ID} && {:STATUS_ID}.length]] {VISITATECNICA.STATUS_ID} IN ({:STATUS_ID})
  WHERE [[IFJS {:USER}]] {T.EMAIL} = {:USER}
  WHERE [[IFJS {:VTDATE}]] {VISITATECNICA.VTDATE} = {:VTDATE}
  WHERE [[IFJS {:VTDATE_ABOVE}]] {VISITATECNICA.VTDATE} >= {:VTDATE_ABOVE}
  WHERE [[IFJS {:VTUPDATE}]] {VISITATECNICA.VTUPDATE} > {:VTUPDATE}
  WHERE [[IFJS {:VTDELETED}]] {VISITATECNICA.VTDELETED} = {:VTDELETED}
  WHERE [[ELSE]] {VISITATECNICA.VTDELETED} = '0'
  WHERE [[IFJS {:VTDELETED_DATE_UNDER}]] {VISITATECNICA.VTUPDATE} < {:VTDELETED_DATE_UNDER}
*/
export function getVisitaTecnica (qPars: {
  ID?: number,
  STATUS_ID?: number[],
  USER?: string,
  VTDATE?: string,
  VTDATE_ABOVE?: string,
  VTUPDATE?: number,
  VTDELETED?: string,
  VTDELETED_DATE_UNDER?: number
}) {
  let sentence = `
    SELECT
      VISITATECNICA.ID,
      VISITATECNICA.CLIENT_ID,
      VISITATECNICA.UNIT_ID,
      VISITATECNICA.TECNICO_ID,
      VISITATECNICA.STATUS_ID,
      VISITATECNICA.VTDATE,
      VISITATECNICA.VTTIME,
      VISITATECNICA.AMBIENTES,
      VISITATECNICA.MAQUINAS,
      VISITATECNICA.CARACTERISTICA,
      VISITATECNICA.PLANTABAIXA_IMG,
      VISITATECNICA.AUTORIZACAO_IMG,
      VISITATECNICA.OBSERVACAO,
      VISITATECNICA.OBSERVACAO_REAGENDAMENTO,
      VISITATECNICA.RESPONSAVEL,
      UC.NAME AS CITY_NAME,
      CLIENTS.NAME AS CLIENT_NAME,
      CLUNITS.UNIT_NAME,
      CLUNITS.LAT AS UNIT_LAT,
      CLUNITS.LON AS UNIT_LON,
      R.NOME AS RESPONSAVEL_NOME,
      R.PHONENB AS RESPONSAVEL_PHONE,
      T.NOME AS TECNICO_NOME,
      T.SOBRENOME AS TECNICO_SOBRENOME,
      T.PHONENB AS TECNICO_PHONE,
      TC.NAME AS CIDADE_TECNICO,
      VTSTATUS.STATUS,
      VISITATECNICA.VTUPDATE
  `
  sentence += `
    FROM
      VISITATECNICA
      INNER JOIN VTSTATUS ON (VTSTATUS.ID = VISITATECNICA.STATUS_ID)
      INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = VISITATECNICA.UNIT_ID)
      INNER JOIN CLIENTS ON (CLIENTS.CLIENT_ID = VISITATECNICA.CLIENT_ID)
      INNER JOIN CITY AS UC ON (UC.CITY_ID = CLUNITS.CITY_ID)
      INNER JOIN DASHUSERS AS R ON (R.EMAIL = VISITATECNICA.RESPONSAVEL AND R.IS_ACTIVE = '1')
      INNER JOIN DASHUSERS AS T ON (T.EMAIL = VISITATECNICA.TECNICO_ID AND T.IS_ACTIVE = '1')
      LEFT JOIN CITY AS TC ON (TC.CITY_ID = T.CITY_ID)
  `

  const conditions: string[] = []
  if (qPars.ID) { conditions.push(`VISITATECNICA.ID = :ID`) }
  if (qPars.STATUS_ID && qPars.STATUS_ID.length) { conditions.push(`VISITATECNICA.STATUS_ID IN (:STATUS_ID)`) }
  if (qPars.USER) { conditions.push(`T.EMAIL = :USER`) }
  if (qPars.VTDATE) { conditions.push(`VISITATECNICA.VTDATE = :VTDATE`) }
  if (qPars.VTDATE_ABOVE) { conditions.push(`VISITATECNICA.VTDATE >= :VTDATE_ABOVE`) }
  if (qPars.VTUPDATE) { conditions.push(`VISITATECNICA.VTUPDATE > :VTUPDATE`) }
  if (qPars.VTDELETED) { conditions.push(`VISITATECNICA.VTDELETED = :VTDELETED`) }
  else { conditions.push(`VISITATECNICA.VTDELETED = '0'`) }
  if (qPars.VTDELETED_DATE_UNDER) { conditions.push(`VISITATECNICA.VTUPDATE < :VTDELETED_DATE_UNDER`) }
  sentence += ' WHERE ' + conditions.join(' AND ')
  
  return sqldb.query<{
    ID: number
    CLIENT_ID: number
    UNIT_ID: number
    TECNICO_ID: string
    STATUS_ID: number
    VTDATE: string
    VTTIME: string
    AMBIENTES: number
    MAQUINAS: number
    CARACTERISTICA: string
    PLANTABAIXA_IMG: string
    AUTORIZACAO_IMG: string
    OBSERVACAO: string
    OBSERVACAO_REAGENDAMENTO: string
    RESPONSAVEL: string
    CITY_NAME: string
    CLIENT_NAME: string
    UNIT_NAME: string
    UNIT_LAT: string
    UNIT_LON: string
    RESPONSAVEL_NOME: string
    RESPONSAVEL_PHONE: string
    TECNICO_NOME: string
    TECNICO_SOBRENOME: string
    TECNICO_PHONE: string
    CIDADE_TECNICO: string
    STATUS: string
    VTUPDATE: number
  }>(sentence, qPars)
}

// export function getListVisitasTecnicasByStatus(qPars: { STATUS_ID: number[], USER: string }) {
//   let sentence = `
//     SELECT
//       VISITATECNICA.ID
//       ,VISITATECNICA.UNIT_ID
//       ,VISITATECNICA.TECNICO_ID
//       ,VISITATECNICA.VTDATE
//       ,VISITATECNICA.VTTIME
//       ,VISITATECNICA.STATUS_ID
//       ,VISITATECNICA.OBSERVACAO_REAGENDAMENTO
//       ,DASHUSERS.SOBRENOME TECNICO_SOBRENOME
//       ,DASHUSERS.NOME TECNICO_NOME
//       ,VTSTATUS.STATUS
//       ,CLUNITS.UNIT_NAME
//   `;
//   sentence += `
//     FROM
//       VISITATECNICA
//       INNER JOIN VTSTATUS ON (VTSTATUS.ID = VISITATECNICA.STATUS_ID)
//       INNER JOIN CLUNITS ON (CLUNITS.UNIT_ID = VISITATECNICA.UNIT_ID)
//       INNER JOIN DASHUSERS ON (DASHUSERS.EMAIL = VISITATECNICA.TECNICO_ID)
//   `;

//   if (qPars) {
//     const conditions: string[] = [];

//     if (qPars.STATUS_ID && qPars.STATUS_ID.length) {
//       conditions.push(`VISITATECNICA.STATUS_ID IN (:STATUS_ID)`);
//     }

//     if (qPars.USER) {
//       conditions.push(`DASHUSERS.EMAIL = :USER`);

//       var now = new Date();
//       var todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

//       conditions.push(`VISITATECNICA.VTDATE = ${todayUTC.toISOString().slice(0, 10)}`);
//     }

//     sentence += " WHERE " + conditions.join(" AND ");
//   }

//   return sqldb.query<{
//     ID: number;
//     UNIT_ID: number;
//     UNIT_NAME: string;
//     TECNICO_ID: string;
//     TECNICO_NOME: string;
//     TECNICO_SOBRENOME: string;
//     VTDATE: string;
//     VTTIME: string;
//     STATUS_ID: number;
//     STATUS: string;
//     OBSERVACAO_REAGENDAMENTO?: string;
//   }>(sentence, qPars);
// }

/* @IFHELPER:FUNC getCaracteristicasVisitaTecnica = SELECT LIST
  FROM VTCHARACTERISTICTYPE

  SELECT VTCHARACTERISTICTYPE.ID
  SELECT VTCHARACTERISTICTYPE.CHARACTERISTIC
*/
export function getCaracteristicasVisitaTecnica () {
  let sentence = `
    SELECT
      VTCHARACTERISTICTYPE.ID,
      VTCHARACTERISTICTYPE.CHARACTERISTIC
  `
  sentence += `
    FROM
      VTCHARACTERISTICTYPE
  `

  return sqldb.query<{
    ID: number
    CHARACTERISTIC: string
  }>(sentence)
}

/* @IFHELPER:FUNC deleteFromClient = DELETE
  PARAM CLIENT_ID: {VISITATECNICA.CLIENT_ID}
  FROM VISITATECNICA
  WHERE {VISITATECNICA.CLIENT_ID} = {:CLIENT_ID}
*/
export async function w_deleteFromClient (qPars: { CLIENT_ID: number }, delChecks: {
  VTENVIRONMENTS: true,
  VTMACHINES: true,
  VTENERGIES: true,
  VTWATERMEASURERS: true,
  VTDRTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VISITATECNICA WHERE VISITATECNICA.CLIENT_ID = :CLIENT_ID`;

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUnit = DELETE
  PARAM UNIT_ID: {VISITATECNICA.UNIT_ID}
  FROM VISITATECNICA
  WHERE {VISITATECNICA.UNIT_ID} = {:UNIT_ID}
*/
export async function w_deleteFromUnit (qPars: { UNIT_ID: number }, delChecks: {
  VTENVIRONMENTS: true,
  VTMACHINES: true,
  VTENERGIES: true,
  VTWATERMEASURERS: true,
  VTDRTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VISITATECNICA WHERE VISITATECNICA.UNIT_ID = :UNIT_ID`;

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC deleteFromUser = DELETE
  PARAM USER_ID: {DASHUSERS.EMAIL}
  FROM VISITATECNICA
  WHERE ({VISITATECNICA.TECNICO_ID} = {:USER_ID} OR {VISITATECNICA.RESPONSAVEL} = {:USER_ID})
*/
export async function w_deleteFromUser (qPars: { USER_ID: string }, delChecks: {
  VTENVIRONMENTS: true,
  VTMACHINES: true,
  VTENERGIES: true,
  VTWATERMEASURERS: true,
  VTDRTS: true
}, operationLogData: OperationLogData) {

  const sentence = `DELETE FROM VISITATECNICA WHERE (VISITATECNICA.TECNICO_ID = :USER_ID OR VISITATECNICA.RESPONSAVEL = :USER_ID)`;

  if (operationLogData) {
    await saveOperationLog('VISITATECNICA', sentence, qPars, operationLogData);
    dbLogger('VISITATECNICA', sentence, qPars, operationLogData);
  }

  return sqldb.execute(sentence, qPars)
}

/* @IFHELPER:FUNC getVtUpdate = SELECT ROW
  PARAM IDS?: {VISITATECNICA.ID}[]

  FROM VISITATECNICA

  SELECT (MAX({VISITATECNICA.VTUPDATE})) AS VTUPDATE: {VISITATECNICA.VTUPDATE}

  WHERE [[IFJS {:IDS}]] {VISITATECNICA.ID} IN ({:IDS})
*/
export function getVtUpdate (qPars: { IDS?: number[] }) {
  let sentence = `
    SELECT
      (MAX(VISITATECNICA.VTUPDATE)) AS VTUPDATE
  `
  sentence += `
    FROM
      VISITATECNICA
  `

  if (qPars.IDS) { sentence += ` WHERE VISITATECNICA.ID IN (:IDS) ` }

  return sqldb.querySingle<{
    VTUPDATE: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getVTsUpdate = SELECT LIST
  PARAM IDS: {VISITATECNICA.ID}[]
  PARAM TECNICO_ID?: {VISITATECNICA.TECNICO_ID}

  FROM VISITATECNICA

  SELECT VISITATECNICA.VTUPDATE
  SELECT VISITATECNICA.TECNICO_ID

  WHERE [[IFJS {:IDS}]] {VISITATECNICA.ID} IN ({:IDS})
  WHERE [[IFJS {:TECNICO_ID}]] {VISITATECNICA.TECNICO_ID} = {:TECNICO_ID}
*/
export function getVTsUpdate (qPars: { IDS: number[], TECNICO_ID?: string }) {
  let sentence = `
    SELECT
      VISITATECNICA.VTUPDATE,
      VISITATECNICA.TECNICO_ID
  `
  sentence += `
    FROM
      VISITATECNICA
  `

  const conditions: string[] = []
  if (qPars.IDS) { conditions.push(`VISITATECNICA.ID IN (:IDS)`) }
  if (qPars.TECNICO_ID) { conditions.push(`VISITATECNICA.TECNICO_ID = :TECNICO_ID`) }
  if (conditions.length) { sentence += ' WHERE ' + conditions.join(' AND ') }

  return sqldb.query<{
    VTUPDATE: number
    TECNICO_ID: string
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListFromClient = SELECT LIST
  PARAM CLIENT_ID: {VISITATECNICA.CLIENT_ID}
  FROM VISITATECNICA
  SELECT VISITATECNICA.ID
  WHERE {VISITATECNICA.CLIENT_ID} = {:CLIENT_ID}
*/
export function getListFromClient (qPars: { CLIENT_ID: number }) {
  let sentence = `
    SELECT
      VISITATECNICA.ID
  `
  sentence += `
    FROM
      VISITATECNICA
  `

  sentence += ` WHERE VISITATECNICA.CLIENT_ID = :CLIENT_ID `

  return sqldb.query<{
    ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListFromUnit = SELECT LIST
  PARAM UNIT_ID: {VISITATECNICA.UNIT_ID}
  FROM VISITATECNICA
  SELECT VISITATECNICA.ID
  WHERE {VISITATECNICA.UNIT_ID} = {:UNIT_ID}
*/
export function getListFromUnit (qPars: { UNIT_ID: number }) {
  let sentence = `
    SELECT
      VISITATECNICA.ID
  `
  sentence += `
    FROM
      VISITATECNICA
  `

  sentence += ` WHERE VISITATECNICA.UNIT_ID = :UNIT_ID `

  return sqldb.query<{
    ID: number
  }>(sentence, qPars)
}

/* @IFHELPER:FUNC getListFromUser = SELECT LIST
  PARAM USER_ID: {DASHUSERS.EMAIL}
  FROM VISITATECNICA
  SELECT VISITATECNICA.ID
  WHERE ({VISITATECNICA.TECNICO_ID} = {:USER_ID} OR {VISITATECNICA.RESPONSAVEL} = {:USER_ID})
*/
export function getListFromUser (qPars: { USER_ID: string }) {
  let sentence = `
    SELECT
      VISITATECNICA.ID
  `
  sentence += `
    FROM
      VISITATECNICA
  `

  sentence += ` WHERE (VISITATECNICA.TECNICO_ID = :USER_ID OR VISITATECNICA.RESPONSAVEL = :USER_ID) `

  return sqldb.query<{
    ID: number
  }>(sentence, qPars)
}
