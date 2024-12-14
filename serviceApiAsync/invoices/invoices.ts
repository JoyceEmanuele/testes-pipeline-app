import * as httpRouter from "../apiServer/httpRouter";
import sqldb from "../../srcCommon/db";
import servConfig from "../../configfile";
import * as dynamoDbHelper from '../../srcCommon/db/connectDynamoDb'
import * as s3Helper from '../../srcCommon/s3/connectS3'
import { SessionData } from '../../srcCommon/types'
import { logger } from '../../srcCommon/helpers/logger';
import { getAllowedUnitsView, getPermissionsOnUnit } from "../../srcCommon/helpers/permissionControl";

const quantyDaysMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const invoiceBucket = servConfig.filesBucketPrivate;

httpRouter.privateRoutes["/invoice/get-invoices"] = async function (reqParams, session) {

 if (!reqParams.unit_id)
  throw Error(
    "There was an error!\nInvalid properties. Missing unit_id."
  ).HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unit_id });

  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  let start_date = reqParams.periodStart;
  let end_date = reqParams.periodEnd;

  // prepare query to dynamo
  const dynamoFetcher = dynamoDbHelper.prepareQuery({
    tableName: 'UnitInvoices',
    selectedPropsList: null,
    partKeyName: 'unit_id',
    sortKeyName: 'invoice_date',
    partKeyValue: reqParams.unit_id.toString(),
    ...dynamoDbHelper.sortCompar_betweenInc({
      date_begin: start_date.substring(0, 10),
      date_end: end_date.substring(0, 10),
    })
  });

  // Result objects
  var result = [];
  var message = '';

  try {
    // get items on dynamo
    const resultsPage = await dynamoFetcher.getPage();

    var maxTotalCharges = 0;
    var maxTotalMeasured = 0;

    if (resultsPage) {

      const months = [] as string[];
      const monthAux = new Date(start_date.replace('.000Z', ''));
      monthAux.setMonth(monthAux.getMonth() - 1);

      // create month array from date start to end
      for (let i = 0; i < 13; i++) {
        monthAux.setMonth(monthAux.getMonth() + 1);
        months.push(monthAux.toISOString().replace('.000Z', ''));
      }

      const invoicesParsed = [];
      var first = true;

      const baselineData = await sqldb.BASELINES.getExtraInfo({BASELINE_ID: reqParams.baseline_id || 0});
      for (const item of resultsPage.Items) {
        const invoiceParsed = JSON.parse(item.invoice);
        var totalMeasured = invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next, 0);

        let baseline = null;
        if (reqParams.baseline_id){
          const dateFrom = new Date(invoiceParsed.dates.reading.periodFrom);
          const dateUntil = new Date(invoiceParsed.dates.reading.periodUntil);
          const timeDifference = Math.abs(dateFrom.getTime() - dateUntil.getTime());
          const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

          baseline = await httpRouter.privateRoutes['/clients/get-baselines-invoice']({
            CLIENT_ID: unitInfo.CLIENT_ID,
            UNIT_ID: unitInfo.UNIT_ID,
            BASELINE_ID: reqParams.baseline_id || 0,
            MONTH: invoiceParsed.dates.month.substring(0, 10),
            BASELINE_TEMPLATE_TAG: baselineData?.BASELINE_TEMPLATE_TAG || '',
            QUANTY_DAYS_MONTHS: daysDifference || 0,
          }, session);
        }

        if (first) {
          maxTotalCharges = invoiceParsed.totalCharges > (baseline?.BASELINE_PRICE || 0)? invoiceParsed.totalCharges : (baseline?.BASELINE_PRICE || 0);
          maxTotalMeasured = totalMeasured > (baseline?.BASELINE_KWH || 0) ? totalMeasured : (baseline?.BASELINE_KWH || 0);
          first = false;
        }
        else {
          maxTotalCharges = invoiceParsed.totalCharges > maxTotalCharges ? invoiceParsed.totalCharges : maxTotalCharges;
          maxTotalCharges = (baseline?.BASELINE_PRICE || 0) > maxTotalCharges ? (baseline?.BASELINE_PRICE || 0) : maxTotalCharges;
          maxTotalMeasured = totalMeasured > maxTotalMeasured ? totalMeasured : maxTotalMeasured;
          maxTotalMeasured = (baseline?.BASELINE_KWH || 0) > maxTotalMeasured ? (baseline?.BASELINE_KWH || 0) : maxTotalMeasured;
        }

        var resultItem = {
          month: invoiceParsed.dates.month,
          periodFrom: invoiceParsed.dates.reading.periodFrom,
          periodUntil: invoiceParsed.dates.reading.periodUntil,
          totalCharges: invoiceParsed.totalCharges,
          totalMeasured: totalMeasured,
          baselinePrice: baseline?.BASELINE_PRICE || 0,
          baselineKwh: baseline?.BASELINE_KWH || 0,
        }
        invoicesParsed.push(resultItem);
      }

      for (const dateAux of months) {
        let invoice = invoicesParsed.find((item) => item.month.substring(0, 10) === dateAux.substring(0, 10));
        var invoiceAux;
        if (!invoice) {
          invoiceAux = {
            month: dateAux,
            periodFrom: dateAux,
            periodUntil: dateAux,
            totalCharges: 0,
            totalMeasured: 0,
            percentageTotalCharges: 0,
            percentageTotalMeasured: 0,
            baselinePrice: 0,
            baselineKwh: 0,
            percentageBaselinePrice: 0,
            percentageBaselineKwh: 0
          };
        }
        else {
          invoiceAux = {
            ...invoice,
            percentageTotalCharges: 0,
            percentageTotalMeasured: 0,
            percentageBaselinePrice: 0,
            percentageBaselineKwh: 0
          };
        }
        result.push(invoiceAux);
      }
    }
    else {
      message = 'Dados não encontrado';
    }
  }
  catch (err) {
    message = err.toString();
  }

  return {invoices: result, messageError: message, maxTotalCharges: maxTotalCharges, maxTotalMeasured: maxTotalMeasured};
}

