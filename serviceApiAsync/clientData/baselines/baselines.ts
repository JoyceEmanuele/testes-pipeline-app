import * as httpRouter from '../../apiServer/httpRouter'
import sqldb from '../../../srcCommon/db'
import * as dynamoDbHelper from '../../../srcCommon/db/connectDynamoDb'
import { logger } from '../../../srcCommon/helpers/logger';
import { getPermissionsOnUnit } from '../../../srcCommon/helpers/permissionControl';

const quantyDaysMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

httpRouter.privateRoutes['/clients/get-baseline-info'] = async function (reqParams, session) {
  const baselineInfo = await sqldb.BASELINES.getExtraInfo({ BASELINE_ID: reqParams.BASELINE_ID, UNIT_ID: reqParams.UNIT_ID });
  if (!baselineInfo) { throw Error('Baseline not found').HttpStatus(400); }

  const perms = await getPermissionsOnUnit(session, baselineInfo.CLIENT_ID, baselineInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  } 
  else throw Error('Permission denied!').HttpStatus(403)

  return baselineInfo;
}

httpRouter.privateRoutes['/clients/add-baseline'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  if (!reqParams.BASELINE_TEMPLATE_ID) { throw Error('Invalid properties. Missing BASELINE_TEMPLATE_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  } 
  else throw Error('Permission denied!').HttpStatus(403)

  const template = await sqldb.BASELINE_TEMPLATES.getExtraInfo({BASELINE_TEMPLATE_ID: reqParams.BASELINE_TEMPLATE_ID})
  if (!template) {
    throw Error('Template not found').HttpStatus(400)
  }

  try {
    const {insertId: insertedId} = await sqldb.BASELINES.w_insert({
        UNIT_ID: reqParams.UNIT_ID,
        BASELINE_TEMPLATE_ID: reqParams.BASELINE_TEMPLATE_ID,
        }, session.user)
    
    return httpRouter.privateRoutes['/clients/get-baseline-info']({ BASELINE_ID: insertedId}, session);
  }
  catch (err) {
    logger.error(`Error updating Access Distributor - msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error updating Access Distributor').HttpStatus(400)
  }
}

httpRouter.privateRoutes['/clients/edit-baseline'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  if (!reqParams.BASELINE_ID) { throw Error('Invalid properties. Missing BASELINE_ID.').HttpStatus(400) }
  if (!reqParams.BASELINE_TEMPLATE_ID) { throw Error('Invalid properties. Missing BASELINE_TEMPLATE_ID.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const template = await sqldb.BASELINE_TEMPLATES.getExtraInfo({BASELINE_TEMPLATE_ID: reqParams.BASELINE_TEMPLATE_ID})
  if (!template) {
    throw Error('Template not found').HttpStatus(400)
  }
  
  try {
    await sqldb.BASELINES.w_updateInfo({
        BASELINE_ID: reqParams.BASELINE_ID,
        UNIT_ID: reqParams.UNIT_ID,
        BASELINE_TEMPLATE_ID: reqParams.BASELINE_TEMPLATE_ID,
        }, session.user)
    
    return httpRouter.privateRoutes['/clients/get-baseline-info']({ BASELINE_ID: reqParams.BASELINE_ID}, session);
  }
  catch (err) {
    logger.error(`Error updating Access Distributor - msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw Error('Error updating Access Distributor').HttpStatus(400)
  }
}

httpRouter.privateRoutes['/clients/get-baselines-invoice'] = async function (reqParams, session) {
  if (!reqParams.UNIT_ID) { throw Error('Invalid properties. Missing UNIT_ID.').HttpStatus(400) }
  if (!reqParams.CLIENT_ID) { throw Error('Invalid properties. Missing CLIENT_ID.').HttpStatus(400) }
  if (!reqParams.BASELINE_ID) { throw Error('Invalid properties. Missing BASELINE_ID.').HttpStatus(400) }
  if (!reqParams.MONTH) { throw Error('Invalid properties. Missing MONTH.').HttpStatus(400) }
  if (!reqParams.QUANTY_DAYS_MONTHS) { throw Error('Invalid properties. Missing QUANTY_DAYS_MONTHS.').HttpStatus(400) }
  if (!reqParams.BASELINE_TEMPLATE_TAG) { throw Error('Invalid properties. Missing BASELINE_TEMPLATE_TAG.').HttpStatus(400) }
  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({ UNIT_ID: reqParams.UNIT_ID, CLIENT_ID: reqParams.CLIENT_ID });
  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK 
  } 
  else throw Error('Permission denied!').HttpStatus(403);

  let baselinePrice = 0;
  let baselineKwh = 0;

  if (reqParams.BASELINE_TEMPLATE_TAG === 'monthLastYear'){
    const monthAux = new Date(reqParams.MONTH.replace('.000Z', ''));
    monthAux.setFullYear(monthAux.getFullYear() - 1);

    const month = monthAux.toISOString().split('T')[0];
    const result = await dynamoDbHelper.getDynamoItem('UnitInvoices', 'unit_id', reqParams.UNIT_ID.toString(), 'invoice_date', month.substring(0, 10))
   
    if (result.Item){
      let invoiceParsed = JSON.parse(result.Item.invoice);
      baselinePrice = invoiceParsed.totalCharges;
      baselineKwh = invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next);
      const dateFrom = new Date(invoiceParsed.dates.reading.periodFrom);
      const dateUntil = new Date(invoiceParsed.dates.reading.periodUntil);
      const timeDifference = Math.abs(dateFrom.getTime() - dateUntil.getTime());
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
      baselinePrice = baselinePrice / daysDifference;
      baselineKwh = baselineKwh / daysDifference;
    }
  }
  else if(reqParams.BASELINE_TEMPLATE_TAG === 'avgLast3Months'){
    // prepare query to dynamo
    const monthAux = new Date(reqParams.MONTH.replace('.000Z', ''));
    monthAux.setMonth(monthAux.getMonth() - 1);
    const periodEnd = monthAux.toISOString().split('T')[0];
    monthAux.setMonth(monthAux.getMonth() - 2);
    const periodStart = monthAux.toISOString().split('T')[0];
    const dynamoFetcher = dynamoDbHelper.prepareQuery({
      tableName: 'UnitInvoices',
      selectedPropsList: null,
      partKeyName: 'unit_id',
      sortKeyName: 'invoice_date',
      partKeyValue: reqParams.UNIT_ID.toString(),
      ...dynamoDbHelper.sortCompar_betweenInc({
        date_begin: periodStart.substring(0, 10),
        date_end: periodEnd.substring(0, 10),
      })
    });

    // get items on dynamo
    const resultsPage = await dynamoFetcher.getPage();
    let totalDays = 0;
    if (resultsPage) {
      let totalPrice = 0;
      let totalKwh = 0;
      for (const item of resultsPage.Items){
        let invoiceParsed = JSON.parse(item.invoice);
        totalPrice += invoiceParsed.totalCharges;
        totalKwh += invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next);
        const dateFrom = new Date(invoiceParsed.dates.reading.periodFrom);
        const dateUntil = new Date(invoiceParsed.dates.reading.periodUntil);
        const timeDifference = Math.abs(dateFrom.getTime() - dateUntil.getTime());
        const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
        totalDays = totalDays + daysDifference;
      }

      baselinePrice = totalPrice / totalDays || 1;
      baselineKwh = totalKwh / totalDays || 1;
    }
  }
  else if(reqParams.BASELINE_TEMPLATE_TAG === 'avgMonth2019And2021'){
    const monthAux = new Date(reqParams.MONTH.replace('.000Z', ''));
    monthAux.setFullYear(2019);

    const month2019 = monthAux.toISOString().split('T')[0];
    const result2019 = await dynamoDbHelper.getDynamoItem('UnitInvoices', 'unit_id', reqParams.UNIT_ID.toString(), 'invoice_date', month2019.substring(0, 10))
   
    monthAux.setFullYear(2021);
    const month2021 = monthAux.toISOString().split('T')[0];
    const result2021 = await dynamoDbHelper.getDynamoItem('UnitInvoices', 'unit_id', reqParams.UNIT_ID.toString(), 'invoice_date', month2021.substring(0, 10))
  
    let price2019 = 0;
    let kwh2019 = 0;
    let price2021 = 0;
    let kwh2021 = 0;
    let daysQuantity = 0;
    if (result2019.Item){
      let invoiceParsed = JSON.parse(result2019.Item.invoice);
      price2019 = invoiceParsed.totalCharges;
      kwh2019 = invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next);
      const dateFrom = new Date(invoiceParsed.dates.reading.periodFrom);
      const dateUntil = new Date(invoiceParsed.dates.reading.periodUntil);
      const timeDifference = Math.abs(dateFrom.getTime() - dateUntil.getTime());
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
      daysQuantity = daysQuantity + daysDifference;
    }
    if (result2021.Item){
      let invoiceParsed = JSON.parse(result2021.Item.invoice);
      price2021 = invoiceParsed.totalCharges;
      kwh2021 = invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next);
      const dateFrom = new Date(invoiceParsed.dates.reading.periodFrom);
      const dateUntil = new Date(invoiceParsed.dates.reading.periodUntil);
      const timeDifference = Math.abs(dateFrom.getTime() - dateUntil.getTime());
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
      daysQuantity = daysQuantity + daysDifference;
    }

    baselinePrice = (price2019 + price2021) / daysQuantity || 1;
    baselineKwh = (kwh2019 + kwh2021) / daysQuantity || 1;
  }
  else if(reqParams.BASELINE_TEMPLATE_TAG === 'manual'){
    const year = Number(reqParams.MONTH.substring(0,5));
    const isLeapYear = year % 4 === 0;
    const month = Number(reqParams.MONTH.substring(5,7));
    const baselineValue = await sqldb.BASELINE_VALUES.getUnitBaselineValueInfo({BASELINE_ID: reqParams.BASELINE_ID, BASELINE_MONTH: month});
    const sumToLeapYear = month === 2 && isLeapYear ? 1 : 0;
    baselinePrice = baselineValue ? baselineValue.BASELINE_PRICE / (quantyDaysMonths[month - 1] + sumToLeapYear) : 0;
    baselineKwh = baselineValue ? baselineValue.BASELINE_KWH / (quantyDaysMonths[month - 1] + sumToLeapYear) : 0;
  }

  baselinePrice = baselinePrice * reqParams.QUANTY_DAYS_MONTHS;
  baselineKwh = baselineKwh * reqParams.QUANTY_DAYS_MONTHS;

  return {BASELINE_PRICE: baselinePrice, BASELINE_KWH: baselineKwh};
}