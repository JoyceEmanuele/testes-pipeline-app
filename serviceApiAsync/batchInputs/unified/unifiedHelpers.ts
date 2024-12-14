import axios from 'axios'
import { deleteSketch, uploadUnitSketch } from '../../clientData/unitsSketches'
import { SessionData } from '../../../srcCommon/types'
import * as httpRouter from '../../apiServer/httpRouter'
import {
  newUploadAssetImage,
  dmaDeleteImages,
  uploadMachineImage,
  uploadDutImage,
  uploadDacImage,
  uploadDamImage,
  uploadDriImage,
  damDeleteImages,
  assetDeleteImage,
  machinesDeleteImage,
  dutDeleteImage,
  uploadDmaImage,
  driDeleteImages,
  dmtDeleteImages,
  dalDeleteImages,
  uploadDalImage,
  uploadDmtImages,
  uploadNobreakImageS3,
  nobreakDeletePhotos, 
  uploadIlluminationImage,
  illuminationDeleteImages,
  sendImageToUploadService,
  deleteImageFromUploadService,
  getImageListFromUploadService,
} from '../../devsPictures'
import { createCityId, searchCityInfo } from '../../crossData/dacCities'
import { getNormalized } from '../../../srcCommon/helpers/textNormalization'
import * as googleApi from '../../../srcCommon/extServices/googleApi'
import sqldb from '../../../srcCommon/db'
import { checkNumber } from '../dacs'
import servConfig from '../../../configfile'
import { PROFILECODES } from '../../../srcCommon/helpers/permissionControl'
import { hydrometerModels } from '../dmas'
import * as moment from 'moment';
import { logger } from '../../../srcCommon/helpers/logger';
import { realocateManufacturerDevice } from '../../clientData/machines'
import { UnifiedBatch } from '../../../srcCommon/types/api-private'
import { checkAvailablePorts } from '../../dmt/dmtInfo'
import { exportAdditionalParams, getDamDuoSensorLabel, getDamInstallationLocationLabel, getDamPlacementLocationLabel, getStringOrCharacter, getUnitLatLon, getUnitStatus, isDam } from './unified'
import { uploadSimcardImage } from '../../../srcCommon/s3/connectS3'
import { uploadSimcards } from '../../painel/simcards'
export type TableRow = UnifiedBatch;
export type PhotoTypes = 'sketch'|'devgroups'|'asset'|'dam'|'dac'|'dut'|'dri'|'dma'| 'nobreak'|'dal'|'dmt'|'illumination'|'simcard';
import * as sharp from 'sharp';
import { apiUploadService } from '../../extServices/uploadServiceApi';
import { ReferenceType } from '../../../srcCommon/types/backendTypes';

const ENERGY_APPLICATIONS = ['Carrier ECOSPLIT', 'Medidor de Energia', 'VAV', 'Fancoil'];
const FANCOIL_VAV_THERM_MODELS = ['BAC-2000', 'BAC-2000 MLN', 'BAC-6000', 'BAC-6000 MLN', 'BAC-6000 AMLN'];
const VALVE_TYPES = ['Válvula Proporcional 0-10V', 'Válvula Fixa On-Off'];

export interface AvailableOptions {
  units:   { value: number, label: string, norms: string[] }[]
  fluids:  { value: string, label: string, norms: string[] }[]
  applics: { value: string, label: string, norms: string[] }[]
  types:   { value: string, label: string, norms: string[] }[]
  envs:    { value: string, label: string, norms: string[] }[]
  brands:  { value: string, label: string, norms: string[] }[]
  roles:  { value: string, label: string, norms: string[] }[]
  damInstallationLocation:  { value: string, label: string, norms: string[] }[]
  evaporatorModels:  { value: string, label: string, norms: string[] }[]
  vavs:  { value: string, label: string, type: string, norms: string[] }[]
  rtypes:   { RTYPE_ID: number, RTYPE_NAME: string, norms: string[] }[]
  psens:   { value: string, label: string, norms: string[] }[]
  energy: { MODEL_ID: number, MANUFACTURER_ID: number, NAME: string, norms: string[] }[]
  fancoils:  { value: string, label: string, type: string, norms: string[] }[]
}

// Funções para Input Rows 
export function prepareUnitInRow(inRow: TableRow){
  if (inRow.UNIT_NAME === '-' || !inRow.UNIT_NAME) inRow.UNIT_NAME = null;
  if (inRow.UNIT_ID === '-' || !inRow.UNIT_ID) inRow.UNIT_ID = null;
  if (inRow.UNIT_CODE_CELSIUS === '-' || !inRow.UNIT_CODE_CELSIUS) inRow.UNIT_CODE_CELSIUS = null;
  if (inRow.UNIT_CODE_API === '-' || !inRow.UNIT_CODE_API) inRow.UNIT_CODE_API = null;
  if (inRow.STATE_ID === '-' || !inRow.STATE_ID) inRow.STATE_ID = null;
  if (inRow.CITY_NAME === '-' || !inRow.CITY_NAME) inRow.CITY_NAME = null;
  if (inRow.LATLONG === '-' || !inRow.LATLONG) inRow.LATLONG = null;  
  if (inRow.AMOUNT_PEOPLE === '-' || !inRow.AMOUNT_PEOPLE) inRow.AMOUNT_PEOPLE = null;
  if (inRow.SKETCH_1 === '-' || !inRow.SKETCH_1) inRow.SKETCH_1 = null;
  if (inRow.SKETCH_2 === '-' || !inRow.SKETCH_2) inRow.SKETCH_2 = null;
  if (inRow.SKETCH_3 === '-' || !inRow.SKETCH_3) inRow.SKETCH_3 = null;
  if (inRow.SKETCH_4 === '-' || !inRow.SKETCH_4) inRow.SKETCH_4 = null;
  if (inRow.SKETCH_5 === '-' || !inRow.SKETCH_5) inRow.SKETCH_5 = null;
  if (inRow.COUNTRY === '-' || !inRow.COUNTRY) inRow.COUNTRY = null;
  if (inRow.UNIT_STATUS === '-' || !inRow.UNIT_STATUS) inRow.UNIT_STATUS = null;
  if (inRow.TIME_ZONE === '-' || !inRow.TIME_ZONE) inRow.TIME_ZONE = null;
  if (inRow.CONSTRUCTED_AREA === '-' || !inRow.CONSTRUCTED_AREA) inRow.CONSTRUCTED_AREA = null;
}

export function prepareSimcardUnitInRow(inRow: TableRow) {
  if (inRow.ICCID === '-' || !inRow.ICCID) inRow.ICCID = null;
  if (inRow.ACCESSPOINT === '-' || !inRow.ACCESSPOINT) inRow.ACCESSPOINT = null;
  if (inRow.MODEM === '-' || !inRow.MODEM) inRow.MODEM = null;
  if (inRow.MACACCESSPOINT === '-' || !inRow.MACACCESSPOINT) inRow.MACACCESSPOINT = null;
  if (inRow.MACREPEATER === '-' || !inRow.MACREPEATER) inRow.MACREPEATER = null;
  if (inRow.SIMCARD_PHOTO1 === '-' || !inRow.SIMCARD_PHOTO1) inRow.SIMCARD_PHOTO1 = null;
  if (inRow.SIMCARD_PHOTO2 === '-' || !inRow.SIMCARD_PHOTO2) inRow.SIMCARD_PHOTO2 = null;
  if (inRow.SIMCARD_PHOTO3 === '-' || !inRow.SIMCARD_PHOTO3) inRow.SIMCARD_PHOTO3 = null;
}

export function prepareIlluminationInRow(inRow: TableRow) {
  if (inRow.UTILITY_ID === '-' || !inRow.UTILITY_ID) inRow.UTILITY_ID = null;
  if (inRow.UTILITY_NAME === '-' || !inRow.UTILITY_NAME) inRow.UTILITY_NAME = null;
  if (inRow.GRID_VOLTAGE === '-' || !inRow.GRID_VOLTAGE) inRow.GRID_VOLTAGE = null;
  if (inRow.MAINS_CURRENT === '-' || !inRow.MAINS_CURRENT) inRow.MAINS_CURRENT = null;
  if (inRow.ASSOCIATE_DEV === '-' || !inRow.ASSOCIATE_DEV) inRow.ASSOCIATE_DEV = null;
  if (inRow.ASSOCIATE_DEV_PORT === '-' || !inRow.ASSOCIATE_DEV_PORT) inRow.ASSOCIATE_DEV_PORT = null;
  if (inRow.FEEDBACK_DAL === '-' || !inRow.FEEDBACK_DAL) inRow.FEEDBACK_DAL = null;
}

export function prepareIlluminationPhotosInRow(inRow: TableRow) {
  if (inRow.PHOTO_DAL === '-' || !inRow.PHOTO_DAL) inRow.PHOTO_DAL = null;
  if (inRow.PHOTO_DMT === '-' || !inRow.PHOTO_DMT) inRow.PHOTO_DMT = null;
  if (inRow.PHOTO_UTILITY === '-' || !inRow.PHOTO_UTILITY) inRow.PHOTO_UTILITY = null;
  if (inRow.MAINS_CURRENT === '-' || !inRow.MAINS_CURRENT) inRow.MAINS_CURRENT = null;
  if (inRow.ASSOCIATE_DEV === '-' || !inRow.ASSOCIATE_DEV) inRow.ASSOCIATE_DEV = null;
  if (inRow.ASSOCIATE_DEV_PORT === '-' || !inRow.ASSOCIATE_DEV_PORT) inRow.ASSOCIATE_DEV_PORT = null;
  if (inRow.FEEDBACK_DAL === '-' || !inRow.FEEDBACK_DAL) inRow.FEEDBACK_DAL = null;
}

const preparePropInRow = (inRow: TableRow, prop: keyof TableRow) => {
  if (inRow[prop] === '-' || !inRow[prop]) inRow[prop] = null;
}

export function prepareNobreakInRow(inRow: TableRow){
  preparePropInRow(inRow, 'UNIT_ID');
  preparePropInRow(inRow, 'UTILITY_ID');
  preparePropInRow(inRow, 'UTILITY_NAME');
  preparePropInRow(inRow, 'INSTALLATION_DATE_UTIL');
  preparePropInRow(inRow, 'DISTRIBUTOR');
  preparePropInRow(inRow, 'MODEL');
  preparePropInRow(inRow, 'ENTRY_VOLTAGE');
  preparePropInRow(inRow, 'OUT_VOLTAGE');
  preparePropInRow(inRow, 'POT_NOMINAL');
  preparePropInRow(inRow, 'AUTON_NOMINAL');
  preparePropInRow(inRow, 'INPUT_ELECTRIC_CURRENT');
  preparePropInRow(inRow, 'OUTPUT_ELECTRIC_CURRENT');
  preparePropInRow(inRow, 'NOMINAL_BATTERY_CAPACITY');
  preparePropInRow(inRow, 'ASSOCIATE_DEV');
  preparePropInRow(inRow, 'ASSOCIATE_DEV_PORT');
  preparePropInRow(inRow, 'ASSOCIATE_ASSET');
  preparePropInRow(inRow, 'PHOTO_DMT');
  preparePropInRow(inRow, 'PHOTO_UTILITY');
}


export function prepareGroupBasicInfoInRow(inRow: TableRow) {
  if (inRow.GROUP_ID === '-' || !inRow.GROUP_ID) inRow.GROUP_ID = null;
  if (inRow.GROUP_NAME === '-' || !inRow.GROUP_NAME) inRow.GROUP_NAME = null;
  if (inRow.INSTALLATION_DATE === '-' || !inRow.INSTALLATION_DATE) inRow.INSTALLATION_DATE = null;
  if (inRow.MCHN_APPL === '-' || !inRow.MCHN_APPL) inRow.MCHN_APPL = null;
  if (inRow.GROUP_TYPE === '-' || !inRow.GROUP_TYPE) inRow.GROUP_TYPE = null;
  if (inRow.MCHN_BRAND === '-' || !inRow.MCHN_BRAND) inRow.MCHN_BRAND = null;
  if (inRow.FLUID_TYPE === '-' || !inRow.FLUID_TYPE) inRow.FLUID_TYPE = null;
  if (inRow.MACHINE_RATED_POWER === '-' || !inRow.MACHINE_RATED_POWER) inRow.MACHINE_RATED_POWER = null;
}

export function prepareGroupAndAutomDevPhotosInRow(inRow: TableRow) {
  if (inRow.PHOTO_DEVGROUPS_1 === '-' || !inRow.PHOTO_DEVGROUPS_1) inRow.PHOTO_DEVGROUPS_1 = null;
  if (inRow.PHOTO_DEVGROUPS_2 === '-' || !inRow.PHOTO_DEVGROUPS_2) inRow.PHOTO_DEVGROUPS_2 = null;
  if (inRow.PHOTO_DEVGROUPS_3 === '-' || !inRow.PHOTO_DEVGROUPS_3) inRow.PHOTO_DEVGROUPS_3 = null;
  if (inRow.PHOTO_DEVGROUPS_4 === '-' || !inRow.PHOTO_DEVGROUPS_4) inRow.PHOTO_DEVGROUPS_4 = null;
  if (inRow.PHOTO_DEVGROUPS_5 === '-' || !inRow.PHOTO_DEVGROUPS_5) inRow.PHOTO_DEVGROUPS_5 = null;
  if (inRow.PHOTO_AUTOM_DEV_1 === '-' || !inRow.PHOTO_AUTOM_DEV_1) inRow.PHOTO_AUTOM_DEV_1 = null;
  if (inRow.PHOTO_AUTOM_DEV_2 === '-' || !inRow.PHOTO_AUTOM_DEV_2) inRow.PHOTO_AUTOM_DEV_2 = null;
  if (inRow.PHOTO_AUTOM_DEV_3 === '-' || !inRow.PHOTO_AUTOM_DEV_3) inRow.PHOTO_AUTOM_DEV_3 = null;
  if (inRow.PHOTO_AUTOM_DEV_4 === '-' || !inRow.PHOTO_AUTOM_DEV_4) inRow.PHOTO_AUTOM_DEV_4 = null;
  if (inRow.PHOTO_AUTOM_DEV_5 === '-' || !inRow.PHOTO_AUTOM_DEV_5) inRow.PHOTO_AUTOM_DEV_5 = null;
}

export function prepareDutInRow(inRow: TableRow) {
  if (inRow.DEV_AUTOM_ID === '-' || !inRow.DEV_AUTOM_ID) inRow.DEV_AUTOM_ID = null;
  if (inRow.PLACEMENT === '-' || !inRow.PLACEMENT) inRow.PLACEMENT = null;
  if (inRow.SENSORS_DUT_DUO === '-' || !inRow.SENSORS_DUT_DUO) inRow.SENSORS_DUT_DUO = null;
  if (inRow.DUT_ID === '-' || !inRow.DUT_ID) inRow.DUT_ID = null;
  if (inRow.PHOTO_DUT_1 === '-' || !inRow.PHOTO_DUT_1) inRow.PHOTO_DUT_1 = null;
  if (inRow.PHOTO_DUT_2 === '-' || !inRow.PHOTO_DUT_2) inRow.PHOTO_DUT_2 = null;
  if (inRow.PHOTO_DUT_3 === '-' || !inRow.PHOTO_DUT_3) inRow.PHOTO_DUT_3 = null;
  if (inRow.PHOTO_DUT_4 === '-' || !inRow.PHOTO_DUT_4) inRow.PHOTO_DUT_4 = null;
  if (inRow.PHOTO_DUT_5 === '-' || !inRow.PHOTO_DUT_5) inRow.PHOTO_DUT_5 = null;
  if (inRow.ROOM_NAME === '-' || !inRow.ROOM_NAME) inRow.ROOM_NAME = null;
  if (inRow.RTYPE_NAME === '-' || !inRow.RTYPE_NAME) inRow.RTYPE_NAME = null;
}