httpRouter.privateRoutes['/invoice/get-invoice-pdf'] = async function (reqParams, session, { res }) {
  logger.info(reqParams)

  if (!reqParams.unit_id)
  throw Error(
    "There was an error!\nInvalid properties. Missing unit_id."
  ).HttpStatus(400);

  if (!reqParams.month)
  throw Error(
    "There was an error!\nInvalid properties. Missing month."
  ).HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.unit_id });

  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }
  const perms = await getPermissionsOnUnit(session, unitInfo.CLIENT_ID, unitInfo.UNIT_ID);
  if (!perms.canViewDevs) {
    throw Error('Permission denied!').HttpStatus(403);
  }

  try {
    const key = invoiceBucket.invoicePdfBucketPath + reqParams.unit_id + '/' + reqParams.month.substring(0, 10);
    const object = await s3Helper.getItemS3(invoiceBucket, key);

    res.attachment(key);
    const fileStream = object.Body;
    res.contentType("application/pdf");
    fileStream.pipe(res);
  }
  catch(err){
    logger.info('Error getting pdf' + err.toString());
    throw Error('Error getting pdf').HttpStatus(500);
  }

  return res;
}

httpRouter.privateRoutes['/invoice/get-invoices-overview'] = async function (reqParams, session) {

  if (!reqParams.periodStart) {
    throw Error(
      "There was an error!\nInvalid properties. Missing unitIds."
    ).HttpStatus(400);
  }

  if (!reqParams.periodEnd) {
    throw Error(
      "There was an error!\nInvalid properties. Missing unitIds."
    ).HttpStatus(400);
  }

  if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {
     // OK
  }
  else {
    const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
    if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
    reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
    if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
    if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
  }

  const unitsList = await sqldb.CLUNITS.getUnitsList2({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
    cityIds: reqParams.cityIds,
    stateIds: reqParams.stateIds,
    excludeClient: servConfig.dielClientId,
  }, { onlyWithGA: false });

  const months = [] as string[];
  const monthAux = new Date(reqParams.periodStart.replace('.000Z', ''));
  monthAux.setMonth(monthAux.getMonth() - 1);

  // create month array from date start to one year after
  for (let i = 0; i < 13; i++) {
    monthAux.setMonth(monthAux.getMonth() + 1);
    months.push(monthAux.toISOString().substring(0, 10));
  }

  if (unitsList && unitsList.length > 0) {

    const listUnitIds = unitsList.map(item => item.UNIT_ID);

    await persistedInvoiceDynamoToDataBase(listUnitIds, reqParams.periodStart, reqParams.periodEnd, months, session.user);

    let {invoicesTotal, maxTotalCharges, maxTotalMeasured } = await invoicesTotalizationGroupByDate(
      listUnitIds,
      reqParams.clientIds,
      months,
      reqParams.periodStart,
      reqParams.periodEnd,
      session.user,
    );

    const unitsInvoice = await lastInvoicesGroupByUnits(
      listUnitIds,
      reqParams.clientIds,
      maxTotalMeasured,
      months,
      reqParams.periodStart,
      reqParams.periodEnd,
      session,
    );
    const measurementUnit = maxTotalMeasured < 10000 ? 'kWh' : 'MWh';
    maxTotalMeasured = maxTotalMeasured / (maxTotalMeasured < 10000 ? 1 : 1000); // kWh to mWh when greater than 10000
    return {invoicesTotal, maxTotalCharges, maxTotalMeasured, unitsInvoice, measurementUnit };
  }

  return {invoicesTotal: [], maxTotalCharges: 0, maxTotalMeasured: 0, unitsInvoice: [], measurementUnit: 'kWh'};
}

