import * as httpRouter from "./httpApiRouter";
import sqldb from "../srcCommon/db";
import configfile from "./configfile";
import * as dynamoDbHelper from '../srcCommon/db/connectDynamoDb'
import * as s3Helper from '../srcCommon/s3/connectS3'
import { logger } from '../srcCommon/helpers/logger';
import { ObjectCannedACL } from '@aws-sdk/client-s3';

httpRouter.invoiceRoutes["/invoice/upload-invoice"] = async function (reqParams) {
  if (!reqParams.clientData)
  throw Error(
    "There was an error!\nInvalid properties. Missing clientData."
  ).HttpStatus(400);

  if (!reqParams.clientData.invoiceAuthToken)
  throw Error(
    "There was an error!\nInvalid properties. Missing clientData.invoiceAuthToken."
  ).HttpStatus(400);

  if (reqParams.clientData.invoiceAuthToken !== configfile.authToken)
  throw Error(
    "Invalid token to upload invoice."
  ).HttpStatus(400);


  if (!reqParams.clientData.unitId)
  throw Error(
    "There was an error!\nInvalid properties. Missing clientData.unitId."
  ).HttpStatus(400);


  if (!reqParams.json)
  throw Error(
    "There was an error!\nInvalid properties. Missing json."
  ).HttpStatus(400);

  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.clientData.unitId });

  if (!unitInfo) { throw Error('Unit not found').HttpStatus(400); }

  const json = reqParams.json;

  // remove histórico
  delete json['history'];
  const jsonToUpload = JSON.stringify(json);

  try {
    // Valida se existe, para inserir ou atualizar
    // prepare query to dynamo
    const dynamoFetcher = dynamoDbHelper.prepareQuery({
      tableName: 'UnitInvoices',
      selectedPropsList: null,
      partKeyName: 'unit_id',
      sortKeyName: 'invoice_date',
      partKeyValue: unitInfo.UNIT_ID.toString(),
      ...dynamoDbHelper.sortCompar_exact({
        date_exact: json.dates.month.substring(0, 10)
      })
    });

    const resultsPage = await dynamoFetcher.getPage();

    // persiste on mariadb
    const invoicePersistedExist = await sqldb.INVOICES.getInvoiceExist({UNIT_ID: unitInfo.UNIT_ID, INVOICE_DATE: json.dates.month.substring(0, 10)})
    const totalMeasured = json.measuredItems.map((measuredItem:any) => measuredItem.type === 'energy' ? measuredItem.measured : 0).reduce((prev: any, next: any) => prev + next, 0);
    const totalCharges = json.totalCharges;
    if (!invoicePersistedExist) {
      await sqldb.INVOICES.w_insert({
        UNIT_ID: unitInfo.UNIT_ID,
        INVOICE_DATE: json.dates.month.substring(0, 10),
        TOTAL_CHARGES: totalCharges,
        TOTAL_MEASURED: totalMeasured,
      }, '[INVOICE]');
    }
    else {
      await sqldb.INVOICES.w_updateInfo({
        INVOICE_ID: invoicePersistedExist.INVOICE_ID,
        UNIT_ID: unitInfo.UNIT_ID,
        INVOICE_DATE: json.dates.month.substring(0, 10),
        TOTAL_CHARGES: totalCharges,
        TOTAL_MEASURED: totalMeasured,
      }, '[INVOICE]');
    }

    // upload para o dynamo
    if (resultsPage.Items!.length === 0){
      await dynamoDbHelper.putDynamoItem(
        'UnitInvoices',
        {unit_id: unitInfo.UNIT_ID.toString(), invoice_date: json.dates.month.substring(0, 10),  invoice: jsonToUpload, persisted: true},
        'attribute_not_exists(unit_id)'
      );
    }
    // update para o dynamo
    else{
      await dynamoDbHelper.updateDynamoItem('UnitInvoices', 'unit_id', unitInfo.UNIT_ID.toString(), 'invoice_date', json.dates.month, {invoice: jsonToUpload, persisted: true})
    }

    // upload pdf para o s3, caso exista substitui
    if (reqParams.pdfFile){
      await uploadInvoicePdf(unitInfo.UNIT_ID, json.dates.month.substring(0, 10), reqParams.pdfFile)
    }

    return { httpStatusCode: 200 };
  }
  catch(err){
    logger.error(err);
    throw err;
  }
};

async function uploadInvoicePdf(unitId: number, month: string, pdfFile: string) {
  const key = configfile.filesBucketPrivate.invoicePdfBucketPath + unitId + '/' + month;
  const body = Buffer.from(pdfFile, 'base64');
  const contentDisposition = 'attachment; filename="' + unitId + ' - ' + month +'.pdf"';
  const acl: ObjectCannedACL = undefined;

  const pres = await s3Helper.putItemS3(configfile.filesBucketPrivate, key, body, contentDisposition, acl);

  return pres;
}