export function prepareAssetInRow(inRow: TableRow) {
  if (inRow.DAT_ID === '-' || !inRow.DAT_ID) inRow.DAT_ID = null;
  if (inRow.AST_DESC === '-' || !inRow.AST_DESC) inRow.AST_DESC = null;
  if (inRow.AST_ROLE_NAME === '-' || !inRow.AST_ROLE_NAME) inRow.AST_ROLE_NAME = null;
  if (inRow.MCHN_MODEL === '-' || !inRow.MCHN_MODEL) inRow.MCHN_MODEL = null;
  if (inRow.CAPACITY_PWR === '-' || !inRow.CAPACITY_PWR) inRow.CAPACITY_PWR = null;
  if (inRow.MCHN_KW === '-' || !inRow.MCHN_KW) inRow.MCHN_KW = null;
  if (inRow.EVAPORATOR_MODEL === '-' || !inRow.EVAPORATOR_MODEL) inRow.EVAPORATOR_MODEL = null;
  if (inRow.INSUFFLATION_SPEED === '-' || !inRow.INSUFFLATION_SPEED) inRow.INSUFFLATION_SPEED = null;
  if (inRow.COMPRESSOR_RLA === '-' || !inRow.COMPRESSOR_RLA) inRow.COMPRESSOR_RLA = null;
  if (inRow.EQUIPMENT_POWER === '-' || !inRow.EQUIPMENT_POWER) inRow.EQUIPMENT_POWER = null;
  if (inRow.PHOTO_ASSET_1 === '-' || !inRow.PHOTO_ASSET_1) inRow.PHOTO_ASSET_1 = null;
  if (inRow.PHOTO_ASSET_2 === '-' || !inRow.PHOTO_ASSET_2) inRow.PHOTO_ASSET_2 = null;
  if (inRow.PHOTO_ASSET_3 === '-' || !inRow.PHOTO_ASSET_3) inRow.PHOTO_ASSET_3 = null;
  if (inRow.PHOTO_ASSET_4 === '-' || !inRow.PHOTO_ASSET_4) inRow.PHOTO_ASSET_4 = null;
  if (inRow.PHOTO_ASSET_5 === '-' || !inRow.PHOTO_ASSET_5) inRow.PHOTO_ASSET_5 = null;
}

export function prepareDacInRow(inRow: TableRow) {
  if (inRow.DEV_ID === '-' || !inRow.DEV_ID) inRow.DEV_ID = null;
  if (inRow.DAC_COMIS === '-' || !inRow.DAC_COMIS) inRow.DAC_COMIS = null;
  if (inRow.P0_SENSOR === '-' || !inRow.P0_SENSOR) inRow.P0_SENSOR = null;
  if (inRow.P0_POSITN === '-' || !inRow.P0_POSITN) inRow.P0_POSITN = null;
  if (inRow.P1_SENSOR === '-' || !inRow.P1_SENSOR) inRow.P1_SENSOR = null;
  if (inRow.P1_POSITN === '-' || !inRow.P1_POSITN) inRow.P1_POSITN = null;
  if (inRow.DAC_COP === '-' || !inRow.DAC_COP) inRow.DAC_COP = null;
  if (inRow.INSTALLATION_LOCATION === '-' || !inRow.INSTALLATION_LOCATION) inRow.INSTALLATION_LOCATION = null;
}

export function prepareDamInRow(inRow: TableRow) {
  if (inRow.DAM_INSTALLATION_LOCATION === '-' || !inRow.DAM_INSTALLATION_LOCATION) inRow.DAM_INSTALLATION_LOCATION = null;
  if (inRow.DAM_PLACEMENT === '-' || !inRow.DAM_PLACEMENT) inRow.DAM_PLACEMENT = null;
  if (inRow.DAM_T0_POSITION === '-' || !inRow.DAM_T0_POSITION) inRow.DAM_T0_POSITION = null;
  if (inRow.DAM_T1_POSITION === '-' || !inRow.DAM_T1_POSITION) inRow.DAM_T1_POSITION = null;
}

export function prepareDriInRow(inRow: TableRow) {
  if (inRow.ID_MED_ENERGY === '-' || !inRow.ID_MED_ENERGY) inRow.ID_MED_ENERGY = null;
  if (inRow.NUM_SERIE_MED_ENERGY === '-' || !inRow.NUM_SERIE_MED_ENERGY) inRow.NUM_SERIE_MED_ENERGY = null;
  if (inRow.MODEL_MED_ENERGY === '-' || !inRow.MODEL_MED_ENERGY) inRow.MODEL_MED_ENERGY = null;
  if (inRow.CAPACITY_TCA === '-' || !inRow.CAPACITY_TCA) inRow.CAPACITY_TCA = null;
  if (inRow.INSTALLATION_ELETRICAL_TYPE === '-' || !inRow.INSTALLATION_ELETRICAL_TYPE) inRow.INSTALLATION_ELETRICAL_TYPE = null;
  if (inRow.SHIPPING_INTERVAL === '-' || !inRow.SHIPPING_INTERVAL) inRow.SHIPPING_INTERVAL = null;
  if (inRow.PHOTO_DRI_1 === '-' || !inRow.PHOTO_DRI_1) inRow.PHOTO_DRI_1 = null;
  if (inRow.PHOTO_DRI_2 === '-' || !inRow.PHOTO_DRI_2) inRow.PHOTO_DRI_2 = null;
  if (inRow.PHOTO_DRI_3 === '-' || !inRow.PHOTO_DRI_3) inRow.PHOTO_DRI_3 = null;
  if (inRow.PHOTO_DRI_4 === '-' || !inRow.PHOTO_DRI_4) inRow.PHOTO_DRI_4 = null;
  if (inRow.PHOTO_DRI_5 === '-' || !inRow.PHOTO_DRI_5) inRow.PHOTO_DRI_5 = null;
}

export function prepareDacPhotosInRow(inRow: TableRow) {
  if (inRow.PHOTO_DAC_1 === '-' || !inRow.PHOTO_DAC_1) inRow.PHOTO_DAC_1 = null;
  if (inRow.PHOTO_DAC_2 === '-' || !inRow.PHOTO_DAC_2) inRow.PHOTO_DAC_2 = null;
  if (inRow.PHOTO_DAC_3 === '-' || !inRow.PHOTO_DAC_3) inRow.PHOTO_DAC_3 = null;
  if (inRow.PHOTO_DAC_4 === '-' || !inRow.PHOTO_DAC_4) inRow.PHOTO_DAC_4 = null;
  if (inRow.PHOTO_DAC_5 === '-' || !inRow.PHOTO_DAC_5) inRow.PHOTO_DAC_5 = null;
}

export function prepareWaterMeterInRow(inRow: TableRow){
  if (inRow.DMA_ID === '-' || !inRow.DMA_ID) inRow.DMA_ID = null;
  if (inRow.HYDROMETER_MODEL === '-' || !inRow.HYDROMETER_MODEL) inRow.HYDROMETER_MODEL = null;
  if (inRow.WATER_INSTALLATION_DATE === '-' || !inRow.WATER_INSTALLATION_DATE) inRow.WATER_INSTALLATION_DATE = null;
  if (inRow.TOTAL_CAPACITY === '-' || !inRow.TOTAL_CAPACITY) inRow.TOTAL_CAPACITY = null;
  if (inRow.TOTAL_RESERVOIRS === '-' || !inRow.TOTAL_RESERVOIRS) inRow.TOTAL_RESERVOIRS = null;
}

export function prepareWaterMeterPhotosInRow(inRow: TableRow){
  if (inRow.PHOTO_DMA_1 === '-' || !inRow.PHOTO_DMA_1) inRow.PHOTO_DMA_1 = null;
  if (inRow.PHOTO_DMA_2 === '-' || !inRow.PHOTO_DMA_2) inRow.PHOTO_DMA_2 = null;
  if (inRow.PHOTO_DMA_3 === '-' || !inRow.PHOTO_DMA_3) inRow.PHOTO_DMA_3 = null;
  if (inRow.PHOTO_DMA_4 === '-' || !inRow.PHOTO_DMA_4) inRow.PHOTO_DMA_4 = null;
  if (inRow.PHOTO_DMA_5 === '-' || !inRow.PHOTO_DMA_5) inRow.PHOTO_DMA_5 = null;
}

// Upload de fotos
export async function uploadFile(file: string, info: number|string, type: ReferenceType, authHeader: string) {
  if (file != null && info) {
    const url = convertGoogleDriveLink(file);
    const response = await axios.get(url, { responseType: 'arraybuffer' }).then((res) => res);

    const buffer = Buffer.from(response.data);
  
    // Obter o tipo MIME e a extensão do arquivo
    const mimeType = response.headers['content-type'];

    if (type !== 'SKETCHES') {
      const compressedBuffer = await sharp(response.data)
            .jpeg({ quality: 60 }) // Define a qualidade desejada (60% de qualidade JPEG)
            .toBuffer(); // Converte para buffer

      // Criar o objeto Multer.File
      const multerFile: Express.Multer.File  = {
        fieldname: 'file',
        originalname: 'imagem.jpg',
        encoding: '7bit',
        mimetype: mimeType,
        size: compressedBuffer.length,
        buffer: compressedBuffer,
        stream: null, // Adicione estas propriedades com valores nulos
        destination: null,
        filename: null,
        path: null
      };
      await sendImageToUploadService(multerFile, {referenceId: Number(info), referenceType: type}, authHeader);
    }
    else {
      // Nome do arquivo
      const contentDisposition = response.headers['content-disposition'];
      const fileName = contentDisposition ? contentDisposition.substring(contentDisposition.indexOf('filename="') + 10, contentDisposition.length - 1) : `downloaded_file.pdf`;
      // Criar o objeto Multer.File
      const multerFile: Express.Multer.File  = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: mimeType,
        size: buffer.length,
        buffer: buffer,
        stream: null, // Adicione estas propriedades com valores nulos
        destination: null,
        filename: null,
        path: null
      };

      const params = {
        unitId: Number(info),
        isVisible: true,
        nameSketch: fileName,
        file: multerFile
      }
      await apiUploadService['POST /upload-service/upload-sketch'](
        params,
        authHeader
      );
    }
  }
}

function convertGoogleDriveLink(url: string): string {
  const fileViewPattern = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view(\?usp=sharing)?/;

  const viewMatch = url.match(fileViewPattern);

  if (viewMatch) {
    const fileId = viewMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  } else {
    return url;
  }
}

export async function uploadFiles(files: string[], info: number, type: ReferenceType, authHeader: string) {
  for (let file of files) {
    if(type === 'SKETCHES' || !file?.endsWith(".pdf")){
      await uploadFile(file, info, type, authHeader);
    }    
  }
}


export async function addMachineAdditionalParameters(machineId: number, info: {[key: string]: string}, session: SessionData ){
  for (const parameterAdditional in info ){
    const row = info[parameterAdditional];
    const machineParameterInfo = await sqldb.ADDITIONAL_MACHINE_PARAMETERS.getBasicInfo({ MACHINE_ID: machineId, COLUMN_NAME: parameterAdditional})
    if (!machineParameterInfo && row) {
      await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_insert({NAME: parameterAdditional, VALUE: row, MACHINE_ID: machineId}, session.user);
    } else if (machineParameterInfo && !row) {
      await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_deleteMachineParameters({ ID: machineParameterInfo.ID }, session.user);
    } else if (machineParameterInfo && machineParameterInfo.COLUMN_VALUE != row){
      await sqldb.ADDITIONAL_MACHINE_PARAMETERS.w_update({ ID: machineParameterInfo.ID, COLUMN_VALUE: row }, session.user);
    }
  }
}

export async function addNobreakAdditionalParameters(nobreakId: number, info: {[key: string]: string}, session: SessionData ){
  for (const parameterAdditional in info ){
    const row = info[parameterAdditional];
    const nobreakParameterInfo = await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.getBasicInfo({ NOBREAK_ID: nobreakId, COLUMN_NAME: parameterAdditional})
    if (!nobreakParameterInfo && row){
      await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.w_insert({NAME: parameterAdditional, VALUE: row, NOBREAK_ID: nobreakId}, session.user);
    } else if (nobreakParameterInfo && !row) {
      await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.w_deleteNobreakParameters({ ID: nobreakParameterInfo.ID }, session.user);
    } else if (nobreakParameterInfo && nobreakParameterInfo.COLUMN_VALUE != row){
      await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.w_update({ ID: nobreakParameterInfo.ID, COLUMN_VALUE: row }, session.user);
    }
  }
}

export async function deleteNobreakPhotos(checked: TableRow, session: SessionData) {
  if (checked.UTILITY_ID ) {
    const results = await sqldb.NOBREAK_IMAGES.getList({ NOBREAK_ID: Number(checked.UTILITY_ID) })
    if (results.length && results.length > 0 && (checked.PHOTO_UTILITY)) {
      const urlPrefix = `${servConfig.filesBucket.url}/${servConfig.filesBucket.imagesBucketPath}`
      const list = results.map(row => (urlPrefix + row.FILENAME));
      for (const image of list) {
        await nobreakDeletePhotos(image, Number(checked.UTILITY_ID), session.user);
      }
    }
  }
}

export async function deleteDamsPhotos(checked: TableRow, authHeader: string) {
  // Se for edição, apaga croquis/projetos anteriores, caso haja novos
  if (checked.DEV_AUTOM_ID?.startsWith('DAM')) {
    const damInfo = await sqldb.DAMS.getDamBasicInfo({devId: checked.DEV_AUTOM_ID});
    const results = await getImageListFromUploadService({referenceId: damInfo.DEVICE_ID, referenceType: 'DAMS'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_AUTOM_DEV_1 || checked.PHOTO_AUTOM_DEV_2 || checked.PHOTO_AUTOM_DEV_3 || checked.PHOTO_AUTOM_DEV_4 || checked.PHOTO_AUTOM_DEV_5)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: damInfo.DEVICE_ID, referenceType: 'DAMS', filename: image}, authHeader);
      }
    }
  }
}

export async function deleteAssetsPhotos(checked: TableRow, authHeader: string) {
  if (checked.DAT_ID) {
    const assetInfo= await sqldb.ASSETS.getAssetByDatCode({DAT_CODE: checked.DAT_ID});
    if (!assetInfo) return;
    const results = await getImageListFromUploadService({referenceId: assetInfo.ASSET_ID, referenceType: 'ASSETS'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_ASSET_1 || checked.PHOTO_ASSET_2 || checked.PHOTO_ASSET_3 || checked.PHOTO_ASSET_4 || checked.PHOTO_ASSET_5)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: assetInfo.ASSET_ID, referenceType: 'ASSETS', filename: image}, authHeader);
      }
    }
  }
}

export async function deleteDacsPhotos(checked: TableRow, deviceId: number, authHeader: string) {
  const results = await getImageListFromUploadService({referenceId: deviceId, referenceType: 'DACS'}, authHeader);
  if (results.length && results.length > 0 && (checked.PHOTO_DAC_1 || checked.PHOTO_DAC_2 || checked.PHOTO_DAC_3 || checked.PHOTO_DAC_4 || checked.PHOTO_DAC_5)) {
    for (const image of results) {
      await deleteImageFromUploadService({referenceId: deviceId, referenceType: 'DACS', filename: image}, authHeader);
    }
  }
}

export async function deleteDevgroupsPhotos(checked: TableRow, GROUP_ID: number, authHeader: string) {
  if (GROUP_ID){
    const results = await getImageListFromUploadService({referenceId: GROUP_ID, referenceType: 'MACHINES'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_DEVGROUPS_1 || checked.PHOTO_DEVGROUPS_2 || checked.PHOTO_DEVGROUPS_3 || checked.PHOTO_DEVGROUPS_4 || checked.PHOTO_DEVGROUPS_5)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: GROUP_ID, referenceType: 'DACS', filename: image}, authHeader);
      }
    }
  }    
}

export async function deleteDutsPhotos(checked: TableRow, deviceId: number, authHeader: string) {
  const results = await getImageListFromUploadService({referenceId: deviceId, referenceType: 'DUTS'}, authHeader);
  if (results.length && results.length > 0 && (checked.PHOTO_DUT_1 || checked.PHOTO_DUT_2 || checked.PHOTO_DUT_3 || checked.PHOTO_DUT_4 || checked.PHOTO_DUT_5)) {
    for (const image of results) {
      await deleteImageFromUploadService({referenceId: deviceId, referenceType: 'DUTS', filename: image}, authHeader);
    }
  }
}

export async function deleteDmasPhotos(checked: TableRow, authHeader: string) {
  const dmaInfo = await sqldb.DMAS_DEVICES.getBasicInfo({DEVICE_CODE: checked.DMA_ID});
  const results = await getImageListFromUploadService({referenceId: dmaInfo.DEVICE_ID, referenceType: 'DMAS'}, authHeader);
  if (results.length && results.length > 0 && (checked.PHOTO_DMA_1 || checked.PHOTO_DMA_2 || checked.PHOTO_DMA_3 || checked.PHOTO_DMA_4 || checked.PHOTO_DMA_5)) {
    for (const image of results) {
      await deleteImageFromUploadService({referenceId: dmaInfo.DEVICE_ID, referenceType: 'DMAS', filename: image}, authHeader);
    }
  }
}