export async function getUnitsWithInvoice() {
  const response = await s3Helper.getObjectsS3(invoiceBucket, invoiceBucket.invoicePdfBucketPath);

  if (response && response.CommonPrefixes) {
    return response.CommonPrefixes.map((item) => item.Prefix.replace(invoiceBucket.invoicePdfBucketPath, '').replace('/',''));
  }
  return [];
}

async function persistedInvoiceDynamoToDataBase(unitIds: number[], periodStart: string, periodEnd: string, months: string[], user: string) {

  // Select units on s3 that have invoices
  try {
    const unitsWithInvoice = await getUnitsWithInvoice();

    const joinUnits = unitIds.filter(item => unitsWithInvoice.includes(item.toString()));

    // Select invoices on dynamo that weren't persisted
    for (const unit of joinUnits) {
      const unitQuantityPersisted = await sqldb.INVOICES.getInvoiceUnitCount({UNIT_ID: unit, periodStart, periodEnd});

      // Prevent query on dynamo items that exists on mariadb
      if (!unitQuantityPersisted || unitQuantityPersisted.REGISTER_QUANTITY < months.length) {
        const dynamoFetcher = dynamoDbHelper.prepareQuery({
          tableName: 'UnitInvoices',
          selectedPropsList: null,
          partKeyName: 'unit_id',
          sortKeyName: 'invoice_date',
          partKeyValue: unit.toString(),
          ...dynamoDbHelper.sortCompar_betweenInc({
            date_begin: periodStart.substring(0, 10),
            date_end: periodEnd.substring(0, 10),
          }),
          filterExpression: 'attribute_not_exists(persisted) or persisted = :booleanValue',
          booleanValue: false,
        });

        const resultsPage = await dynamoFetcher.getPage();

        for (const item of resultsPage.Items){
          const invoiceParsed = JSON.parse(item.invoice);
          const totalMeasured = invoiceParsed.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next, 0);
          const totalCharges = invoiceParsed.totalCharges;
          const month = invoiceParsed.dates.month.substring(0, 10);

          const invoicePersistedExist = await sqldb.INVOICES.getInvoiceExist({UNIT_ID: unit, INVOICE_DATE: month})

          if (!invoicePersistedExist) {
            await sqldb.INVOICES.w_insert({
              UNIT_ID: unit,
              INVOICE_DATE: month,
              TOTAL_CHARGES: totalCharges,
              TOTAL_MEASURED: totalMeasured,
            }, user);
          }
          else {
            await sqldb.INVOICES.w_updateInfo({
              INVOICE_ID: invoicePersistedExist.INVOICE_ID,
              UNIT_ID: unit,
              INVOICE_DATE: month,
              TOTAL_CHARGES: totalCharges,
              TOTAL_MEASURED: totalMeasured,
            }, user);
          }

          const resultJson = await dynamoDbHelper.updateDynamoItem(
            'UnitInvoices',
            'unit_id',
            unit.toString(),
            'invoice_date',
            month,
            {invoice: item.invoice, persisted: true})
        }
      }
    }
  }
  catch(err) {
    logger.info('Error persisted Invoice to DynamoDB: ' + err.toString());
    throw Error('Error persisted Invoice to DynamoDB').HttpStatus(500);
  }
}

