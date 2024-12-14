import * as httpRouter from '../apiServer/httpRouter';
import sqldb from '../../srcCommon/db';
import servConfig from '../../configfile';
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import * as dielServices from '../../srcCommon/dielServices';

// Dados do Sensor
// ID: DASA-058962-EC
// Tipo: Temperatura da Sala de Exame
// Modelo: GE HEALTHCARE - Signa HDX
// Unidade: BR-CAMPO GRANDE II
// curl 'https://dasa.nmonitor.ness.com.br/DashboardsNSensor/BuscarDadosSensorNivel3' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0' -H 'Accept: */*' --compressed -H 'Referer: https://dasa.nmonitor.ness.com.br/DashboardsNSensor/DashboardNivel3?SensoresID=397' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'X-Requested-With: XMLHttpRequest' -H 'Origin: https://dasa.nmonitor.ness.com.br' -H 'DNT: 1' -H 'Connection: keep-alive' -H 'Cookie: ARRAffinity=b9d145e4b47f8794b2fb57e4146bb0d65337651b9278f9df04ed03b42afc8196; ARRAffinitySameSite=b9d145e4b47f8794b2fb57e4146bb0d65337651b9278f9df04ed03b42afc8196; ASP.NET_SessionId=arhtumfviqlz2jmj2f31ydsy' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: same-origin' -H 'Sec-GPC: 1' --data-raw 'SensoresID=397&DataInicio=10%2F08%2F2021&DataFim=10%2F08%2F2021&HoraInicio=0%3A00&HoraTermino=23%3A30'
// SensoresID	"397"
// DataInicio	"10/08/2021"
// DataFim	"10/08/2021"
// HoraInicio	"0:00"
// HoraTermino	"23:30"

httpRouter.privateRoutes['/ness-get-overview-data/json'] = async function (reqParams, session, { req }) {
  if (!reqParams.unitId) throw Error('Código de unidade não informado (E28)').HttpStatus(400);
  let unitId = (reqParams.unitId && Number(reqParams.unitId)) || null;
  const dasaId = (reqParams.unitId && (reqParams.unitId as string).toUpperCase && (reqParams.unitId as string).toUpperCase()) || null;
  if ((!unitId) && dasaId) {
    const dasaUnit = await sqldb.INTEGRNESS.getUnitId({ NESS_ID: dasaId });
    if (dasaUnit) {
      unitId = dasaUnit.UNIT_ID;
    }
  }
  if (!unitId) throw Error('Código de unidade inválido (E30)').HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: unitId });
  if (!unitInfo) throw Error('Unidade não encontrada (E34)').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Acesso negado (E35)').HttpStatus(403);

  const { health: healthNow } = await dielServices.asyncExternalApi(req.get('authorization'), '/health-overview-card', {
    // atDayYMD: moment().format(DATE_FORMAT),
    unitIds: [unitId],
  });
  // const healthBefore = await httpRouter.privateRoutes['/health-overview-card']({
  //   atDayYMD: moment().subtract(7, 'days').format(DATE_FORMAT),
  //   unitIds: [unitId],
  // }, session);
  const { list: dacsList } = await httpRouter.privateRoutes['/dac/get-dacs-list']({
    unitIds: [unitId],
    includeCapacityKW: true,
  }, session);
  const { list: dutsList } = await httpRouter.privateRoutes['/dut/get-duts-list']({
    unitIds: [unitId],
    includeMeanTemperature: true,
  }, session);

  return {
    unitName: unitInfo.UNIT_NAME,
    dutsList,
    dacsList,
    machinesHealthNow: healthNow,
    machinesHealthBefore: healthNow,
  };
}

httpRouter.privateRoutes['/get-ness-dashboard-url-for-unit'] = async function (reqParams, session, { res }) {
  if (!reqParams.unitId) throw Error('Código de unidade não informado (E70)').HttpStatus(400);
  let unitId = (reqParams.unitId && Number(reqParams.unitId)) || null;
  if (!unitId) throw Error('Código de unidade inválido (E73)').HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: unitId });
  if (!unitInfo) throw Error('Unidade não encontrada (E34)').HttpStatus(400);

  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) throw Error('Acesso negado (E35)').HttpStatus(403);

  const dasaUnit = await sqldb.INTEGRNESS.getIntegrId({ UNIT_ID: unitId });
  const url = dasaUnit && `https://app-dasa-nmonitor-01.azurewebsites.net/api/diel/${servConfig.ness.dashToken}/${dasaUnit.NESS_ID}`;

  // I can check if the url returns HTTP code 200 before returning it

  return { url };
}