export async function deleteDriPhotos(checked: TableRow, deviceId: number, authHeader: string) {
  const results = await getImageListFromUploadService({referenceId: deviceId, referenceType: 'DRIS'}, authHeader);
  if (results.length && results.length > 0 && (checked.PHOTO_DRI_1 || checked.PHOTO_DRI_2 || checked.PHOTO_DRI_3 || checked.PHOTO_DRI_4 || checked.PHOTO_DRI_5)) {
    for (const image of results) {
      await deleteImageFromUploadService({referenceId: deviceId, referenceType: 'DRIS', filename: image}, authHeader);
    }
  }
}

export async function deleteIlluminationsPhotos(checked: TableRow, illuminationId: number, authHeader: string) {
  if (illuminationId) {
    const results = await getImageListFromUploadService({referenceId: illuminationId, referenceType: 'ILLUMINATIONS'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_UTILITY)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: illuminationId, referenceType: 'ILLUMINATIONS', filename: image}, authHeader);
      }
    }
  }
}

export async function deleteDmtPhotos(checked: TableRow, deviceId: number, authHeader: string) {
  if (deviceId) {
    const results = await getImageListFromUploadService({referenceId: deviceId, referenceType: 'DMTS'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_DMT)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: deviceId, referenceType: 'DMTS', filename: image}, authHeader);
      }
    }
  }
}

export async function deleteDalPhotos(checked: TableRow, deviceId: number, authHeader: string) {
  if (deviceId) {
    const results = await getImageListFromUploadService({referenceId: deviceId, referenceType: 'DALS'}, authHeader);
    if (results.length && results.length > 0 && (checked.PHOTO_DAL)) {
      for (const image of results) {
        await deleteImageFromUploadService({referenceId: deviceId, referenceType: 'DALS', filename: image}, authHeader);
      }
    }
  }
}

// Funções para preenchimento de checked
export function checkUnitParse(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, unitsWillBeCreated: string[]) {
  if (inRow.UNIT_NAME !== undefined) {
    checked.UNIT_NAME = null;
    if (inRow.UNIT_NAME) {
      const asNorm = getNormalized(inRow.UNIT_NAME)
      const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        const foundWillBeCreated = unitsWillBeCreated.includes(inRow.UNIT_NAME);
        if (!foundWillBeCreated){
          errors.push({ message: `Unidade inválida: ${inRow.UNIT_NAME}` });
        }
      }
      checked.UNIT_NAME = inRow.UNIT_NAME;
    }
  }
}


async function verifyUtilityRelationDmt(checked: TableRow, errors: { message: string }[], ID: number) {
  const dmts = await sqldb.DMTS_ILLUMINATIONS.getDalsByDalId({ DMT_ID: ID });
  if (dmts.length === 4) errors.push({ message: 'Não existe portas disponíveis para mais um utilitário.'});
}


async function DmtIlluminationVerify(checked: TableRow, errors: { message: string }[], UNIT_ID: number) {
  const existingID = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
  if (existingID) {
    const dmtPorts = await checkAvailablePorts(checked.ASSOCIATE_DEV, 'Illumination');
    if ((dmtPorts.ports[Number(checked.ASSOCIATE_DEV_PORT)-1].associated && !(dmtPorts.ports[Number(checked.ASSOCIATE_DEV_PORT)-1].illuminationId && dmtPorts.ports[Number(checked.ASSOCIATE_DEV_PORT)-1].illuminationId === Number(checked.UTILITY_ID)))
    || !dmtPorts.freePorts
    ) {
      errors.push({ message: 'A porta do dispositivo já está ocupada, ou não é possível associar um novo utilitário.'});
    }
    const dmtUnit = await sqldb.DMTS.getBasicInfo({ DMT_CODE: checked.ASSOCIATE_DEV });
    if (dmtUnit?.UNIT_ID && UNIT_ID !== null) {
      if (dmtUnit.UNIT_ID !== UNIT_ID){
        errors.push({ message: ' DMT já associado a outra unidade.'});
      }
    }
  }
}

async function verifyUtilityRelationDal(checked: TableRow, errors: { message: string }[], ID: number) {
  const dals = await sqldb.DALS_ILLUMINATIONS.getDalsByDalId({ DAL_ID: ID });
  if (dals.length === 4) errors.push({ message: 'Não existe portas disponíveis para mais um utilitário.'});
}

async function DalIlluminationVerify(checked: TableRow, errors: { message: string }[], UNIT_ID: number) {
  const existingDAL = await sqldb.DALS.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
  if (existingDAL) {
    await verifyUtilityRelationDal(checked, errors, existingDAL.ID);
    const isFreePort = await sqldb.DALS_ILLUMINATIONS.getDalWithUnitByIdAndPort({ DAL_ID: existingDAL.ID, PORT: Number(checked.ASSOCIATE_DEV_PORT) });
  
    if (!isFreePort.filter((item) => !(item.PORT === Number(checked.ASSOCIATE_DEV_PORT) && !(item.ILLUMINATION_ID && item.ILLUMINATION_ID === Number(checked.UTILITY_ID)))).length) {
      errors.push({ message: 'A porta do dispositivo já está ocupada.'});
    }
    const dalUnit = await sqldb.DALS.getBasicInfo({ DAL_CODE: checked.ASSOCIATE_DEV });
    if (dalUnit?.UNIT_ID && UNIT_ID !== null) {
      if (dalUnit.UNIT_ID !== UNIT_ID){
        errors.push({ message: 'DAL já associado a outra unidade.'});
      }
    }
    await checkFeedbackDAL(checked, errors, isFreePort);
  }
}

async function checkFeedbackDAL(checked: TableRow, errors: { message: string }[], isFreePort: {
  ID: number;
  DAL_ID: number;
  ILLUMINATION_ID: number;
  PORT: number;
  FEEDBACK: number;
  UNIT_ID: number;
}[]) {
  if (checked.FEEDBACK_DAL){
    if (isFreePort[0] && isFreePort[0].FEEDBACK !== null && isFreePort[0].ILLUMINATION_ID !== Number(checked.UTILITY_ID)) errors.push({ message: 'Já existe feedback para este DAL.'});
  }
  }

export async function checkPortIllumDev(checked: TableRow, errors: { message: string }[], UNIT_ID: number) {
  if (checked.ASSOCIATE_DEV && checked.ASSOCIATE_DEV_PORT) {
    if (isNaN(Number(checked.ASSOCIATE_DEV_PORT))){
      errors.push({ message: 'A porta do dispositivo deve ser um número de 1 a 4.'});
    }
    if (Number(checked.ASSOCIATE_DEV_PORT) < 1 || Number(checked.ASSOCIATE_DEV_PORT) > 4) {
      errors.push({ message: 'A porta do dispositivo não é válida'});
    }
    if (checked.ASSOCIATE_DEV.startsWith('DMT')) {
      await  DmtIlluminationVerify(checked, errors, UNIT_ID);
    } else if (checked.ASSOCIATE_DEV.startsWith('DAL')) {
      await  DalIlluminationVerify(checked, errors, UNIT_ID);
    }
  } 
}

async function checkEditionIllumination(checked: TableRow, errors: { message: string }[], unitId: number) {
  if (checked.ASSOCIATE_DEV) {
    if (checked.ASSOCIATE_DEV.startsWith('DAL') && checked.ASSOCIATE_DEV.length === 12) {
      const dalItem = await sqldb.DALS.getBasicInfo({ DAL_CODE: checked.ASSOCIATE_DEV })
      if (dalItem && dalItem.UNIT_ID !== unitId) {
        errors.push({ message: 'Dispositivo já associado a outra unidade.'});
      }
    }
    else if (checked.ASSOCIATE_DEV.startsWith('DMT') && checked.ASSOCIATE_DEV.length === 12) {
      const dmtItem = await sqldb.DMTS.getBasicInfo({ DMT_CODE: checked.ASSOCIATE_DEV });
      if (dmtItem && dmtItem.UNIT_ID !== unitId) {
        errors.push({ message: 'Dispositivo já associado a outra unidade.'});
      }
    }
    else if (checked.ASSOCIATE_DEV.startsWith('DAM') && checked.ASSOCIATE_DEV.length === 12) {
      const damItem = await sqldb.DAMS_DEVICES.getDamByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
      if (damItem && damItem.UNIT_ID !== unitId) {
        errors.push({ message: 'Dispositivo já associado a outra unidade.'});
      }
    }
    else {
      errors.push({ message: 'ID dispositivo associado inválido'});
    }
  }
}

export async function checkUtilityNameAndId(checked: TableRow, errors: { message: string }[], clientId: number, unitsWillBeCreated: string[] ) {
  if (unitsWillBeCreated.includes(checked.UNIT_NAME)) {
    return null;
  }
  const unit = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: clientId });
  if (!unit) errors.push({ message: 'Unidade não encontrada'});
  else {
    if (checked.UTILITY_NAME) {
      const DEV_ID = await sqldb.ILLUMINATIONS.getIlluminationByNameAndUnit({ NAME: checked.UTILITY_NAME, UNIT_ID: unit.UNIT_ID });
      if (DEV_ID.length > 0 && !checked.UTILITY_ID) errors.push({ message: 'É necessário o ID do utilitário para edição'});
    }
    if (checked.UTILITY_ID) {
      await checkEditionIllumination(checked, errors, unit.UNIT_ID);
    }
    if (!checked.UTILITY_ID && !checked.UTILITY_NAME) {
      errors.push({ message: 'É necessário o ID ou o nome do utilitário'});
    }
    return unit.UNIT_ID;
  }
  return null;
}

export async function checkExistUtility(checked: TableRow, errors: { message: string }[]) {
  if(!checked.UTILITY_ID && !checked.UTILITY_NAME) {
    errors.push({ message: 'É necessário informar o ID do utilitário para edicão ou o nome do utilitário para criação.' });
    return;
  }

  if (checked.UTILITY_ID) {
    const checkIllumination = await sqldb.ILLUMINATIONS.getIllumination({ ID: Number(checked.UTILITY_ID) });
    if (!checkIllumination) {
      errors.push({ message: 'Utilitário não existe.'});
    }
  }
}

export async function checkUnitNull(unitId: number | null, checked: TableRow, errors: { message: string }[]) {
  if (unitId !== null) {
    return;
  }
  if (checked.UTILITY_NAME) {
    return;
  }
  if (checked.UTILITY_ID) {
    if (checked.ASSOCIATE_DEV.startsWith('DAL') && checked.ASSOCIATE_DEV.length === 12) {
      const dalItem = await sqldb.DALS.getBasicInfo({ DAL_CODE: checked.ASSOCIATE_DEV })
      if (dalItem?.UNIT_ID !== null) {
        errors.push({ message: 'Dispositivo já associado a outra unidade.'});
      }
    }
    else if (checked.ASSOCIATE_DEV.startsWith('DMT') && checked.ASSOCIATE_DEV.length === 12) {
      const dmtItem = await sqldb.DMTS.getBasicInfo({ DMT_CODE: checked.ASSOCIATE_DEV });
      if (dmtItem?.UNIT_ID !== null) {
        errors.push({ message: 'Dispositivo já associado a outra unidade.'});
      }
    }
  }
}

export function fillUnitInfoField(inRow: TableRow, checked: TableRow) {
  checked.UNIT_ID = inRow.UNIT_ID || null;
  checked.UNIT_CODE_CELSIUS = inRow.UNIT_CODE_CELSIUS || null;
  checked.UNIT_CODE_API = inRow.UNIT_CODE_API || null;
  checked.STATE_ID = inRow.STATE_ID || null;
  checked.CITY_NAME = inRow.CITY_NAME || null;
  checked.ADDRESS = inRow.ADDRESS || null;
  checked.AMOUNT_PEOPLE = inRow.AMOUNT_PEOPLE || null;
  checked.COUNTRY = inRow.COUNTRY || null;
  checked.TIME_ZONE = inRow.TIME_ZONE || null;
  checked.CONSTRUCTED_AREA = inRow.CONSTRUCTED_AREA || null;
  checked.UNIT_STATUS = inRow.UNIT_STATUS || null;
  checked.ICCID = inRow.ICCID || null;
  checked.ACCESSPOINT = inRow.ACCESSPOINT || null;
  checked.MODEM = inRow.MODEM || null;
  checked.MACACCESSPOINT = inRow.MACACCESSPOINT || null;
  checked.MACREPEATER = inRow.MACREPEATER || null;

  checked.SIMCARD_PHOTO1 = inRow.SIMCARD_PHOTO1;
  checked.SIMCARD_PHOTO2 = inRow.SIMCARD_PHOTO2;
  checked.SIMCARD_PHOTO3 = inRow.SIMCARD_PHOTO3;

  checked.SKETCH_1 = inRow.SKETCH_1;
  checked.SKETCH_2 = inRow.SKETCH_2;
  checked.SKETCH_3 = inRow.SKETCH_3;
  checked.SKETCH_4 = inRow.SKETCH_4;
  checked.SKETCH_5 = inRow.SKETCH_5;
}

export function fillMachineBasicInfoFields(inRow: TableRow, checked: TableRow) {
  checked.GROUP_NAME = inRow.GROUP_NAME || null;
  checked.UNIT_NAME = inRow.UNIT_NAME || null;
  checked.GROUP_ID = inRow.GROUP_ID || null;
  checked.INSTALLATION_DATE = inRow.INSTALLATION_DATE || null;
  checked.INSTALLATION_LOCATION = inRow.INSTALLATION_LOCATION || null;
  checked.DEV_AUTOM_ID = inRow.DEV_AUTOM_ID || null;
  checked.GROUP_TYPE = inRow.GROUP_TYPE || null;
  checked.DAM_INSTALLATION_LOCATION = inRow.DAM_INSTALLATION_LOCATION || null;
  checked.DAM_PLACEMENT = inRow.DAM_PLACEMENT || null;
  checked.DAM_T0_POSITION = inRow.DAM_T0_POSITION || null;
  checked.DAM_T1_POSITION = inRow.DAM_T1_POSITION || null;
  checked.MACHINE_RATED_POWER = inRow.MACHINE_RATED_POWER || null;
}

export function fillNobreakFields(inRow: TableRow, checked: TableRow) {
  checked.UTILITY_ID = inRow.UTILITY_ID || null;
  checked.ENTRY_VOLTAGE = inRow.ENTRY_VOLTAGE || null;
  checked.OUT_VOLTAGE = inRow.OUT_VOLTAGE || null;
  checked.POT_NOMINAL = inRow.POT_NOMINAL || null;
  checked.AUTON_NOMINAL = inRow.AUTON_NOMINAL || null;
  checked.INPUT_ELECTRIC_CURRENT = inRow.INPUT_ELECTRIC_CURRENT || null;
  checked.OUTPUT_ELECTRIC_CURRENT = inRow.OUTPUT_ELECTRIC_CURRENT || null;
  checked.NOMINAL_BATTERY_CAPACITY = inRow.NOMINAL_BATTERY_CAPACITY || null;
  checked.ASSOCIATE_DEV = inRow.ASSOCIATE_DEV || null;
  checked.ASSOCIATE_DEV_PORT = inRow.ASSOCIATE_DEV_PORT || null;
}

export function fillNobreakAssetFields(inRow: TableRow, checked: TableRow){
  checked.UNIT_ID = inRow.UNIT_ID || null;
  checked.MODEL = inRow.MODEL || null;
  checked.INSTALLATION_DATE_UTIL = inRow.INSTALLATION_DATE_UTIL || null;
  checked.ASSOCIATE_ASSET = inRow.ASSOCIATE_ASSET || null;
  checked.DISTRIBUTOR = inRow.DISTRIBUTOR || null;
  checked.UTILITY_NAME = inRow.UTILITY_NAME || null;
}

export function fillNobreakDmtPhotosFields(inRow: TableRow, checked: TableRow){
  checked.PHOTO_DMT = inRow.PHOTO_DMT || null;
  checked.PHOTO_UTILITY = inRow.PHOTO_UTILITY || null;
}

export function fillDevGroupsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_DEVGROUPS_1 = inRow.PHOTO_DEVGROUPS_1 || null;
  checked.PHOTO_DEVGROUPS_2 = inRow.PHOTO_DEVGROUPS_2 || null;
  checked.PHOTO_DEVGROUPS_3 = inRow.PHOTO_DEVGROUPS_3 || null;
  checked.PHOTO_DEVGROUPS_4 = inRow.PHOTO_DEVGROUPS_4 || null;
  checked.PHOTO_DEVGROUPS_5 = inRow.PHOTO_DEVGROUPS_5 || null;
}