async function invoicesTotalizationGroupByDate(unitIds: number[], clientIds: number[], months: string[], periodStart: string, periodEnd: string, user: string) {

  const invoicesTotal = [] as {
    month: string,
    totalCharges: number,
    totalMeasured: number,
    percentageTotalCharges: number,
    percentageTotalMeasured: number,
    percentageInvoices: number,
  }[]
  const totalPossibleInvoicePerMonth = unitIds.length;

  try {
    const invoicesGroupByDate = await sqldb.INVOICES.getInvoicesGroupByDate({
      unitIds: unitIds,
      clientIds: clientIds,
      periodStart: periodStart,
      periodEnd: periodEnd,
    });

    let maxTotalCharges = 0;
    let maxTotalMeasured = 0;

    if (invoicesGroupByDate && invoicesGroupByDate.length > 0) {
      maxTotalCharges = Math.max(...invoicesGroupByDate.map(item => item.TOTAL_CHARGES));
      maxTotalMeasured = Math.max(...invoicesGroupByDate.map(item => item.TOTAL_MEASURED));

      for (const monthAux of months) {
        const invoiceData = invoicesGroupByDate.find(item => item.INVOICE_DATE === monthAux);

        if (invoiceData) {
          invoicesTotal.push({
            month: monthAux,
            totalCharges: invoiceData.TOTAL_CHARGES,
            totalMeasured: invoiceData.TOTAL_MEASURED / (maxTotalMeasured < 10000 ? 1 : 1000), // kWh to mWh when greater than 10000
            percentageTotalCharges: 0,
            percentageTotalMeasured: 0,
            percentageInvoices: invoiceData.TOTAL_INVOICES / totalPossibleInvoicePerMonth * 100,
          });
        }
        else {
          invoicesTotal.push({
            month: monthAux,
            totalCharges: 0,
            totalMeasured: 0,
            percentageTotalCharges: 0,
            percentageTotalMeasured: 0,
            percentageInvoices: 0,
          });
        }
      }
    }

    return {invoicesTotal, maxTotalCharges, maxTotalMeasured};
  }
  catch(err) {
    logger.info('Error selecting invoices totalization group by date: ' + err.toString());
    throw Error('Error selecting invoices totalization group by date').HttpStatus(500);
  }
}

async function lastInvoicesGroupByUnits(unitIds: number[], clientIds: number[], maxTotalMeasured: number, months: string[], periodStart: string, periodEnd: string, session: SessionData) {
  const unitsInvoice = [] as {
    unitId: number,
    unitName: string,
    totalCharges: number,
    totalBaselineCharges: number,
    variationCharges: number,
    totalMeasured: number,
    totalBaselineMeasured: number,
    variationMeasured: number,
  }[]

  try {
    const invoicesByUnit = await sqldb.INVOICES.getLastInvoicesGroupByUnit({
      unitIds: unitIds,
      clientIds: clientIds,
      periodStart: periodStart,
      periodEnd: periodEnd,
    })


    for (const unit of invoicesByUnit) {

      const baselineData = await sqldb.BASELINES.getExtraInfo({UNIT_ID: unit.UNIT_ID});
      let baselineCharges = 0;
      let baselineMeasured = 0;

      if (baselineData) {
        const month = unit.INVOICE_DATE;
        const year = Number(month.substring(0,5));
        const isLeapYear = year % 4 === 0;
        const quantityDaysMonth = quantyDaysMonths[Number(month.substring(5,7)) - 1] + (Number(month.substring(5,7)) === 2 && isLeapYear ? 1 : 0);
        const baseline = await httpRouter.privateRoutes['/clients/get-baselines-invoice']({
          CLIENT_ID: unit.CLIENT_ID,
          UNIT_ID: unit.UNIT_ID,
          BASELINE_ID: baselineData.BASELINE_ID,
          MONTH: month,
          BASELINE_TEMPLATE_TAG: baselineData?.BASELINE_TEMPLATE_TAG || '',
          QUANTY_DAYS_MONTHS: quantityDaysMonth,
        }, session);

        if (baseline) {
          baselineCharges = baseline.BASELINE_PRICE;
          baselineMeasured = baseline.BASELINE_KWH;
        }
      }

      const differenceCharges = baselineCharges - unit.TOTAL_CHARGES;
      const differenceMeasured = baselineMeasured - unit.TOTAL_MEASURED;

      let variationCharges = baselineCharges > 0 ? (Math.abs(differenceCharges) * 100) / baselineCharges : 0;
      let variationMeasured = baselineMeasured > 0 ? (Math.abs(differenceMeasured) * 100) / baselineMeasured : 0;

      if (differenceCharges > 0) {
        variationCharges = variationCharges * (-1);
      }
      if (differenceMeasured > 0) {
        variationMeasured = variationMeasured * (-1);
      }

      unitsInvoice.push({
        unitId: unit.UNIT_ID,
        unitName: unit.UNIT_NAME,
        totalCharges: unit.TOTAL_CHARGES,
        variationCharges,
        totalBaselineCharges: baselineCharges,
        totalMeasured: unit.TOTAL_MEASURED / (maxTotalMeasured < 10000 ? 1 : 1000), // kWh to mWh when greater than 10000
        totalBaselineMeasured: baselineMeasured / (maxTotalMeasured < 10000 ? 1 : 1000), // kWh to mWh when greater than 10000
        variationMeasured,
      })
    }

    return unitsInvoice;
  }
  catch(err) {
    logger.info('Error selecting invoices totalization group by unit: ' + err.toString());
    throw Error('Error selecting invoices totalization group by unit').HttpStatus(500);
  }
}

export async function getDistributorFromDynamo(unitId: string){
  const prefix = invoiceBucket.invoicePdfBucketPath + unitId + '/';
  const response = await s3Helper.getObjectsS3(invoiceBucket, prefix);
  let provider = '' as string;
  if (response && response.Contents) {
    const dynamoItem = await dynamoDbHelper.getDynamoItem(
      'UnitInvoices',
      'unit_id',
      unitId,
      'invoice_date',
      response.Contents[0].Key.replace(prefix, '')
    );

    if (dynamoItem && dynamoItem.Item) {
      let invoiceParsed = await JSON.parse(dynamoItem.Item.invoice);
      provider = invoiceParsed.provider;
    }
  }

  return provider;
}