export function checkGridVoltage(checked: TableRow, errors: { message: string }[]) {
  if (checked.GRID_VOLTAGE) {
    const normGridVoltage = getNormalized(checked.GRID_VOLTAGE);
    if (!(['127', '220', '380'].includes(normGridVoltage))) {
      errors.push({ message: 'Valor de tensão de rede inválido.'});
    }
  }
  if (checked.MAINS_CURRENT && Number(checked.MAINS_CURRENT) < 0) {
    errors.push({ message: 'Corrente da Rede Elétrica deve ser um número positivo.'});
  }
}

export function fillIluminationInfoFields(inRow: TableRow, checked: TableRow) {
  checked.UTILITY_ID = inRow.UTILITY_ID || null;
  checked.UTILITY_NAME = inRow.UTILITY_NAME || null;
  checked.GRID_VOLTAGE = inRow.GRID_VOLTAGE || null;
  checked.MAINS_CURRENT = inRow.MAINS_CURRENT || null;
  checked.ASSOCIATE_DEV = inRow.ASSOCIATE_DEV || null;
  checked.ASSOCIATE_DEV_PORT = inRow.ASSOCIATE_DEV_PORT || null;
  checked.FEEDBACK_DAL = inRow.FEEDBACK_DAL || null;
}

export function fillIlluminationsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_DAL = inRow.PHOTO_DAL || null;
  checked.PHOTO_DMT = inRow.PHOTO_DMT || null;
  checked.PHOTO_UTILITY = inRow.PHOTO_UTILITY || null;
}

export function fillAutomDevsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_AUTOM_DEV_1 = inRow.PHOTO_AUTOM_DEV_1 || null;
  checked.PHOTO_AUTOM_DEV_2 = inRow.PHOTO_AUTOM_DEV_2 || null;
  checked.PHOTO_AUTOM_DEV_3 = inRow.PHOTO_AUTOM_DEV_3 || null;
  checked.PHOTO_AUTOM_DEV_4 = inRow.PHOTO_AUTOM_DEV_4 || null;
  checked.PHOTO_AUTOM_DEV_5 = inRow.PHOTO_AUTOM_DEV_5 || null;
}

export function fillDutsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_DUT_1 = inRow.PHOTO_DUT_1 || null;
  checked.PHOTO_DUT_2 = inRow.PHOTO_DUT_2 || null;
  checked.PHOTO_DUT_3 = inRow.PHOTO_DUT_3 || null;
  checked.PHOTO_DUT_4 = inRow.PHOTO_DUT_4 || null;
  checked.PHOTO_DUT_5 = inRow.PHOTO_DUT_5 || null;
}

export function fillAssetsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_ASSET_1 = inRow.PHOTO_ASSET_1 || null;
  checked.PHOTO_ASSET_2 = inRow.PHOTO_ASSET_2 || null;
  checked.PHOTO_ASSET_3 = inRow.PHOTO_ASSET_3 || null;
  checked.PHOTO_ASSET_4 = inRow.PHOTO_ASSET_4 || null;
  checked.PHOTO_ASSET_5 = inRow.PHOTO_ASSET_5 || null;
}

export function fillDacsPhotoFields(inRow: TableRow, checked: TableRow) {
  checked.PHOTO_DAC_1 = inRow.PHOTO_DAC_1 || null;
  checked.PHOTO_DAC_2 = inRow.PHOTO_DAC_2 || null;
  checked.PHOTO_DAC_3 = inRow.PHOTO_DAC_3 || null;
  checked.PHOTO_DAC_4 = inRow.PHOTO_DAC_4 || null;
  checked.PHOTO_DAC_5 = inRow.PHOTO_DAC_5 || null;
}

export function fillDriPhotosFields(inRow: TableRow, checked: TableRow){
  checked.PHOTO_DRI_1 = inRow.PHOTO_DRI_1 || null;
  checked.PHOTO_DRI_2 = inRow.PHOTO_DRI_2 || null;
  checked.PHOTO_DRI_3 = inRow.PHOTO_DRI_3 || null;
  checked.PHOTO_DRI_4 = inRow.PHOTO_DRI_4 || null;
  checked.PHOTO_DRI_5 = inRow.PHOTO_DRI_5 || null;
}

export function fillDriFancoilFields(inRow: TableRow, checked: TableRow) {
  checked.FANCOIL_MANUF = inRow.FANCOIL_MANUF || null;
  checked.FANCOIL_MODEL = inRow.FANCOIL_MODEL || null;
}

export function fillDriFancoilVavFields(inRow: TableRow, checked: TableRow) {
  checked.THERM_MANUF = inRow.THERM_MANUF || null;
  checked.THERM_MODEL = inRow.THERM_MODEL || null;
  checked.VALVE_MANUF = inRow.VALVE_MANUF || null;
  checked.VALVE_MODEL = inRow.VALVE_MODEL || null;
  checked.VALVE_TYPE = inRow.VALVE_TYPE || null;
  checked.BOX_MANUF = inRow.BOX_MANUF || null;
  checked.BOX_MODEL = inRow.BOX_MODEL || null;
  checked.ROOM_VAV = inRow.ROOM_VAV || null;
  fillDriFancoilFields(inRow, checked);
}

export function fillDriBasicsInfoFields(inRow: TableRow, checked: TableRow) {
  checked.MCHN_APPL = inRow.MCHN_APPL || null;
  checked.ID_MED_ENERGY = inRow.ID_MED_ENERGY || null;
  checked.NUM_SERIE_MED_ENERGY = inRow.NUM_SERIE_MED_ENERGY || null;
  checked.MODEL_MED_ENERGY = inRow.MODEL_MED_ENERGY || null;
  checked.CAPACITY_TCA = inRow.CAPACITY_TCA || null;
  checked.INSTALLATION_ELETRICAL_TYPE = inRow.INSTALLATION_ELETRICAL_TYPE || null;
  checked.SHIPPING_INTERVAL = inRow.SHIPPING_INTERVAL || null;
  checked.ELECTRIC_CIRCUIT_ID = inRow.ELECTRIC_CIRCUIT_ID || null;
  checked.ELECTRIC_CIRCUIT_NAME = inRow.ELECTRIC_CIRCUIT_NAME || null;
  checked.ENERGY_DEVICES_INFO_ID = inRow.ENERGY_DEVICES_INFO_ID || null;
  fillDriFancoilVavFields(inRow, checked);
}

export function fillAssetsFields(inRow: TableRow, checked: TableRow) {
  checked.DAT_ID = inRow.DAT_ID || null;
  checked.MCHN_BRAND = inRow.MCHN_BRAND || null;
  checked.MCHN_MODEL = inRow.MCHN_MODEL || null;
  checked.CAPACITY_PWR = inRow.CAPACITY_PWR || null;
  checked.AST_DESC = inRow.AST_DESC || null;
  checked.AST_ROLE_NAME = inRow.AST_ROLE_NAME || null;
  checked.DEV_ID = inRow.DEV_ID || null;
  checked.DAC_COMIS = inRow.DAC_COMIS || null;
  checked.EVAPORATOR_MODEL = inRow.EVAPORATOR_MODEL || null;
  checked.INSUFFLATION_SPEED = inRow.INSUFFLATION_SPEED || null;
  checked.COMPRESSOR_RLA = inRow.COMPRESSOR_RLA || null;
  checked.EQUIPMENT_POWER = inRow.EQUIPMENT_POWER || null;
}

export function checkAdditionalParameters(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  checked.ADDITIONAL_PARAMETERS = inRow.ADDITIONAL_PARAMETERS || null;
  const errorsSet = new Set();

  for (const paramName in inRow.ADDITIONAL_PARAMETERS) {
    const paramValue = inRow.ADDITIONAL_PARAMETERS[paramName];
    if (paramValue && paramName.length > 100) {
      errorsSet.add('- O nome do parâmetro é maior do que 100 caracteres.');
    }
    
    if (paramValue?.length > 250) {
      errorsSet.add('- O valor do parâmetro é maior do que 250 caracteres.');
    }
  }

  if (errorsSet.size) {
    const err = Array.from(errorsSet).join('\n');
    errors.push({ message: `Erro nos parâmetros adicionais:\n${err}` });
  }

}

export function fillDmasFields(inRow: TableRow, checked: TableRow){
  checked.DMA_ID = inRow.DMA_ID;
  checked.INSTALLATION_LOCATION = inRow.INSTALLATION_LOCATION || null;
  checked.WATER_INSTALLATION_DATE = inRow.WATER_INSTALLATION_DATE || moment().format('DD/MM/YYYY');
}

export function fillDmasPhotoFields(inRow: TableRow, checked: TableRow){
  checked.PHOTO_DMA_1 = inRow.PHOTO_DMA_1 || null;
  checked.PHOTO_DMA_2 = inRow.PHOTO_DMA_2 || null;
  checked.PHOTO_DMA_3= inRow.PHOTO_DMA_3 || null;
  checked.PHOTO_DMA_4 = inRow.PHOTO_DMA_4 || null;
  checked.PHOTO_DMA_5 = inRow.PHOTO_DMA_5 || null;
}

export function checkStateCityCountry(checked: TableRow, errors: { message: string }[]){
  if (checked.CITY_NAME && !checked.STATE_ID) errors.push({ message: `Cidade definida sem estado: ${checked.CITY_NAME}` });
  if (checked.STATE_ID && !checked.CITY_NAME) errors.push({ message: `Faltou o nome da cidade` });
  if ((checked.STATE_ID || checked.CITY_NAME) && !checked.COUNTRY) errors.push({ message: `Faltou o nome do País` });
}

export async function checkTimeZone(checked: TableRow, errors: { message: string }[]) {
  try {
    if(checked.TIME_ZONE) {
      const timezoneInfo = await sqldb.TIME_ZONES.getTimezone({ TIMEZONE_AREA: checked.TIME_ZONE});
      if (!timezoneInfo) {
        errors.push({ message:  'Nenhum Fuso Horário encontrado com esse nome' });
      }
    }
  } catch (err) {
    console.log(err)
  }
}

export async function checkUnitCodeApi(checked: TableRow, clientId: number, errors: { message: string }[]) {
  try {
    const existingUnitItems = await sqldb.CLUNITS.getUnitCodesByClient({ CLIENT_ID: clientId });
    let unitCodeApiError = false;
    let unitCodeCelsiusError = false;

    existingUnitItems.forEach(unit => {
      if (checked.UNIT_CODE_API && unit.UNIT_CODE_API === checked.UNIT_CODE_API && Number(checked.UNIT_ID) !== unit.UNIT_ID) {
        unitCodeApiError = true;
      }
      if (checked.UNIT_CODE_CELSIUS && unit.UNIT_CODE_CELSIUS === checked.UNIT_CODE_CELSIUS && Number(checked.UNIT_ID) !== unit.UNIT_ID) {
        unitCodeCelsiusError = true;
      }
    });

    if (unitCodeApiError) {
      errors.push({ message: 'Já existe uma unidade com o mesmo Código da Unidade API' });
    }
    if (unitCodeCelsiusError) {
      errors.push({ message: 'Já existe uma unidade com o mesmo Código da Unidade Celsius' });
    }
  } catch (err) {
    console.log(err);
  }
}


export async function checkConstructedArea(checked: TableRow, errors: { message: string }[]) {
  if(!checked.CONSTRUCTED_AREA) return
  const constructedArea = Number(checked.CONSTRUCTED_AREA)
  if(isNaN(constructedArea) || constructedArea <= 0) {
    errors.push({ message:  'Área Construída deve ser um número e ser maior que 0' });
  }
}

export async function checkAmounPeople(checked: TableRow, errors: { message: string }[]) {
  if(!checked.AMOUNT_PEOPLE) return
  const amountPeople = Number(checked.AMOUNT_PEOPLE)
  if(isNaN(amountPeople) || amountPeople <= 0 || !Number.isInteger(amountPeople)) {
    errors.push({ message:  'Numéro de pessoas deve ser um número inteiro e ser maior que 0' });
  }
}

export async function checkAddres(checked: TableRow, errors: { message: string }[]) {
  let addressCity: string = null;
  if (checked.STATE_ID && checked.CITY_NAME) {
    const cityId = createCityId({
      STATE_ID: checked.STATE_ID,
      CITY_NAME: checked.CITY_NAME,
    });
    if (!cityId) {
      errors.push({ message: `Não foi possível criar o ID da cidade` });
    } else {
      const city = await sqldb.CITY.getCity({ CITY_ID: cityId });
      if (city) {
        addressCity = checkCity(checked, errors, city);
      } else {
        const citiesInfo = await searchCityInfo(cityId);
        addressCity = checkCitiesInfo(checked, errors, citiesInfo);
      }
    }
  }
  return addressCity;
}

function checkCity(checked: TableRow, errors: { message: string }[], city: {
  id: string;
  name: string;
  state: string;
  country: string;
  lat: string;
  lon: string;
}){
  if (checked.COUNTRY) {
    if (city.country && city.country.toLocaleLowerCase() !== checked.COUNTRY.toLocaleLowerCase()) {
      errors.push({ message: `A cidade ${checked.CITY_NAME} não pertence ao país ${checked.COUNTRY}` });
    } else {
      return `${city.name}, ${city.state}`;
    }
   } else {
    errors.push({ message: `A cidade ${checked.CITY_NAME} não pertence ao país ${checked.COUNTRY}` });
  }

  return null;
}

function checkCitiesInfo(checked: TableRow, errors: { message: string }[], citiesInfo: {
  CITY_ID: string;
  COUNTRY_NAME: string;
  COUNTRY_LAT: string;
  COUNTRY_LON: string;
  STATE_CODE: string;
  STATE_NAME: string;
  STATE_LAT: string;
  STATE_LON: string;
  CITY_NAME: string;
  CITY_LAT: string;
  CITY_LON: string;
}[]){
  if (citiesInfo.length === 1) {
    if (citiesInfo[0].COUNTRY_NAME.toLocaleLowerCase() !== checked.COUNTRY.toLocaleLowerCase()) {
      errors.push({ message: `A cidade ${checked.CITY_NAME} não pertence ao país ${checked.COUNTRY}`})
    } else {
      return`${citiesInfo[0].CITY_NAME}, ${citiesInfo[0].STATE_CODE}`;
    }
  } else {
    errors.push({ message: `Cidade inválida` });
  }
  return null
}

export async function handleLatLong(inRow: TableRow, checked: TableRow, addressCity: string) { 
  if ((!inRow.LATLONG) && addressCity && checked.ADDRESS && checked.ADDRESS.length > 0) {
    const itemAddress = checked.ADDRESS;
    if (itemAddress) {
      const address = `${itemAddress}, ${addressCity}`;
      try {
        const geoCode = await googleApi.convertAddressToGeo(address);
        if (geoCode && geoCode.status === 'OK' && geoCode.results.length > 0) {
          fillCheckedLatLong(geoCode, checked);
        }
      } catch (err) {
        logger.error(err);
      }
    }
  }
}

function fillCheckedLatLong(geoCode: googleApi.GeocodeResponse, checked: TableRow){
  const itemCoords = geoCode.results.find(x => (x.geometry && x.geometry.location && x.geometry.location.lat != null));
  if (itemCoords) {
    checked.LATLONG = `${itemCoords.geometry.location.lat}, ${itemCoords.geometry.location.lng}`;
  }
}

export function checkMachineParameters(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {

  if (!checked.GROUP_NAME) errors.push({ message: 'É necessário informar o Nome da Máquina' });
  if (!checked.UNIT_NAME) errors.push({ message: 'É necessário informar o Nome da Unidade' });
  if (inRow.GROUP_NAME && inRow.GROUP_NAME.length > 250) errors.push({message: "O Nome da Máquina não pode ter mais de 250 caracteres."});
  if ((checked.DEV_ID && checked.DEV_ID.length !== 12)  || (checked.DEV_AUTOM_ID && checked.DEV_AUTOM_ID.length !== 12) || (checked.DUT_ID && checked.DUT_ID.length !== 12)) errors.push({message: "Os id's dos dispostivos devem ter 12 caracteres."});
  checkFluidMachineParameters(inRow, checked, errors, opts);
}

function checkFluidMachineParameters(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.FLUID_TYPE !== undefined) {
    checked.FLUID_TYPE = null;
    if (inRow.FLUID_TYPE) {
      const asNorm = getNormalized(inRow.FLUID_TYPE)
      const found = opts.fluids.filter(x1 => (x1.value === inRow.FLUID_TYPE) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: `Opção de fluido inválida: ${inRow.FLUID_TYPE}` });
      } else {
        checked.FLUID_TYPE = found[0].value;
      }
    }
  }
}

export async function checkMachineId(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, clientId: number) {
  const clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [clientId] });
  const normMachineName = getNormalized(inRow.GROUP_NAME);
  const asNorm = getNormalized(inRow.UNIT_NAME)
  const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
  const unitId = found.length > 0 ? found[0].value : null;
  if (!checked.GROUP_ID) {
    const MACHINE_IDs = clientMachines.filter((row2) => (row2.UNIT_ID === unitId) && (getNormalized(row2.MACHINE_NAME) === normMachineName));
    return MACHINE_IDs.length > 0 ? MACHINE_IDs[0].MACHINE_ID : null;
  }
  else {
    if (clientMachines.find(item => item.MACHINE_ID === Number(inRow.GROUP_ID))){
      return Number(checked.GROUP_ID);
    }
    else {
      errors.push({ message: 'Id da máquina não encontrado nesta unidade!' });
      checked.GROUP_ID = null;
      return null;
    }
  }
}

export async function checkEnvironmentId(checked: TableRow, opts: AvailableOptions, clientId: number, UNIT_ID: number, MACHINE_ID?: number, DEV_ID?: string) {
  const clientEnvironments = await sqldb.ENVIRONMENTS.getEnvironmentsList({ CLIENT_IDs: [clientId], UNIT_ID: UNIT_ID });
  const normEnvironmentName = getNormalized(checked.ROOM_NAME); 
  if (MACHINE_ID) {
    const environmentByMachineId = await sqldb.REFRIGERATES.getRefrigerateInfo({MACHINE_ID: MACHINE_ID});
    if (environmentByMachineId.length > 0) {
      return environmentByMachineId[0].ENVIRONMENT_ID;
    }
  }
  let ENVIRONMENT_IDs;
  if (DEV_ID) {
    ENVIRONMENT_IDs = clientEnvironments.filter((row2) => row2.DUT_CODE === DEV_ID);
    if (ENVIRONMENT_IDs.length > 0) {
      return ENVIRONMENT_IDs[0].ID;
    }
  }
  ENVIRONMENT_IDs = clientEnvironments.filter((row2) => (getNormalized(row2.ENVIRONMENT_NAME) === normEnvironmentName));
  return ENVIRONMENT_IDs.length > 0 ? ENVIRONMENT_IDs[0].ID : null;
}

export async function checkEnergyParameters(checked: TableRow, errors: { message: string }[], clientId: number) {
  if (checked.ID_MED_ENERGY && (checked.ID_MED_ENERGY.length !== 12 || !checked.ID_MED_ENERGY.startsWith('DRI'))) errors.push({ message: 'É necessário informar um ID de um medidor de energia' })
  if (!checked.MCHN_APPL) errors.push({ message: 'É necessário informar o tipo de Aplicação' })
  const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.ID_MED_ENERGY });
  if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
    if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
      // OK, dispositivo está associado a um fabricante
    } else {
      errors.push({ message: `Dispositivo já associado a outro cliente` });
    }
  }
}

export async function checkEnergyAplication(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.MCHN_APPL) {
    if (ENERGY_APPLICATIONS.map((x) => getNormalized(x)).includes(getNormalized(inRow.MCHN_APPL))) {
      checked.MCHN_APPL = inRow.MCHN_APPL;
    } else {
      errors.push({ message: 'Aplicação não disponível para upload em planilha' });
    }
  }
  await checkEnergyMeter(inRow, checked, errors, opts);
  await checkEnergyVAV(inRow, checked, errors, opts);
  await checkEnergyFancoil(inRow, checked, errors, opts);
}

async function checkEnergyMeter(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (getNormalized(checked.MCHN_APPL) === getNormalized('Medidor de Energia')) {
    if (!inRow.ELECTRIC_CIRCUIT_NAME) { errors.push({ message: 'Nome do Quadro de Energia é obrigatório!'}); }
    let existIdEnergy: {
      ENERGY_DEVICE_ID: string;
      CLIENT_ID: number;
      UNIT_ID: number;
    } | undefined = undefined
    if(checked.ID_MED_ENERGY) {
      existIdEnergy = await sqldb.ENERGY_DEVICES_INFO.getItem({ id: checked.ID_MED_ENERGY });
    }
    if (existIdEnergy) {
      if (!inRow.MODEL_MED_ENERGY || inRow.MODEL_MED_ENERGY.length < 1) { errors.push({ message: 'Modelo deve estar preenchido para edição' })
      } else if (inRow.MODEL_MED_ENERGY && opts.energy.find((model) => model.norms.includes(getNormalized(inRow.MODEL_MED_ENERGY)))) {
        checked.MODEL_MED_ENERGY = inRow.MODEL_MED_ENERGY;
      } else errors.push({ message: 'Modelo não informado ou não encontrado para a aplicação "Medidor de Energia"' });
    }
  } 
}

function parseThermModel(model: string) {
  if (model.endsWith(' MLN')) {
    return model.replace(' MLN', '');
  }
  return model;
}

async function checkEnergyVAV(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions){
  if (getNormalized(checked.MCHN_APPL) === getNormalized('VAV')) {
    if (!inRow.ROOM_VAV) errors.push({ message: 'Ambiente monitorado não informado' });
    checked.ROOM_VAV = inRow.ROOM_VAV;
    checkThermVAVEnergy(inRow, checked, errors, opts);
    checkValveVAVEnergy(inRow, checked, errors, opts);
    if (inRow.BOX_MANUF) {
      const asNorm = getNormalized(inRow.BOX_MANUF);
      const found = opts.vavs.find((opt) => opt.type === 'BOX_MANUF' && opt.norms.some((norm) => norm === asNorm));
      if (found) checked.BOX_MANUF = found.label;
      else errors.push({ message: 'Opção de fabricante de caixa VAV não encontrada' });
    } else errors.push({ message: 'Opção de fabricante de caixa VAV não encontrada' });
    checked.BOX_MODEL = inRow.BOX_MODEL;
  }
}

function checkThermVAVEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (checked.THERM_MANUF) {
    const asNorm = getNormalized(inRow.THERM_MANUF);
    const found = opts.vavs.find((opt) => opt.type === 'THERM_MANUF' && opt.norms.some((norm) => norm === asNorm));
    if (found) checked.THERM_MANUF = found.label;
    else errors.push({ message: 'Opção de fabricante de termostato VAV não encontrada' });
  } else errors.push({ message: 'Opção de fabricante de termostato VAV não encontrada' });
  if (FANCOIL_VAV_THERM_MODELS.includes(inRow.THERM_MODEL)) {
    checked.THERM_MODEL = parseThermModel(inRow.THERM_MODEL);
  } else errors.push({ message: 'Opção de modelo de termostato VAV não encontrada' });
}

function checkValveVAVEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (checked.VALVE_MANUF) {
    const asNorm = getNormalized(inRow.VALVE_MANUF);
    const found = opts.vavs.find((opt) => opt.type === 'VALVE_MANUF' && opt.norms.some((norm) => norm === asNorm));
    if (found) checked.VALVE_MANUF = found.label;
    else errors.push({ message: 'Opção de fabricante de atuador VAV não encontrada' });
  } else errors.push({ message: 'Opção de fabricante de atuador VAV não encontrada' });
  if (checked.VALVE_TYPE) {
    const found = VALVE_TYPES.includes(inRow.VALVE_TYPE);
    if (found) checked.VALVE_TYPE = inRow.VALVE_TYPE;
    else errors.push({ message: 'Opção de tipo do atuador VAV não encontrado' });
  } else if (getNormalized(inRow.THERM_MODEL) === 'bac-6000-amln') errors.push({ message: 'Opção de tipo do atuador VAV não encontrado' });
}

async function checkEnergyFancoil(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (getNormalized(checked.MCHN_APPL) === getNormalized('Fancoil')) {
    checkThermFancoilEnergy(inRow, checked, errors, opts);
    checkValveFancoilEnergy(inRow, checked, errors, opts);
    checkFancoilModelManufEnergy(inRow, checked, errors, opts);
  }
}

function checkThermFancoilEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (checked.THERM_MANUF) {
    const asNorm = getNormalized(inRow.THERM_MANUF);
    const found = opts.fancoils.find((opt) => opt.type === 'THERM_MANUF' && opt.norms.some((norm) => norm === asNorm));
    if (found) checked.THERM_MANUF = found.label;
    else errors.push({ message: 'Opção de fabricante de termostato Fancoil não encontrada' });
  } else errors.push({ message: 'Opção de fabricante de termostato Fancoil não encontrada' });
  if (FANCOIL_VAV_THERM_MODELS.includes(inRow.THERM_MODEL)) {
    checked.THERM_MODEL = parseThermModel(inRow.THERM_MODEL);
  } else errors.push({ message: 'Opção de modelo de termostato Fancoil não encontrada' });
}

function checkValveFancoilEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (checked.VALVE_MANUF) {
    const asNorm = getNormalized(inRow.VALVE_MANUF);
    const found = opts.fancoils.find((opt) => opt.type === 'VALVE_MANUF' && opt.norms.some((norm) => norm === asNorm));
    if (found) checked.VALVE_MANUF = found.label;
    else errors.push({ message: 'Opção de fabricante de atuador Fancoil não encontrada' });
  } else errors.push({ message: 'Opção de fabricante de atuador Fancoil não encontrada' });
  if (checked.VALVE_TYPE) {
    const found = VALVE_TYPES.includes(inRow.VALVE_TYPE);
    if (found) checked.VALVE_TYPE = inRow.VALVE_TYPE;
    else errors.push({ message: 'Opção de tipo do atuador Fancoil não encontrado' });
  } else if (getNormalized(inRow.THERM_MODEL) === 'bac-6000-amln') errors.push({ message: 'Opção de tipo do atuador Fancoil não encontrado' });
}

function checkFancoilModelManufEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (checked.FANCOIL_MANUF) {
    const asNorm = getNormalized(inRow.FANCOIL_MANUF);
    const found = opts.fancoils.find((opt) => opt.type === 'FANCOIL_MANUF' && opt.norms.some((norm) => norm === asNorm));
    if (found) checked.FANCOIL_MANUF = found.label;
    else errors.push({ message: 'Opção de fabricante de Fancoil não encontrada' });
  } else errors.push({ message: 'Opção de fabricante de Fancoil não encontrada' });
}

export async function checkIluminationApplication(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.MCHN_APPL !== undefined) {
    checked.MCHN_APPL = null;
    if (inRow.MCHN_APPL) {
      const asNorm = getNormalized(inRow.MCHN_APPL)
      const found = opts.applics.filter(x1 => (x1.value === inRow.MCHN_APPL) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: `Aplicação inválida: ${inRow.MCHN_APPL}` });
      } else if (found[0].value !== 'iluminacao' && getNormalized(found[0].value) !== getNormalized('iluminação')) {
        errors.push({ message: 'Aplicação da máquina inváliada para este Tipo de Solução!' });
      }
      else {
        checked.MCHN_APPL = found[0].value;
      }
    }
  }
}

export async function checkDmaId(checked: TableRow, errors: { message: string}[], clientId: number){
  if (checked.DMA_ID) {
    if (!/^DMA\d{9}$/.test(checked.DMA_ID)) {
      errors.push({ message: 'Id do DMA inválido' });
    }
    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DMA_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `DMA já associado a outro cliente` });
      }
    }
  }
}

export async function checkDmaInfo(inRow: TableRow, checked: TableRow, errors: { message: string}[]){
  if (inRow.HYDROMETER_MODEL != null) {
    if (hydrometerModels.map((x) => getNormalized(x)).includes(getNormalized(inRow.HYDROMETER_MODEL))) {
      checked.HYDROMETER_MODEL = inRow.HYDROMETER_MODEL;
    } else {
      errors.push({ message: 'Modelo de hidrômetro não informado ou não encontrado para o DMA' })
    }
  }

  if (inRow.TOTAL_RESERVOIRS != null) {
    if (Number(inRow.TOTAL_RESERVOIRS) >= 0) {
      checked.TOTAL_RESERVOIRS = inRow.TOTAL_RESERVOIRS;
    } else {
      errors.push({ message: 'A quantidade de reservatórios não pode ser negativa.' });
    }
  }

  if (inRow.TOTAL_CAPACITY != null) {
    if (Number(inRow.TOTAL_CAPACITY) >= 0) {
      checked.TOTAL_CAPACITY = inRow.TOTAL_CAPACITY;
    } else {
      errors.push({ message: 'A capacidade total não pode ser negativa.' });
    }
  }
}

export async function checkDmaUnitByName(inRow: TableRow, checked: TableRow, errors: { message: string}[], clientId: number, opts: AvailableOptions, session: SessionData, unitsWillBeCreated: string []){
  let unitWillBeCreated = unitsWillBeCreated.includes(inRow.UNIT_NAME);
  const asNorm = getNormalized(inRow.UNIT_NAME)
  const found = opts.units.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
  if (!unitWillBeCreated) {
    if (found.length !== 1) {
      errors.push({ message: `Unidade inválida: ${inRow.UNIT_NAME}` });
    } else {
      const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.DMA_ID })
      if (currentDevInfo && currentDevInfo.UNIT_ID && found[0].value !== currentDevInfo.UNIT_ID) {
        errors.push({ message: 'Dispositivo já associado a outra unidade' });
      }
      checked.UNIT_NAME = inRow.UNIT_NAME;
    }
    const data = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: inRow.UNIT_NAME, CLIENT_ID: clientId });
    const allAssociatedMeters = await sqldb.DMAS_DEVICES.getList({ unitIds: [ data.UNIT_ID]});
    const associatedLaager = await sqldb.LAAGER.getLaagerByUnit({ UNIT_ID: data.UNIT_ID });
    if (data && data.UNIT_ID) {
      const meters = allAssociatedMeters.filter((meter) => meter.UNIT_ID === data.UNIT_ID && meter.DMA_ID !== inRow.DMA_ID);
      if (meters.length !== 0 || (associatedLaager || associatedLaager.LAAGER_CODE !== checked.DMA_ID)) {
        errors.push({ message: `Unidade já possui um medidor de água associado` });
      }
    } else {
      errors.push({ message: `Não foi possível identificar a unidade` });
    }
  }
  
}

export async function groupAutoDevsToCheck(inRow: TableRow, errors: { message: string }[], groupIdCurrent: number) {
  await checkDevOtherMachine(inRow, errors, groupIdCurrent);
  if (inRow.DUT_ID != null && inRow.DEV_AUTOM_ID!= null){
    if (inRow.DEV_AUTOM_ID.includes('DUT') && (inRow.DUT_ID !== inRow.DEV_AUTOM_ID)){
      errors.push({message: 'O dispositivo de automação não pode ser diferente do DUT de referência' });
    }
  }
}

async function checkDevOtherMachine(inRow: TableRow, errors: { message: string }[], groupIdCurrent: number){
  if (inRow.DEV_AUTOM_ID != null) {
    const {dutAut, damAut, driAut, dev} = await fillDevIdToGroupAutoDevsCheck(inRow);

    const group = await sqldb.MACHINES.getListWithDamDut({ DEV_AUT: inRow.DEV_AUTOM_ID }, {});

    if (group.length > 0) {
      if (group[0].MACHINE_ID !== groupIdCurrent) {
        errors.push({ message: 'Dispositivo de automação já associado à uma outra máquina!' });
      }
    }
  }
}

async function fillDevIdToGroupAutoDevsCheck(inRow: TableRow){
  const dutAut = inRow.DEV_AUTOM_ID.includes('DUT') ? inRow.DEV_AUTOM_ID : undefined;
  const damAut = inRow.DEV_AUTOM_ID.includes('DAM') ? inRow.DEV_AUTOM_ID : undefined;
  const driAut = inRow.DEV_AUTOM_ID.includes('DRI') ? inRow.DEV_AUTOM_ID : undefined;
  const dev = await sqldb.DEVICES.getBasicInfo({devId: inRow.DEV_AUTOM_ID})

  return ({dutAut, damAut, driAut, dev});
}

export async  function assetsCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[], machineId: number) {
  if (!inRow.AST_DESC) errors.push({ message: 'A descrição do ativo não foi fornecida.' });

  assetDescCheck(inRow, checked, errors, opts);
  assetBrandCheck(inRow, checked, errors, opts);
  await assetRatedPowerCheck(inRow, checked, errors, sumRatedPowerCondensers, machineId);
  machineCapacityPowerCheck(inRow, checked, errors);
  machineEvaporatorModelCheck(inRow, checked, errors, opts);
  machineInsufflationSpeedCheck(inRow, checked, errors);
  machineCompressorRlaCheck(inRow, checked, errors);
  machineEquipmentPowerCheck(inRow, checked, errors);
}

async function checkSumRatedPowerCondensers(sumRatedPowerCondensers: { assetCondensersIds: number[], sum: number }, checked: TableRow, errors: { message: string }[], machineId: number) {
  let minSumRatedPower = sumRatedPowerCondensers?.sum || 0;
  if (machineId) {
    const assetInfos = await sqldb.ASSETS.getAssetsByMachine({ MACHINE_ID: machineId })
    for (const asset of assetInfos) {
      if (sumRatedPowerCondensers?.assetCondensersIds.includes(asset.ASSET_ID)) { continue }
      minSumRatedPower += asset.CONDENSER_MACHINE_KW;
    }
  }

  if (Number(checked.MACHINE_RATED_POWER) < (minSumRatedPower)) {
    errors.push({ message: 'O valor mínimo para a potência nominal da máquina deve ser a soma das potências das condensadoras.'})
   }
}

export async function checkMachineRatedPower(inRow: TableRow, checked: TableRow, errors: { message: string }[], sumRatedPowerCondensers: { assetCondensersIds: number[], sum: number }, machineId: number) {
  if (inRow.MACHINE_RATED_POWER != null && inRow.MACHINE_RATED_POWER.length) {
    checked.MACHINE_RATED_POWER = null;
    const nInfo = checkNumber(inRow.MACHINE_RATED_POWER);
    if (!nInfo) {
      errors.push({ message: 'Potência nominal inválida' });
    } else if (nInfo.unidade && nInfo.unidade.toLowerCase() !== 'kw') {
      errors.push({ message: 'Unidade da potência nominal inválida. Precisa ser "kW"' });
    } else if (nInfo.noSeparator || (nInfo.numSeps === 1)) {
      checked.MACHINE_RATED_POWER = nInfo.numI.replace(',', '.');
     await checkSumRatedPowerCondensers(sumRatedPowerCondensers, checked, errors, machineId);
    } else {
      errors.push({ message: 'Não foi possível interpretar a potência nominal' });
    }
  }
}

function assetDescCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.AST_ROLE_NAME !== undefined) {
    checked.AST_ROLE_NAME = null;
    if (inRow.AST_ROLE_NAME) {
      const asNormRole = getNormalized(inRow.AST_ROLE_NAME)
      const foundRole = opts.roles.filter(x1 => (x1.value === inRow.AST_ROLE_NAME) || x1.norms.some(x2 => x2 === asNormRole));
      if (foundRole.length !== 1) {
        errors.push({ message: `Função de equipamento inválida: ${inRow.AST_ROLE_NAME}` });
      } else {
        checked.AST_ROLE_NAME = foundRole[0].label;
      }
    }
  }
}

function assetBrandCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.MCHN_BRAND !== undefined) {
    checked.MCHN_BRAND = (inRow.MCHN_BRAND && inRow.MCHN_BRAND.trim()) || null;
    if (checked.MCHN_BRAND) {
      const asNormBrand = getNormalized(checked.MCHN_BRAND)
      const foundBrand = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNormBrand));
      if (foundBrand.length === 1) {
        // OK
      }
      else if (foundBrand.length === 0) {
        // OK, will be added
      }
      else {
        errors.push({ message: `Não foi possível identificar a marca` });
      }
    }
  }
}

async function assetRatedPowerCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[], machineId: number) {
  if (inRow.MCHN_KW !== undefined) {
    checked.MCHN_KW = null;
    if (inRow.MCHN_KW) {
      const nInfo = checkNumber(inRow.MCHN_KW);
      if (!nInfo) {
        errors.push({ message: 'Potência nominal inválida' });
      } else if (nInfo.unidade && nInfo.unidade.toLowerCase() !== 'kw') {
        errors.push({ message: 'Unidade da potência nominal inválida. Precisa ser "kW"' });
      }
      else if (nInfo.noSeparator || (nInfo.numSeps === 1)) {
        checked.MCHN_KW = nInfo.numI.replace(',', '.');
        if (checked.AST_ROLE_NAME.toLowerCase() === 'condensadora') {
          await verifySumRatedPowerByMachine(checked, machineId, sumRatedPowerCondensers);
        }
      }
      else {
        errors.push({ message: 'Não foi possível interpretar a potência nominal' });
      }
    }
  }
}

async function verifySumRatedPowerByMachine(checked: TableRow, machineId: number, sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number}[]) {
  const currentAssetInfo = await sqldb.ASSETS.getCondensersToVerifyRatedPower({ ASSET_NAME: checked.AST_DESC, MACHINE_ID: machineId });
  let indexAsset = 0;
  let assetInfo = null;
  if (currentAssetInfo.length > 1 && checked.DAT_ID) {
    indexAsset = currentAssetInfo.findIndex(i => i.DAT_ID === checked.DAT_ID);
    assetInfo = currentAssetInfo[indexAsset];
  } else if (currentAssetInfo.length === 1) {
    assetInfo = currentAssetInfo[indexAsset];
  }

  const sumRatedPowerIndex = sumRatedPowerCondensers.findIndex((x) => x.unitName === checked.UNIT_NAME && x.machineName === checked.GROUP_NAME);
  if (sumRatedPowerIndex !== -1) {
    sumRatedPowerCondensers[sumRatedPowerIndex].sum += Number(checked.MCHN_KW);
    assetInfo?.ASSET_ID && sumRatedPowerCondensers[sumRatedPowerIndex].assetCondensersIds.push(assetInfo?.ASSET_ID);
  } else {
    sumRatedPowerCondensers.push({
      unitName: checked.UNIT_NAME,
      assetCondensersIds: assetInfo?.ASSET_ID ? [assetInfo.ASSET_ID] : [],
      machineName: checked.GROUP_NAME,
      sum: Number(checked.MCHN_KW),
    })

  }
}

function machineEvaporatorModelCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.EVAPORATOR_MODEL !== undefined) {
    checked.EVAPORATOR_MODEL = null;
    if (inRow.EVAPORATOR_MODEL) {
      const found = opts.evaporatorModels.filter(x1 =>(x1.label === inRow.EVAPORATOR_MODEL) || (x1.value === inRow.EVAPORATOR_MODEL));
      if (found.length !== 1) {
        errors.push({ message: `Modelo de Evaporadora Inválido: ${inRow.EVAPORATOR_MODEL}` });
      } else {
        checked.EVAPORATOR_MODEL = found[0].value;
      }
    }
  }
}

function machineInsufflationSpeedCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.INSUFFLATION_SPEED !== undefined) {
    checked.INSUFFLATION_SPEED = null;
    if (inRow.INSUFFLATION_SPEED) {
      const nInfo = checkNumber(inRow.INSUFFLATION_SPEED);
      if (!nInfo) {
        errors.push({ message: 'Velocidade de Insuflamento inválida' });
      } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
        checked.INSUFFLATION_SPEED = nInfo.numI.replace(',', '.');
      } else {
        errors.push({ message: 'Velocidade de Insuflamento inválida' });
      }
    }
  }
}

function machineCompressorRlaCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.COMPRESSOR_RLA !== undefined) {
    checked.COMPRESSOR_RLA = null;
    if (inRow.COMPRESSOR_RLA) {
      const nInfo = checkNumber(inRow.COMPRESSOR_RLA);
      if (!nInfo) {
        errors.push({ message: 'RLA do Compressor inválido' });
      } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
        checked.COMPRESSOR_RLA = nInfo.numI.replace(',', '.');
      } else {
        errors.push({ message: 'RLA do Compressor' });
      }
    }
  }
}


function machineEquipmentPowerCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.EQUIPMENT_POWER !== undefined) {
    checked.EQUIPMENT_POWER = null;
    if (inRow.EQUIPMENT_POWER) {
      const isEquipmentPowerValid = inRow.EQUIPMENT_POWER === '380V / 3F / 60Hz' || inRow.EQUIPMENT_POWER === '220V / 3F / 60Hz' || inRow.EQUIPMENT_POWER === '220V / 1F / 60Hz';
      if (!isEquipmentPowerValid) {
        errors.push({ message: 'A Alimentação do Equipamento deve ser "380V / 3F / 60Hz", "220V / 3F / 60Hz" ou "220V / 1F / 60Hz"' });
        checked.EQUIPMENT_POWER = inRow.EQUIPMENT_POWER;
      } else {
        checked.EQUIPMENT_POWER = inRow.EQUIPMENT_POWER;
      }
    }
  }
}

function machineCapacityPowerCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.CAPACITY_PWR !== undefined) {
    checked.CAPACITY_PWR = null;
    if (inRow.CAPACITY_PWR) {
      const nInfo = checkNumber(inRow.CAPACITY_PWR);
      if (!nInfo) {
        errors.push({ message: 'Capacidade frigorífica inválida' });
      } else if (nInfo.unidade && nInfo.unidade.toLowerCase() !== 'kw') {
        errors.push({ message: 'Unidade da capacidade frigorífica inválida. Precisa ser "kW"' });
      }
      else if (nInfo.noSeparator || (nInfo.numSeps === 1)) {
        checked.CAPACITY_PWR = nInfo.numI.replace(',', '.');
      }
      else {
        errors.push({ message: 'Não foi possível interpretar a capacidade frigorífica' });
      }
    }
  }
}

function checkInstallationLocation(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.DAM_INSTALLATION_LOCATION !== undefined) {
    checked.DAM_INSTALLATION_LOCATION = null;
    if (inRow.DAM_INSTALLATION_LOCATION) {
      const asNorm = getNormalized(inRow.DAM_INSTALLATION_LOCATION)
      const found = opts.damInstallationLocation.filter(x1 =>(x1.label === inRow.DAM_INSTALLATION_LOCATION) || (x1.value === inRow.DAM_INSTALLATION_LOCATION) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: `Local de Instalação inválido: ${inRow.DAM_INSTALLATION_LOCATION}` });
      } else {
        checked.DAM_INSTALLATION_LOCATION = found[0].value;
      }
    }
  }
}

export function damCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  checkInstallationLocation(inRow, checked, errors, opts);
  checkDamPlacement(inRow, checked, errors);
  checkSensorDamDuo(inRow, checked, errors);
}


export function dutCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  checkSensorDutDuo(inRow, checked, errors);
  checkPlacement(inRow, checked, errors);
  checkRtypeName(inRow, checked, errors, opts);
}

function checkSensorDutDuo(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.DUT_ID) {
    if (inRow.SENSORS_DUT_DUO && inRow.PLACEMENT && inRow.PLACEMENT.toUpperCase() === 'DUO') {
      const sensor1 = getNormalized(inRow.SENSORS_DUT_DUO.split(',')[0]);
      const sensor2 = getNormalized(inRow.SENSORS_DUT_DUO.split(',')[1]);

      if (!((sensor1 === getNormalized('Insuflação') && sensor2 === getNormalized('Retorno')) || 
      (sensor2 === getNormalized('Insuflação') && sensor1 === getNormalized('Retorno')))) {
        errors.push({ message: 'Sensores de DUT DUO inválidos' });
      }
      else {
        checked.SENSORS_DUT_DUO = inRow.SENSORS_DUT_DUO;
      }
    }
    else if (inRow.SENSORS_DUT_DUO && (!inRow.PLACEMENT || inRow.PLACEMENT.toUpperCase() !== 'DUO')) {
      errors.push({ message: 'Sensores de DUT DUO apenas quando Posicionamento for DUO' });
    }
  }
}

function checkPlacement(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.PLACEMENT !== undefined) {
    checked.PLACEMENT = inRow.PLACEMENT;
    if (inRow.DEV_ID != null && inRow.DEV_ID.startsWith('DUT')) {
      const inRowToUpperCase = inRow.PLACEMENT && inRow.PLACEMENT.toUpperCase();
      const isPlacementValid = inRowToUpperCase === 'INS' || inRowToUpperCase === 'AMB' || inRowToUpperCase === 'DUO';
      if (!isPlacementValid) {
        errors.push({ message: 'O posicionamento do DUT deve ser INS, AMB ou DUO' });
        checked.PLACEMENT = 'AMB';
      } else {
        checked.PLACEMENT = inRowToUpperCase;
      }
    }
  }
}

function checkDamPlacement(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.DAM_PLACEMENT !== undefined) {
    checked.DAM_PLACEMENT = inRow.DAM_PLACEMENT;
    if (inRow.DEV_AUTOM_ID != null && inRow.DEV_AUTOM_ID.startsWith('DAM')) {
      const inRowToUpperCase = inRow.DAM_PLACEMENT && inRow.DAM_PLACEMENT.toUpperCase();
      const isPlacementValid = inRowToUpperCase === 'RETURN' || inRowToUpperCase === 'RETORNO' || inRowToUpperCase === 'DUO';
      if (!isPlacementValid) {
        errors.push({ message: 'O posicionamento do DAM deve ser Retorno ou DUO' });
        checked.DAM_PLACEMENT = (inRowToUpperCase === 'RETORNO' || inRowToUpperCase === 'RETURN' || !inRowToUpperCase) ? 'RETURN' : 'DUO';
      } else {
        if (inRowToUpperCase === 'DUO' && (inRow.DAM_INSTALLATION_LOCATION !== 'Casa de Máquina' && inRow.DAM_INSTALLATION_LOCATION !== 'casa-de-maquina')) errors.push({ message: 'O posicionamento do DAM só pode ser DUO caso o DAM esteja localizado na Casa de Máquina' });

        checked.DAM_PLACEMENT = (inRowToUpperCase === 'RETORNO' as 'RETURN'|'DUO' || inRowToUpperCase === 'RETURN' || !inRowToUpperCase) ? 'RETURN' : 'DUO';
      }
    }
  }
}

function checkSensorDamDuo(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  const labels : {[key: string] : 'RETURN' | 'INSUFFLATION'} = {
    'Retorno': 'RETURN',
    'Insuflação': 'INSUFFLATION',
    'INSUFFLATION': 'INSUFFLATION',
    'RETURN': 'RETURN'
  }
  if (inRow.DEV_AUTOM_ID && inRow.DEV_AUTOM_ID.startsWith('DAM')) {
    if (inRow.DAM_PLACEMENT && inRow.DAM_PLACEMENT.toUpperCase() === 'DUO') {
      const sensor1 = inRow.DAM_T0_POSITION;
      const sensor2 = inRow.DAM_T1_POSITION;
      if (sensor1 != null && (sensor1 !== 'Retorno' && sensor1 !== 'Insuflação' && sensor1 !== 'INSUFFLATION' && sensor1 !== 'RETURN') || 
          sensor2 != null && (sensor2 !== 'Retorno' && sensor2 !== 'Insuflação' && sensor2 !== 'INSUFFLATION' && sensor2 !== 'RETURN'))  
        errors.push({ message: 'Sensores de DAM DUO inválidos' });
      else if (sensor1 === sensor2 && sensor1 != null) {
        errors.push({ message: 'Posicionamento dos Sensores DAM DUO inválidos' });
      }
      else {
        checked.DAM_T0_POSITION = (inRow.DAM_T0_POSITION && labels[inRow.DAM_T0_POSITION]) || null;
        checked.DAM_T1_POSITION = (inRow.DAM_T1_POSITION && labels[inRow.DAM_T1_POSITION]) || null;
      }
    }
    else if ((inRow.DAM_T0_POSITION || inRow.DAM_T1_POSITION) && (!inRow.DAM_PLACEMENT || inRow.DAM_PLACEMENT.toUpperCase() !== 'DUO')) {
      errors.push({ message: 'Posicionamento dos Sensores de DAM DUO apenas quando Posicionamento do DAM for DUO' });
    }
  }
}

function checkRtypeName(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  if (inRow.RTYPE_NAME !== undefined) {
    checked.RTYPE_NAME = null;
    if (inRow.RTYPE_NAME) {
      const asNorm = getNormalized(inRow.RTYPE_NAME)
      const found = opts.rtypes.filter(x1 => x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: 'Tipo de ambiente inválido' });
      } else {
        checked.RTYPE_NAME = inRow.RTYPE_NAME;
      }
    }
  }
}

export function dacCheck(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions) {
  checkCop(inRow, checked, errors);

  if ((inRow.P0_SENSOR !== undefined) || (inRow.P0_POSITN !== undefined) || (inRow.P1_SENSOR !== undefined) || (inRow.P1_POSITN !== undefined)) {
    checked.P0_SENSOR = null;
    checked.P0_POSITN = null;
    checked.P1_SENSOR = null;
    checked.P1_POSITN = null;
    const p0Values = checkSensorPosition(errors, opts, inRow.P0_SENSOR, inRow.P0_POSITN, 0);
    checked.P0_SENSOR = p0Values.checkedSensor;
    checked.P0_POSITN = p0Values.checkedPosition;
    const p1Values = checkSensorPosition(errors, opts, inRow.P1_SENSOR, inRow.P1_POSITN, 1);
    checked.P1_SENSOR = p1Values.checkedSensor;
    checked.P1_POSITN = p1Values.checkedPosition;
  }
}
  
function checkCop(inRow: TableRow, checked: TableRow, errors: { message: string }[]) {
  if (inRow.DAC_COP !== undefined) {
    checked.DAC_COP = null;
    if (inRow.DAC_COP) {
      const nInfo = checkNumber(inRow.DAC_COP);
      if (!nInfo) {
        errors.push({ message: 'COP inválido' });
      } else if ((!nInfo.unidade) && (nInfo.noSeparator || (nInfo.numSeps === 1))) {
        checked.DAC_COP = nInfo.numI.replace(',', '.');
      } else {
        errors.push({ message: 'COP inválido' });
      }
    }
  }
}

function checkSensorPosition(errors: { message: string }[], opts: AvailableOptions, sensor: string, position: string, indexP: number) {
  let checkedSensor = null;
  let checkedPosition = null;
    
  if (sensor || position) {
    let warnedError = false;
    const sensorFill = fillCheckSensor(sensor, errors, opts, indexP);
    warnedError = sensorFill.warnedError;
    checkedSensor = sensorFill.checkedSensor;

    const positionFill = fillCheckPosition(position, errors);
    warnedError = warnedError && positionFill.warnedError;
    checkedPosition = positionFill.checkedPosition;

    if ((!checkedSensor) || (!checkedPosition)) {
      if (!warnedError) errors.push({ message: `Informações incompletas de P${indexP.toString()}` });
    }
  }
  return ({checkedSensor, checkedPosition});
}

function fillCheckSensor(sensor: string, errors: { message: string }[], opts: AvailableOptions, indexP: number ) {
  let warnedError = false;
  let checkedSensor = null;
  if (sensor) {
    const asNorm = getNormalized(sensor)
    const found = opts.psens.filter(x1 => (x1.value === sensor) || x1.norms.some(x2 => x2 === asNorm));
    if (found.length !== 1) {
      errors.push({ message: `Sensor de pressão em P${indexP.toString()} não reconhecido: ${sensor}` });
      warnedError = true;
    } else {
      checkedSensor = found[0].value;
    }
  }
  return ({warnedError, checkedSensor});
}

function fillCheckPosition(posistion: string, errors: { message: string }[]) {
  let warnedError = false;
  let checkedPosition = null;
  if (posistion) {
    const asNorm = getNormalized(posistion)
    if (asNorm === 'pliq') { checkedPosition = 'Pliq' }
    else if (asNorm === 'psuc') { checkedPosition = 'Psuc' }
    else {
      errors.push({ message: `Posição de P0 inválida: ${posistion}` });
      warnedError = true;
    }
  }
  return ({checkedPosition, warnedError})
}

export function checkColumn(col: number, label: string, errorsList: string[], auxAdditionalParameters?: number[]) {
  if (col < 0) errorsList.push(label);
  else if (!errorsList.length) {
    const index = auxAdditionalParameters.indexOf(col)
    auxAdditionalParameters.splice(index, 1);
  }
}

// Funções para adicionar dados
export async function addCityFromUnit(checked: TableRow,  ignored: { key: string, reason: string }[], existingCities: string[], sessionUser: string){
  let cityId: string = null;
  let result = true;
  if (checked.STATE_ID && checked.CITY_NAME) {
    cityId = createCityId({
      STATE_ID: checked.STATE_ID,
      CITY_NAME: checked.CITY_NAME,
    });
    if (!cityId) throw Error('Não foi possível criar o ID da cidade').HttpStatus(500)
    if (!existingCities.includes(cityId)) {
      result = await addCity(checked, ignored, existingCities, cityId, sessionUser);
    }
  }
  return ({cityId, result});
}

async function addCity(checked: TableRow, ignored: { key: string, reason: string }[], existingCities: string[],  cityId: string, sessionUser: string){
  const city = await sqldb.CITY.getCity({ CITY_ID: cityId });
  if (!city) {
    const citiesInfo = await searchCityInfo(cityId);
    if (citiesInfo.length === 1) {
      const country = await sqldb.COUNTRY.getCountry({ COUNTRY_NAME: citiesInfo[0].COUNTRY_NAME });
      const stateInfo = country && await sqldb.STATEREGION.getState({ STATE_NAME: citiesInfo[0].STATE_NAME, COUNTRY_ID: country.id });
      if (stateInfo) {
        await sqldb.CITY.w_insert({
          CITY_ID: citiesInfo[0].CITY_ID,
          NAME: citiesInfo[0].CITY_NAME,
          STATE_ID: stateInfo.id,
          LAT: citiesInfo[0].CITY_LAT,
          LON: citiesInfo[0].CITY_LON,
        }, sessionUser)
        existingCities.push(cityId);        
        return false;
      } else {
        ignored.push({ key: checked.key, reason: 'Não foi possivel encontrar o estado/país da cidade' });
        return false;
      }
    } else if (citiesInfo.length === 0) {
      ignored.push({ key: checked.key, reason: 'Nenhuma cidade encontrada com esse nome' });
      return false;
    } else {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar os dados da cidade' });
      return false;
    }
  }
  
  return true;
}
async function deleteSketches(checked: TableRow, unitId: number, session: SessionData){
  // Se for edição, apaga croquis/projetos anteriores, caso haja novos
  const results = await sqldb.UNITS_SKETCHES.getList({ UNIT_ID: unitId })
  if (results.length && results.length > 0 && (checked.SKETCH_1 || checked.SKETCH_2 || checked.SKETCH_3 || checked.SKETCH_4 || checked.SKETCH_5)) {
    const urlPrefix = `${servConfig.filesBucketPrivate.url}/${servConfig.filesBucketPrivate.sketchesBucketPath}`
    const list = results.map(row => (urlPrefix + row.FILENAME));
    for (const image of list) {
      await deleteSketch(image, unitId, session.user);
    }
  }
}

export async function controlEditUnit(checked: TableRow, cityId: string, ignored: { key: string, reason: string }[], session: SessionData){
  let timezoneInfo: {
    id: number;
    offset: number;
    area: string;
  };
  if (checked.TIME_ZONE) {
    timezoneInfo = await sqldb.TIME_ZONES.getTimezone({ TIMEZONE_AREA: checked.TIME_ZONE});
    if (!timezoneInfo) {
      ignored.push({ key: checked.key, reason: 'Fuso Horário não encontrado' });
    }
  } else {
    timezoneInfo = {
      id: 31,
      offset: -3,
      area: 'America/Sao_Paulo'
    }
  }
  const isProduction = (checked.UNIT_STATUS && getNormalized(checked.UNIT_STATUS) === "em-operac-a-o") ?  true : false;
  const isProductionDate = isProduction ? new Date() : null;
  const _editedItem = await httpRouter.privateRoutes['/clients/edit-unit']({
    UNIT_ID: Number(checked.UNIT_ID),
    UNIT_NAME: checked.UNIT_NAME || undefined,
    UNIT_CODE_CELSIUS: checked.UNIT_CODE_CELSIUS,
    UNIT_CODE_API: checked.UNIT_CODE_API,
    CITY_ID: cityId || undefined,
    PRODUCTION: isProduction,
    LAT: checked.LATLONG ? checked.LATLONG.split(',')[0].trim() : undefined,
    LON: checked.LATLONG ? checked.LATLONG.split(',')[1].trim() : undefined,
    EXTRA_DATA: (checked.ADDRESS && `[["Endereço", "${checked.ADDRESS}"]]`) || undefined,
    ADDRESS: checked.ADDRESS,
    TIMEZONE_ID: timezoneInfo.id,
    CONSTRUCTED_AREA: checked.CONSTRUCTED_AREA,
    PRODUCTION_TIMESTAMP: isProductionDate,
    AMOUNT_PEOPLE: checked.AMOUNT_PEOPLE,
  }, session);
  const unitId = Number(checked.UNIT_ID);

  return unitId;
}

export async function controlChecksToAddIlumination (checked: TableRow,  ignored: { key: string, reason: string }[], opts: AvailableOptions, existingUnitItems: {
  UNIT_ID: number;
  UNIT_NAME: string;
}[], clientId: number, session: SessionData) {
  let {UNIT_ID, result} = await checkUnitToAdd(checked, ignored, existingUnitItems);
  if (!result) {
    return ({UNIT_ID, result: false});
  }
  if (!checkBrandToAdd(checked, ignored, opts, clientId, session)){
    return ({UNIT_ID, result: false});
  }
  if(!checkGroupTypeToAdd(checked, ignored, opts, clientId, session)){
    return ({UNIT_ID, result: false});
  }

  return ({UNIT_ID, result: true});
}

export async function controlChecksToAddEnvironment(checked: TableRow,  ignored: { key: string, reason: string }[], existingUnitItems: {
  UNIT_ID: number;
  UNIT_NAME: string;
}[], clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[]) {
  let {UNIT_ID, result} = await checkUnitToAdd(checked, ignored, existingUnitItems);
  if (!result) {
    return ({UNIT_ID, RTYPE_IDs: null, result: false});
  }
  let {RTYPE_IDs, result: resultCheckRtype} = await checkRtypeNameToAdd(checked, ignored, clientRoomTypes);
  if (!resultCheckRtype) {
    return ({UNIT_ID, RTYPE_IDs, result: false});
  }

  return ({UNIT_ID, RTYPE_IDs, result: true});
}

async function checkRtypeNameToAdd(checked: TableRow,  ignored: { key: string, reason: string }[], clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[]){
  let RTYPE_IDs = null
  if (checked.RTYPE_NAME) {
    const normRTypeName = getNormalized(checked.RTYPE_NAME);
    RTYPE_IDs = clientRoomTypes.filter((room) => (getNormalized(room.RTYPE_NAME) === normRTypeName));
    if (RTYPE_IDs.length !== 1) {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de ambiente' });
      return ({RTYPE_IDs, result: false});
    }
  }
  return ({RTYPE_IDs, result: true});
}

export async function checkUnitToAdd(checked: TableRow,  ignored: { key: string, reason: string }[], existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[]){
  let UNIT_ID: number = undefined;
  if (checked.UNIT_NAME !== undefined) {
    UNIT_ID = null;
    if (checked.UNIT_NAME) {
      const normUnitName = getNormalized(checked.UNIT_NAME);
      const UNIT_IDs = existingUnitItems.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
      if (UNIT_IDs.length !== 1) {
        ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
        return ({UNIT_ID, result: false});
      }
      UNIT_ID = UNIT_IDs[0].UNIT_ID;
    }
  }
  return ({UNIT_ID, result: true});
}

export async function checkBrandToAdd(checked: TableRow,  ignored: { key: string, reason: string }[],  opts: AvailableOptions, clientId: number, session: SessionData){
  if (checked.MCHN_BRAND) {
    const asNorm = getNormalized(checked.MCHN_BRAND)
    let found = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNorm));
    if (found.length === 0) {
      await sqldb.AV_OPTS.w_insert({
        OPT_TYPE: 'BRAND',
        OPT_ID: `marca-${asNorm}`,
        OPT_LABEL: checked.MCHN_BRAND,
        TAGS: null,
      }, session.user);
      opts = await availableOptions(session, clientId);
      found = opts.brands.filter(x1 => (x1.value === checked.MCHN_BRAND) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a marca' });
        return false;
      }
    }
    if (found.length === 1) {
      checked.MCHN_BRAND = found[0].value;
    } else {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar marca' });
      return false;
    }
  }
  return true;
}

export async function checkGroupTypeToAdd(checked: TableRow,  ignored: { key: string, reason: string }[],  opts: AvailableOptions, clientId: number, session: SessionData){
  if (checked.GROUP_TYPE) {
    const asNorm = getNormalized(checked.GROUP_TYPE)
    let found = opts.types.filter(x1 => (x1.value === checked.GROUP_TYPE) || x1.norms.some(x2 => x2 === asNorm));
    if (found.length === 0) {
      await sqldb.AV_OPTS.w_insert({
        OPT_TYPE: 'TIPO',
        OPT_ID: `tipo-${asNorm}`,
        OPT_LABEL: checked.GROUP_TYPE,
        TAGS: null,
      }, session.user);
      opts = await availableOptions(session, clientId);
      found = opts.types.filter(x1 => (x1.value === checked.GROUP_TYPE) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        ignored.push({ key: checked.key, reason: 'Não foi possível adicionar o tipo de máquina' });
        return false;
      }
    }
    if (found.length === 1) {
      checked.GROUP_TYPE = found[0].value;
    } else {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de máquina' });
      return false;
    }
  }
  return true;
}

export async function checkGroupIdToAdd(checked: TableRow, ignored: { key: string, reason: string }[]) {
  let MACHINE_IDs;
  if (checked.GROUP_ID) {
    MACHINE_IDs = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: [Number(checked.GROUP_ID)] });
    if (MACHINE_IDs.length === 0) {
      ignored.push({ key: checked.key, reason: 'Não foi possível encontrar a máquina correspondente a esse ID' });
    }
  }
  return MACHINE_IDs;
}

export async function controlAddGroupIlumination(
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  MACHINE_IDs: {
    GROUP_ID: number;
    GROUP_NAME: string;
    UNIT_ID: number;
  }[],
  info: {
    devAut: string,
    installationFormatted: string,
    clientId: number,
    UNIT_ID: number,
  },  
  MACHINE_NAMEs:{
    GROUP_ID: number;
    GROUP_NAME: string;
    UNIT_ID: number;
  }[],
  session: SessionData) {
  let MACHINE_ID;
  if (MACHINE_IDs != null && MACHINE_IDs?.length === 1) {
    MACHINE_ID = MACHINE_IDs[0].GROUP_ID;
    await httpRouter.privateRoutes['/clients/edit-group']({
      GROUP_ID: Number(MACHINE_ID),
      GROUP_NAME: checked.GROUP_NAME,
      REL_DEV_AUT: info.devAut,
      REL_DUT_ID: checked.DUT_ID,
      INSTALLATION_DATE: info.installationFormatted,
      GROUP_TYPE: checked.GROUP_TYPE,
      BRAND: checked.MCHN_BRAND,
      FLUID_TYPE: checked.FLUID_TYPE,
      MCHN_APPL: checked.MCHN_APPL,
      UNIT_ID: info.UNIT_ID,
    }, session);
  }
  //Validar se o GORUP_ID não existe e se o nome também não existe
  else if (MACHINE_IDs == null && MACHINE_NAMEs.length === 0) {
    const inserted = await httpRouter.privateRoutes['/dac/add-new-group']({
      CLIENT_ID: info.clientId,
      UNIT_ID: info.UNIT_ID,
      GROUP_NAME: checked.GROUP_NAME,
      INSTALLATION_DATE: info.installationFormatted,
      MCHN_APPL: checked.MCHN_APPL,
      GROUP_TYPE: checked.GROUP_TYPE,
      BRAND: checked.MCHN_BRAND,
      FLUID_TYPE: checked.FLUID_TYPE,
      REL_DUT_ID: checked.DUT_ID,
      DEV_AUT: info.devAut,
    }, session);
    MACHINE_ID = inserted.GROUP_ID;          

    if (MACHINE_ID == null || MACHINE_ID == undefined) {
      ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a máquina' });
      return ({MACHINE_ID, response: false});
    }
  }
  else if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
    ignored.push({ key: checked.key, reason: 'Já existe uma máquina com esse nome na unidade' });
  }

  else {
    ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
    return ({MACHINE_ID, response: false});
  }
  return ({MACHINE_ID, response: true});
}

export async function checkInfosToAddIlumination(
  checked: TableRow,
  ignored: { key: string,
  reason: string }[],
  clientMachines: {GROUP_ID: number, GROUP_NAME: string, UNIT_ID: number}[],
  info: {
    UNIT_ID: number,
    clientId: number,
  },
  MACHINE_IDs: {GROUP_ID: number, GROUP_NAME: string, UNIT_ID: number}[],
  session: SessionData
) {
  let devAut;
  let installationFormatted;

  if (!info.UNIT_ID) {
    ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
    return ({MACHINE_IDs, MACHINE_NAMEs: null, devAut, installationFormatted, result: false});
  }
  const normMachineName = getNormalized(checked.GROUP_NAME);
  let MACHINE_NAMEs = clientMachines.filter((row2) => (row2.UNIT_ID === info.UNIT_ID) && (getNormalized(row2.GROUP_NAME) === normMachineName));

  if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
    MACHINE_IDs = [MACHINE_NAMEs[0]];
  }


  if (checked.DEV_AUTOM_ID){
    devAut = checked.DEV_AUTOM_ID;
  }

  if (checked.INSTALLATION_DATE){
    installationFormatted = `${checked.INSTALLATION_DATE.substring(6,10)}-${checked.INSTALLATION_DATE.substring(3,5)}-${checked.INSTALLATION_DATE.substring(0,2)}`
  }

  if (devAut) {
    const devInfo = await sqldb.DEVICES.getBasicInfo({ devId: devAut});

    if (!devInfo) {
      await httpRouter.privateRoutes['/dam/set-dam-info']({
        CLIENT_ID: info.clientId,
        DAM_ID: checked.DEV_AUTOM_ID,
        UNIT_ID: info.UNIT_ID,
        groups: MACHINE_IDs ? MACHINE_IDs.map(item => item.GROUP_ID.toString()) : undefined,
      }, session);
    }
    else {
      // Associar dispositivo à unidade caso seja fabricante
      await realocateManufacturerDevice(
        info.clientId,
        info.UNIT_ID,
        {
          DEV_AUT: devAut || null,
        },
        session, true);
    }
  }
  return ({MACHINE_IDs, MACHINE_NAMEs, devAut, installationFormatted, result: true});
}


export async function checkDmaUnitInfoToAdd(checked: TableRow, ignored: { key: string, reason: string}[], existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[], clientId: number, session: SessionData){  
  let UNIT_ID: number = null;
  let UNIT_IDs: { UNIT_ID: number, UNIT_NAME: string }[]
  const normUnitName = getNormalized(checked.UNIT_NAME);
  UNIT_IDs = existingUnitItems.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));

  if (UNIT_IDs.length !== 1) {
    ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
    return { result: false, UNIT_ID};
  } else {
    const currentDevInfo = await sqldb.DEVICES.getBasicInfo({ devId: checked.DMA_ID })
    if (currentDevInfo && currentDevInfo.UNIT_ID && UNIT_IDs[0].UNIT_ID !== currentDevInfo.UNIT_ID) {
      ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outra unidade deste cliente' });
      return { result: false, UNIT_ID};
    }
  }

  const data = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: clientId });
  
  const allAssociatedMeters = await sqldb.DMAS_DEVICES.getList({ unitIds: [ data.UNIT_ID]});
  const associatedLaager = await sqldb.LAAGER.getLaagerByUnit({ UNIT_ID: data.UNIT_ID });
  if (data && data.UNIT_ID) {
    const meters = allAssociatedMeters.filter((meter) => meter.UNIT_ID === data.UNIT_ID && meter.DMA_ID !== checked.DMA_ID );
    if (meters.length !== 0 || (associatedLaager && associatedLaager.LAAGER_CODE !== checked.DMA_ID)) {
      ignored.push({ key: checked.key, reason: `Unidade já possui um medidor de água associado` });
      return { result: false, UNIT_ID};    }
  }

  UNIT_ID = UNIT_IDs[0].UNIT_ID;

  return { result: true, UNIT_ID};
}

// Funções para exportação
export async function exportAssetsFromMachine(
  machine: Awaited<ReturnType<typeof sqldb.MACHINES.getMachinesList>>[0],
  data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>,
  timezone: Awaited<ReturnType<typeof sqldb.TIME_ZONES.getTimezone>>,
  dacsExported: string[],
  additionalColumns: string[],
  machinesAdditionalParams: Awaited<ReturnType<typeof sqldb.ADDITIONAL_MACHINE_PARAMETERS.getAllParametersByMachine>>){
  const assets = await sqldb.ASSETS.getAssetsListByMachine({ MACHINE_ID: machine.MACHINE_ID });
  let dutInfo;
  const hasAsset = assets.length > 0;
  let dutDuo = '';
  let environment: (Awaited<ReturnType<typeof sqldb.ENVIRONMENTS.getEnvironmentsInfo>> | undefined) = undefined;
  if (machine.DUT_ID) {
    dutInfo = await sqldb.DUTS.getDevInfoToUnified({DEV_ID: machine.DUT_ID});
    if (dutInfo) {
      const dutDuoString = dutInfo.SENSOR_AUTOM ? 'Insuflação,Retorno' : 'Retorno,Insuflação';
      dutDuo = dutInfo.PLACEMENT !== 'DUO' ? '' : dutDuoString;
      environment = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ ENVIRONMENT_ID: dutInfo.ENVIRONMENT_ID });
    }
  }
  
  // Exporta ativos da máquina
  for (const row of assets) {
    let dacInfo = await exportDacFromAssetFromMachine(row, dacsExported);
    const dacAutoEnable = dacInfo ? (dacInfo.DAC_ID === machine.DEV_AUT ? 'S' : 'N') : null;
    const dacInfoValues = dacInfoToExportDacFromAssetFromMachineValues(dacInfo);
    const damInfo = machine.DEV_AUT && isDam(machine.DEV_AUT) ? await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: machine.DEV_AUT}) : null;
    const rowData = [
      'Máquina',
      getStringOrCharacter(unitInfo.UNIT_NAME),
      getStringOrCharacter(unitInfo.UNIT_ID),
      getStringOrCharacter(unitInfo.UNIT_CODE_CELSIUS),
      getStringOrCharacter(unitInfo.UNIT_CODE_API),  
      getStringOrCharacter(unitInfo.COUNTRY_NAME),
      getStringOrCharacter(unitInfo.STATE_ID),
      getStringOrCharacter(unitInfo.CITY_NAME),
      getStringOrCharacter(timezone.area),
      getStringOrCharacter(unitInfo.CONSTRUCTED_AREA),
      getUnitStatus(unitInfo.PRODUCTION),
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, `${unitInfo.LAT},${unitInfo.LON}`),
      getStringOrCharacter(unitInfo.ADDRESS),
      getStringOrCharacter(unitInfo.AMOUNT_PEOPLE),
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      getStringOrCharacter(machine.MACHINE_ID),
      getStringOrCharacter(machine.MACHINE_NAME),
      getStringOrCharacter(machine.INSTALLATION_DATE),
      getStringOrCharacter(machine.MCHN_APPL),
      getStringOrCharacter(machine.GROUP_TYPE),
      getStringOrCharacter(machine.BRAND),
      getStringOrCharacter(machine.FLUID_TYPE),
      getStringOrCharacter(machine.MACHINE_RATED_POWER),
      '',
      '',
      '',
      '',
      '',
      getStringOrCharacter(machine.DEV_AUT),
      dutInfo?.PLACEMENT || '',
      getStringOrCharacter(dutDuo),
      getDamInstallationLocationLabel(damInfo?.INSTALLATION_LOCATION),
      getDamPlacementLocationLabel(damInfo?.PLACEMENT),
      getDamDuoSensorLabel(damInfo?.T0_POSITION),
      getDamDuoSensorLabel(damInfo?.T1_POSITION),
      '',
      '',
      '',
      '',
      '',
      getStringOrCharacter(machine.DUT_ID),
      '',
      '',
      '',
      '',
      '',
      environment?.ENVIRONMENT_NAME || '',
      environment?.RTYPE_NAME || '',
      row.DAT_ID,
      row.AST_DESC,
      row.AST_ROLE_NAME,
      row.MCHN_MODEL,
      row.CAPACITY_PWR,
      dacInfoValues.dacCop,
      row.MACHINE_KW,
      dacInfo?.EVAPORATOR_MODEL || '',
      dacInfo?.INSUFFLATION_SPEED || '',
      dacInfo?.COMPRESSOR_NOMINAL_CURRENT || '',
      dacInfo?.EQUIPMENT_POWER || '',
      '',
      '',
      '',
      '',
      '',
      row.DEV_ID,
      dacInfo && row.DEV_ID ? dacAutoEnable : '' ,
      dacInfoValues.p0Sensor,
      dacInfoValues.p0Positn,
      dacInfoValues.p1Sensor,
      dacInfoValues.p1Positn,
      dacInfoValues.dacDesc,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      row.INSTALLATION_LOCATION,
    ];
    await exportAdditionalParams(data, rowData, additionalColumns, machinesAdditionalParams);
  }
  return {dutInfo, hasAsset, dutDuo};
}

async function exportDacFromAssetFromMachine(asset: Awaited<ReturnType<typeof sqldb.ASSETS.getAssetsListByMachine>>[0], dacsExported: string[]){
  if (asset.DEV_ID && asset.DEV_ID.startsWith('DAC')) {
    const dacInfo = await sqldb.DACS_DEVICES.getExtraInfoFull({DAC_ID: asset.DEV_ID});
    dacsExported.push(dacInfo.DAC_ID);
    return dacInfo;
  }
  return null;
}

function dacInfoToExportDacFromAssetFromMachineValues(dacInfo: Awaited<ReturnType<typeof sqldb.DACS_DEVICES.getExtraInfoFullToUnified>>) {
  const p0Sensor = dacInfo ? dacInfo.P0_SENSOR : '';
  const p0Positn = dacInfo ? dacInfo.P0_POSITN : '';
  const p1Sensor = dacInfo ? dacInfo.P1_SENSOR : '';
  const p1Positn = dacInfo ? dacInfo.P1_POSITN : '';
  const dacDesc = dacInfo ? dacInfo.DAC_DESC : '';
  const dacCop = dacInfo ? dacInfo.DAC_COP : '';
  const dacKw = dacInfo ? dacInfo.DAC_KW : '';
  return ({p0Sensor,p0Positn, p1Sensor, p1Positn, dacDesc, dacCop, dacKw });
}

// Auxiliares
export async function availableOptions (session: SessionData, clientId: number): Promise<AvailableOptions> {
  const opts = await httpRouter.privateRoutes['/dev/dev-info-combo-options']({
    CLIENT_ID: clientId,
    units: true,
    fluids: true,
    applics: true,
    types: true,
    envs: true,
    brands: true,
    roles: true,
    rtypes: true,
    psens: true,
    vavs: true,
    damInstallationLocation: true,
    evaporatorModels: true,
    fancoils: true,
  }, session);
  const energyOpts = await httpRouter.privateRoutes['/energy/get-energy-combo-opts']({}, session);
  const dielManufInfo = energyOpts.manufacturersList.find((x) => x.NAME === 'Diel Energia');
  const filteredModels = energyOpts.modelsList.filter((x) => x.MANUFACTURER_ID === dielManufInfo.MANUFACTURER_ID);
  return {
    units: opts.units.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    fluids: opts.fluids.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    applics: opts.applics.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    types: opts.types.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    envs: opts.envs.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    brands: opts.brands.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    roles: opts.roles.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    rtypes: opts.rtypes.map(x => ({ ...x, norms: [getNormalized(x.RTYPE_NAME)]})),
    psens: opts.psens.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    vavs: opts.vavs.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    energy: filteredModels.map(x => ({ ...x, norms: [getNormalized(x.NAME)] })),
    damInstallationLocation: opts.damInstallationLocation.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    evaporatorModels: opts.evaporatorModels.map(x => ({ ...x, norms: [getNormalized(x.label)] })),
    fancoils: opts.fancoils.map(x => ({ ...x, norms: [getNormalized(x.label)] }))
  }
}

export const photoType = {
  sketch: 'SKETCHES' as ReferenceType,
  devgroups: 'MACHINES' as ReferenceType,
  assets: 'ASSETS' as ReferenceType,
  dam: 'DAMS' as ReferenceType,
  dac: 'DACS' as ReferenceType,
  dut: 'DUTS' as ReferenceType,
  dri: 'DRIS' as ReferenceType,
  dma: 'DMAS' as ReferenceType,
  dal: 'DALS' as ReferenceType,
  dmt: 'DMTS' as ReferenceType,
  illumination: 'ILLUMINATIONS' as ReferenceType,
}

export async function getUnitsExisting(clientId: number){
  const existingUnitItems = await sqldb.CLUNITS.getUnitsList({ CLIENT_IDS: [clientId] });
  const existingUnitItemsNormalized = existingUnitItems.map(x => getNormalized(x.UNIT_NAME));

  return ({existingUnitItems, existingUnitItemsNormalized});
}

function filterDutDuoFancoil(infos: UnifiedBatch) {
  let ast_number = null
  switch (infos.AST_ROLE_NAME.toLowerCase()) {
    case "evaporadora":
      ast_number = 1
      break;
    case "condensadora":
      ast_number = 2
      break;
    case "cortina de ar":
      ast_number = 3
      break;
    case "trocador de calor":
      ast_number = 4
      break;
    default:
      return null;
  }

  if (!infos.DEV_ID?.startsWith('DUT') && infos.PLACEMENT !== 'DUO' && infos.MCHN_APPL !== 'fancoil') {
    return null;
  }
  return ast_number;
}

function parseInfos(infos: UnifiedBatch) {
  return {
    nInfo_COMPRESSOR_RLA: infos.COMPRESSOR_RLA && checkNumber(infos.COMPRESSOR_RLA),
    nInfo_INSUFFLATION_SPEED: infos.INSUFFLATION_SPEED && checkNumber(infos.INSUFFLATION_SPEED),
    nInfo_MCHN_KW: infos.MCHN_KW && checkNumber(infos.MCHN_KW),
    nInfo_CAPACITY_PWR: infos.CAPACITY_PWR && checkNumber(infos.CAPACITY_PWR),
    nInfo_MACHINE_RATED_POWER: infos.MACHINE_RATED_POWER && checkNumber(infos.MACHINE_RATED_POWER),
  };
}

export async function addAssetFancoilDutDuo(infos: UnifiedBatch, client_id: number, unit_id: number, machine_id: number, session: SessionData) {
  const ast_number = filterDutDuoFancoil(infos);
  if (ast_number == null) {
    return '';
  }

  const paramsAsset = { ASSET_NAME: infos.AST_DESC, MACHINE_ID: machine_id };
  const currentAssetInfo = await sqldb.ASSETS.getAssetInfoList({ ...paramsAsset, withDev: true });

  const {
    nInfo_CAPACITY_PWR,
    nInfo_COMPRESSOR_RLA,
    nInfo_INSUFFLATION_SPEED,
    nInfo_MACHINE_RATED_POWER,
    nInfo_MCHN_KW
  } = parseInfos(infos);

  const assetData = {
    GROUP_ID: machine_id,
    AST_DESC: infos.AST_DESC,
    AST_ROLE: ast_number,
    DAT_ID: infos.DAT_ID,
    EQUIPMENT_POWER: infos.EQUIPMENT_POWER,
    CLIENT_ID: client_id,
    MCHN_MODEL: infos.MCHN_MODEL,
    MCHN_APPL: infos.MCHN_APPL,
    MCHN_BRAND: infos.MCHN_BRAND,
    INSTALLATION_LOCATION: infos.INSTALLATION_LOCATION,
    CAPACITY_UNIT: (infos.CAPACITY_PWR && Number(infos.CAPACITY_PWR)) > 1000 ? 'BTU/hr' : 'TR',
    DEV_ID: infos.DEV_ID?.startsWith('DUT') ? infos.DEV_ID.split(' ')[0] : infos.DEV_ID,
    EVAPORATOR_MODEL_ID: infos.EVAPORATOR_MODEL && Number(infos.EVAPORATOR_MODEL),
    TYPE_CFG: infos.GROUP_TYPE,
    UNIT_ID: unit_id,
    COMPRESSOR_NOMINAL_CURRENT: nInfo_COMPRESSOR_RLA && Number(nInfo_COMPRESSOR_RLA.numI),
    INSUFFLATION_SPEED: nInfo_INSUFFLATION_SPEED && Number(nInfo_INSUFFLATION_SPEED.numI),
    CAPACITY_PWR: nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
    MCHN_KW: nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
    UPDATE_MACHINE_RATED_POWER: !nInfo_MACHINE_RATED_POWER
  };

  if (currentAssetInfo.length > 0) {
    let indexAsset = 0;
    if (currentAssetInfo.length > 1 && infos.DAT_ID) {
      indexAsset = currentAssetInfo.findIndex(i => i.DAT_ID === infos.DAT_ID);
    }

    await httpRouter.privateRoutes['/clients/edit-asset']({
      ...assetData,
      ASSET_ID: currentAssetInfo[indexAsset].ASSET_ID,
      DAT_INDEX: currentAssetInfo[indexAsset].DAT_INDEX,
      OLD_DEV_ID: currentAssetInfo[indexAsset].DEV_ID
    }, session);
  } else {
    await httpRouter.privateRoutes['/clients/add-new-asset'](assetData, session);
  }

  return 'DONE'
}