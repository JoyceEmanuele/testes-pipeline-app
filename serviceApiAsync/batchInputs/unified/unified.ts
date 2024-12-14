import { getUploadedFile } from '../../apiServer/getMultiparFiles'
import * as httpRouter from '../../apiServer/httpRouter'
import { getNormalized } from '../../../srcCommon/helpers/textNormalization'
import sqldb from '../../../srcCommon/db'
import parseXlsx, { createXlsx } from '../../../srcCommon/helpers/parseXlsx'
import { controlAutomMachine, realocateManufacturerDevice } from '../../clientData/machines'
import * as iotMessageListener from '../../../srcCommon/iotMessages/iotMessageListener'
import { logger } from '../../../srcCommon/helpers/logger';
import { PROFILECODES, getPermissionsOnClient, getPermissionsOnUnit } from '../../../srcCommon/helpers/permissionControl'
import { checkNumber } from '../dacs'
import * as devsCommands from '../../../srcCommon/iotMessages/devsCommands'
import servConfig from '../../../configfile'
import {
  getUnitsExisting,
  uploadFiles,
  PhotoTypes,
  deleteDamsPhotos,
  deleteDevgroupsPhotos,
  deleteDutsPhotos,
  deleteAssetsPhotos,
  deleteDacsPhotos,
  TableRow,
  AvailableOptions,
  prepareUnitInRow,
  prepareGroupBasicInfoInRow,
  prepareGroupAndAutomDevPhotosInRow,
  prepareDutInRow,
  prepareAssetInRow,
  prepareDacInRow,
  prepareDacPhotosInRow,
  prepareDriInRow,
  fillUnitInfoField,
  checkAddres,
  handleLatLong,
  checkUnitParse,
  checkMachineId,
  checkEnvironmentId,
  fillMachineBasicInfoFields,
  fillDevGroupsPhotoFields,
  fillIluminationInfoFields,
  fillIlluminationsPhotoFields,
  fillAutomDevsPhotoFields,
  fillDutsPhotoFields,
  fillAssetsPhotoFields,
  fillDacsPhotoFields,
  fillAssetsFields,
  fillDriBasicsInfoFields,
  fillDriPhotosFields,
  photoType,
  availableOptions,
  checkMachineParameters,
  groupAutoDevsToCheck,
  assetsCheck,
  dutCheck,
  dacCheck,
  checkColumn,
  addCityFromUnit,
  controlEditUnit,
  controlChecksToAddEnvironment,
  exportAssetsFromMachine,
  fillDmasFields,
  checkDmaInfo,
  checkDmaId,
  prepareWaterMeterInRow,
  prepareWaterMeterPhotosInRow,
  deleteDmasPhotos,
  checkDmaUnitByName,
  checkDmaUnitInfoToAdd,
  fillDmasPhotoFields,
  checkEnergyParameters,
  deleteDriPhotos,
  checkEnergyAplication,
  prepareNobreakInRow,
  fillNobreakFields,
  checkTimeZone,
  checkStateCityCountry,
  checkUtilityNameAndId,
  checkGridVoltage,
  checkPortIllumDev,
  prepareIlluminationInRow,
  prepareIlluminationPhotosInRow,
  deleteDalPhotos,
  deleteDmtPhotos,
  deleteNobreakPhotos,
  deleteIlluminationsPhotos,
  checkUnitNull,
  checkExistUtility,
  prepareDamInRow,
  damCheck,
  addMachineAdditionalParameters,
  addNobreakAdditionalParameters,
  fillNobreakDmtPhotosFields,
  fillNobreakAssetFields,
  checkAdditionalParameters,
  checkMachineRatedPower,
  prepareSimcardUnitInRow,
  checkConstructedArea,
  checkAmounPeople,
  addAssetFancoilDutDuo,
  checkUnitCodeApi,
} from './unifiedHelpers'
import moment = require('moment')
import { allowedInsertionInUnit, checkAvailablePorts } from '../../dmt/dmtInfo'
import { updateAndIotInformeChanges, verifyBodyDriVarsCfg } from '../../dri/driInfo'
import {
  DriVarsConfig,
  SessionData,
  WSListener,
} from '../../../srcCommon/types'
import { ControlMsgDUT, DutMsg_ReturnReset, DutMsg_ReturnSensorAutomation, MsgDutEchoJson } from '../../../srcCommon/types/devicesMessages'
import { UnifiedBatch } from '../../../srcCommon/types/api-private';
import { setSimInfoRoute } from '../../painel/simcards';
import { sendCommandToDeviceWithConfigTimezone } from '../../../srcCommon/helpers/timezones'
import { parseFirmwareVersion } from '../../../srcCommon/helpers/fwVersion'
import { ReferenceType } from '../../../srcCommon/types/backendTypes'
import { ramCaches_TIMEZONES_updateTimezoneId } from '../../realTime/eventHooks'

export const inputColumns = {
  SOLUTION_TYPE: {
    label: 'Tipo de Solução',
    exampleList: ['Unidade', 'Unidade', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Máquina', 'Água', 'Ambiente', 'Energia', 'Energia', 'Energia', 'Energia', 'Energia', 'Nobreak', 'Nobreak', 'Nobreak', 'Iluminação', 'Iluminação', 'Iluminação',]
  },
  UNIT_NAME: {
    label: 'Unidade',
    exampleList: ['Unidade Nova', 'Novo Nome', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova', 'Unidade Nova']
  },
  UNIT_ID: {
    label: 'ID da Unidade',
    exampleList: ['', '1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  UNIT_CODE_CELSIUS: {
    label: 'Código da Unidade Celsius',
    exampleList: ['', '1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  UNIT_CODE_API: {
    label: 'Código da Unidade API',
    exampleList: ['', '1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  COUNTRY: {
    label: 'País',
    exampleList: ['Brasil', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  STATE_ID: {
    label: 'Estado',
    exampleList: ['RJ', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  CITY_NAME: {
    label: 'Cidade',
    exampleList: ['Rio de Janeiro', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  TIME_ZONE: {
    label: 'Fuso Horário (IANA)',
    exampleList: ['America/Sao_Paulo', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  CONSTRUCTED_AREA: {
    label: 'Área construída (m²)',
    exampleList: ['200', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  UNIT_STATUS: {
    label: 'Status da Unidade',
    exampleList: ['Em Instalação', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  LATLONG: {
    label: 'Latitude e Longitude',
    exampleList: ['-12.984281103010751, -38.50524452809755', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  ADDRESS: {
    label: 'Endereço',
    exampleList: ['Rua Voluntários da Pátria, 190', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  AMOUNT_PEOPLE: {
    label: 'Número de Pessoas',
    exampleList: ['50', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  ICCID: {
    label: 'SIMCARD ICCID',
    exampleList: ['89550534590016789748', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  ACCESSPOINT: {
    label: 'Ponto de Acesso',
    exampleList: ['DRT303211205', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  MODEM: {
    label: 'Modem',
    exampleList: ['AmplimaxFit', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  MACACCESSPOINT: {
    label: 'MAC - Ponto de Acesso',
    exampleList: ['DAP 2230 - 10:be:f5:c3:fc:f0', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  MACREPEATER: {
    label: 'MAC - Repetidor',
    exampleList: ['DAP 2230 - 10:be:f5:c4:0a:70', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SIMCARD_PHOTO1: {
    label: 'Foto 1 SIMCARD',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SIMCARD_PHOTO2: {
    label: 'Foto 2 SIMCARD',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SIMCARD_PHOTO3: {
    label: 'Foto 3 SIMCARD',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SKETCH_1: {
    label: 'Documento 1 Unidade',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SKETCH_2: {
    label: 'Documento 2 Unidade',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SKETCH_3: {
    label: 'Documento 3 Unidade',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SKETCH_4: {
    label: 'Documento 4 Unidade',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SKETCH_5: {
    label: 'Documento 5 Unidade',
    exampleList: ['https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  GROUP_ID: {
    label: 'ID da Máquina',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  GROUP_NAME: {
    label: 'Nome da Máquina',
    exampleList: ['-', '-', 'Splitão EV01 (15 TR) - Área dos Caixas', 'Splitão EV01 (15 TR) - Área dos Caixas', 'Splitão EV01 (15 TR) - Área dos Caixas', 'Split-Piso Teto (3 TR) - Sala Técnica', 'Split-Piso Teto (3 TR) - Sala Técnica', 'Split-Wall (0,75 TR) - Sala de Treinamento', 'Split-Wall (0,75 TR) - Sala de Treinamento', 'Splitão-Inverter (20 TR) - Área de Atendimento', 'Splitão-Inverter (20 TR) - Área de Atendimento', 'ILUMINAÇÃO', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  INSTALLATION_DATE: { label: 
    'Máquina Instalada em', 
    exampleList: ['-', '-', '01/08/2021', '01/08/2021', '01/08/2021', '01/01/2022', '01/01/2022', '01/08/2021', '01/01/2022', '01/08/2021', '01/01/2022', '01/01/2022', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] 
  },
  MCHN_APPL: { 
    label: 'Aplicação', 
    exampleList: ['-', '-', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Ar Condicionado', 'Carrier ECOSPLIT', 'Carrier ECOSPLIT', 'ILUMINAÇÃO', '-', '-', 'VAV', 'VAV', 'Fancoil', 'Medidor de Energia', 'Carrier ECOSPLIT', '-', '-', '-']
  },
  GROUP_TYPE: { 
    label: 'Tipo de Equipamento', 
    exampleList: ['-', '-', 'Splitão', 'Splitão', 'Splitão', 'Split-Piso Teto', 'Split-Piso Teto', 'Split-Wall', 'Split-Wall', 'Splitão-Inverter', 'Splitão-Inverter', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  MCHN_BRAND: { 
    label: 'Fabricante',
    exampleList: ['-', '-', 'Carrier', 'Carrier', 'Carrier', 'Carrier', 'Carrier', 'Hitachi', 'Hitachi', 'Carrier', 'Carrier', '-', '-', '-', '-', '-', '-', '-',  '-', '-', '-']
  },
  FLUID_TYPE: { 
    label: 'Fluido',
    exampleList: ['-', '-', 'R410A', 'R410A', 'R410A', 'R410A', 'R410A', 'R410A', 'R410A', 'R410A', 'R410A', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  MACHINE_RATED_POWER: { 
    label: 'Potência Nominal da Máquina [kW]',
    exampleList:  ['-', '-', '8,125', '8,125', '', '3,25', '-', '0,75', '-', '20', '', '', '-', '-', '-']
  },
  PHOTO_DEVGROUPS_1: { label: 'Foto 1 Máquina', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DEVGROUPS_2: { label: 'Foto 2 Máquina', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DEVGROUPS_3: { label: 'Foto 3 Máquina', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DEVGROUPS_4: { label: 'Foto 4 Máquina', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DEVGROUPS_5: { label: 'Foto 5 Máquina', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
  DEV_AUTOM_ID: { 
    label: 'Dispositivo de Automação (ID DUT/DAM/DRI)', 
    exampleList: ['-', '-', 'DAM300000001', 'DAM300000001', 'DAM300000001', 'DUT300000001', 'DUT300000001', '-', '-', 'DRI0000000001', 'DRI0000000001', 'DAM300000002', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] 
  },
  PLACEMENT: {
    label: 'Posicionamento (INS/AMB/DUO)',
    exampleList: ['-', '-', '-', '-', '-', 'DUO', 'DUO', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  SENSORS_DUT_DUO: {
    label: `DUT DUO (POSIÇÃO SENSORES)`,
    exampleList: ['-', '-', '-', '-', '-', 'Retorno, Insuflação', 'Retorno, Insuflação', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  DAM_INSTALLATION_LOCATION: {
    label: `Local de Instalação do DAM`,
    exampleList: ['-', '-', 'Casa de Máquina', 'Ambiente Refrigerado', 'Outros', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  DAM_PLACEMENT: {
    label: `Posicionamento do DAM`,
    exampleList: ['-', '-', 'DUO', 'DUO', 'Retorno', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  DAM_T0_POSITION: {
    label: `Sensor T0 do DAM`,
    exampleList: ['-', '-', 'Insuflação', 'Retorno', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  DAM_T1_POSITION: {
    label: `Sensor T1 do DAM`,
    exampleList: ['-', '-', 'Retorno', 'Insuflação', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  PHOTO_AUTOM_DEV_1: { label: 'Foto 1 Dispositivo de Automação', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_AUTOM_DEV_2: { label: 'Foto 2 Dispositivo de Automação', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_AUTOM_DEV_3: { label: 'Foto 3 Dispositivo de Automação', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_AUTOM_DEV_4: { label: 'Foto 4 Dispositivo de Automação', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_AUTOM_DEV_5: { label: 'Foto 5 Dispositivo de Automação', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  DUT_ID: { 
    label: 'DUT de Referência (ID DUT)',
    example: 'DUT122220000', 
    exampleList: ['-', '-', 'DUT30000002', 'DUT30000002', 'DUT30000002', '-', '-', '-', '-', 'DUT00000004', 'DUT00000004', '-', '-', 'DUT30000003', '-', '-', '-', '-'] 
  },
  PHOTO_DUT_1: { label: 'Foto 1 DUT Referência', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-'] },
  PHOTO_DUT_2: { label: 'Foto 2 DUT Referência', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-'] },
  PHOTO_DUT_3: { label: 'Foto 3 DUT Referência', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-'] },
  PHOTO_DUT_4: { label: 'Foto 4 DUT Referência', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-'] },
  PHOTO_DUT_5: { label: 'Foto 5 DUT Referência', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-'] },
  ROOM_NAME: {
    label: 'Nome do Ambiente',
    exampleList: ['-', '-', 'Área dos Caixas', 'Área dos Caixas', 'Área dos Caixas', 'Sala Técnica', 'Sala Técnica', '-', '-', 'Área de Atendimento', 'Área de Atendimento', '-', '-', 'Área de Atendimento', '-', '-']
  },
  RTYPE_NAME: {
    label: 'Tipo de Ambiente',
    exampleList: ['-', '-', 'Escritório', 'Escritório', 'Escritório', 'CPD', 'CPD', '-', '-', 'Escritório', 'Escritório', '-', '-', 'Escritório', '-', '-']
  },
  DAT_ID: { 
    label: 'ID Ativo', 
    exampleList: ['-', '-', 'DAT00000001', 'DAT00000002', 'DAT00000003', 'DAT00000004', 'DAT122220005', 'DAT122220006', 'DAT122220007', 'DAT122220008', 'DAT122220009', '-', '-', '-', '-']
  },
  AST_DESC: { 
    label: 'Nome do Ativo',
    exampleList: ['-', '-', 'CD01 - Zona Técnica', 'CD02 - Zona Técnica', 'EV01 - Sala de Máquinas', 'CD03 - Zona Técnica', 'EV02 - Sala Técnica', 'CD04 - Zona Técnica', 'EV03 - Sala de Treinamento', 'CD05 - Zona Técnica', 'EV05 - Área de Atendimento', '-', '-', '-','-'] 
  },
  AST_ROLE_NAME: { 
    label: 'Função',
    exampleList: ['-', '-', 'Condensadora', 'Condensadora', 'Evaporadora', 'Condensadora', 'Evaporadora', 'Condensadora', 'Evaporadora', 'Condensadora', 'Evaporadora', '-', '-', '-', '-']
  },
  MCHN_MODEL: {
    label: 'Modelo',
    exampleList: ['-', '-', '38MSE180', '38MSE180', '42MCX180', '38CCL036515MSC', '42CCL036515MSC', '38MACA09S5', '42MACA09S5', '38EXC20', '42XC20', '-', '-', '-', '-']
  },
  CAPACITY_PWR: { 
    label: 'Capacidade Frigorífica',
    exampleList: ['-', '-', '7,5', '7,5', '15', '3', '3', '0,75', '0,75', '200000', '200000', '-', '-', '-', '-']
  },
  DAC_COP: {
    label: 'COP',
    exampleList: ['-', '-', '3,3', '3,3', '3,3', '3', '3', '3', '3', '3', '3', '-', '-', '-', '-']
  },
  MCHN_KW: { 
    label: 'Potência Nominal do Ativo [kW]', 
    exampleList: ['-', '-', '8,125', '8,125', '', '3,25', '-', '0,75', '-', '20', '', '', '-', '-', '-']
  },
  EVAPORATOR_MODEL: {
    label: 'Modelo da Evaporadora', 
    exampleList: ['-', '-', '40MZB240236VS*', '40BVA08236VS', '', 'RVT150CPX', '-', 'DXPA103EK32P0000', '-', 'RVT150CPX', '', '', '-', '-', '-']
  },
  INSUFFLATION_SPEED: { 
    label: 'Velocidade de Insuflamento', 
    exampleList: ['-', '-', '8,25', '12,12', '', '33,25', '-', '10,75', '-', '20', '', '', '-', '-', '-']
  },
  COMPRESSOR_RLA: { 
    label: 'Corrente Nominal / RLA do Compressor [A]', 
    exampleList: ['-', '-', '8,3', '8,8', '', '3,2', '-', '0,7', '-', '10', '', '', '-', '-', '-']
  },
  EQUIPMENT_POWER: { 
    label: 'Alimentação do Equipamento', 
    exampleList: ['-', '-', '380V / 3F / 60Hz', '220V / 3F / 60Hz', '', '380V / 3F / 60Hz', '-', '220V / 1F / 60Hz', '-', '220V / 1F / 60Hz', '', '', '-', '-', '-']
  },
  PHOTO_ASSET_1: { label: 'Foto 1 Ativo', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', '-', '-', '-'] },
  PHOTO_ASSET_2: { label: 'Foto 2 Ativo', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', '-', '-', '-'] },
  PHOTO_ASSET_3: { label: 'Foto 3 Ativo', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', '-', '-', '-'] },
  PHOTO_ASSET_4: { label: 'Foto 4 Ativo', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', '-', '-', '-'] },
  PHOTO_ASSET_5: { label: 'Foto 5 Ativo', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', '-', '-', '-'] },
  DEV_ID: { 
    label: 'Dispositivo Diel associado ao ativo (ID DAC/DUT)', 
    exampleList: ['-', '-', 'DAC40000001', 'DAC40000002', '-', 'DAC40000003', '-', '-', '-', 'DAC40000004', '-', '', '-', '-', '-']
  },
  DAC_COMIS: { label: 'Comissionado (S/N)', exampleList: ['-','-','S','-','N','-','-','-','-','-','-','-','-','-', '-'] },
  P0_SENSOR: {
    label: 'Sensor P0',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  P0_POSITN: {
    label: 'P0',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
  },
  P1_SENSOR: {
    label: 'Sensor P1',
    exampleList: ['-', '-', '3RHO_8814', '3RHO_8814', '-', '3RHO_8814', '-', '-', '-', '3RHO_8814', '-', '-', '-', '-', '-']
  },
  P1_POSITN: {
    label: 'P1',
    exampleList: ['-', '-', 'Psuc', 'Psuc', '-', 'Psuc', '-', '-', '-', 'Psuc', '-', '-', '-', '-', '-']
  },
  PHOTO_DAC_1: { label: 'Foto 1 DAC', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DAC_2: { label: 'Foto 2 DAC', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DAC_3: { label: 'Foto 3 DAC', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DAC_4: { label: 'Foto 4 DAC', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  PHOTO_DAC_5: { label: 'Foto 5 DAC', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-'] },
  ELECTRIC_CIRCUIT_ID: { label: 'ID do Quadro Elétrico', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',] },
  ELECTRIC_CIRCUIT_NAME: { label: 'Nome do Quadro Elétrico', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Quadro Geral', '-', '-', '-', '-'] },
  ENERGY_DEVICES_INFO_ID: { label: 'ID Dispositivo Energia', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',] },
  ID_MED_ENERGY: {label: 'ID Med Energia', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'DRI001220008', 'DRI001220009', 'DRI001220010', 'DRI001220019', 'DRI000000018']},
  NUM_SERIE_MED_ENERGY: {label: 'N. Série Medidor', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '2021130']},
  MODEL_MED_ENERGY: {label: 'Modelo Medidor', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'ET330']},
  CAPACITY_TCA: {label: 'Capacidade TC (A)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '200']},
  INSTALLATION_ELETRICAL_TYPE: {label: 'Tipo de Instalação Elétrica', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '', '-', '-', '-', '-', 'Rede Bifásica']},
  SHIPPING_INTERVAL: {label: 'Intervalo de Envio (s)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '10', '-', '-', '-', '-', '50']},
  PHOTO_DRI_1: { label: 'Foto 1 DRI', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-'] },
  PHOTO_DRI_2: { label: 'Foto 2 DRI', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-'] },
  PHOTO_DRI_3: { label: 'Foto 3 DRI', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-'] },
  PHOTO_DRI_4: { label: 'Foto 4 DRI', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-'] },
  PHOTO_DRI_5: { label: 'Foto 5 DRI', exampleList: ['-', '-', 'https://s3.amazonaws.com/...', 'https://s3.amazonaws.com/...', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-'] },
  ROOM_VAV: {
    label: 'Ambiente Monitorado VAV',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Corredor VAV', 'Sala VAV', '-', '-', '-', '-']
  },
  THERM_MANUF: {
    label: 'Fabricante do Termostato',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Beca Smart', 'Beca Smart', 'Beca Smart', '-', '-', '-'],
  },
  THERM_MODEL: {
    label: 'Modelo do Termostato',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'BAC-2000', 'BAC-6000', 'BAC-6000 AMLN', '-', '-', '-']
  },
  VALVE_MANUF: {
    label: 'Fabricante do Atuador',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Trox', 'Belimo', 'Trox', '-', '-', '-'],
  },
  VALVE_MODEL: {
    label: 'Modelo do Atuador',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'M466ES3', 'M466ES3', 'M466ES3', '-', '-', '-'],
  },
  VALVE_TYPE: {
    label: 'Tipo do Atuador',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Válvula Fixa On-Off', '-', '-', '-'],
  },
  BOX_MANUF: {
    label: 'Fabricante da Caixa VAV',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Trox', 'Belimo', '-', '-', '-', '-'],
  },
  BOX_MODEL: {
    label: 'Modelo da Caixa VAV',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'TVZ D-250', 'TVZ D-250', '-', '-', '-', '-'],
  },
  FANCOIL_MANUF: {
    label: 'Fabricante do Fancoil',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Air Quality', '-', '-', '-'],
  },
  FANCOIL_MODEL: {
    label: 'Modelo do Fancoil',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'ILQ-S-15-V3-ESQ', '-', '-', '-'],
  },
  DMA_ID: {
    label: 'ID do DMA',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'DMA00000001', '-', '-', '-']
  },
  HYDROMETER_MODEL: {
    label: 'Hidrômetro',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Elster S120 (1 L/pulso)', '-', '-', '-']
  },
  INSTALLATION_LOCATION: {
    label: 'Local de Instalação do dispositivo',
    exampleList: ['-', '-', 'Salão A', 'Salão A', 'Salão A', '-', '-', '', '-', '', 'Salão B', '-', "Próximo à caixa d'agua", '-', '-', '-']
  },
  WATER_INSTALLATION_DATE: {
    label: 'Data de Instalação do DMA',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '01/08/2021', '-', '-']
  },
  TOTAL_CAPACITY: {
    label: 'Capacidade Total dos Reservatórios (L)',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '2000', '-', '-']
  },
  TOTAL_RESERVOIRS: {
    label: 'Total de Reservatórios',
    exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '2', '-', '-']
  },
  PHOTO_DMA_1 :{ label: 'Foto 1 DMA', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-']},
  PHOTO_DMA_2 :{ label: 'Foto 2 DMA', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-']},
  PHOTO_DMA_3 :{ label: 'Foto 3 DMA', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-']},
  PHOTO_DMA_4 :{ label: 'Foto 4 DMA', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-']},
  PHOTO_DMA_5 :{ label: 'Foto 5 DMA', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/...', '-', '-']},
  UTILITY_ID: { label: 'Id do utilitario', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',  '-','1', '2', '3', '-', '-', '2'] },
  UTILITY_NAME: { label: 'Nome do utilitario', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','Nobreak 01 – Sala do Gabriel', 'Nobreak 02 – Sala da Ana', 'Nobreak 03 – Sala do Rodolfo', 'Nobreak 04 – Sala do Bivar', 'Circuito de Iluminação com DAL', 'Circuito de Iluminação  com DMT', 'Circuito de Iluminação  editado'] },
  INSTALLATION_DATE_UTIL: { label: 'Data de Instalação do Utilitário', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','30/05/23', '30/05/23', '30/05/23', '-', '-', '-'] },
  DISTRIBUTOR: { label: 'Fabricante Nobreak', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','intelbras', 'intelbras', 'intelbras', '-', '-', '-'] },
  MODEL: { label: 'Modelo Nobreak', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'IT900023-E', 'IT900023-E', 'IT900023-E', '-', '-', '-'] },
  ENTRY_VOLTAGE: { label: 'Tensão de Entrada (VAC)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','115', '220', '-', '-', '-'] },
  OUT_VOLTAGE: { label: 'Tensão de Saída (VAC)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','15', '220', '-', '-', '-'] },
  POT_NOMINAL: { label: 'Potência Nominal (VA)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','600', '200', '-', '-', '-'] },
  AUTON_NOMINAL: { label: 'Autonomia Nominal (min)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','50', '80', '-', '-', '-'] },
  INPUT_ELECTRIC_CURRENT: { label: 'Corrente Elétrica de Entrada (A)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','8', '10', '-', '-', '-'] },
  OUTPUT_ELECTRIC_CURRENT: { label: 'Corrente Elétrica de Saída (A)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','10', '12', '-', '-', '-'] },
  NOMINAL_BATTERY_CAPACITY: { label: 'Capacidade Nominal da Bateria (Ah)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','100', '120', '-', '-', '-'] },
  GRID_VOLTAGE: { label: 'Tensão da Rede (VAC)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','127', '127', '200'] },
  MAINS_CURRENT : { label: 'Corrente da Rede Elétrica (A)', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',  '-','20', '30', '50'] },
  ASSOCIATE_DEV: { label: 'Dispositivo associado', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','DMT000000001', 'DMT000000001', 'DAL000000001', 'DMT100000001', 'DAL000000001'] },
  ASSOCIATE_DEV_PORT: { label: 'Porta do Dispositivo associado', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','1', '2', '3', '1', '1', '2'] },
  FEEDBACK_DAL: { label: 'Feedback do DAL ou DMT', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-','-', '-', '-', '-', '1', '', '1', '1', '-', '1'] },
  ASSOCIATE_ASSET: { label: 'Ativo associado', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'DAT000000001', 'DAT000000001'] },
  PHOTO_DMT: { label: 'Foto DMT', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', '-', 'https://s3.amazonaws.com/…'] },
  PHOTO_DAL: { label: 'Foto DAL ou DMT', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',  '-', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', '', 'https://s3.amazonaws.com/…'] },
  PHOTO_UTILITY: { label: 'Foto Utilitário', exampleList: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', 'https://s3.amazonaws.com/…', '', 'https://s3.amazonaws.com/…', ''] },
}

httpRouter.privateRoutes['/check-client-unified-batch'] = async function (_reqParams, session, { req, res }) {
  const file = await getUploadedFile(req, res);
  const reqParams = req.body;
  const clientId = Number(reqParams.CLIENT_ID);

  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) {
    // OK
  }
  else if (session.permissions.MANAGE_UNOWNED_DEVS) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const { tableRows, tableCols, tableColsAdditionalParameters } = await parseFileRows(file);

  const {existingUnitItems: _existingUnitItems, existingUnitItemsNormalized} = await getUnitsExisting(clientId);
  const opts = await availableOptions(session, clientId);
  const list = [];
  const unitsWillBeCreated = [] as string[];
  const sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[] = [];
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    const isEmptyRow = Object.keys(row).every(value => value === 'key' || row[value as keyof TableRow] == null);
    if (!isEmptyRow) {
      list.push(await parseInputRow(row, `${i}/${Date.now()}`, existingUnitItemsNormalized, opts, Number(reqParams.CLIENT_ID), session, { unitsWillBeCreated, sumRatedPowerCondensers }));    }
  }
  return { list, tableCols, tableColsAdditionalParameters };
}

httpRouter.privateRoutes['/add-client-unified-batch'] = async function (reqParams, session, { req, res }) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.datas) throw Error('Missing parameter: datas').HttpStatus(400)

  const perms = await getPermissionsOnClient(session, reqParams.CLIENT_ID);
  if (perms.canManageClient) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  let clientMachines = await sqldb.MACHINES.getMachinesList({ CLIENT_IDS: [reqParams.CLIENT_ID] });
  const opts = await availableOptions(session, reqParams.CLIENT_ID);
  const clientRoomTypes = await sqldb.ROOMTYPES.getRoomTypesList({ CLIENT_ID: reqParams.CLIENT_ID });

  const added = [] as { key: string } [];
  const ignored = [] as { key: string, reason: string }[];
  const existingCities: string[] = [];

  const authHeader = req.get('Authorization');

  await controlAddUnifiedBatch(reqParams.datas, added, ignored, { clientId: reqParams.CLIENT_ID, existingCities, opts, clientRoomTypes }, clientMachines, session, authHeader);
  return { added, ignored };
}

async function verifyTypeSolution(
  checked: TableRow & {
    errors: {
        message: string;
    }[],
  },
  ignored: { key: string, reason: string }[], infos: {
  clientId: number,
  existingCities: string[],
  opts: AvailableOptions,
  clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[],
  }, 
  existingItems: string[], 
  existingUnits: {
    CLIENT_ID: number
    UNIT_ID: number
    UNIT_NAME: string
    LAT: string
    LON: string
    CITY_ID: string
    TARIFA_KWH: number
    PRODUCTION: boolean
    PRODUCTION_TIMESTAMP: string
    DISABREP: number
    ADDRESS: string
    CLIENT_NAME: string
    CITY_NAME: string
    STATE_ID: string
    STATE_NAME: string
    COUNTRY_NAME: string
    DISTRIBUTOR_ID: string
    ADDITIONAL_DISTRIBUTOR_INFO: string
    CONSUMER_UNIT: string
    LOGIN: string
    LOGIN_EXTRA: string
    DISTRIBUTOR_LABEL: string
    BASELINE_ID: number
    TIMEZONE_AREA: string
    TIMEZONE_ID: number
    CONSTRUCTED_AREA: number
  }[], 
  clientMachines: {MACHINE_ID: number, MACHINE_NAME: string, UNIT_ID: number}[],
  session: SessionData,
  auxCondensersInserted: { unitName: string, machineName: string, assetCondensersIds: number []}[],
  authHeader: string) {
    // Verificar tipo de cadastro
    if (checked.SOLUTION_TYPE === 'Unidade') {
      await addUnit(infos.clientId, checked, ignored, existingItems, infos.existingCities, infos.opts, session, authHeader);
    }
    else if (checked.SOLUTION_TYPE === 'Máquina') {
      await addMachine(infos.clientId, checked, ignored, existingUnits, clientMachines, infos.clientRoomTypes, infos.opts, session, auxCondensersInserted, authHeader);
    }
    else if (checked.SOLUTION_TYPE === 'Iluminação') {
      await addIlumination(infos.clientId, checked, ignored, session, authHeader);
    }
    else if (checked.SOLUTION_TYPE === 'Ambiente') {
      await addEnvironment(infos.clientId, checked, ignored, existingUnits, infos.clientRoomTypes, infos.opts, session, authHeader);
    }
    else if (checked.SOLUTION_TYPE === 'Água') {
      await addWater(infos.clientId, checked, ignored, existingUnits, session, authHeader)
    }
    else if (checked.SOLUTION_TYPE === 'Energia') {
      await addEnergy(infos.clientId, checked, ignored, existingUnits, session, authHeader);
    }
    else if (checked.SOLUTION_TYPE === 'Nobreak') {
      await addNobreakDmt(infos.clientId, checked, ignored, session, authHeader);
    }
    else {
      ignored.push({ key: checked.key, reason: `Tipo ${checked.SOLUTION_TYPE} não encontrado` });
      return false
    }
    return true
}

const pushToRefactoredFw = async (promises5: WSListener<ControlMsgDUT>[], dut: {
  key: string;
  dutId: string;
  value: number;
  refactoredFw: boolean;
}) => {
  promises5.push(iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as MsgDutEchoJson;
    if (message.dev_id !== dut.dutId) return false;
    if (message.msgtype !== 'echo_json') return false;
    if ((message as any).number_sensors !== 2) throw Error('Error setting DUT sensors').HttpStatus(400);
    if (message.json_status === false) throw Error('Error setting DUT sensors').HttpStatus(400);
    return true;
  }, 5000));
}

const pushToDeprecatedFw = async (promises5: WSListener<ControlMsgDUT>[], promises20: WSListener<ControlMsgDUT>[], dut: {
  key: string;
  dutId: string;
  value: number;
  refactoredFw: boolean;
}) => {
  promises5.push(iotMessageListener.waitForDutControl((message) => {
    if (!message) return false;
    message = message as DutMsg_ReturnSensorAutomation;
    if (message.dev_id !== dut.dutId) return false;
    if (message.msgtype !== 'return-sensor-automation') return false;
    if ((message.number_sensors || message.number_sensors === 0) && message.number_sensors !== 2) throw Error('Error setting sensor automation').HttpStatus(400);
    return true;
  }, 10000));
  promises20.push(iotMessageListener.waitForDutControl((payload) => {
    if (!payload) return false
    if ((payload as DutMsg_ReturnReset).dev_id !== dut.dutId) return false
    if ((payload as DutMsg_ReturnReset).message_type !== 'device_data') return false
    return true;
  }, 20000));
}

async function createArrayPromise(promises5: WSListener<ControlMsgDUT>[], promises20: WSListener<ControlMsgDUT>[], dut: {
  key: string;
  dutId: string;
  value: number;
  refactoredFw: boolean;
}) {
  try {
    if (dut.refactoredFw) {
      await pushToRefactoredFw(promises5, dut);
    } else {
      await pushToDeprecatedFw(promises5, promises20, dut);
    }
  } catch (err) {
    logger.error(`msg: ${err} - SetTemperatureSensors dut duo planilha`);
  }
}

async function setDutDuoSensors5second(promises5: WSListener<ControlMsgDUT>[], infoDutsSensors: {
  key: string,
  dutId: string,
  value: number,
  refactoredFw: boolean,
}[], ignored: { key: string, reason: string }[], session: SessionData) {

  infoDutsSensors.forEach((dut) => {
    if (dut.refactoredFw) {
      devsCommands.sendDutCommand(dut.dutId, {
        msgtype: "set_sensor_temperature",
        number_sensors: 2,
        sensor_autom_index: dut.value,
      }, session.user);
    } else {
      devsCommands.sendDutCommand(dut.dutId, {
        msgtype: "set-sensor-automation",
        index: dut.value,
        number_sensors: 2,
      }, session.user)
    }
  });

  let results: (DutMsg_ReturnSensorAutomation | MsgDutEchoJson)[] = [];
  if (promises5) {
    await Promise.allSettled(promises5.map(async (item) =>
      await item as DutMsg_ReturnSensorAutomation | MsgDutEchoJson
      )).then((values) => {
        values.forEach((value) => { if (value.status === 'fulfilled') {
          results.push(value.value);
        }})
    });
  }

  const fail = infoDutsSensors.filter((item) => { 
    return !results.find((itemResult) => itemResult.dev_id === item.dutId);
  })

  fail.forEach((item) => ignored.push({ key: item.key, reason: "Erro ao setar os comandos do dut duo" }))
  return results;
}

async function resetDutDuoSensors20second(promises20: WSListener<ControlMsgDUT>[], infoDutsSensors: {
  key: string,
  dutId: string,
  value: number,
}[], ignored: { key: string, reason: string }[], session: SessionData) {
  
  infoDutsSensors.forEach((dut) => 
  devsCommands.sendDutCommand(dut.dutId, {
    msgtype: "software-reset-device",
  }, session.user)
  );

  const results20: DutMsg_ReturnReset[] = [];
  await Promise.allSettled(promises20.map(async (value) => await value as DutMsg_ReturnReset)).then((values) => {
  values.forEach((item) => {
    if (item.status === 'fulfilled') {
      results20.push(item.value);
    }
  })});
  const fail = infoDutsSensors.filter((item) => { 
    return !results20.find((itemResult) => itemResult.dev_id === item.dutId);
  })

  fail.forEach((item) => ignored.push({ key: item.key, reason: "Erro ao resetar os comandos do dut duo" }))
}

async function setTemperatureSensors(infoDutsSensors: {
  key: string,
  dutId: string,
  value: number,
  redefinedSensor: number,
  refactoredFw: boolean
}[], ignored: { key: string, reason: string }[], session: SessionData) {
  try {
    await resetSensorsDutDuo(infoDutsSensors, ignored, session);

    const promises5SensorValue: WSListener<ControlMsgDUT>[] = [];
    const promises20RestartSensorValue: WSListener<ControlMsgDUT>[] = [];
    for (const dut of infoDutsSensors) {
      const infoDut = await sqldb.DUTS.getBasicInfo({ devId: dut.dutId });
      if (![0,1].includes(dut.value)) { ignored.push({ key: dut.key, reason: "Missing value (0 or 1) DUT DUO" }); return;}
      const perms = await getPermissionsOnUnit(session, infoDut.CLIENT_ID, infoDut.UNIT_ID);
      if (!perms.canChangeDeviceOperation) {
        ignored.push({ key: dut.key, reason: "Sem permissão para mudar a operação do dispositivo" }); 
        return;
      }
      await createArrayPromise(promises5SensorValue, promises20RestartSensorValue, dut);
    }
    const results = await setDutDuoSensors5second(promises5SensorValue, infoDutsSensors, ignored, session);
    await resetDutDuoSensors20second(promises20RestartSensorValue, infoDutsSensors, ignored, session);
    for (const result of results) {
      const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({ DUT_CODE: result.dev_id });
      if (!dutDuo) throw Error('There was an error! Dutduo not found!').HttpStatus(400);
      const dutInfo = infoDutsSensors.find((v) => v.dutId === result.dev_id);
      if (dutInfo?.refactoredFw) {
        await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, SENSOR_AUTOM: dutInfo.value }, session.user );
      } else {
        // @ts-ignore
        await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, SENSOR_AUTOM: result.index }, session.user );
      }
    }  
  } catch (err) {
    logger.error(`msg: ${err} - user: ${session.user} - SetTemperatureSensors dut duo planilha`);
  }
}

async function resetSensorsDutDuo(infoDutsSensors: {
  key: string,
  dutId: string,
  value: number,
  redefinedSensor: number,
  refactoredFw: boolean
}[], ignored: { key: string, reason: string }[], session: SessionData) {
  const promises5ResetSensor: WSListener<ControlMsgDUT>[] = [];
  const promises20RestartResetSensor: WSListener<ControlMsgDUT>[] = [];
  const infoDutsSensorsToReset = infoDutsSensors.filter(dut => !dut.redefinedSensor && !dut.refactoredFw);
  for (let index = 0; index < infoDutsSensorsToReset.length; index++) {
    if (![0,1].includes(infoDutsSensorsToReset[index].value)) { return;}
    const infoDut = await sqldb.DUTS.getBasicInfo({ devId: infoDutsSensorsToReset[index].dutId });
    const perms = await getPermissionsOnUnit(session, infoDut.CLIENT_ID, infoDut.UNIT_ID);
    if (!perms.canChangeDeviceOperation) {
      return;
    }
    infoDutsSensorsToReset[index].value = -1;
    await createArrayPromise(promises5ResetSensor, promises20RestartResetSensor, infoDutsSensorsToReset[index]);
  }
  const resultsReset = await setDutDuoSensors5second(promises5ResetSensor, infoDutsSensorsToReset, ignored, session);
  await resetDutDuoSensors20second(promises20RestartResetSensor, infoDutsSensorsToReset, ignored, session);
  for (const result of resultsReset) {
    const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({ DUT_CODE: result.dev_id });
    if (!dutDuo) throw Error('There was an error! Dutduo not found!').HttpStatus(400);
    await sqldb.DUTS_DUO.w_updateInfo({ ID: dutDuo.ID, REDEFINED_SENSORS: 1 }, session.user );
  } 
}
async function verifyParamsDutDuoToSetSensors(checked: TableRow & {
  errors: {
      message: string;
  }[],
}, dutsToSetTemperature: { key: string, dutId: string, value: number, redefinedSensor: number, refactoredFw: boolean }[], row: UnifiedBatch) {
  if (checked.SOLUTION_TYPE === 'Máquina' && (checked.SENSORS_DUT_DUO && checked.PLACEMENT && checked.PLACEMENT.toUpperCase() === 'DUO') && checked.DEV_AUTOM_ID.startsWith('DUT')) {
    const sensor1 = getNormalized(checked.SENSORS_DUT_DUO.split(',')[0]);
    const SENSOR_AUTOM = sensor1 === getNormalized('Insuflação') ? 1 : 0;
    const dutDuo = await sqldb.DUTS_DUO.getDutDuoInfo({DUT_CODE: row.DUT_ID});

    const fwInfo = await sqldb.DEVFWVERS.getDevFwInfo({devId: row.DUT_ID});
    const fwVers = (fwInfo?.CURRFW_VERS && parseFirmwareVersion(fwInfo?.CURRFW_VERS)) || null;
    dutsToSetTemperature.push({
      key: checked.key,
      dutId: row.DUT_ID,
      value: SENSOR_AUTOM,
      redefinedSensor: (dutDuo && dutDuo.REDEFINED_SENSORS) || 0,
      refactoredFw: !!(fwVers?.vMajor >= 4),
    })
  }
}

async function controlAddUnifiedBatch(
  datas: Parameters<typeof httpRouter.privateRoutes['/add-client-unified-batch']>[0]['datas'][0][],
  added: { key: string } [],
  ignored: { key: string, reason: string }[],
  infos: {
    clientId: number,
    existingCities: string[],
    opts: AvailableOptions,
    clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[],
  },
  clientMachines: {MACHINE_ID: number, MACHINE_NAME: string, UNIT_ID: number}[],
  session: SessionData,
  authHeader: string,
){
  const unitsWillBeCreated = [] as string[];
  const sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[] = []
  const dutsToSetTemperature = [] as {
    dutId: string,
    value: number,
    key: string,
    redefinedSensor: number,
    refactoredFw: boolean
  }[];
  let keyChecked: string[] = [];
  for (const row of datas) {
    try {
      const {existingUnitItems: existingUnits, existingUnitItemsNormalized: existingItems} = await getUnitsExisting(infos.clientId);
      const checked = await parseInputRow(row, row.key, existingItems, infos.opts, infos.clientId, session, { unitsWillBeCreated, sumRatedPowerCondensers });
      keyChecked.push(checked.key);
      if (checked.errors.length > 0) {
        ignored.push({ key: checked.key, reason: checked.errors[0].message });
        continue;
      }

      const typeError = await verifyTypeSolution(checked, ignored, infos, existingItems, existingUnits, clientMachines, session, sumRatedPowerCondensers, authHeader)
      // Verificar tipo de cadastro
      if(!typeError){
        continue;
      }
      
      if (!ignored.find(item => item.key === checked.key)) {
        await verifyParamsDutDuoToSetSensors(checked, dutsToSetTemperature, row);
      }
    } catch (err) {
      logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(row)}`);
      if (row.key) ignored.push({ key: row.key, reason: String(err) });
    }
  }
  await setTemperatureSensors(dutsToSetTemperature, ignored, session);
  for (const keyCheck of keyChecked) {
    if (!ignored.find((item) => item.key === keyCheck)) {
      added.push({ key: keyCheck });
    }
  }
}

async function verifyExportation(typeOfSolutions: string[], data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, additionalColumns: string[] ) {
  if (typeOfSolutions.includes('unit')){
    await exportUnit(data, unitInfo);
  } 
  if (typeOfSolutions.includes('water')) {
    await exportWater(data, unitInfo);
  } 
  if (typeOfSolutions.includes('energy')) {
    await exportEnergy(data, unitInfo);
  } 
  if (typeOfSolutions.includes('machine')) {
    await exportMachines(data, unitInfo, additionalColumns);
  }
  if (typeOfSolutions.includes('illumination')) {
    await exportIlumination(data, unitInfo);
  }
  if (typeOfSolutions.includes('environment')) {
    await exportEnvironment(data, unitInfo);
  }  
  if (typeOfSolutions.includes('nobreak')) {
    await exportNobreak(data, unitInfo, additionalColumns);
  }
}
const inputColumnsLabels: (string|number)[] =
  [
    inputColumns.SOLUTION_TYPE.label,
    inputColumns.UNIT_NAME.label,
    inputColumns.UNIT_ID.label,
    inputColumns.UNIT_CODE_CELSIUS.label,
    inputColumns.UNIT_CODE_API.label,
    inputColumns.COUNTRY.label,
    inputColumns.STATE_ID.label,
    inputColumns.CITY_NAME.label,
    inputColumns.TIME_ZONE.label,
    inputColumns.CONSTRUCTED_AREA.label,
    inputColumns.UNIT_STATUS.label,
    inputColumns.LATLONG.label,
    inputColumns.ADDRESS.label,    
    inputColumns.AMOUNT_PEOPLE.label,
    inputColumns.ICCID.label,
    inputColumns.ACCESSPOINT.label,
    inputColumns.MODEM.label,
    inputColumns.MACACCESSPOINT.label,
    inputColumns.MACREPEATER.label,
    inputColumns.SIMCARD_PHOTO1.label,
    inputColumns.SIMCARD_PHOTO2.label,
    inputColumns.SIMCARD_PHOTO3.label,
    inputColumns.SKETCH_1.label,
    inputColumns.SKETCH_2.label,
    inputColumns.SKETCH_3.label,
    inputColumns.SKETCH_4.label,
    inputColumns.SKETCH_5.label,
    inputColumns.GROUP_ID.label,
    inputColumns.GROUP_NAME.label,
    inputColumns.INSTALLATION_DATE.label,
    inputColumns.MCHN_APPL.label,
    inputColumns.GROUP_TYPE.label,
    inputColumns.MCHN_BRAND.label,
    inputColumns.FLUID_TYPE.label,
    inputColumns.MACHINE_RATED_POWER.label,
    inputColumns.PHOTO_DEVGROUPS_1.label,
    inputColumns.PHOTO_DEVGROUPS_2.label,
    inputColumns.PHOTO_DEVGROUPS_3.label,
    inputColumns.PHOTO_DEVGROUPS_4.label,
    inputColumns.PHOTO_DEVGROUPS_5.label,
    inputColumns.DEV_AUTOM_ID.label,
    inputColumns.PLACEMENT.label,
    inputColumns.SENSORS_DUT_DUO.label,
    inputColumns.DAM_INSTALLATION_LOCATION.label,
    inputColumns.DAM_PLACEMENT.label,
    inputColumns.DAM_T0_POSITION.label,
    inputColumns.DAM_T1_POSITION.label,
    inputColumns.PHOTO_AUTOM_DEV_1.label,
    inputColumns.PHOTO_AUTOM_DEV_2.label,
    inputColumns.PHOTO_AUTOM_DEV_3.label,
    inputColumns.PHOTO_AUTOM_DEV_4.label,
    inputColumns.PHOTO_AUTOM_DEV_5.label,
    inputColumns.DUT_ID.label,
    inputColumns.PHOTO_DUT_1.label,
    inputColumns.PHOTO_DUT_2.label,
    inputColumns.PHOTO_DUT_3.label,
    inputColumns.PHOTO_DUT_4.label,
    inputColumns.PHOTO_DUT_5.label,
    inputColumns.ROOM_NAME.label,
    inputColumns.RTYPE_NAME.label,
    inputColumns.DAT_ID.label,
    inputColumns.AST_DESC.label,
    inputColumns.AST_ROLE_NAME.label,
    inputColumns.MCHN_MODEL.label,
    inputColumns.CAPACITY_PWR.label,
    inputColumns.DAC_COP.label,
    inputColumns.MCHN_KW.label,
    inputColumns.EVAPORATOR_MODEL.label,
    inputColumns.INSUFFLATION_SPEED.label,
    inputColumns.COMPRESSOR_RLA.label,
    inputColumns.EQUIPMENT_POWER.label,
    inputColumns.PHOTO_ASSET_1.label,
    inputColumns.PHOTO_ASSET_2.label,
    inputColumns.PHOTO_ASSET_3.label,
    inputColumns.PHOTO_ASSET_4.label,
    inputColumns.PHOTO_ASSET_5.label,
    inputColumns.DEV_ID.label,
    inputColumns.DAC_COMIS.label,
    inputColumns.P0_SENSOR.label,
    inputColumns.P0_POSITN.label,
    inputColumns.P1_SENSOR.label,
    inputColumns.P1_POSITN.label,
    inputColumns.PHOTO_DAC_1.label,
    inputColumns.PHOTO_DAC_2.label,
    inputColumns.PHOTO_DAC_3.label,
    inputColumns.PHOTO_DAC_4.label,
    inputColumns.PHOTO_DAC_5.label,
    inputColumns.ELECTRIC_CIRCUIT_ID.label,
    inputColumns.ELECTRIC_CIRCUIT_NAME.label,
    inputColumns.ENERGY_DEVICES_INFO_ID.label,
    inputColumns.ID_MED_ENERGY.label,
    inputColumns.NUM_SERIE_MED_ENERGY.label,
    inputColumns.MODEL_MED_ENERGY.label,
    inputColumns.CAPACITY_TCA.label,
    inputColumns.INSTALLATION_ELETRICAL_TYPE.label,
    inputColumns.SHIPPING_INTERVAL.label,
    inputColumns.ROOM_VAV.label,
    inputColumns.THERM_MANUF.label,
    inputColumns.THERM_MODEL.label,
    inputColumns.VALVE_MANUF.label,
    inputColumns.VALVE_MODEL.label,
    inputColumns.VALVE_TYPE.label,
    inputColumns.BOX_MANUF.label,
    inputColumns.BOX_MODEL.label,
    inputColumns.FANCOIL_MANUF.label,
    inputColumns.FANCOIL_MODEL.label,
    inputColumns.PHOTO_DRI_1.label,
    inputColumns.PHOTO_DRI_2.label,
    inputColumns.PHOTO_DRI_3.label,
    inputColumns.PHOTO_DRI_4.label,
    inputColumns.PHOTO_DRI_5.label,
    inputColumns.DMA_ID.label,
    inputColumns.HYDROMETER_MODEL.label,
    inputColumns.INSTALLATION_LOCATION.label,
    inputColumns.WATER_INSTALLATION_DATE.label,
    inputColumns.TOTAL_CAPACITY.label,
    inputColumns.TOTAL_RESERVOIRS.label,
    inputColumns.PHOTO_DMA_1.label,
    inputColumns.PHOTO_DMA_2.label,
    inputColumns.PHOTO_DMA_3.label,
    inputColumns.PHOTO_DMA_4.label,
    inputColumns.PHOTO_DMA_5.label,
    inputColumns.UTILITY_ID.label,
    inputColumns.UTILITY_NAME.label,
    inputColumns.INSTALLATION_DATE_UTIL.label,
    inputColumns.DISTRIBUTOR.label,
    inputColumns.MODEL.label, 
    inputColumns.ENTRY_VOLTAGE.label,
    inputColumns.OUT_VOLTAGE.label,
    inputColumns.POT_NOMINAL.label,
    inputColumns.AUTON_NOMINAL.label,
    inputColumns.INPUT_ELECTRIC_CURRENT.label,
    inputColumns.OUTPUT_ELECTRIC_CURRENT.label,
    inputColumns.NOMINAL_BATTERY_CAPACITY.label,
    inputColumns.GRID_VOLTAGE.label,
    inputColumns.MAINS_CURRENT.label,
    inputColumns.ASSOCIATE_DEV.label,
    inputColumns.ASSOCIATE_DEV_PORT.label,
    inputColumns.FEEDBACK_DAL.label,
    inputColumns.ASSOCIATE_ASSET.label,
    inputColumns.PHOTO_DMT.label,
    inputColumns.PHOTO_DAL.label,
    inputColumns.PHOTO_UTILITY.label,
];

httpRouter.privateRoutes['/export-client-unified-batch-input'] = async function (reqParams, session, { res }) {
  if (reqParams.units.length === 0 || reqParams.typeOfSolutions.length === 0 || !reqParams.clientId) throw Error('Missing parameters').HttpStatus(400);
  const data = [[...inputColumnsLabels]];
  let additionalColumns: string[] = [];
  
  await verifyAdditionalParametersMachinesToExport(reqParams.units, data, additionalColumns, reqParams.typeOfSolutions);
  await verifyAdditionalParametersNobreaksToExport(reqParams.units, data, additionalColumns, reqParams.typeOfSolutions);

  const clientId = Number(reqParams.clientId);
  if (!clientId) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400);
  const perms = await getPermissionsOnClient(session, clientId);
  if (perms.canManageClient) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  reqParams.units.forEach((itemUnit) => {
    const unitId = itemUnit && Number(itemUnit);
    if (!unitId) throw Error('Missing parameter: UNIT_ID').HttpStatus(400);
  })

  const promises = [];
  for (const itemUnit of reqParams.units) {
    const exportUnitInfo = async (unitId: number, clientId: number) => {
      const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: unitId, CLIENT_ID: clientId });
      if (!unitInfo) throw Error('Unidade não encontrada').HttpStatus(400);
      await verifyExportation(reqParams.typeOfSolutions, data, unitInfo, additionalColumns);
    }
    promises.push(exportUnitInfo(itemUnit, clientId));
  }

  await Promise.all(promises).catch((err) => {
    logger.error(`Error exporting unified batch: ${err} - user: ${session.user}`);
  });

  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('Content-Disposition', `attachment; filename="Unificada.xlsx"`);
  res.append('filename', `Unificada.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);
  return res;
}

export async function verifyAdditionalParametersMachinesToExport(UNIT_IDS: number [], data: (string|number)[][], additionalColumns: string[], typeOfSolutions: string[]){
  if (!typeOfSolutions.includes('machine')) return;
  const additionalParametersMachine = await sqldb.ADDITIONAL_MACHINE_PARAMETERS.getAllParametersByUnit({ UNIT_IDS });
  if (additionalParametersMachine.length) {
    const parametersMachines = additionalParametersMachine.map(objeto => objeto.COLUMN_NAME);
    for (const parameter of parametersMachines) {
      if (!additionalColumns.map(column => column.toLowerCase()).includes(parameter.toLowerCase())) {
        data[0].push(parameter);
        additionalColumns.push(parameter);
      }
    }
  }
}

export async function verifyAdditionalParametersNobreaksToExport(UNIT_IDS: number [], data: (string|number)[][], additionalColumns: string[], typeOfSolutions: string[]){
  if (!typeOfSolutions.includes('nobreak')) return;
  const additionalParametersNobreak = await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.getAllParametersByUnit({ UNIT_IDS });
  if (additionalParametersNobreak.length) {
    const parametersNobreaks = additionalParametersNobreak.map(objeto => objeto.COLUMN_NAME);
    for (const parameter of parametersNobreaks) {
      if (!additionalColumns.map(column => column.toLowerCase()).includes(parameter.toLowerCase())) {
        data[0].push(parameter);
        additionalColumns.push(parameter);
      }
    }
  }
}

export async function parseFileRows(file: Buffer) {
  const _lines = parseXlsx(file);
  if (_lines.length < 2) {
    throw Error('Tem que ter pelo menos uma linha de cabeçalho e uma de dados').HttpStatus(400);
  }
  const lines = _lines
  .filter(row => row.some(col => col != null))
  .map(row => row.map(col => (col ?? '').toString()));

  const tableRows: TableRow[] = [];
  const headers = lines[0].map(x => x.trim());
  const col_SOLUTION_TYPE = headers.indexOf(inputColumns.SOLUTION_TYPE.label);
  const col_UNIT_NAME = headers.indexOf(inputColumns.UNIT_NAME.label);
  const col_UNIT_ID = headers.indexOf(inputColumns.UNIT_ID.label);
  const col_UNIT_CODE_CELSIUS = headers.indexOf(inputColumns.UNIT_CODE_CELSIUS.label);
  const col_UNIT_CODE_API = headers.indexOf(inputColumns.UNIT_CODE_API.label);
  const col_COUNTRY = headers.indexOf(inputColumns.COUNTRY.label);
  const col_STATE_ID = headers.indexOf(inputColumns.STATE_ID.label);
  const col_CITY_NAME = headers.indexOf(inputColumns.CITY_NAME.label);
  const col_UNIT_STATUS = headers.indexOf(inputColumns.UNIT_STATUS.label);
  const col_TIME_ZONE = headers.indexOf(inputColumns.TIME_ZONE.label);
  const col_CONSTRUCTED_AREA = headers.indexOf(inputColumns.CONSTRUCTED_AREA.label);
  const col_LATLONG = headers.indexOf(inputColumns.LATLONG.label);
  const col_ADDRESS = headers.indexOf(inputColumns.ADDRESS.label);
  const col_AMOUNT_PEOPLE = headers.indexOf(inputColumns.AMOUNT_PEOPLE.label);
  const col_ICCID = headers.indexOf(inputColumns.ICCID.label);
  const col_ACCESSPOINT = headers.indexOf(inputColumns.ACCESSPOINT.label);
  const col_MODEM = headers.indexOf(inputColumns.MODEM.label);
  const col_MACACCESSPOINT = headers.indexOf(inputColumns.MACACCESSPOINT.label);
  const col_MACREPEATER = headers.indexOf(inputColumns.MACREPEATER.label);
  const col_SIMCARD_PHOTO1 = headers.indexOf(inputColumns.SIMCARD_PHOTO1.label);
  const col_SIMCARD_PHOTO2 = headers.indexOf(inputColumns.SIMCARD_PHOTO2.label);
  const col_SIMCARD_PHOTO3 = headers.indexOf(inputColumns.SIMCARD_PHOTO3.label);
  const col_SKETCH_1 = headers.indexOf(inputColumns.SKETCH_1.label);
  const col_SKETCH_2 = headers.indexOf(inputColumns.SKETCH_2.label);
  const col_SKETCH_3 = headers.indexOf(inputColumns.SKETCH_3.label);
  const col_SKETCH_4 = headers.indexOf(inputColumns.SKETCH_4.label);
  const col_SKETCH_5 = headers.indexOf(inputColumns.SKETCH_5.label);

  const col_GROUP_ID = headers.indexOf(inputColumns.GROUP_ID.label);
  const col_GROUP_NAME = headers.indexOf(inputColumns.GROUP_NAME.label);
  const col_INSTALLATION_DATE = headers.indexOf(inputColumns.INSTALLATION_DATE.label);
  const col_MCHN_APPL = headers.indexOf(inputColumns.MCHN_APPL.label);
  const col_GROUP_TYPE = headers.indexOf(inputColumns.GROUP_TYPE.label);
  const col_MCHN_BRAND = headers.indexOf(inputColumns.MCHN_BRAND.label);
  const col_FLUID_TYPE = headers.indexOf(inputColumns.FLUID_TYPE.label);
  const col_MACHINE_RATED_POWER = headers.indexOf(inputColumns.MACHINE_RATED_POWER.label);
  const col_PHOTO_DEVGROUPS_1 = headers.indexOf(inputColumns.PHOTO_DEVGROUPS_1.label);
  const col_PHOTO_DEVGROUPS_2 = headers.indexOf(inputColumns.PHOTO_DEVGROUPS_2.label);
  const col_PHOTO_DEVGROUPS_3 = headers.indexOf(inputColumns.PHOTO_DEVGROUPS_3.label);
  const col_PHOTO_DEVGROUPS_4 = headers.indexOf(inputColumns.PHOTO_DEVGROUPS_4.label);
  const col_PHOTO_DEVGROUPS_5 = headers.indexOf(inputColumns.PHOTO_DEVGROUPS_5.label);
  const col_DEV_AUTOM_ID = headers.indexOf(inputColumns.DEV_AUTOM_ID.label);
  const col_PLACEMENT = headers.indexOf(inputColumns.PLACEMENT.label);
  const col_SENSORS_DUT_DUO = headers.indexOf(inputColumns.SENSORS_DUT_DUO.label);
  const col_DAM_INSTALLATION_LOCATION = headers.indexOf(inputColumns.DAM_INSTALLATION_LOCATION.label);
  const col_DAM_PLACEMENT = headers.indexOf(inputColumns.DAM_PLACEMENT.label);
  const col_DAM_T0_POSITION = headers.indexOf(inputColumns.DAM_T0_POSITION.label);
  const col_DAM_T1_POSITION = headers.indexOf(inputColumns.DAM_T1_POSITION.label);
  const col_PHOTO_AUTOM_DEV_1 = headers.indexOf(inputColumns.PHOTO_AUTOM_DEV_1.label);
  const col_PHOTO_AUTOM_DEV_2 = headers.indexOf(inputColumns.PHOTO_AUTOM_DEV_2.label);
  const col_PHOTO_AUTOM_DEV_3 = headers.indexOf(inputColumns.PHOTO_AUTOM_DEV_3.label);
  const col_PHOTO_AUTOM_DEV_4 = headers.indexOf(inputColumns.PHOTO_AUTOM_DEV_4.label);
  const col_PHOTO_AUTOM_DEV_5 = headers.indexOf(inputColumns.PHOTO_AUTOM_DEV_5.label);
  const col_DUT_ID = headers.indexOf(inputColumns.DUT_ID.label);
  const col_PHOTO_DUT_1 = headers.indexOf(inputColumns.PHOTO_DUT_1.label);
  const col_PHOTO_DUT_2 = headers.indexOf(inputColumns.PHOTO_DUT_2.label);
  const col_PHOTO_DUT_3 = headers.indexOf(inputColumns.PHOTO_DUT_3.label);
  const col_PHOTO_DUT_4 = headers.indexOf(inputColumns.PHOTO_DUT_4.label);
  const col_PHOTO_DUT_5 = headers.indexOf(inputColumns.PHOTO_DUT_5.label);
  const col_ROOM_NAME = headers.indexOf(inputColumns.ROOM_NAME.label);
  const col_RTYPE_NAME = headers.indexOf(inputColumns.RTYPE_NAME.label);
  const col_DAT_ID = headers.indexOf(inputColumns.DAT_ID.label);
  const col_AST_DESC = headers.indexOf(inputColumns.AST_DESC.label);
  const col_AST_ROLE_NAME = headers.indexOf(inputColumns.AST_ROLE_NAME.label);
  const col_MCHN_MODEL = headers.indexOf(inputColumns.MCHN_MODEL.label);
  const col_CAPACITY_PWR = headers.indexOf(inputColumns.CAPACITY_PWR.label);
  const col_DAC_COP = headers.indexOf(inputColumns.DAC_COP.label);
  const col_MCHN_KW = headers.indexOf(inputColumns.MCHN_KW.label);
  const col_EVAPORATOR_MODEL = headers.indexOf(inputColumns.EVAPORATOR_MODEL.label);
  const col_INSUFFLATION_SPEED = headers.indexOf(inputColumns.INSUFFLATION_SPEED.label);
  const col_COMPRESSOR_RLA = headers.indexOf(inputColumns.COMPRESSOR_RLA.label);
  const col_EQUIPMENT_POWER = headers.indexOf(inputColumns.EQUIPMENT_POWER.label);
  const col_PHOTO_ASSET_1 = headers.indexOf(inputColumns.PHOTO_ASSET_1.label);
  const col_PHOTO_ASSET_2 = headers.indexOf(inputColumns.PHOTO_ASSET_2.label);
  const col_PHOTO_ASSET_3 = headers.indexOf(inputColumns.PHOTO_ASSET_3.label);
  const col_PHOTO_ASSET_4 = headers.indexOf(inputColumns.PHOTO_ASSET_4.label);
  const col_PHOTO_ASSET_5 = headers.indexOf(inputColumns.PHOTO_ASSET_5.label);
  const col_DEV_ID = headers.indexOf(inputColumns.DEV_ID.label);
  const col_DAC_COMIS = headers.indexOf(inputColumns.DAC_COMIS.label);
  const col_P0_SENSOR = headers.indexOf(inputColumns.P0_SENSOR.label);
  const col_P0_POSITN = headers.indexOf(inputColumns.P0_POSITN.label);
  const col_P1_SENSOR = headers.indexOf(inputColumns.P1_SENSOR.label);
  const col_P1_POSITN = headers.indexOf(inputColumns.P1_POSITN.label);
  const col_PHOTO_DAC_1 = headers.indexOf(inputColumns.PHOTO_DAC_1.label);
  const col_PHOTO_DAC_2 = headers.indexOf(inputColumns.PHOTO_DAC_2.label);
  const col_PHOTO_DAC_3 = headers.indexOf(inputColumns.PHOTO_DAC_3.label);
  const col_PHOTO_DAC_4 = headers.indexOf(inputColumns.PHOTO_DAC_4.label);
  const col_PHOTO_DAC_5 = headers.indexOf(inputColumns.PHOTO_DAC_5.label);
  const col_ELECTRIC_CIRCUIT_ID = headers.indexOf(inputColumns.ELECTRIC_CIRCUIT_ID.label);
  const col_ELECTRIC_CIRCUIT_NAME = headers.indexOf(inputColumns.ELECTRIC_CIRCUIT_NAME.label);
  const col_ENERGY_DEVICES_INFO_ID = headers.indexOf(inputColumns.ENERGY_DEVICES_INFO_ID.label);
  const col_ID_MED_ENERGY = headers.indexOf(inputColumns.ID_MED_ENERGY.label);
  const col_NUM_SERIE_MED_ENERGY = headers.indexOf(inputColumns.NUM_SERIE_MED_ENERGY.label);
  const col_MODEL_MED_ENERGY = headers.indexOf(inputColumns.MODEL_MED_ENERGY.label);
  const col_CAPACITY_TCA = headers.indexOf(inputColumns.CAPACITY_TCA.label);
  const col_INSTALLATION_ELETRICAL_TYPE = headers.indexOf(inputColumns.INSTALLATION_ELETRICAL_TYPE.label);
  const col_SHIPPING_INTERVAL = headers.indexOf(inputColumns.SHIPPING_INTERVAL.label);
  const col_ROOM_VAV = headers.indexOf(inputColumns.ROOM_VAV.label);
  const col_THERM_MANUF = headers.indexOf(inputColumns.THERM_MANUF.label);
  const col_THERM_MODEL = headers.indexOf(inputColumns.THERM_MODEL.label);
  const col_VALVE_MANUF = headers.indexOf(inputColumns.VALVE_MANUF.label);
  const col_VALVE_MODEL = headers.indexOf(inputColumns.VALVE_MODEL.label);
  const col_VALVE_TYPE = headers.indexOf(inputColumns.VALVE_TYPE.label);
  const col_BOX_MANUF = headers.indexOf(inputColumns.BOX_MANUF.label);
  const col_BOX_MODEL = headers.indexOf(inputColumns.BOX_MODEL.label);
  const col_FANCOIL_MANUF = headers.indexOf(inputColumns.FANCOIL_MANUF.label);
  const col_FANCOIL_MODEL = headers.indexOf(inputColumns.FANCOIL_MODEL.label);
  const col_PHOTO_DRI_1 = headers.indexOf(inputColumns.PHOTO_DRI_1.label);
  const col_PHOTO_DRI_2 = headers.indexOf(inputColumns.PHOTO_DRI_2.label);
  const col_PHOTO_DRI_3 = headers.indexOf(inputColumns.PHOTO_DRI_3.label);
  const col_PHOTO_DRI_4 = headers.indexOf(inputColumns.PHOTO_DRI_4.label);
  const col_PHOTO_DRI_5 = headers.indexOf(inputColumns.PHOTO_DRI_5.label);
  const col_DMA_ID = headers.indexOf(inputColumns.DMA_ID.label);
  const col_HYDROMETER_MODEL = headers.indexOf(inputColumns.HYDROMETER_MODEL.label);
  const col_INSTALLATION_LOCATION = headers.indexOf(inputColumns.INSTALLATION_LOCATION.label);
  const col_WATER_INSTALLATION_DATE = headers.indexOf(inputColumns.WATER_INSTALLATION_DATE.label);
  const col_TOTAL_CAPACITY = headers.indexOf(inputColumns.TOTAL_CAPACITY.label);
  const col_TOTAL_RESERVOIRS = headers.indexOf(inputColumns.TOTAL_RESERVOIRS.label);
  const col_PHOTO_DMA_1 = headers.indexOf(inputColumns.PHOTO_DMA_1.label);
  const col_PHOTO_DMA_2 = headers.indexOf(inputColumns.PHOTO_DMA_2.label);
  const col_PHOTO_DMA_3 = headers.indexOf(inputColumns.PHOTO_DMA_3.label);
  const col_PHOTO_DMA_4 = headers.indexOf(inputColumns.PHOTO_DMA_4.label);
  const col_PHOTO_DMA_5 = headers.indexOf(inputColumns.PHOTO_DMA_5.label);
  const col_UTILITY_ID = headers.indexOf(inputColumns.UTILITY_ID.label);
  const col_UTILITY_NAME = headers.indexOf(inputColumns.UTILITY_NAME.label);
  const col_INSTALLATION_DATE_UTIL = headers.indexOf(inputColumns.INSTALLATION_DATE_UTIL.label);
  const col_DISTRIBUTOR = headers.indexOf(inputColumns.DISTRIBUTOR.label);
  const col_MODEL = headers.indexOf(inputColumns.MODEL.label);
  const col_ENTRY_VOLTAGE = headers.indexOf(inputColumns.ENTRY_VOLTAGE.label);
  const col_OUT_VOLTAGE = headers.indexOf(inputColumns.OUT_VOLTAGE.label);
  const col_POT_NOMINAL = headers.indexOf(inputColumns.POT_NOMINAL.label);
  const col_AUTON_NOMINAL = headers.indexOf(inputColumns.AUTON_NOMINAL.label);
  const col_INPUT_ELECTRIC_CURRENT = headers.indexOf(inputColumns.INPUT_ELECTRIC_CURRENT.label);
  const col_OUTPUT_ELECTRIC_CURRENT = headers.indexOf(inputColumns.OUTPUT_ELECTRIC_CURRENT.label);
  const col_NOMINAL_BATTERY_CAPACITY = headers.indexOf(inputColumns.NOMINAL_BATTERY_CAPACITY.label);
  const col_GRID_VOLTAGE = headers.indexOf(inputColumns.GRID_VOLTAGE.label);
  const col_MAINS_CURRENT = headers.indexOf(inputColumns.MAINS_CURRENT.label);
  const col_ASSOCIATE_DEV = headers.indexOf(inputColumns.ASSOCIATE_DEV.label);
  const col_ASSOCIATE_DEV_PORT = headers.indexOf(inputColumns.ASSOCIATE_DEV_PORT.label);
  const col_FEEDBACK_DAL = headers.indexOf(inputColumns.FEEDBACK_DAL.label);
  const col_ASSOCIATE_ASSET = headers.indexOf(inputColumns.ASSOCIATE_ASSET.label);
  const col_PHOTO_DMT = headers.indexOf(inputColumns.PHOTO_DMT.label);
  const col_PHOTO_DAL = headers.indexOf(inputColumns.PHOTO_DAL.label);
  const col_PHOTO_UTILITY = headers.indexOf(inputColumns.PHOTO_UTILITY.label);

  const tableCols = Object.keys(inputColumns);
  const tableColsAdditionalParameters = [];
  let indexRowsAdditionalParameters = headers.map((_, index) => index);

  let errorColumns: string[] = [];
  checkColumn(col_SOLUTION_TYPE, inputColumns.SOLUTION_TYPE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UNIT_NAME, inputColumns.UNIT_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UNIT_ID, inputColumns.UNIT_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UNIT_CODE_CELSIUS, inputColumns.UNIT_CODE_CELSIUS.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UNIT_CODE_API, inputColumns.UNIT_CODE_API.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_COUNTRY, inputColumns.COUNTRY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_STATE_ID, inputColumns.STATE_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_CITY_NAME, inputColumns.CITY_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UNIT_STATUS, inputColumns.UNIT_STATUS.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_TIME_ZONE, inputColumns.TIME_ZONE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_CONSTRUCTED_AREA, inputColumns.CONSTRUCTED_AREA.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_LATLONG, inputColumns.LATLONG.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ADDRESS, inputColumns.ADDRESS.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_AMOUNT_PEOPLE, inputColumns.AMOUNT_PEOPLE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ICCID, inputColumns.ICCID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ACCESSPOINT, inputColumns.ACCESSPOINT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MODEM, inputColumns.MODEM.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MACACCESSPOINT, inputColumns.MACACCESSPOINT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MACREPEATER, inputColumns.MACREPEATER.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SIMCARD_PHOTO1, inputColumns.SIMCARD_PHOTO1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SIMCARD_PHOTO2, inputColumns.SIMCARD_PHOTO2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SIMCARD_PHOTO3, inputColumns.SIMCARD_PHOTO3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SKETCH_1, inputColumns.SKETCH_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SKETCH_2, inputColumns.SKETCH_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SKETCH_3, inputColumns.SKETCH_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SKETCH_4, inputColumns.SKETCH_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SKETCH_5, inputColumns.SKETCH_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_GROUP_ID, inputColumns.GROUP_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_GROUP_NAME, inputColumns.GROUP_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INSTALLATION_DATE, inputColumns.INSTALLATION_DATE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MCHN_APPL, inputColumns.MCHN_APPL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_GROUP_TYPE, inputColumns.GROUP_TYPE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MCHN_BRAND, inputColumns.MCHN_BRAND.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_FLUID_TYPE, inputColumns.FLUID_TYPE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MACHINE_RATED_POWER, inputColumns.MACHINE_RATED_POWER.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DEVGROUPS_1, inputColumns.PHOTO_DEVGROUPS_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DEVGROUPS_2, inputColumns.PHOTO_DEVGROUPS_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DEVGROUPS_3, inputColumns.PHOTO_DEVGROUPS_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DEVGROUPS_4, inputColumns.PHOTO_DEVGROUPS_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DEVGROUPS_5, inputColumns.PHOTO_DEVGROUPS_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DEV_AUTOM_ID, inputColumns.DEV_AUTOM_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PLACEMENT, inputColumns.PLACEMENT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SENSORS_DUT_DUO, inputColumns.SENSORS_DUT_DUO.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAM_INSTALLATION_LOCATION, inputColumns.DAM_INSTALLATION_LOCATION.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAM_PLACEMENT, inputColumns.DAM_PLACEMENT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAM_T0_POSITION, inputColumns.DAM_T0_POSITION.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAM_T1_POSITION, inputColumns.DAM_T1_POSITION.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_AUTOM_DEV_1, inputColumns.PHOTO_AUTOM_DEV_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_AUTOM_DEV_2, inputColumns.PHOTO_AUTOM_DEV_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_AUTOM_DEV_3, inputColumns.PHOTO_AUTOM_DEV_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_AUTOM_DEV_4, inputColumns.PHOTO_AUTOM_DEV_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_AUTOM_DEV_5, inputColumns.PHOTO_AUTOM_DEV_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DUT_ID, inputColumns.DUT_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DUT_1, inputColumns.PHOTO_DUT_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DUT_2, inputColumns.PHOTO_DUT_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DUT_3, inputColumns.PHOTO_DUT_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DUT_4, inputColumns.PHOTO_DUT_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DUT_5, inputColumns.PHOTO_DUT_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ROOM_NAME, inputColumns.ROOM_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_RTYPE_NAME, inputColumns.RTYPE_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAT_ID, inputColumns.DAT_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_AST_DESC, inputColumns.AST_DESC.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_AST_ROLE_NAME, inputColumns.AST_ROLE_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MCHN_MODEL, inputColumns.MCHN_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_CAPACITY_PWR, inputColumns.CAPACITY_PWR.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAC_COP, inputColumns.DAC_COP.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MCHN_KW, inputColumns.MCHN_KW.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_EVAPORATOR_MODEL, inputColumns.EVAPORATOR_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INSUFFLATION_SPEED, inputColumns.INSUFFLATION_SPEED.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_COMPRESSOR_RLA, inputColumns.COMPRESSOR_RLA.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_EQUIPMENT_POWER, inputColumns.EQUIPMENT_POWER.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_ASSET_1, inputColumns.PHOTO_ASSET_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_ASSET_2, inputColumns.PHOTO_ASSET_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_ASSET_3, inputColumns.PHOTO_ASSET_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_ASSET_4, inputColumns.PHOTO_ASSET_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_ASSET_5, inputColumns.PHOTO_ASSET_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DEV_ID, inputColumns.DEV_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DAC_COMIS, inputColumns.DAC_COMIS.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_P0_SENSOR, inputColumns.P0_SENSOR.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_P0_POSITN, inputColumns.P0_POSITN.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_P1_SENSOR, inputColumns.P1_SENSOR.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_P1_POSITN, inputColumns.P1_POSITN.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAC_1, inputColumns.PHOTO_DAC_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAC_2, inputColumns.PHOTO_DAC_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAC_3, inputColumns.PHOTO_DAC_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAC_4, inputColumns.PHOTO_DAC_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAC_5, inputColumns.PHOTO_DAC_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ELECTRIC_CIRCUIT_ID, inputColumns.ELECTRIC_CIRCUIT_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ELECTRIC_CIRCUIT_NAME, inputColumns.ELECTRIC_CIRCUIT_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ENERGY_DEVICES_INFO_ID, inputColumns.ENERGY_DEVICES_INFO_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ID_MED_ENERGY, inputColumns.ID_MED_ENERGY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_NUM_SERIE_MED_ENERGY, inputColumns.NUM_SERIE_MED_ENERGY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MODEL_MED_ENERGY, inputColumns.MODEL_MED_ENERGY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_CAPACITY_TCA, inputColumns.CAPACITY_TCA.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INSTALLATION_ELETRICAL_TYPE, inputColumns.INSTALLATION_ELETRICAL_TYPE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_SHIPPING_INTERVAL, inputColumns.SHIPPING_INTERVAL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ROOM_VAV, inputColumns.ROOM_VAV.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_THERM_MANUF, inputColumns.THERM_MANUF.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_THERM_MODEL, inputColumns.THERM_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_VALVE_MANUF, inputColumns.VALVE_MANUF.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_VALVE_MODEL, inputColumns.VALVE_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_VALVE_TYPE, inputColumns.VALVE_TYPE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_BOX_MANUF, inputColumns.BOX_MANUF.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_BOX_MODEL, inputColumns.BOX_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_FANCOIL_MANUF, inputColumns.FANCOIL_MANUF.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_FANCOIL_MODEL, inputColumns.FANCOIL_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DRI_1, inputColumns.PHOTO_DRI_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DRI_2, inputColumns.PHOTO_DRI_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DRI_3, inputColumns.PHOTO_DRI_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DRI_4, inputColumns.PHOTO_DRI_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DRI_5, inputColumns.PHOTO_DRI_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DMA_ID, inputColumns.DMA_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_HYDROMETER_MODEL, inputColumns.HYDROMETER_MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INSTALLATION_LOCATION, inputColumns.INSTALLATION_LOCATION.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_WATER_INSTALLATION_DATE, inputColumns.WATER_INSTALLATION_DATE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_TOTAL_CAPACITY, inputColumns.TOTAL_CAPACITY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_TOTAL_RESERVOIRS, inputColumns.TOTAL_RESERVOIRS.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMA_1, inputColumns.PHOTO_DMA_1.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMA_2, inputColumns.PHOTO_DMA_2.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMA_3, inputColumns.PHOTO_DMA_3.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMA_4, inputColumns.PHOTO_DMA_4.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMA_5, inputColumns.PHOTO_DMA_5.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UTILITY_ID, inputColumns.UTILITY_ID.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_UTILITY_NAME, inputColumns.UTILITY_NAME.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INSTALLATION_DATE_UTIL, inputColumns.INSTALLATION_DATE_UTIL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_DISTRIBUTOR, inputColumns.DISTRIBUTOR.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MODEL, inputColumns.MODEL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ENTRY_VOLTAGE, inputColumns.ENTRY_VOLTAGE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_OUT_VOLTAGE, inputColumns.OUT_VOLTAGE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_POT_NOMINAL, inputColumns.POT_NOMINAL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_AUTON_NOMINAL, inputColumns.AUTON_NOMINAL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_INPUT_ELECTRIC_CURRENT, inputColumns.INPUT_ELECTRIC_CURRENT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_OUTPUT_ELECTRIC_CURRENT, inputColumns.OUTPUT_ELECTRIC_CURRENT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_NOMINAL_BATTERY_CAPACITY, inputColumns.NOMINAL_BATTERY_CAPACITY.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_GRID_VOLTAGE, inputColumns.GRID_VOLTAGE.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_MAINS_CURRENT, inputColumns.MAINS_CURRENT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ASSOCIATE_DEV, inputColumns.ASSOCIATE_DEV.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ASSOCIATE_DEV_PORT, inputColumns.ASSOCIATE_DEV_PORT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_FEEDBACK_DAL, inputColumns.FEEDBACK_DAL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_ASSOCIATE_ASSET, inputColumns.ASSOCIATE_ASSET.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DMT, inputColumns.PHOTO_DMT.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_DAL, inputColumns.PHOTO_DAL.label, errorColumns, indexRowsAdditionalParameters);
  checkColumn(col_PHOTO_UTILITY, inputColumns.PHOTO_UTILITY.label, errorColumns, indexRowsAdditionalParameters);

  if (errorColumns.length) {
    const columns = errorColumns.join(', ');
    throw Error(`Coluna(s) não encontrada(s): ${columns}`).HttpStatus(400);
  }

  if (indexRowsAdditionalParameters.length != headers.length) {
    for (let index of indexRowsAdditionalParameters){
      tableColsAdditionalParameters.push(headers[index]);
    }
  }


  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].map(x => x.trim());
    const rowData = {
      key: `${i}/${Date.now()}`,
      SOLUTION_TYPE: cols[col_SOLUTION_TYPE],
      UNIT_NAME: cols[col_UNIT_NAME],
      UNIT_ID: cols[col_UNIT_ID],
      UNIT_CODE_CELSIUS: cols[col_UNIT_CODE_CELSIUS],
      UNIT_CODE_API: cols[col_UNIT_CODE_API],
      COUNTRY: cols[col_COUNTRY],
      STATE_ID: cols[col_STATE_ID],
      CITY_NAME: cols[col_CITY_NAME],
      UNIT_STATUS: cols[col_UNIT_STATUS],
      TIME_ZONE: cols[col_TIME_ZONE],
      CONSTRUCTED_AREA: cols[col_CONSTRUCTED_AREA],
      LATLONG: cols[col_LATLONG],
      ADDRESS: cols[col_ADDRESS],
      AMOUNT_PEOPLE: cols[col_AMOUNT_PEOPLE],
      ICCID: cols[col_ICCID],
      ACCESSPOINT: cols[col_ACCESSPOINT],
      MODEM: cols[col_MODEM],
      MACACCESSPOINT: cols[col_MACACCESSPOINT],
      MACREPEATER: cols[col_MACREPEATER],
      SIMCARD_PHOTO1: cols[col_SIMCARD_PHOTO1],
      SIMCARD_PHOTO2: cols[col_SIMCARD_PHOTO2],
      SIMCARD_PHOTO3: cols[col_SIMCARD_PHOTO3],
      SKETCH_1: cols[col_SKETCH_1],
      SKETCH_2: cols[col_SKETCH_2],
      SKETCH_3: cols[col_SKETCH_3],
      SKETCH_4: cols[col_SKETCH_4],
      SKETCH_5: cols[col_SKETCH_5],
      GROUP_ID: cols[col_GROUP_ID],
      GROUP_NAME: cols[col_GROUP_NAME],
      INSTALLATION_DATE: cols[col_INSTALLATION_DATE],
      MCHN_APPL: cols[col_MCHN_APPL],
      GROUP_TYPE: cols[col_GROUP_TYPE],
      MCHN_BRAND: cols[col_MCHN_BRAND],
      FLUID_TYPE: cols[col_FLUID_TYPE],
      MACHINE_RATED_POWER: cols[col_MACHINE_RATED_POWER],
      PHOTO_DEVGROUPS_1: cols[col_PHOTO_DEVGROUPS_1],
      PHOTO_DEVGROUPS_2: cols[col_PHOTO_DEVGROUPS_2],
      PHOTO_DEVGROUPS_3: cols[col_PHOTO_DEVGROUPS_3],
      PHOTO_DEVGROUPS_4: cols[col_PHOTO_DEVGROUPS_4],
      PHOTO_DEVGROUPS_5: cols[col_PHOTO_DEVGROUPS_5],
      DEV_AUTOM_ID: cols[col_DEV_AUTOM_ID],
      PLACEMENT: cols[col_PLACEMENT],
      SENSORS_DUT_DUO: cols[col_SENSORS_DUT_DUO],
      DAM_INSTALLATION_LOCATION: cols[col_DAM_INSTALLATION_LOCATION],
      DAM_PLACEMENT: cols[col_DAM_PLACEMENT],
      DAM_T0_POSITION: cols[col_DAM_T0_POSITION],
      DAM_T1_POSITION: cols[col_DAM_T1_POSITION],
      PHOTO_AUTOM_DEV_1: cols[col_PHOTO_AUTOM_DEV_1],
      PHOTO_AUTOM_DEV_2: cols[col_PHOTO_AUTOM_DEV_2],
      PHOTO_AUTOM_DEV_3: cols[col_PHOTO_AUTOM_DEV_3],
      PHOTO_AUTOM_DEV_4: cols[col_PHOTO_AUTOM_DEV_4],
      PHOTO_AUTOM_DEV_5: cols[col_PHOTO_AUTOM_DEV_5],
      DUT_ID: cols[col_DUT_ID],
      PHOTO_DUT_1: cols[col_PHOTO_DUT_1],
      PHOTO_DUT_2: cols[col_PHOTO_DUT_2],
      PHOTO_DUT_3: cols[col_PHOTO_DUT_3],
      PHOTO_DUT_4: cols[col_PHOTO_DUT_4],
      PHOTO_DUT_5: cols[col_PHOTO_DUT_5],
      ROOM_NAME: cols[col_ROOM_NAME],
      RTYPE_NAME: cols[col_RTYPE_NAME],
      DAT_ID: cols[col_DAT_ID],
      AST_DESC: cols[col_AST_DESC],
      AST_ROLE_NAME: cols[col_AST_ROLE_NAME],
      MCHN_MODEL: cols[col_MCHN_MODEL],
      CAPACITY_PWR: cols[col_CAPACITY_PWR],
      DAC_COP: cols[col_DAC_COP],
      MCHN_KW: cols[col_MCHN_KW],
      EVAPORATOR_MODEL: cols[col_EVAPORATOR_MODEL],
      INSUFFLATION_SPEED: cols[col_INSUFFLATION_SPEED],
      COMPRESSOR_RLA: cols[col_COMPRESSOR_RLA],
      EQUIPMENT_POWER: cols[col_EQUIPMENT_POWER],
      PHOTO_ASSET_1: cols[col_PHOTO_ASSET_1],
      PHOTO_ASSET_2: cols[col_PHOTO_ASSET_2],
      PHOTO_ASSET_3: cols[col_PHOTO_ASSET_3],
      PHOTO_ASSET_4: cols[col_PHOTO_ASSET_4],
      PHOTO_ASSET_5: cols[col_PHOTO_ASSET_5],
      DEV_ID: cols[col_DEV_ID],
      DAC_COMIS: cols[col_DAC_COMIS],
      P0_SENSOR: cols[col_P0_SENSOR],
      P0_POSITN: cols[col_P0_POSITN],
      P1_SENSOR: cols[col_P1_SENSOR],
      P1_POSITN: cols[col_P1_POSITN],
      PHOTO_DAC_1: cols[col_PHOTO_DAC_1],
      PHOTO_DAC_2: cols[col_PHOTO_DAC_2],
      PHOTO_DAC_3: cols[col_PHOTO_DAC_3],
      PHOTO_DAC_4: cols[col_PHOTO_DAC_4],
      PHOTO_DAC_5: cols[col_PHOTO_DAC_5],
      ELECTRIC_CIRCUIT_ID: cols[col_ELECTRIC_CIRCUIT_ID],
      ELECTRIC_CIRCUIT_NAME: cols[col_ELECTRIC_CIRCUIT_NAME],
      ENERGY_DEVICES_INFO_ID: cols[col_ENERGY_DEVICES_INFO_ID],
      ID_MED_ENERGY: cols[col_ID_MED_ENERGY],
      NUM_SERIE_MED_ENERGY: cols[col_NUM_SERIE_MED_ENERGY],
      MODEL_MED_ENERGY: cols[col_MODEL_MED_ENERGY],
      CAPACITY_TCA: cols[col_CAPACITY_TCA],
      INSTALLATION_ELETRICAL_TYPE: cols[col_INSTALLATION_ELETRICAL_TYPE],
      SHIPPING_INTERVAL: cols[col_SHIPPING_INTERVAL],
      ROOM_VAV: cols[col_ROOM_VAV],
      THERM_MANUF:cols[col_THERM_MANUF],
      THERM_MODEL: cols[col_THERM_MODEL],
      VALVE_MANUF: cols[col_VALVE_MANUF],
      VALVE_MODEL: cols[col_VALVE_MODEL],
      VALVE_TYPE: cols[col_VALVE_TYPE],
      BOX_MANUF: cols[col_BOX_MANUF],
      BOX_MODEL: cols[col_BOX_MODEL],
      FANCOIL_MANUF: cols[col_FANCOIL_MANUF],
      FANCOIL_MODEL: cols[col_FANCOIL_MODEL],
      PHOTO_DRI_1: cols[col_PHOTO_DRI_1],
      PHOTO_DRI_2: cols[col_PHOTO_DRI_2],
      PHOTO_DRI_3: cols[col_PHOTO_DRI_3],
      PHOTO_DRI_4: cols[col_PHOTO_DRI_4],
      PHOTO_DRI_5: cols[col_PHOTO_DRI_5],
      DMA_ID: cols[col_DMA_ID],
      HYDROMETER_MODEL: cols[col_HYDROMETER_MODEL],
      INSTALLATION_LOCATION: cols[col_INSTALLATION_LOCATION],
      WATER_INSTALLATION_DATE: cols[col_WATER_INSTALLATION_DATE],
      TOTAL_CAPACITY: cols[col_TOTAL_CAPACITY],
      TOTAL_RESERVOIRS: cols[col_TOTAL_RESERVOIRS],
      PHOTO_DMA_1: cols[col_PHOTO_DMA_1],
      PHOTO_DMA_2: cols[col_PHOTO_DMA_2],
      PHOTO_DMA_3: cols[col_PHOTO_DMA_3],
      PHOTO_DMA_4: cols[col_PHOTO_DMA_4],
      PHOTO_DMA_5: cols[col_PHOTO_DMA_5],
      UTILITY_ID: cols[col_UTILITY_ID],
      UTILITY_NAME: cols[col_UTILITY_NAME],
      INSTALLATION_DATE_UTIL: cols[col_INSTALLATION_DATE_UTIL],
      DISTRIBUTOR: cols[col_DISTRIBUTOR],
      MODEL: cols[col_MODEL], 
      ENTRY_VOLTAGE: cols[col_ENTRY_VOLTAGE],
      OUT_VOLTAGE: cols[col_OUT_VOLTAGE],
      POT_NOMINAL: cols[col_POT_NOMINAL],
      AUTON_NOMINAL: cols[col_AUTON_NOMINAL],
      INPUT_ELECTRIC_CURRENT: cols[col_INPUT_ELECTRIC_CURRENT],
      OUTPUT_ELECTRIC_CURRENT: cols[col_OUTPUT_ELECTRIC_CURRENT],
      NOMINAL_BATTERY_CAPACITY: cols[col_NOMINAL_BATTERY_CAPACITY],
      GRID_VOLTAGE: cols[col_GRID_VOLTAGE],
      MAINS_CURRENT: cols[col_MAINS_CURRENT],
      ASSOCIATE_DEV: cols[col_ASSOCIATE_DEV],
      ASSOCIATE_DEV_PORT: cols[col_ASSOCIATE_DEV_PORT],
      FEEDBACK_DAL: cols[col_FEEDBACK_DAL],
      ASSOCIATE_ASSET: cols[col_ASSOCIATE_ASSET],
      PHOTO_DMT: cols[col_PHOTO_DMT],
      PHOTO_DAL: cols[col_PHOTO_DAL],
      PHOTO_UTILITY: cols[col_PHOTO_UTILITY],
      ADDITIONAL_PARAMETERS: tableColsAdditionalParameters.length && { }
    };

    if (tableColsAdditionalParameters.length) {
      let additionalParams: { [key: string]: string } = {};
      for (let j = 0; j < indexRowsAdditionalParameters.length; j++) {
        const columnIndex = indexRowsAdditionalParameters[j];
        const columnName = tableColsAdditionalParameters[j];

        additionalParams[columnName] = cols[columnIndex] || null;
      }
      rowData.ADDITIONAL_PARAMETERS = additionalParams;
    }

    tableRows.push(rowData);
  }

  return { tableRows, tableCols, tableColsAdditionalParameters };
}

export async function parseInputRow(inRow: TableRow, key: string, existingUnitItems: string[], opts: AvailableOptions, clientId: number, session: SessionData, extraParams: { unitsWillBeCreated: string[], sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[] }) {
  const checked: TableRow = {
    key,
    SOLUTION_TYPE: null,
    UNIT_NAME: null,
    UNIT_ID: null,
    UNIT_CODE_CELSIUS: null,
    UNIT_CODE_API: null,
    COUNTRY: null,
    STATE_ID: null,
    CITY_NAME: null,
    LATLONG: null,
    UNIT_STATUS: null,
    TIME_ZONE: null,
    CONSTRUCTED_AREA: null,
    ADDRESS: null,
    AMOUNT_PEOPLE: null,
    ICCID: null,
    ACCESSPOINT: null,
    MODEM: null,
    MACACCESSPOINT: null,
    MACREPEATER: null,
    SIMCARD_PHOTO1: null,
    SIMCARD_PHOTO2: null,
    SIMCARD_PHOTO3: null,
    SKETCH_1: null,
    SKETCH_2: null,
    SKETCH_3: null,
    SKETCH_4: null,
    SKETCH_5: null,
    GROUP_ID: null,
    GROUP_NAME: null,
    INSTALLATION_DATE: null,
    MCHN_APPL: null,
    GROUP_TYPE: null,
    MCHN_BRAND: null,
    FLUID_TYPE: null,
    MACHINE_RATED_POWER: null,
    PHOTO_DEVGROUPS_1: null,
    PHOTO_DEVGROUPS_2: null,
    PHOTO_DEVGROUPS_3: null,
    PHOTO_DEVGROUPS_4: null,
    PHOTO_DEVGROUPS_5: null,
    DEV_AUTOM_ID: null,
    PLACEMENT: null,
    SENSORS_DUT_DUO: null,
    DAM_INSTALLATION_LOCATION: null,
    DAM_PLACEMENT: null,
    DAM_T0_POSITION: null,
    DAM_T1_POSITION: null,
    PHOTO_AUTOM_DEV_1: null,
    PHOTO_AUTOM_DEV_2: null,
    PHOTO_AUTOM_DEV_3: null,
    PHOTO_AUTOM_DEV_4: null,
    PHOTO_AUTOM_DEV_5: null,
    DUT_ID: null,
    PHOTO_DUT_1: null,
    PHOTO_DUT_2: null,
    PHOTO_DUT_3: null,
    PHOTO_DUT_4: null,
    PHOTO_DUT_5: null,
    ROOM_NAME: null,
    RTYPE_NAME: null,
    DAT_ID: null,
    AST_DESC: null,
    AST_ROLE_NAME: null,
    MCHN_MODEL: null,
    CAPACITY_PWR: null,
    DAC_COP: null,
    MCHN_KW: null,
    EVAPORATOR_MODEL: null,
    INSUFFLATION_SPEED: null,
    COMPRESSOR_RLA: null,
    EQUIPMENT_POWER: null,
    PHOTO_ASSET_1: null,
    PHOTO_ASSET_2: null,
    PHOTO_ASSET_3: null,
    PHOTO_ASSET_4: null,
    PHOTO_ASSET_5: null,
    DEV_ID: null,
    DAC_COMIS: null,
    P0_SENSOR: null,
    P0_POSITN: null,
    P1_SENSOR: null,
    P1_POSITN: null,
    PHOTO_DAC_1: null,
    PHOTO_DAC_2: null,
    PHOTO_DAC_3: null,
    PHOTO_DAC_4: null,
    PHOTO_DAC_5: null,
    ELECTRIC_CIRCUIT_ID: null,
    ELECTRIC_CIRCUIT_NAME: null,
    ENERGY_DEVICES_INFO_ID: null,
    DMA_ID: null,
    HYDROMETER_MODEL: null,
    ID_MED_ENERGY: null,
    NUM_SERIE_MED_ENERGY: null, 
    MODEL_MED_ENERGY: null, 
    CAPACITY_TCA: null, 
    INSTALLATION_ELETRICAL_TYPE: null,
    SHIPPING_INTERVAL: null,
    ROOM_VAV: null,
    THERM_MANUF: null,
    THERM_MODEL: null,
    VALVE_MANUF: null,
    VALVE_MODEL: null,
    VALVE_TYPE: null,
    BOX_MANUF: null,
    BOX_MODEL: null,
    FANCOIL_MANUF: null,
    FANCOIL_MODEL: null,
    PHOTO_DRI_1: null,
    PHOTO_DRI_2: null,
    PHOTO_DRI_3: null,
    PHOTO_DRI_4: null,
    PHOTO_DRI_5: null,
    INSTALLATION_LOCATION: null,
    WATER_INSTALLATION_DATE: null,
    TOTAL_CAPACITY: null,
    TOTAL_RESERVOIRS: null,
    PHOTO_DMA_1: null,
    PHOTO_DMA_2: null,
    PHOTO_DMA_3: null,
    PHOTO_DMA_4: null,
    PHOTO_DMA_5: null,
    UTILITY_ID: null,
    UTILITY_NAME: null,
    INSTALLATION_DATE_UTIL: null,
    DISTRIBUTOR: null,
    MODEL: null, 
    ENTRY_VOLTAGE: null,
    OUT_VOLTAGE: null,
    POT_NOMINAL: null,
    AUTON_NOMINAL: null,
    INPUT_ELECTRIC_CURRENT: null,
    OUTPUT_ELECTRIC_CURRENT: null,
    NOMINAL_BATTERY_CAPACITY: null,
    GRID_VOLTAGE: null,
    MAINS_CURRENT: null,
    ASSOCIATE_DEV: null,
    ASSOCIATE_DEV_PORT: null,
    FEEDBACK_DAL: null,
    ASSOCIATE_ASSET: null,
    PHOTO_DMT: null,
    PHOTO_DAL: null,
    PHOTO_UTILITY: null,
    ADDITIONAL_PARAMETERS: null,
  }
  const errors = [] as { message: string }[];
  try {
    prepareUnitInRow(inRow);
    prepareSimcardUnitInRow(inRow);
    prepareGroupBasicInfoInRow(inRow);
    prepareGroupAndAutomDevPhotosInRow(inRow);
    prepareDutInRow(inRow);
    prepareAssetInRow(inRow);
    prepareDacInRow(inRow);
    prepareDacPhotosInRow(inRow);
    prepareDriInRow(inRow);
    prepareWaterMeterInRow(inRow)
    prepareWaterMeterPhotosInRow(inRow)
    prepareNobreakInRow(inRow)
    prepareIlluminationInRow(inRow);
    prepareIlluminationPhotosInRow(inRow);
    prepareDamInRow(inRow);

    checked.SOLUTION_TYPE = inRow.SOLUTION_TYPE || null;
    if (!checked.SOLUTION_TYPE) errors.push({ message: 'É necessário informar um Tipo de Solução' });

    checked.UNIT_NAME = inRow.UNIT_NAME || null;
    if (!checked.UNIT_NAME) errors.push({ message: 'É necessário informar o nome da unidade' });

    if (checked.SOLUTION_TYPE === 'Unidade') {
      await parseInputRowUnit(clientId, inRow, checked, errors, existingUnitItems, extraParams.unitsWillBeCreated);
    }
    else if (checked.SOLUTION_TYPE === 'Máquina') {
      await parseInputRowMachine(inRow, checked, errors, opts, clientId, extraParams.unitsWillBeCreated, extraParams.sumRatedPowerCondensers);
    }
    else if (checked.SOLUTION_TYPE === 'Iluminação') {
      await parseInputRowIlumination(inRow, checked, errors, opts, clientId, extraParams.unitsWillBeCreated);
    }
    else if (checked.SOLUTION_TYPE === 'Água') {
      await parseInputRowWater(inRow, checked, errors, opts, clientId, session, extraParams.unitsWillBeCreated);
    }
    else if (checked.SOLUTION_TYPE === 'Energia') {
      await parseInputRowEnergy(inRow, checked, errors, opts, clientId, extraParams.unitsWillBeCreated);
    }
    else if (checked.SOLUTION_TYPE === 'Ambiente') {
      await parseInputRowEnvironment(inRow, checked, errors, opts, clientId, extraParams.unitsWillBeCreated);
    } else if (checked.SOLUTION_TYPE === 'Nobreak') {
      await parseInputRowNobreak(inRow, checked, errors, opts, clientId, extraParams.unitsWillBeCreated)
    }
    else {
      errors.push({ message: `Solução ${checked.SOLUTION_TYPE || '-'} inválida` });
    }
    
  } catch (err) {
    logger.error(err);
    errors.push({ message: String(err) });
  }
  return { ...checked, errors }
}

async function parseInputRowUnit (clientId: number, inRow: TableRow, checked: TableRow, errors: { message: string }[], existingUnitItems: string[], unitsWillBeCreated: string[]) {
  fillUnitInfoField(inRow, checked);
  // Verificar se já existe registro com esse nome
  const normName = getNormalized(checked.UNIT_NAME);
  if (!checked.UNIT_ID) {
    if (existingUnitItems.includes(normName)) {
      errors.push({ message: 'Já existe uma unidade com o mesmo nome' });
    }
    else if (unitsWillBeCreated.includes(normName)) {
      errors.push({ message: 'Já será criado uma unidade com o mesmo nome' });
    } 
  }
  unitsWillBeCreated.push(checked.UNIT_NAME);
  
  if (checked.STATE_ID) {
    if (checked.STATE_ID.length === 2) {
      checked.STATE_ID = checked.STATE_ID.toUpperCase();
    } else {
      errors.push({ message: `Sigla do estado inválida: ${checked.STATE_ID}` });
      checked.STATE_ID = null;
    }
  }

  checkStateCityCountry(checked, errors);

  let addressCity = await checkAddres(checked, errors);
  checkAmounPeople(checked, errors);
  await Promise.all([checkConstructedArea(checked, errors),checkTimeZone(checked, errors), checkUnitCodeApi(checked, clientId, errors)])

  if (inRow.LATLONG) {
    const latlong = inRow.LATLONG.split(',').map(x => Number(x.trim()));
    if ((latlong.length === 2) && isFinite(latlong[0]) && isFinite(latlong[1])) {
      checked.LATLONG = latlong.join(', ');
    } else {
      errors.push({ message: `Erro interpretando as coordenadas: ${inRow.LATLONG}` });
    }
  }
  await handleLatLong(inRow, checked, addressCity);
}

async function parseInputRowMachine (inRow: TableRow, checked: TableRow, errors: { message: string }[],  opts: AvailableOptions, clientId: number, unitsWillBeCreated: string[], sumRatedPowerCondensers: { unitName: string, machineName: string, assetCondensersIds: number[], sum: number }[]) {
  fillMachineBasicInfoFields(inRow, checked);
  fillDevGroupsPhotoFields(inRow, checked);
  fillAutomDevsPhotoFields(inRow, checked);
  fillDutsPhotoFields(inRow, checked);
  fillAssetsPhotoFields(inRow, checked);
  fillDacsPhotoFields(inRow, checked);
  fillAssetsFields(inRow, checked);

  checked.DUT_ID = inRow.DUT_ID || null;
  checked.ROOM_NAME = inRow.ROOM_NAME || null;
  
  if (inRow.MCHN_APPL !== undefined) {
    checked.MCHN_APPL = null;
    if (inRow.MCHN_APPL) {
      const asNorm = getNormalized(inRow.MCHN_APPL)
      const found = opts.applics.filter(x1 => (x1.value === inRow.MCHN_APPL) || x1.norms.some(x2 => x2 === asNorm));
      if (found.length !== 1) {
        errors.push({ message: `Aplicação inválida: ${inRow.MCHN_APPL}` });
      } else {
        checked.MCHN_APPL = found[0].value;
      }
    }
  }
  checkAdditionalParameters(inRow, checked, errors);
  checkUnitParse(inRow, checked, errors, opts, unitsWillBeCreated);
  checkMachineParameters(inRow, checked, errors, opts);
  // Group id para validação de dispositivos
  const groupIdCurrent = await checkMachineId(inRow, checked, errors, opts, clientId);
  await groupAutoDevsToCheck(inRow, errors, groupIdCurrent);
  damCheck(inRow, checked, errors, opts);
  if (inRow.AST_ROLE_NAME) await assetsCheck(inRow, checked, errors, opts, sumRatedPowerCondensers, groupIdCurrent);
  const sumRatedPowerCondensersByMachine = sumRatedPowerCondensers.find((x) => x.machineName === checked.GROUP_NAME && x.unitName === checked.UNIT_NAME);
  await checkMachineRatedPower(inRow, checked, errors, sumRatedPowerCondensersByMachine, groupIdCurrent);

  dutCheck(inRow, checked, errors, opts);
  dacCheck(inRow, checked, errors, opts);
}


async function parseInputRowNobreak(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, clientId: number, unitsWillBeCreated: string[]) {
  fillNobreakFields(inRow, checked);
  fillNobreakDmtPhotosFields(inRow, checked);
  fillNobreakAssetFields(inRow, checked);
  verifyVoltageDmt(checked, errors);
  verifyIdsNobreaks(checked, errors);
  checkAdditionalParameters(inRow, checked, errors);
  await verifyNobreakUnit(checked, errors, clientId, unitsWillBeCreated);

  if(checked.INSTALLATION_DATE_UTIL && !moment(checked.INSTALLATION_DATE_UTIL, "DD/MM/YYYY", true).isValid()) errors.push({ message: 'É necessário informar uma data de instalação válida, no formato DD/MM/YYYY' });

  if(checked.ASSOCIATE_DEV_PORT && checked.ASSOCIATE_DEV) {
    const ports = await checkAvailablePorts(checked.ASSOCIATE_DEV, 'Nobreak');
    const foundPort = ports.ports.find((port) => port.port === Number(checked.ASSOCIATE_DEV_PORT));

    if ((foundPort.associated && !(foundPort.nobreakId && foundPort.nobreakId === Number(checked.UTILITY_ID))) 
    || (!ports.freePorts && (foundPort.associated && !(foundPort.nobreakId && foundPort.nobreakId === Number(checked.UTILITY_ID))) )) 
      { errors.push({ message: `A porta ${checked.ASSOCIATE_DEV_PORT} já está associada, ou não existe portas disponíveis para associar um novo utilitário.` }); }
  }
}


async function parseInputRowIlumination (inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, clientId: number, unitsWillBeCreated: string[]) {
  fillIluminationInfoFields(inRow, checked);
  fillIlluminationsPhotoFields(inRow, checked);
  checkUnitParse(inRow, checked, errors, opts, unitsWillBeCreated);
  const UNIT_ID = await checkUtilityNameAndId(checked, errors, clientId, unitsWillBeCreated);
  await checkExistUtility(checked, errors);
  await checkUnitNull(UNIT_ID, checked, errors);
  checkGridVoltage(checked, errors);
  await checkPortIllumDev(checked, errors, UNIT_ID);

}

async function parseInputRowEnergy(inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, clientId: number, unitsWillBeCreated: string[]) {
  fillDriBasicsInfoFields(inRow, checked);
  fillDriPhotosFields(inRow, checked);

  checkUnitParse(inRow, checked, errors, opts, unitsWillBeCreated);
  await checkEnergyParameters(checked, errors, clientId);
  await checkEnergyAplication(inRow, checked, errors, opts);
}

async function parseInputRowWater (inRow: TableRow, checked: TableRow, errors: { message: string}[], opts: AvailableOptions, clientId: number, session: SessionData, unitsWillBeCreated: string[]){
  fillDmasFields(inRow, checked);
  fillDmasPhotoFields(inRow, checked);
  
  await checkDmaId(checked, errors, clientId);
  await checkDmaInfo(inRow, checked, errors);
  await checkDmaUnitByName(inRow, checked, errors, clientId, opts, session, unitsWillBeCreated);
}

async function parseInputRowEnvironment (inRow: TableRow, checked: TableRow, errors: { message: string }[], opts: AvailableOptions, clientId: number, unitsWillBeCreated: string[]) {
  checked.DUT_ID = inRow.DUT_ID || null;
  checked.ROOM_NAME = inRow.ROOM_NAME || null;
  checkUnitParse(inRow, checked, errors, opts, unitsWillBeCreated);  
  fillDutsPhotoFields(inRow, checked);
  dutCheck(inRow, checked, errors, opts);


  if (!checked.ROOM_NAME) errors.push({ message: 'É necessário informar o nome do Ambiente' });
  if (checked.DUT_ID && (inRow.DUT_ID.length !== 12 || !inRow.DUT_ID.startsWith('DUT'))) errors.push({ message: 'É necessário um ID do DUT válido' });
  if (checked.DUT_ID) {
    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DUT_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        errors.push({ message: `Dispositivo já associado a outro cliente` });
      }
    }
  }
}

async function checkedTimezoneUnit(checked: TableRow, ignored: { key: string, reason: string }[]) {
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
  return timezoneInfo;
}
  
async function verifyUnitHaveUnitId(clientId: number, checked: TableRow, ignored: { key: string, reason: string }[], cityId: string, session: SessionData) {
  let unitId: number;
  if (!checked.UNIT_ID) {
    const timezoneInfo = await checkedTimezoneUnit(checked, ignored);
    const isProduction = (checked.UNIT_STATUS && getNormalized(checked.UNIT_STATUS) === "em-operac-a-o") ?  true : false;
    const isProductionDate = isProduction ? new Date() : null;
    const _addedItem = await httpRouter.privateRoutes['/dac/add-client-unit']({
      CLIENT_ID: clientId,
      UNIT_NAME: checked.UNIT_NAME,
      UNIT_CODE_CELSIUS: checked.UNIT_CODE_CELSIUS,
      UNIT_CODE_API: checked.UNIT_CODE_API,
      CITY_ID: cityId,
      LAT: checked.LATLONG && checked.LATLONG.split(',')[0].trim(),
      LON: checked.LATLONG && checked.LATLONG.split(',')[1].trim(),
      EXTRA_DATA: (checked.ADDRESS && `[["Endereço", "${checked.ADDRESS}"]]`) || null,
      TIMEZONE_ID: timezoneInfo.id,
      CONSTRUCTED_AREA: checked.CONSTRUCTED_AREA,
      PRODUCTION: isProduction,
      ADDRESS: checked.ADDRESS,
      AMOUNT_PEOPLE: checked.AMOUNT_PEOPLE?.toString() !== '' ? checked.AMOUNT_PEOPLE : null,
      PRODUCTION_TIMESTAMP: isProductionDate,      
    }, session);
    unitId = _addedItem.UNIT_ID;
  }
  else {
    unitId = await controlEditUnit(checked, cityId, ignored, session)
  }
  return unitId;
}

async function addUnit(clientId: number, checked: TableRow, ignored: { key: string, reason: string }[], existingUnitItems: string[], existingCities: string[], 
  opts: AvailableOptions, session: SessionData, authHeader: string) {
  // Verificar se já existe registro com esse nome
  const normName = getNormalized(checked.UNIT_NAME);
  if (!checked.UNIT_ID && existingUnitItems.includes(normName)) {
    ignored.push({ key: checked.key, reason: 'Já existe uma unidade com o mesmo nome. Caso deseja editar, necessário informar o ID.' });
    return;
  }

  // Adicionar a cidade se não existir
  const {cityId, result} = await addCityFromUnit(checked, ignored, existingCities, session.user);
  if (!result) {
    return;
  }

  existingUnitItems.push(normName);
  const unitId =  await verifyUnitHaveUnitId(clientId, checked, ignored, cityId, session);

  // Adiciona SIMCARD
  if (checked.ICCID) {
    await setSimInfoRoute({
      ICCID: checked.ICCID,
      CLIENT: clientId,
      UNIT: unitId,
      ACCESSPOINT: checked.ACCESSPOINT,
      MODEM: checked.MODEM,
      MACACCESSPOINT: checked.MACACCESSPOINT,
      MACREPEATER: checked.MACREPEATER,
      ASSOCIATION_DATE: new Date(Date.now()).toISOString(),
    }, session);
    const simInfo = await sqldb.SIMCARDS.getDetails({ICCID: checked.ICCID});
    await uploadFiles([checked.SIMCARD_PHOTO1, checked.SIMCARD_PHOTO2, checked.SIMCARD_PHOTO3], simInfo.ID, 'SIMCARDS', authHeader);
  }

  // Realiza upload de croquis/projetos
  await uploadFiles([checked.SKETCH_1, checked.SKETCH_2, checked.SKETCH_3, checked.SKETCH_4, checked.SKETCH_5], unitId, 'SKETCHES', authHeader);

  opts.units.push({value: unitId, label: checked.UNIT_NAME, norms: [getNormalized(checked.UNIT_NAME)]});
}

export const isDac = (devId: string) => devId.toUpperCase().startsWith('DAC');
export const isDut = (devId: string) => devId.toUpperCase().startsWith('DUT');
export const isDma = (devId: string) => devId.toUpperCase().startsWith('DMA');
export const isDam = (devId: string) => devId.toUpperCase().startsWith('DAM');
export const isDri = (devId: string) => devId.toUpperCase().startsWith('DRI');
export const isDmt = (devId: string) => devId.toUpperCase().startsWith('DMT');
export const isDal = (devId: string) => devId.toUpperCase().startsWith('DAL');

async function checkAutomId(checked: TableRow, session: SessionData) {
  if (checked.DEV_AUTOM_ID) { // se nao existir adiciona
    const devsExist = await sqldb.DEVICES.getBasicInfo({ devId: checked.DEV_AUTOM_ID });
    if (!devsExist) {
      const inserted = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: checked.DEV_AUTOM_ID, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
      ramCaches_TIMEZONES_updateTimezoneId(checked.DEV_AUTOM_ID, 31);
      if (isDut(checked.DEV_AUTOM_ID)) {
        await sqldb.DUTS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      } else if (isDam(checked.DEV_AUTOM_ID)) {       
        await sqldb.DAMS_DEVICES.w_insertIgnore({ DEVICE_ID: inserted.insertId, INSTALLATION_LOCATION: checked.DAM_INSTALLATION_LOCATION, PLACEMENT: checked.DAM_INSTALLATION_LOCATION, T0_POSITION: checked.DAM_T0_POSITION, T1_POSITION: checked.DAM_T1_POSITION }, session.user);
      } else if (isDri(checked.DEV_AUTOM_ID)) {  
        await sqldb.DRIS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      } else if (isDac(checked.DEV_AUTOM_ID)) {
        await sqldb.DACS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      }
    } else if(isDam(checked.DEV_AUTOM_ID) && (checked.DAM_INSTALLATION_LOCATION || checked.DAM_PLACEMENT)) {
      await sqldb.DAMS_DEVICES.w_updateInfo({ID: devsExist.DEVICE_ID, INSTALLATION_LOCATION: checked.DAM_INSTALLATION_LOCATION, PLACEMENT: checked.DAM_INSTALLATION_LOCATION, T0_POSITION: checked.DAM_T0_POSITION, T1_POSITION: checked.DAM_T1_POSITION }, session.user);
    }
  }
}

async function checkDevId(checked: TableRow, session: SessionData) {
  if (checked.DEV_ID) {
    const devsExist = await sqldb.DEVICES.getBasicInfo({ devId: checked.DEV_ID });
    if (!devsExist) {
      const inserted = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: checked.DEV_ID, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
      ramCaches_TIMEZONES_updateTimezoneId(checked.DEV_ID, 31);
      if (isDac(checked.DEV_ID)) {
        await sqldb.DACS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      } else if (isDut(checked.DEV_ID)) {
        await sqldb.DUTS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      }
    }
  }
}

async function checkDutId(checked: TableRow, session: SessionData, clientId: number) {
  if (checked.DUT_ID) { // adicionar se nao existir
    const dutInfo = await sqldb.DUTS.getBasicInfo({ devId: checked.DUT_ID, clientId });
    if (!dutInfo) {
      const inserted = await sqldb.DEVICES.w_insertIgnore({DEVICE_CODE: checked.DUT_ID, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19)}, session.user);
      await sqldb.DUTS_DEVICES.w_insertIgnore({DEVICE_ID: inserted.insertId}, session.user);
      ramCaches_TIMEZONES_updateTimezoneId(checked.DUT_ID, 31);
    }
  }
}

async function addMachine(
  clientId: number,
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[],
  clientMachines: {MACHINE_ID: number, MACHINE_NAME: string, UNIT_ID: number}[],
  clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[],
  opts: AvailableOptions,
  session: SessionData,
  auxCondensersInserted: { unitName: string, machineName: string, assetCondensersIds: number []}[],
  authHeader: string
) {

  if (checked.MCHN_APPL === 'iluminacao') {
    ignored.push({ key: checked.key, reason: 'Aplicação da máquina inváliada para este Tipo de Solução!' });
    return;
  }

  if (checked.GROUP_NAME == null) {
    ignored.push({ key: checked.key, reason: 'Nome de máquina obrigatório para este Tipo de Solução!' });
    return;
  }

  let UNIT_ID: number = undefined;
  if (checked.UNIT_NAME !== undefined) {
    UNIT_ID = null;
    if (checked.UNIT_NAME) {
      const normUnitName = getNormalized(checked.UNIT_NAME);
      const UNIT_IDs = existingUnitItems.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
      if (UNIT_IDs.length !== 1) {
        ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
        return;
      }
      UNIT_ID = UNIT_IDs[0].UNIT_ID;
    }
  }

  // Adicionar a marca se não existir
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
        return;
      }
    }
    if (found.length === 1) {
      checked.MCHN_BRAND = found[0].value;
    } else {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar marca' });
      return;
    }
  }

  // Adicione tipo de grupo se não existir
  if (checked.GROUP_TYPE) {
    const asNorm = getNormalized(checked.GROUP_TYPE)
    let found = opts.types.filter(x1 => (x1.value === checked.GROUP_TYPE));
    if (found.length === 0) {
      found = found.concat(opts.types.filter(x1 => x1.norms.some(x2 => x2 === asNorm)));
    }
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
        return;
      }
    }
    if (found.length === 1) {
      checked.GROUP_TYPE = found[0].value;
    } else {
      ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de máquina' });
      return;
    }
  }

  let MACHINE_ID = undefined;
  //Validando se existe o ID da máquina
  let MACHINE_IDs = null;
  if (checked.GROUP_ID) {
    MACHINE_IDs = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: [Number(checked.GROUP_ID)], withoutIllumination: true });
    if (MACHINE_IDs.length === 0) {
      ignored.push({ key: checked.key, reason: 'Não foi possível encontrar a máquina correspondente a esse ID' });
    }
  }

  if (!UNIT_ID) {
    ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade da máquina' });
    return;
  }
  const normMachineName = getNormalized(checked.GROUP_NAME);
  let MACHINE_NAMEs = clientMachines.filter((row2) => (row2.UNIT_ID === UNIT_ID) && (getNormalized(row2.MACHINE_NAME) === normMachineName));

  if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
    MACHINE_IDs = [MACHINE_NAMEs[0]];
  }

  await checkAutomId(checked, session);

  await checkDevId(checked, session);

  await checkDutId(checked, session, clientId);

  let devAut = undefined;

  let installationFormatted = undefined;

  if (checked.DEV_AUTOM_ID){
    devAut = checked.DEV_AUTOM_ID;
  }

  if (checked.INSTALLATION_DATE){
    installationFormatted = `${checked.INSTALLATION_DATE.substring(6,10)}-${checked.INSTALLATION_DATE.substring(3,5)}-${checked.INSTALLATION_DATE.substring(0,2)}`
  }

  // Associar dispositivo à unidade caso seja fabricante ou caso não tenha associação
  await realocateManufacturerDevice(
        clientId,
        UNIT_ID,
        {
          DEV_AUT: devAut || null,
          DUT_ID: checked.DUT_ID || null,
        },
    session, true);

  // selecionar environment ID pelo nome ou adicionar na rota
  const machineIdToCheckEnvironmentId = MACHINE_IDs && MACHINE_IDs.length > 0 ? MACHINE_IDs[0].MACHINE_ID : null;
  let environmentId = !checked.ROOM_NAME ? null : await checkEnvironmentId(checked, opts, clientId, UNIT_ID, machineIdToCheckEnvironmentId);

  if (!environmentId && checked.DUT_ID) {
    const dutRefInfo = await sqldb.DUTS.getDevExtraInfo({DEV_ID: checked.DUT_ID});
    environmentId = dutRefInfo.ENVIRONMENT_ID;
  }

  if (environmentId && checked.ROOM_NAME) {
    await sqldb.ENVIRONMENTS.w_updateInfo({ID: environmentId, ENVIRONMENT_NAME: checked.ROOM_NAME, IS_VISIBLE: true}, session.user);
  }
  const nInfo_MACHINE_RATED_POWER = checked.MACHINE_RATED_POWER && checkNumber(checked.MACHINE_RATED_POWER);

  if (MACHINE_IDs != null && MACHINE_IDs?.length === 1) {
    MACHINE_ID = MACHINE_IDs[0].MACHINE_ID;
    ignored.push({ key: checked.key, reason: 'Máquina não alterada' });
    await httpRouter.privateRoutes['/clients/edit-group']({
      GROUP_ID: Number(MACHINE_ID),
      GROUP_NAME: checked.GROUP_NAME,
      REL_DEV_AUT: devAut,
      REL_DUT_ID: devAut && devAut.startsWith('DUT') ? devAut : (checked.DUT_ID || undefined),
      INSTALLATION_DATE: installationFormatted,
      GROUP_TYPE: checked.GROUP_TYPE,
      BRAND: checked.MCHN_BRAND,
      FLUID_TYPE: checked.FLUID_TYPE,
      MCHN_APPL: checked.MCHN_APPL,
      RATED_POWER: nInfo_MACHINE_RATED_POWER && Number(nInfo_MACHINE_RATED_POWER.numI),
      ENVIRONMENT_ID: environmentId || undefined,
      ENVIRONMENT_NAME: checked.ROOM_NAME || undefined,
      UNIT_ID: UNIT_ID,
    }, session);
    ignored.pop();
  }
  else if (MACHINE_IDs == null && MACHINE_NAMEs.length === 0) {
    ignored.push({ key: checked.key, reason: 'Máquina não adicionada' });
    const inserted = await httpRouter.privateRoutes['/dac/add-new-group']({
      CLIENT_ID: clientId,
      UNIT_ID: UNIT_ID,
      GROUP_NAME: checked.GROUP_NAME,
      INSTALLATION_DATE: installationFormatted,
      MCHN_APPL: checked.MCHN_APPL,
      GROUP_TYPE: checked.GROUP_TYPE,
      BRAND: checked.MCHN_BRAND,
      FLUID_TYPE: checked.FLUID_TYPE,
      REL_DUT_ID: devAut && devAut.startsWith('DUT') ? devAut : (checked.DUT_ID || undefined),
      DEV_AUT: devAut,
      RATED_POWER: nInfo_MACHINE_RATED_POWER && Number(nInfo_MACHINE_RATED_POWER.numI),
      ENVIRONMENT_ID: environmentId || undefined,
      ENVIRONMENT_NAME: checked.ROOM_NAME || undefined,
    }, session);
    MACHINE_ID = inserted.GROUP_ID;
    ignored.pop();
    clientMachines.push({MACHINE_ID: inserted.GROUP_ID, MACHINE_NAME: inserted.GROUP_NAME, UNIT_ID: inserted.UNIT_ID} );

    if (MACHINE_ID == null || MACHINE_ID == undefined) {
      ignored.push({ key: checked.key, reason: 'Não foi possível adicionar a máquina' });
      return;
    }
  }
  else if (MACHINE_NAMEs.length > 0 && MACHINE_IDs == null) {
    ignored.push({ key: checked.key, reason: 'Já existe uma máquina com esse nome na unidade' });
  }
  else {
    ignored.push({ key: checked.key, reason: 'Não foi possível identificar a máquina' });
    return;
  }

  if (checked.ADDITIONAL_PARAMETERS) {
    await addMachineAdditionalParameters( MACHINE_ID, checked.ADDITIONAL_PARAMETERS, session);
  }
  await deleteDevgroupsPhotos(checked, MACHINE_ID, authHeader);

  // Upload group column
  await uploadFiles([checked.PHOTO_DEVGROUPS_1, checked.PHOTO_DEVGROUPS_2, checked.PHOTO_DEVGROUPS_3, checked.PHOTO_DEVGROUPS_4, checked.PHOTO_DEVGROUPS_5], MACHINE_ID, photoType.devgroups, authHeader);

  // Upload dat column
  const nInfo_MCHN_KW = checked.MCHN_KW && checkNumber(checked.MCHN_KW);
  const nInfo_CAPACITY_PWR = checked.CAPACITY_PWR && checkNumber(checked.CAPACITY_PWR);
  const allRoles = await sqldb.VTMACHINETYPES.getAllMachineTypes();

  const roleAux = allRoles.find(role => role.NAME === checked.AST_ROLE_NAME);

  let SENSOR_AUTOM = null;
  let RTYPE_IDs = null;
  let datId = null;

  const isDutDuoFancoil = await addAssetFancoilDutDuo(checked, clientId, UNIT_ID, MACHINE_ID, session);

  if (isDutDuoFancoil === 'DONE') {}
  else if (checked.AST_DESC) {    
    ignored.push({ key: checked.key, reason: 'Erro no cadastro de ativo!' });
    datId = checked.DAT_ID;
    const paramsAsset = {ASSET_NAME: checked.AST_DESC, MACHINE_ID: MACHINE_ID};
    const currentAssetInfo = await sqldb.ASSETS.getAssetInfoList({...paramsAsset, withDev: true});
    let indexAsset = 0;
    let assetId = null;
    if (currentAssetInfo.length > 1 && checked.DAT_ID) {
      indexAsset = currentAssetInfo.findIndex(i => i.DAT_ID === checked.DAT_ID);
      assetId = currentAssetInfo[indexAsset].ASSET_ID;
    } else if (currentAssetInfo.length === 1) {
      assetId = currentAssetInfo[indexAsset].ASSET_ID;
    }

    if (checked.DEV_ID?.startsWith('DUT') || checked.DEV_AUTOM_ID?.startsWith('DUT')) {
      const isDevAsset = checked.DEV_ID?.startsWith('DUT');
      const dutId = isDevAsset ? checked.DEV_ID : checked.DEV_AUTOM_ID;      
      ignored.push({ key: checked.key, reason: 'Erro no cadastro de DUT vinculado ao Ativo!' });
      if (dutId?.length !== 12) {
        ignored.push({ key: checked.key, reason: `DUT ID ${isDevAsset ? 'do Dispositivo Diel associado ao ativo' : ''} inválido` });
        return;
      }

      if (checked.PLACEMENT) {
        const placementType = (isDevAsset ? ['INS', 'DUO'] : ['INS', 'DUO', 'AMB']).includes(checked.PLACEMENT);
        if (!placementType) {
          ignored.push({ key: checked.key, reason: `Posicionamento do DUT ${isDevAsset ? 'Dispositivo Diel associado ao ativo' : ''} inválido` });
          return;
        }
      }
      
      if (checked.RTYPE_NAME) {
        const normRTypeName = getNormalized(checked.RTYPE_NAME);
        RTYPE_IDs = clientRoomTypes.filter((row) => (getNormalized(row.RTYPE_NAME) === normRTypeName));
        if (RTYPE_IDs.length !== 1) {
          ignored.push({ key: checked.key, reason: 'Não foi possível identificar o tipo de ambiente' });
          return;
        }
      }

      if (checked.SENSORS_DUT_DUO && checked.PLACEMENT && checked.PLACEMENT.toUpperCase() === 'DUO') {
        const sensor1 = getNormalized(checked.SENSORS_DUT_DUO.split(',')[0]);
        const sensor2 = getNormalized(checked.SENSORS_DUT_DUO.split(',')[1]);
    
        if (!((sensor1 === getNormalized('Insuflação') && sensor2 === getNormalized('Retorno')) || 
        (sensor2 === getNormalized('Insuflação') && sensor1 === getNormalized('Retorno')))) {
          ignored.push({ key: checked.key, reason: 'Sensores de DUT DUO inválidos' });
          return;
        }
        else {
          SENSOR_AUTOM = sensor1 === getNormalized('Insuflação') ? 1 : 0;
        }
      }
      else if (checked.SENSORS_DUT_DUO && (!checked.PLACEMENT || checked.PLACEMENT.toUpperCase() !== 'DUO')) {
        ignored.push({ key: checked.key, reason: 'Sensores de DUT DUO apenas quando Posicionamento for DUO' });
        return;
      }
      // selecionar environment ID pelo nome ou adicionar
      let environmentId = await checkEnvironmentId(checked, opts, clientId, UNIT_ID, null, dutId);

      if (!environmentId) {
        const insertedEnvironment = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: UNIT_ID, ENVIRONMENT_NAME: checked.ROOM_NAME, IS_VISIBLE: true, ENVIRONMENT_TYPE: ''}, session.user);
        environmentId = insertedEnvironment.insertId;
      }

      if (RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID) {
        const environment = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: environmentId});
        if (environment.RTYPE_ID) {
          await sqldb.ENVIRONMENTS_ROOM_TYPES.w_updateInfo({ID: environment.ENVIRONMENT_ROOM_TYPE_ID, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
        }
        else {
          await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ENVIRONMENT_ID: environmentId, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
        }
      }

      const dutInfo = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo({DEVICE_CODE: dutId});
      const useIr = dutInfo.length ? dutInfo[0].DISAB : null;
      await httpRouter.privateRoutes['/dut/set-dut-info']({
        DEV_ID: dutId,
        CLIENT_ID: clientId,
        UNIT_ID: UNIT_ID,
        PLACEMENT: checked.PLACEMENT as 'INS'|'DUO'|'AMB' || undefined,
        ROOM_NAME: checked.ROOM_NAME || undefined,
        RTYPE_ID: RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID,
        MCHN_BRAND: checked.MCHN_BRAND || undefined,
        MCHN_MODEL: checked.MCHN_MODEL || undefined,
        groups: MACHINE_ID && [MACHINE_ID.toString()],
        ENVIRONMENT_ID: environmentId,
        USE_IR: useIr as 0|1|null,
      }, session);
      ignored.pop();

      const deviceinfo = await sqldb.DEVICES.getBasicInfo({devId: dutId});
      await deleteDutsPhotos(checked, deviceinfo.DEVICE_ID, authHeader);
      await uploadFiles([checked.PHOTO_DUT_1, checked.PHOTO_DUT_2, checked.PHOTO_DUT_3, checked.PHOTO_DUT_4, checked.PHOTO_DUT_5], deviceinfo.DEVICE_ID, photoType.dut, authHeader);
    }

    const nInfo_COMPRESSOR_RLA = checked.COMPRESSOR_RLA && checkNumber(checked.COMPRESSOR_RLA);
    const nInfo_INSUFFLATION_SPEED = checked.INSUFFLATION_SPEED && checkNumber(checked.INSUFFLATION_SPEED);
    if (currentAssetInfo.length === 0 || (currentAssetInfo[indexAsset].DAT_ID && currentAssetInfo[indexAsset].DAT_ID !== checked.DAT_ID)) {
      const addedItem = await httpRouter.privateRoutes['/clients/add-new-asset']({
        DAT_ID: datId,
        AST_DESC: checked.AST_DESC,
        INSTALLATION_LOCATION: checked.INSTALLATION_LOCATION,
        CAPACITY_PWR: nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
        CAPACITY_UNIT: (checked.CAPACITY_PWR && Number(checked.CAPACITY_PWR)) > 1000 ? 'BTU/hr' : 'TR',
        CLIENT_ID: clientId,
        GROUP_ID: MACHINE_ID,
        MCHN_KW: nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
        MCHN_MODEL: checked.MCHN_MODEL,
        UNIT_ID: UNIT_ID,
        AST_ROLE: roleAux.ID,
        DEV_ID: checked.DEV_ID?.startsWith('DUT') ? checked.DEV_ID.split(' ')[0] : checked.DEV_ID,
        EQUIPMENT_POWER: checked.EQUIPMENT_POWER,
        COMPRESSOR_NOMINAL_CURRENT: nInfo_COMPRESSOR_RLA && Number(nInfo_COMPRESSOR_RLA.numI),
        EVAPORATOR_MODEL_ID:  checked.EVAPORATOR_MODEL && Number(checked.EVAPORATOR_MODEL),
        MCHN_APPL: checked.MCHN_APPL,
        TYPE_CFG: checked.GROUP_TYPE,
        INSUFFLATION_SPEED: nInfo_INSUFFLATION_SPEED && Number(nInfo_INSUFFLATION_SPEED.numI),
        UPDATE_MACHINE_RATED_POWER: !nInfo_MACHINE_RATED_POWER,
      }, session);
      assetId = addedItem.info.ASSET_ID;
      if (roleAux.ID === 2) {
        const sumRatedPowerIndex = auxCondensersInserted.findIndex((x) => x.unitName === checked.UNIT_NAME && x.machineName === checked.GROUP_NAME);
        auxCondensersInserted[sumRatedPowerIndex]?.assetCondensersIds.push(assetId);
      }
    }
    else {
      await httpRouter.privateRoutes['/clients/edit-asset']({
        ASSET_ID: currentAssetInfo[indexAsset].ASSET_ID,
        DAT_ID: datId,
        AST_DESC: checked.AST_DESC,
        DAT_INDEX: currentAssetInfo[indexAsset].DAT_INDEX,
        INSTALLATION_LOCATION: checked.INSTALLATION_LOCATION,
        CAPACITY_PWR: nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
        CAPACITY_UNIT: (checked.CAPACITY_PWR && Number(checked.CAPACITY_PWR)) > 1000 ? 'BTU/hr' : 'TR',
        CLIENT_ID: clientId,
        GROUP_ID: MACHINE_ID,
        MCHN_KW: nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
        MCHN_MODEL: checked.MCHN_MODEL,
        UNIT_ID: UNIT_ID,
        AST_ROLE: roleAux.ID,
        DEV_ID: checked.DEV_ID?.startsWith('DUT') ? checked.DEV_ID.split(' ')[0] : checked.DEV_ID,
        OLD_DEV_ID: currentAssetInfo[indexAsset].DEV_ID,
        EQUIPMENT_POWER: checked.EQUIPMENT_POWER,
        COMPRESSOR_NOMINAL_CURRENT: nInfo_COMPRESSOR_RLA && Number(nInfo_COMPRESSOR_RLA.numI),
        EVAPORATOR_MODEL_ID:  checked.EVAPORATOR_MODEL && Number(checked.EVAPORATOR_MODEL),
        INSUFFLATION_SPEED: nInfo_INSUFFLATION_SPEED && Number(nInfo_INSUFFLATION_SPEED.numI),
        UPDATE_MACHINE_RATED_POWER: !nInfo_MACHINE_RATED_POWER,
      }, session);
    }
    ignored.pop();
    

    await deleteAssetsPhotos(checked, authHeader);
    await uploadFiles([checked.PHOTO_ASSET_1, checked.PHOTO_ASSET_2, checked.PHOTO_ASSET_3, checked.PHOTO_ASSET_4, checked.PHOTO_ASSET_5], assetId, photoType.assets, authHeader);

    const nInfo_DAC_COP = checked.DAC_COP && checkNumber(checked.DAC_COP);
    if (checked.DEV_ID?.startsWith('DAC')){
      ignored.push({ key: checked.key, reason: 'Erro no cadastro de DAC vinculado ao Ativo!' });

      await httpRouter.privateRoutes['/dac/set-dac-info']({
        DAC_ID: checked.DEV_ID,
        GROUP_ID: MACHINE_ID,
        CLIENT_ID: clientId,
        UNIT_ID: UNIT_ID,
        USE_RELAY: checked.DEV_AUTOM_ID?.startsWith('DAC') ? 1 : 0,
        CAPACITY_PWR:  nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
        CAPACITY_UNIT: (checked.CAPACITY_PWR && Number(checked.CAPACITY_PWR)) > 1000 ? 'BTU/hr' : 'TR',
        DAC_COP: nInfo_DAC_COP && Number(nInfo_DAC_COP.numI),
        DAC_KW:  nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
        FLUID_TYPE: checked.FLUID_TYPE,
        P0_POSITN: checked.P0_POSITN,
        P1_POSITN: checked.P1_POSITN,
        P0_SENSOR: checked.P0_SENSOR,
        P1_SENSOR: checked.P1_SENSOR,
        DAC_BRAND: checked.MCHN_BRAND,
        DAC_MODEL: checked.MCHN_MODEL,
        DAC_COMIS: checked.DAC_COMIS === 'N' ? '0' : '1',
        DAC_NAME: checked.AST_DESC,
        EQUIPMENT_POWER: checked.EQUIPMENT_POWER,
        COMPRESSOR_NOMINAL_CURRENT: nInfo_COMPRESSOR_RLA && Number(nInfo_COMPRESSOR_RLA.numI),
        EVAPORATOR_MODEL_ID:  checked.EVAPORATOR_MODEL && Number(checked.EVAPORATOR_MODEL),
        INSUFFLATION_SPEED: nInfo_INSUFFLATION_SPEED && Number(nInfo_INSUFFLATION_SPEED.numI),
        SELECTED_L1_SIM: "virtual",
      }, session);

      ignored.pop();
      
      const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: checked.DEV_ID });
      await deleteDacsPhotos(checked, dacInfo.DEVICE_ID, authHeader);
      await uploadFiles([checked.PHOTO_DAC_1, checked.PHOTO_DAC_2, checked.PHOTO_DAC_3, checked.PHOTO_DAC_4, checked.PHOTO_DAC_5], dacInfo.DEVICE_ID, photoType.dac, authHeader);
    }

    if (checked.DEV_AUTOM_ID) {      
      ignored.push({ key: checked.key, reason: 'Erro na associação do dispositivo de Automação!' });
      await controlAutomMachine({groupId: MACHINE_ID, automation: {DEV_AUT: checked.DEV_AUTOM_ID}}, session.user);
      let photoTypeDevAut: ReferenceType;
      if (checked.DEV_AUTOM_ID.startsWith('DAM')) {
        await httpRouter.privateRoutes['/dam/set-dam-info']({
          CLIENT_ID: clientId,
          DAM_ID: checked.DEV_AUTOM_ID,
          UNIT_ID: UNIT_ID,
          INSTALLATION_LOCATION: checked.DAM_INSTALLATION_LOCATION,
          groups: [MACHINE_ID.toString()],
          PLACEMENT: checked.DAM_PLACEMENT as 'RETURN'|'DUO',
          T0_POSITION: checked.DAM_T0_POSITION as 'RETURN'|'INSUFFLATION',
          T1_POSITION: checked.DAM_T1_POSITION as 'RETURN'|'INSUFFLATION',
        }, session);

        await deleteDamsPhotos(checked, authHeader);
        photoTypeDevAut = photoType.dam;
      }
      else if (checked.DEV_AUTOM_ID.startsWith('DUT')) {
        // selecionar environment ID pelo nome ou adicionar
        let environmentId = await checkEnvironmentId(checked, opts, clientId, UNIT_ID);

        if (!environmentId) {
          const insertedEnvironment = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: UNIT_ID, ENVIRONMENT_NAME: checked.ROOM_NAME, IS_VISIBLE: true, ENVIRONMENT_TYPE: ''}, session.user);
          environmentId = insertedEnvironment.insertId;
        }

        if (RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID) {
          const environment = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: environmentId});
          if (environment.RTYPE_ID) {
            await sqldb.ENVIRONMENTS_ROOM_TYPES.w_updateInfo({ID: environment.ENVIRONMENT_ROOM_TYPE_ID, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
          }
          else {
            await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ENVIRONMENT_ID: environmentId, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
          }
        }

        await httpRouter.privateRoutes['/dut/set-dut-info']({
          DEV_ID: checked.DEV_AUTOM_ID,
          CLIENT_ID: clientId,
          UNIT_ID: UNIT_ID,
          PLACEMENT: checked.PLACEMENT as 'INS'|'DUO'|'AMB' || undefined,
          ROOM_NAME: checked.ROOM_NAME || undefined,
          RTYPE_ID: RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID || undefined,
          MCHN_BRAND: checked.MCHN_BRAND || undefined,
          MCHN_MODEL: checked.MCHN_MODEL || undefined,
          groups: MACHINE_ID && [MACHINE_ID.toString()],
          ENVIRONMENT_ID: environmentId,
        }, session);

        const deviceInfo = await sqldb.DEVICES.getBasicInfo({devId: checked.DEV_AUTOM_ID});
        await deleteDutsPhotos(checked, deviceInfo.DEVICE_ID, authHeader);
        photoTypeDevAut = photoType.dut;
      }
      else if (checked.DEV_AUTOM_ID.startsWith('DAC')) {
        await httpRouter.privateRoutes['/dac/set-dac-info']({
          DAC_ID: checked.DEV_AUTOM_ID,
          GROUP_ID: MACHINE_ID,
          CLIENT_ID: clientId,
          UNIT_ID: UNIT_ID,
          USE_RELAY: checked.DEV_AUTOM_ID?.startsWith('DAC') ? 1 : 0,
          CAPACITY_PWR:  nInfo_CAPACITY_PWR && Number(nInfo_CAPACITY_PWR.numI),
          CAPACITY_UNIT: (checked.CAPACITY_PWR && Number(checked.CAPACITY_PWR)) > 1000 ? 'BTU/hr' : 'TR',
          DAC_COP: nInfo_DAC_COP && Number(nInfo_DAC_COP.numI),
          DAC_KW:  nInfo_MCHN_KW && Number(nInfo_MCHN_KW.numI),
          FLUID_TYPE: checked.FLUID_TYPE,
          DAC_APPL: checked.MCHN_APPL,
          P0_POSITN: checked.P0_POSITN,
          P1_POSITN: checked.P1_POSITN,
          P0_SENSOR: checked.P0_SENSOR,
          P1_SENSOR: checked.P1_SENSOR,
          SELECTED_L1_SIM: "virtual",
          DAC_COMIS: '1',
        }, session);

        const dacInfo = await sqldb.DACS_DEVICES.getDacDeviceIdByDeviceCode({ DEVICE_CODE: checked.DEV_AUTOM_ID });
        await deleteDacsPhotos(checked, dacInfo.DEVICE_ID, authHeader);
        photoTypeDevAut = photoType.dac;
      }
      else if (checked.DEV_AUTOM_ID.startsWith('DRI')) {

        await httpRouter.privateRoutes['/dri/set-dri-info']({
          DRI_ID: checked.DEV_AUTOM_ID,
          UNIT_ID: UNIT_ID,
          CLIENT_ID: clientId,
        }, session);
        
        await controlAutomMachine({groupId: MACHINE_ID, automation: {DEV_AUT: checked.DEV_AUTOM_ID}}, session.user);
        const driInfo = await sqldb.DRIS.getBasicInfo({driId: checked.DEV_AUTOM_ID});
        await deleteDriPhotos(checked, driInfo.DEVICE_ID, authHeader);

        photoTypeDevAut = photoType.dri;
      }

      ignored.pop();
      const deviceInfo = await sqldb.DEVICES.getBasicInfo({devId: checked.DEV_AUTOM_ID});
      await uploadFiles([checked.PHOTO_AUTOM_DEV_1, checked.PHOTO_AUTOM_DEV_2, checked.PHOTO_AUTOM_DEV_3, checked.PHOTO_AUTOM_DEV_4, checked.PHOTO_AUTOM_DEV_5], deviceInfo.DEVICE_ID, photoTypeDevAut, authHeader);
    }
  }
}

async function addNobreakDmt(
  clientId: number,
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  session: SessionData,
  authHeader: string
) {
  let INSTALLATION_DATE;

  if(checked.INSTALLATION_DATE_UTIL) {
    const splitDate = checked.INSTALLATION_DATE_UTIL.split('/')
    INSTALLATION_DATE = `${splitDate[2]}-${splitDate[1]}-${splitDate[0]}`
  }

  const unitData = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: clientId });

  if (checked.UTILITY_NAME || checked.UTILITY_ID && unitData) {
    try {
      const dmtNobreakInfo = await httpRouter.privateRoutes['/dmt/set-dmt-nobreak']({ 
        NAME: checked.UTILITY_NAME,
        UNIT_ID: unitData.UNIT_ID,
        ID: Number(checked.UTILITY_ID),
        DMT_CODE: checked.ASSOCIATE_DEV, 
        DAT_CODE: checked.ASSOCIATE_ASSET,
        MANUFACTURER: checked.DISTRIBUTOR,
        MODEL: checked.MODEL,
        INPUT_VOLTAGE: Number(checked.ENTRY_VOLTAGE),
        OUTPUT_VOLTAGE: Number(checked.OUT_VOLTAGE),
        NOMINAL_POTENTIAL: Number(checked.POT_NOMINAL),
        NOMINAL_BATTERY_LIFE: Number(checked.AUTON_NOMINAL),
        INPUT_ELECTRIC_CURRENT: Number(checked.INPUT_ELECTRIC_CURRENT),
        OUTPUT_ELECTRIC_CURRENT: Number(checked.OUTPUT_ELECTRIC_CURRENT),
        NOMINAL_BATTERY_CAPACITY: Number(checked.NOMINAL_BATTERY_CAPACITY),
        INSTALLATION_DATE,
        PORT: Number(checked.ASSOCIATE_DEV_PORT),
      }, session);

      if(checked.PHOTO_DMT && checked.ASSOCIATE_DEV) {    
        const deviceInfo = await sqldb.DEVICES.getBasicInfo({devId: checked.ASSOCIATE_DEV});
        await deleteDmtPhotos(checked, deviceInfo.DEVICE_ID, authHeader)
        await uploadFiles([checked.PHOTO_DMT], deviceInfo.DEVICE_ID, 'DMTS', authHeader)
      }
      if(checked.PHOTO_UTILITY && checked.UTILITY_ID) {
        await deleteNobreakPhotos(checked, session)
        await uploadFiles([checked.PHOTO_UTILITY], Number(checked.UTILITY_ID), 'NOBREAKS', authHeader)
      }

      if (checked.ADDITIONAL_PARAMETERS) {
        await addNobreakAdditionalParameters(dmtNobreakInfo.nobreakId, checked.ADDITIONAL_PARAMETERS, session);
      }

    } catch (error) {
      logger.error(`msg: ${error} - user: ${session.user} - params: ${JSON.stringify(error)}`);
      ignored.push({ key:  checked.key, reason: String(error) });
    }
  }
}

async function addNewIllumination(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData) {
  const verifyExistingNameInUnit = await sqldb.ILLUMINATIONS.getIlluminationByNameAndUnit({ NAME: checked.UTILITY_NAME, UNIT_ID });
  if (verifyExistingNameInUnit.length > 0) {
    ignored.push({ key: checked.key, reason: 'Já existe um utilitário nessa unidade com o mesmo nome.'});
  } else {
    const illuminationId = await sqldb.ILLUMINATIONS.w_insert({
      UNIT_ID,
      NAME: checked.UTILITY_NAME,
      GRID_CURRENT: Number(checked.MAINS_CURRENT) || null,
      GRID_VOLTAGE: Number(checked.GRID_VOLTAGE) || null,
    }, session.user);
    const ilumination = await sqldb.ILLUMINATIONS.getIlluminationByNameAndUnit({ NAME: checked.UTILITY_NAME, UNIT_ID });
    return ilumination[0];
  }
  return null;
}

async function editExistingIllumination(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData) {
  const existingUtility = await sqldb.ILLUMINATIONS.getIlluminationInfoSample({ ID: Number(checked.UTILITY_ID)});
  if (existingUtility) {
    await sqldb.ILLUMINATIONS.w_updateInfo({
      ID: Number(checked.UTILITY_ID),
      UNIT_ID,
      NAME: checked.UTILITY_NAME || existingUtility.NAME,
      GRID_VOLTAGE: Number(checked.GRID_VOLTAGE) || existingUtility.GRID_VOLTAGE,
      GRID_CURRENT: Number(checked.MAINS_CURRENT) || existingUtility.GRID_CURRENT,
    }, session.user)
    return existingUtility;
  }
  ignored.push({ key: checked.key, reason: 'Utilitario não existe, erro ao editar.'})
  return null;
}

async function insertDmtDoesntExist(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number) {
  try {
    await sqldb.DEVICES.w_insertIgnore({
      DEVICE_CODE: checked.ASSOCIATE_DEV,
      DAT_BEGMON: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    }, session.user);
    ramCaches_TIMEZONES_updateTimezoneId(checked.ASSOCIATE_DEV, 31);
    const deviceInsert = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!deviceInsert) throw Error('Could not find device insert!').HttpStatus(400);
    else {
      await insertClientAndUnitsDevices(checked, ignored, UNIT_ID, session, deviceInsert.ID);
      await sqldb.DMTS.w_insertIgnore({
        DEVICE_ID: deviceInsert.ID
      }, session.user);
      const deviceDMT = await sqldb.DMTS.getIdByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      if (deviceDMT) {
        await sqldb.DMTS_ILLUMINATIONS.w_insert({
          DMT_ID: deviceDMT.ID,
          ILLUMINATION_ID: illuminationId,
          PORT: Number(checked.ASSOCIATE_DEV_PORT)
        }, session.user)
      }
    }
  } catch (err) {
    logger.error('ERRO AO ADICIONAR DISPOSITIVOS DE ILUMINAÇÃO NAS TABELAS', session.user, checked.ASSOCIATE_DEV);
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar no banco de dados.' });
  }
}

async function insertDMT(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number) {
  try {
    const device = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!device) {
      await insertDmtDoesntExist(checked, ignored, UNIT_ID, session, illuminationId);
    } else {
      const deviceDMT = await sqldb.DMTS.getIdByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      const dmtPorts = await checkAvailablePorts(checked.ASSOCIATE_DEV, 'Illumination');
      if (!dmtPorts.freePorts || dmtPorts.ports[Number(checked.ASSOCIATE_DEV_PORT)-1].associated) ignored.push({ key: checked.key, reason: 'Erro DMT com porta ocupada' });
      if (deviceDMT && !dmtPorts.ports[Number(checked.ASSOCIATE_DEV_PORT)-1].associated) {
        await sqldb.DMTS_ILLUMINATIONS.w_insert({
          DMT_ID: deviceDMT.ID,
          ILLUMINATION_ID: illuminationId,
          PORT: Number(checked.ASSOCIATE_DEV_PORT)
        }, session.user)
      }
    }
  } catch (err) {
    logger.error('ERROR INSERT DEVICE BY UNIFIED');
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar DMT' });
  }
}

async function insertClientAndUnitsDevices(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, deviceId: number) {
  try {
    await sqldb.DEVICES_UNITS.w_insertIgnore({
      DEVICE_ID: deviceId,
      UNIT_ID,
    }, session.user);
    const clientId = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID });
    await sqldb.DEVICES_CLIENTS.w_insertIgnore({
      DEVICE_ID: deviceId,
      CLIENT_ID: clientId.CLIENT_ID,
    }, session.user);
    await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devId: deviceId });
  } catch (err) {
    logger.error('ERRO AO ADICIONAR NAS TABELAS DE DEVICES CLIENTS E UNITS VIA PLANILHA UNIFICADA', session.user, checked.ASSOCIATE_DEV);
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar no banco de dados.' });
  }
}

async function insertIfDeviceDalDoesntExist(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number) {
  try {
    await sqldb.DEVICES.w_insertIgnore({
      DEVICE_CODE: checked.ASSOCIATE_DEV,
      DAT_BEGMON: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    }, session.user);
    ramCaches_TIMEZONES_updateTimezoneId(checked.ASSOCIATE_DEV, 31);
    const deviceInsert = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!deviceInsert) throw Error('Could not find device insert!').HttpStatus(400);
    else {
      await insertClientAndUnitsDevices(checked, ignored, UNIT_ID, session, deviceInsert.ID);
      await sqldb.DALS.w_insertIgnore({
        DEVICE_ID: deviceInsert.ID
      }, session.user);
      const deviceDAL = await sqldb.DALS.getIdByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      if (deviceDAL) {
        const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumination({DAL_ID: deviceDAL.ID, ILLUMINATION_ID: illuminationId});
        if (!dalIllumination) {
          await sqldb.DALS_ILLUMINATIONS.w_insert({
            DAL_ID: deviceDAL.ID,
            ILLUMINATION_ID: illuminationId,
            PORT: Number(checked.ASSOCIATE_DEV_PORT),
            FEEDBACK: Number(checked.FEEDBACK_DAL),
          }, session.user);
        }
        else {
          await sqldb.DALS_ILLUMINATIONS.w_update({
            DAL_ID: deviceDAL.ID,
            ILLUMINATION_ID: illuminationId,
            PORT: Number(checked.ASSOCIATE_DEV_PORT),
            FEEDBACK: Number(checked.FEEDBACK_DAL),
          }, session.user);
        }
      }
    }
  } catch (err) {
    logger.error('ERRO AO ADICIONAR DISPOSITIVOS DE ILUMINAÇÃO NAS TABELAS', session.user, checked.ASSOCIATE_DEV);
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar no banco de dados.' });
  }
}

async function insertDamIlluminationDoesntExist(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number) {
  try {
    await sqldb.DEVICES.w_insertIgnore({
      DEVICE_CODE: checked.ASSOCIATE_DEV,
      DAT_BEGMON: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    }, session.user);
    ramCaches_TIMEZONES_updateTimezoneId(checked.ASSOCIATE_DEV, 31);
    const deviceInsert = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!deviceInsert) throw Error('Could not find device insert!').HttpStatus(400);
    else {
      await insertClientAndUnitsDevices(checked, ignored, UNIT_ID, session, deviceInsert.ID);
      await sqldb.DAMS_DEVICES.w_insertIgnore({
        DEVICE_ID: deviceInsert.ID
      }, session.user);
      const deviceDAM = await sqldb.DAMS_DEVICES.getDamByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      if (deviceDAM) {
        await sqldb.DAMS_ILLUMINATIONS.w_insert({
          DAM_DEVICE_ID: deviceDAM.ID,
          ILLUMINATION_ID: illuminationId,
        }, session.user);
      }
    }
  } catch (err) {
    logger.error('ERRO AO ADICIONAR DISPOSITIVOS DE ILUMINAÇÃO NAS TABELAS', session.user, checked.ASSOCIATE_DEV);
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar no banco de dados.' });
  }
}

async function insertDAL(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number) {
  try {
    const device = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!device) {
      await insertIfDeviceDalDoesntExist(checked, ignored, UNIT_ID, session, illuminationId);
    } else {
      const deviceDAL = await sqldb.DALS.getIdByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      const deviceDalWithPort = await sqldb.DALS_ILLUMINATIONS.getDalWithUnitByIdAndPort({ DAL_ID: deviceDAL.ID, PORT: Number(checked.ASSOCIATE_DEV_PORT) });
      if (deviceDalWithPort.length > 0) ignored.push({ key: checked.key, reason: 'Erro DAL com porta ocupada' });
      if (deviceDAL && deviceDalWithPort.length === 0 && deviceDalWithPort[0].ILLUMINATION_ID !== illuminationId) {
        const dalIllumination = await sqldb.DALS_ILLUMINATIONS.getDalIllumination({DAL_ID: deviceDAL.ID, ILLUMINATION_ID: illuminationId});
        if (!dalIllumination) {
          await sqldb.DALS_ILLUMINATIONS.w_insert({
            DAL_ID: deviceDAL.ID,
            ILLUMINATION_ID: illuminationId,
            PORT: Number(checked.ASSOCIATE_DEV_PORT),
            FEEDBACK: Number(checked.FEEDBACK_DAL)
          }, session.user) 
        }
        else {
          await sqldb.DALS_ILLUMINATIONS.w_update({
            DAL_ID: deviceDAL.ID,
            ILLUMINATION_ID: illuminationId,
            PORT: Number(checked.ASSOCIATE_DEV_PORT),
            FEEDBACK: Number(checked.FEEDBACK_DAL)
          }, session.user) 
        }
      }
    }
  } catch (err) {
    logger.error('ERROR INSERT DEVICE BY UNIFIED');
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar DAL' });
  }
}

async function insertDAM(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number, clientId: number) {
  try {
    const device = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    if (!device) {
      await insertDamIlluminationDoesntExist(checked, ignored, UNIT_ID, session, illuminationId);
    } else {
      const deviceClient = await sqldb.DEVICES_CLIENTS.getClientByDevId({DEVICE_ID: device.ID})       
      if(deviceClient && deviceClient.CLIENT_ID !== clientId) ignored.push({ key: checked.key, reason: 'Erro DAM associado a outro cliente' });
      const deviceUnit = await sqldb.DEVICES_UNITS.getUnitByDevId({DEVICE_ID: device.ID})       
      if(deviceUnit && deviceUnit.UNIT_ID !== UNIT_ID) ignored.push({ key: checked.key, reason: 'Erro DAM associado a outra unidade' });
      const deviceDAM = await sqldb.DAMS_DEVICES.getDamByCode({
        DEVICE_CODE: checked.ASSOCIATE_DEV
      });
      const damIlluminationInfo = await sqldb.DAMS_ILLUMINATIONS.getDamIlluminationUsed({ DAM_DEVICE_ID: deviceDAM.ID });
      if (damIlluminationInfo.length > 0) ignored.push({ key: checked.key, reason: 'Erro DAM associado a outro utilitário' });
      if (deviceDAM && damIlluminationInfo.length === 0 && ignored.length === 0) {
        if(!deviceClient) await sqldb.DEVICES_CLIENTS.w_insert({DEVICE_ID: device.ID, CLIENT_ID: clientId}, session.user)
        if(!deviceUnit) {
          await sqldb.DEVICES_UNITS.w_insert({DEVICE_ID: device.ID, UNIT_ID: UNIT_ID}, session.user);
          await sendCommandToDeviceWithConfigTimezone({ userId: session.user, devId: device.ID });
        }
        await sqldb.DAMS_ILLUMINATIONS.w_insert({
          DAM_DEVICE_ID: deviceDAM.ID,
          ILLUMINATION_ID: illuminationId,
        }, session.user) 
      }
      else{
        await sqldb.ILLUMINATIONS.w_delete({ID: illuminationId}, session.user)
      }
    }
  } catch (err) {
    logger.error('ERROR INSERT DEVICE BY UNIFIED');
    ignored.push({ key: checked.key, reason: 'Erro ao adicionar DAM' });
  }
}

export async function checkIlluminationData(illuminationId: number, unitId: number, session: string) {
  const illuminationInfo = await sqldb.ELECTRIC_CIRCUITS_ILLUMINATIONS.getInfoByIlluminationId({ILLUMINATION_ID: illuminationId})
  if(!illuminationInfo){
    const electricCircuit = await sqldb.ELECTRIC_CIRCUITS.w_insert({
      UNIT_ID: unitId, 
    }, session);     
    await sqldb.ELECTRIC_CIRCUITS_ILLUMINATIONS.w_insert({
      ELECTRIC_CIRCUIT_ID: electricCircuit.insertId, 
      ILLUMINATION_ID: illuminationId, 
    }, session);       
  }  
}

async function checkAssociateDevIllumination(checked: TableRow, ignored: { key: string, reason: string }[], UNIT_ID: number, session: SessionData, illuminationId: number, clientId: number){
  if (checked.ASSOCIATE_DEV.startsWith('DMT')){
    await insertDMT(checked, ignored, UNIT_ID, session, illuminationId);
  }
  if (checked.ASSOCIATE_DEV.startsWith('DAL')) {
    await insertDAL(checked, ignored, UNIT_ID, session, illuminationId);
  }
  if (checked.ASSOCIATE_DEV.startsWith('DAM')) {
    await insertDAM(checked, ignored, UNIT_ID, session, illuminationId, clientId);
  }
}

async function associateDevImages(checked: TableRow, session: SessionData, authHeader: string) {
  if (checked.ASSOCIATE_DEV.startsWith('DAL')) {
    const dalInfo = await sqldb.DALS.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    await deleteDalPhotos(checked, dalInfo.DEVICE_ID, authHeader);
    await uploadFiles([checked.PHOTO_DAL], dalInfo.DEVICE_ID, photoType.dal, authHeader);
  }
  if (checked.ASSOCIATE_DEV.startsWith('DMT')) {
    const dmtInfo = await sqldb.DMTS.getIdByCode({ DEVICE_CODE: checked.ASSOCIATE_DEV });
    await deleteDmtPhotos(checked, dmtInfo.DEVICE_ID, authHeader);
    await uploadFiles([checked.PHOTO_DMT], dmtInfo.DEVICE_ID, photoType.dmt, authHeader);
  }
}


async function addIlumination(
  clientId: number,
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  session: SessionData,
  authHeader: string
) {

  if (checked.UNIT_NAME == null) {
    ignored.push({ key: checked.key, reason: 'Nome da unidade obrigatório para este Tipo de Solução!' });
    return;
  }
  const { UNIT_ID } = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: clientId });
  if (!UNIT_ID) {
    ignored.push({ key: checked.key, reason: 'Unidade não encontrada.' });
    return;
  }

  if(!checked.UTILITY_ID && !checked.UTILITY_NAME) {
    ignored.push({ key: checked.key, reason: 'É necessário informar o ID do utilitário para edicão ou o nome do utilitário para criação.' });
    return;
  }

  let illumination: {
    ID: number;
    NAME: string;
    GRID_VOLTAGE: number;
    GRID_CURRENT: number;
    UNIT_ID: number;
  } | {
    ID: number;
    NAME: string;
    GRID_VOLTAGE: number;
    GRID_CURRENT: number;
  }

  if (checked.UTILITY_NAME && !checked.UTILITY_ID) {
    illumination = await addNewIllumination(checked, ignored, UNIT_ID, session);
  } 
  
  if (checked.UTILITY_ID || (checked.UTILITY_ID && checked.UTILITY_NAME)) {
    illumination = await editExistingIllumination(checked, ignored, UNIT_ID, session);
  }

  if (checked.ASSOCIATE_DEV && illumination !== null) {
    await checkAssociateDevIllumination(checked, ignored, UNIT_ID, session, illumination.ID, clientId);
  }

  if (checked.ASSOCIATE_DEV) {
    await associateDevImages(checked, session, authHeader);
  }

  await deleteIlluminationsPhotos(checked, illumination.ID, authHeader);
  await uploadFiles([checked.PHOTO_UTILITY], illumination.ID, photoType.illumination, authHeader);

}

async function EnergyMeterAddFunction(checked: TableRow, clientId: number, UNIT_ID: number, session: SessionData) {
  const existIdEnergy = await sqldb.ENERGY_DEVICES_INFO.getList({ ids:[ checked.ID_MED_ENERGY], unitIds:[UNIT_ID] },{addUnownedDevs:false}); // verificar se ja existe
  if (existIdEnergy.length > 0 && checked.MODEL_MED_ENERGY?.length > 1) {
    if (checked.MODEL_MED_ENERGY && checked.NUM_SERIE_MED_ENERGY) {
      await sqldb.ENERGY_DEVICES_INFO.w_update({ ENERGY_DEVICE_CODE: checked.ID_MED_ENERGY, MODEL: checked.MODEL_MED_ENERGY, SERIAL: checked.NUM_SERIE_MED_ENERGY }, session.user);
      return checked.MODEL_MED_ENERGY;
    } else if (checked.MODEL_MED_ENERGY && !checked.NUM_SERIE_MED_ENERGY) {
      await sqldb.ENERGY_DEVICES_INFO.w_update({ ENERGY_DEVICE_CODE: checked.ID_MED_ENERGY, MODEL: checked.MODEL_MED_ENERGY }, session.user);
      return checked.MODEL_MED_ENERGY;
    } else if (!checked.MODEL_MED_ENERGY && checked.NUM_SERIE_MED_ENERGY) {
      await sqldb.ENERGY_DEVICES_INFO.w_update({ ENERGY_DEVICE_CODE: checked.ID_MED_ENERGY, SERIAL: checked.NUM_SERIE_MED_ENERGY }, session.user);
    }
    // return existIdEnergy.MODEL;
    return null;
  } else {
    await httpRouter.privateRoutes['/energy/set-energy-info']({
    ELECTRIC_CIRCUIT_ID: checked.ELECTRIC_CIRCUIT_ID ? Number(checked.ELECTRIC_CIRCUIT_ID) : undefined,
    ENERGY_DEVICES_INFO_ID: checked.ENERGY_DEVICES_INFO_ID ? Number(checked.ENERGY_DEVICES_INFO_ID) : undefined,
    ESTABLISHMENT_NAME: checked.ELECTRIC_CIRCUIT_NAME,
    SERIAL: checked.NUM_SERIE_MED_ENERGY,
    MANUFACTURER: 'Diel Energia',
    MODEL: checked.MODEL_MED_ENERGY,
    DRI_ID: checked.ID_MED_ENERGY,
    CLIENT_ID: clientId,
    UNIT_ID,
    }, session);
  }
  return undefined;
}

function checkUnitId(checked: TableRow,  ignored: { key: string, reason: string }[], existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[]) {
  let UNIT_ID: number = undefined;
  if (checked.UNIT_NAME !== undefined) {
    UNIT_ID = null;
    if (checked.UNIT_NAME) {
      const normUnitName = getNormalized(checked.UNIT_NAME);
      const UNIT_IDs = existingUnitItems.filter((row) => (getNormalized(row.UNIT_NAME) === normUnitName));
      if (UNIT_IDs.length !== 1) {
        ignored.push({ key: checked.key, reason: 'Não foi possível identificar a unidade' });
      }
      UNIT_ID = UNIT_IDs[0].UNIT_ID;
    }
  }
  return UNIT_ID;
}

function checkInstalationTypes(
  checked: TableRow,
  installationTypeOpts: { [name: string]: { name: string, value: string }[] },
  variavelNormalized: string,
  ) {
  let typeInstallation = null;
  if (checked.INSTALLATION_ELETRICAL_TYPE) {
    let opts = installationTypeOpts[getNormalized(variavelNormalized)]
    if (opts) {
      typeInstallation = opts.find((row) => getNormalized(row.name) === getNormalized(checked.INSTALLATION_ELETRICAL_TYPE)).value;
    }
  }
  return typeInstallation;
}

function parseValveTypeValue(valveType: string) {
  if (valveType === 'Válvula Fixa On-Off') {
    return 'ON-OFF'
  }
  return 'PROPORTIONAL';
}

export async function addEnergy(
  clientId: number,
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  existingUnitItems: { UNIT_ID: number, UNIT_NAME: string }[],
  session: SessionData,
  authHeader: string) {

  const UNIT_ID = checkUnitId(checked, ignored, existingUnitItems);
  if (!UNIT_ID) return;

  const applicationTypes = {
    'et330': { application: 'CG-ET330', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'nexus-ii': { application: 'ABB-NEXUS-II', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'ete-30': { application: 'ABB-ETE-30', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '2-stop-bits', modbusBaudRate: '9600', parity: 'desabilitado' },
    'ete-50': { application: 'ABB-ETE-50', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '2-stop-bits', modbusBaudRate: '9600', parity: 'desabilitado' },
    'em210': { application: 'CG-EM210', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'mult-k': { application: 'KRON-MULT-K', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'mult-k-05': { application: 'KRON-MULT-K 05', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'mult-k-120': { application: 'KRON-MULT-K 120', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'ikron-03': { application: 'KRON-IKRON-03', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'bac-6000-amln': { application: 'VAV-BAC-6000-AMLN', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'bac-6000': { application: 'VAV-BAC-6000', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'bac-2000': { application: 'VAV-BAC-2000', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'carrier-ecosplit': { application: 'carrier-ecosplit', protocol: 'carrier-ecosplit', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'schneider-pm2100' : { application: 'schneider-eletric-pm2100', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'schneider-pm210' : { application: 'schneider-electric-pm210', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
    'schneider-pm9c': { application: 'schneider-electric-pm9c', protocol: 'modbus-rtu', serialMode: 'rs-485', stopBits: '1-stop-bit', modbusBaudRate: '9600', parity: 'desabilitado' },
  } as { [name: string]: { application: string, protocol: string, serialMode: string, stopBits: string, modbusBaudRate: string, parity: string } };

  const installationTypeOpts = {
    'et330': [
      { name: 'Rede Bifásica', value: '2' },
      { name: 'Rede Trifásica sem neutro', value: '1' },
      { name: 'Rede Trifásica com neutro', value: '0' },
    ],
    'em210': [
      { name: 'Rede Bifásica', value: '2' },
      { name: 'Rede Trifásica sem neutro', value: '1' },
      { name: 'Rede Trifásica com neutro', value: '0' },
    ],
  } as { [name: string]: { name: string, value: string }[] };



  let varsCfg: DriVarsConfig;
  let stopBits: string;
  varsCfg = {
    application: '',
    protocol: '',
    worksheetName: '',
    driConfigs: [],
    varsList: [],
    w_varsList: [],
    automationList: []
  };
  let typeInstallation = null;

  if (getNormalized(checked.MCHN_APPL) === getNormalized('Medidor de Energia')) {
    const model = await EnergyMeterAddFunction(checked, clientId, UNIT_ID, session);
    if (!model) {
      varsCfg.application = getNormalized(applicationTypes[getNormalized(checked.MODEL_MED_ENERGY)]?.application);
      varsCfg.protocol = getNormalized(applicationTypes[getNormalized(checked.MODEL_MED_ENERGY)]?.protocol);
      stopBits = getNormalized(applicationTypes[getNormalized(checked.MODEL_MED_ENERGY)]?.stopBits);

      typeInstallation = checkInstalationTypes(checked, installationTypeOpts, checked.MODEL_MED_ENERGY)
    } else {
      varsCfg.application = getNormalized(applicationTypes[getNormalized(model)]?.application);
      varsCfg.protocol = getNormalized(applicationTypes[getNormalized(model)]?.protocol);
      stopBits = getNormalized(applicationTypes[getNormalized(model)]?.stopBits);
      typeInstallation = checkInstalationTypes(checked, installationTypeOpts, model);
    }
  }

  if (getNormalized(checked.MCHN_APPL) === getNormalized('Carrier ECOSPLIT')) {
    await httpRouter.privateRoutes['/dri/set-dri-info']({
      DRI_ID: checked.ID_MED_ENERGY,
      UNIT_ID,
      CLIENT_ID: clientId,
    }, session);

    varsCfg.application = getNormalized(applicationTypes['carrier-ecosplit'].application);
    varsCfg.protocol = getNormalized(applicationTypes['carrier-ecosplit'].protocol);
    stopBits = getNormalized(applicationTypes['carrier-ecosplit'].stopBits);
  }

  if (getNormalized(checked.MCHN_APPL) === getNormalized('VAV')) {
    await httpRouter.privateRoutes['/dri/set-dri-info']({
      DRI_ID: checked.ID_MED_ENERGY,
      UNIT_ID,
      CLIENT_ID: clientId,
    }, session);

    await httpRouter.privateRoutes['/dri/update-dri-vav']({
      VAV_ID: checked.ID_MED_ENERGY,
      THERM_MANUF: checked.THERM_MANUF,
      THERM_MODEL: checked.THERM_MODEL,
      VALVE_MANUF: checked.VALVE_MANUF,
      VALVE_MODEL: checked.VALVE_MODEL,
      VALVE_TYPE: parseValveTypeValue(checked.VALVE_TYPE),
      BOX_MANUF: checked.BOX_MANUF,
      BOX_MODEL: checked.BOX_MODEL,
      ROOM_NAME: checked.ROOM_VAV
    }, session);
    varsCfg.application = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].application);
    varsCfg.protocol = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].protocol);
    stopBits = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].stopBits);
  }

  if (getNormalized(checked.MCHN_APPL) === getNormalized('Fancoil')) {
    await httpRouter.privateRoutes['/dri/set-dri-info']({
      DRI_ID: checked.ID_MED_ENERGY,
      UNIT_ID,
      CLIENT_ID: clientId,
    }, session);

    await httpRouter.privateRoutes['/dri/update-dri-fancoil']({
      FANCOIL_ID: checked.ID_MED_ENERGY,
      FANCOIL_MANUF: checked.FANCOIL_MANUF,
      FANCOIL_MODEL: checked.FANCOIL_MODEL,
      THERM_MANUF: checked.THERM_MANUF,
      THERM_MODEL: checked.THERM_MODEL,
      VALVE_MANUF: checked.VALVE_MANUF,
      VALVE_MODEL: checked.VALVE_MODEL,
      VALVE_TYPE: parseValveTypeValue(checked.VALVE_TYPE),
    }, session);

    varsCfg.application = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].application.replace('VAV', 'FANCOIL'));
    varsCfg.protocol = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].protocol);
    stopBits = getNormalized(applicationTypes[getNormalized(checked.THERM_MODEL)].stopBits);
  }

  await verifyBodyDriVarsCfg(varsCfg, {
    driId: checked.ID_MED_ENERGY,
    application: varsCfg.application,
    protocol: varsCfg.protocol,
    capacityTc: checked.CAPACITY_TCA,
    telemetryInterval: checked.SHIPPING_INTERVAL,
    installationType: typeInstallation,
    modbusBaudRate: '9600',
    serialMode: 'rs-485',
    parity: 'desabilitado',
    stopBits,
  }, null, session);

  if (checked.ID_MED_ENERGY) {
    await updateAndIotInformeChanges({ driId: checked.ID_MED_ENERGY }, session, varsCfg); // atualizar dri varcfg e mandar pro iot relay;
    const driInfo = await sqldb.DRIS.getBasicInfo({ driId: checked.ID_MED_ENERGY });
    await deleteDriPhotos(checked, driInfo.DEVICE_ID, authHeader);
    await uploadFiles([checked.PHOTO_DRI_1, checked.PHOTO_DRI_2, checked.PHOTO_DRI_3, checked.PHOTO_DRI_4, checked.PHOTO_DRI_5], driInfo.DEVICE_ID, photoType.dri, authHeader);
  }
}

async function addWater(clientId: number, checked: TableRow, ignored: { key: string, reason: string}[], existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[], session: SessionData, authHeader: string){
  const { result, UNIT_ID } = await checkDmaUnitInfoToAdd(checked, ignored, existingUnitItems, clientId, session);

  let installationFormatted = undefined;
  if (checked.WATER_INSTALLATION_DATE){
    installationFormatted = `${checked.WATER_INSTALLATION_DATE.substring(6,10)}-${checked.WATER_INSTALLATION_DATE.substring(3,5)}-${checked.WATER_INSTALLATION_DATE.substring(0,2)}`;
  }
  if (installationFormatted !== undefined) checked.WATER_INSTALLATION_DATE = installationFormatted || null;

  if (!result) return;

  await httpRouter.privateRoutes['/dma/set-dma-info']({
    CLIENT_ID: clientId,
    DMA_ID: checked.DMA_ID,
    UNIT_ID: UNIT_ID,
    UNIT_NAME: checked.UNIT_NAME,
    HYDROMETER_MODEL: checked.HYDROMETER_MODEL,
    INSTALLATION_LOCATION: checked.INSTALLATION_LOCATION,
    INSTALLATION_DATE: checked.WATER_INSTALLATION_DATE,
    TOTAL_CAPACITY: Number(checked.TOTAL_CAPACITY),
    QUANTITY_OF_RESERVOIRS: Number(checked.TOTAL_RESERVOIRS),

  }, session);

  await deleteDmasPhotos(checked, authHeader);
  const dmaInfo = await sqldb.DMAS_DEVICES.getBasicInfo({DEVICE_CODE: checked.DMA_ID});

  await uploadFiles([checked.PHOTO_DMA_1, checked.PHOTO_DMA_2, checked.PHOTO_DMA_3, checked.PHOTO_DMA_4, checked.PHOTO_DMA_5], dmaInfo.DEVICE_ID, photoType.dma, authHeader);
}

async function addEnvironment(
  clientId: number,
  checked: TableRow,
  ignored: { key: string, reason: string }[],
  existingUnitItems: {UNIT_ID: number, UNIT_NAME: string}[],
  clientRoomTypes: {RTYPE_ID: number, RTYPE_NAME: string}[],
  opts: AvailableOptions,
  session: SessionData,
  authHeader: string
) {
  if (checked.DUT_ID) {
    const currentDevInfo = await sqldb.DEVICES.getClientInfo({ devId: checked.DUT_ID });
    if (currentDevInfo && currentDevInfo.CLIENT_ID && currentDevInfo.CLIENT_ID !== clientId) {
      if (currentDevInfo.PERMS_C && currentDevInfo.PERMS_C.includes(PROFILECODES.EMPRESA.Fabricante)) {
        // OK, dispositivo está associado a um fabricante
      } else {
        ignored.push({ key: checked.key, reason: 'Dispositivo já associado a outro cliente' });
        return;
      }
    } else {
      await sqldb.DEVICES.w_insertIgnore({ DEVICE_CODE: checked.DUT_ID, DAT_BEGMON: new Date().toISOString().replace('T', ' ').substring(0, 19) }, session.user);
      ramCaches_TIMEZONES_updateTimezoneId(checked.DUT_ID, 31);
    }
  }

  let {UNIT_ID, RTYPE_IDs, result} = await controlChecksToAddEnvironment(checked, ignored, existingUnitItems, clientRoomTypes);
  if (!result) {
    return;

  }
  let SENSOR_AUTOM = null;
  if (checked.SENSORS_DUT_DUO && checked.PLACEMENT && checked.PLACEMENT.toUpperCase() === 'DUO') {
    const sensor1 = getNormalized(checked.SENSORS_DUT_DUO.split(',')[0]);
    const sensor2 = getNormalized(checked.SENSORS_DUT_DUO.split(',')[1]);

    if (!((sensor1 === getNormalized('Insuflação') && sensor2 === getNormalized('Retorno')) || 
    (sensor2 === getNormalized('Insuflação') && sensor1 === getNormalized('Retorno')))) {
      ignored.push({ key: checked.key, reason: 'Sensores de DUT DUO inválidos' });
      return;
    }
    else {
      SENSOR_AUTOM = sensor1 === getNormalized('Retorno') ? 0 : 1;
    }
  }
  else if (checked.SENSORS_DUT_DUO && (!checked.PLACEMENT || checked.PLACEMENT.toUpperCase() !== 'DUO')) {
    ignored.push({ key: checked.key, reason: 'Sensores de DUT DUO apenas quando Posicionamento for DUO' });
    return;
  }

  // selecionar environment ID pelo nome ou adicionar
  let environmentId = await checkEnvironmentId(checked, opts, clientId, UNIT_ID);

  if (!environmentId) {
    const insertedEnvironment = await sqldb.ENVIRONMENTS.w_insert({UNIT_ID: UNIT_ID, ENVIRONMENT_NAME: checked.ROOM_NAME, IS_VISIBLE: true, ENVIRONMENT_TYPE: ''}, session.user);
    environmentId = insertedEnvironment.insertId;
  }

  if (RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID) {
    const environment = await sqldb.ENVIRONMENTS.getEnvironmentsInfo({ENVIRONMENT_ID: environmentId});
    if (environment.RTYPE_ID) {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_updateInfo({ID: environment.ENVIRONMENT_ROOM_TYPE_ID, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
    }
    else {
      await sqldb.ENVIRONMENTS_ROOM_TYPES.w_insert({ENVIRONMENT_ID: environmentId, RTYPE_ID: RTYPE_IDs[0].RTYPE_ID}, session.user);
    }
  }

  if (checked.DUT_ID) {
    const dutInfo = await sqldb.DUTS_AUTOMATION.getDutsAutomationInfo({DEVICE_CODE: checked.DUT_ID});
    const useIr = dutInfo.length ? dutInfo[0].DISAB : 0;
    await httpRouter.privateRoutes['/dut/set-dut-info']({
      CLIENT_ID: clientId,
      DEV_ID: checked.DUT_ID,
      UNIT_ID: UNIT_ID,
      ROOM_NAME: checked.ROOM_NAME,
      RTYPE_ID: RTYPE_IDs && RTYPE_IDs[0].RTYPE_ID,
      USE_IR: useIr as 0|1,
      PLACEMENT: checked.PLACEMENT as 'INS'|'DUO'|'AMB' || undefined,
      ENVIRONMENT_ID: environmentId
    }, session);
    if (SENSOR_AUTOM != null) {
      await httpRouter.privateRoutes['/dut/set-temperature-sensors']({
        devId: checked.DUT_ID,
        value: SENSOR_AUTOM,
        placement: checked.PLACEMENT,
      }, session);
    }
  }

  if (checked.DUT_ID) {
    const dutInfo = await sqldb.DUTS.getBasicInfo({ devId: checked.DUT_ID })
    await deleteDutsPhotos(checked, dutInfo.DEVICE_ID, authHeader);
    await uploadFiles([checked.PHOTO_DUT_1, checked.PHOTO_DUT_2, checked.PHOTO_DUT_3, checked.PHOTO_DUT_4, checked.PHOTO_DUT_5], dutInfo.DEVICE_ID, photoType.dut, authHeader);
  }
}

export async function exportUnit(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>) {
  // Tipo Unidade
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  data.push([
    'Unidade',
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
    getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
    '-',
    '-',
  ]);
}

export const getDamInstallationLocationLabel = (str?: string|null) => {
  const opts: {[key: string]: string} = {
    'casa-de-maquina': 'Casa de Máquina',
    'ambiente-refrigerado': 'Ambiente Refrigerado',
    outros: 'Outros',
  };
  return (str && opts[str]) || '';
};

export const getDamPlacementLocationLabel = (str?: string|null) => {
  const opts: {[key: string]: string} = {
    'DUO': 'DUO',
    'RETURN': 'Retorno',
  };
  return (str && opts[str]) || '';
};

export const getDamDuoSensorLabel = (str?: string|null) => {
  const opts: {[key: string]: string} = {
    'INSUFFLATION': 'Insuflação',
    'RETURN': 'Retorno',
  };
  return (str && opts[str]) || '';
};

export function getStringOrCharacter(word: string|number) {
  if (word) return word;
  return '-';
}

export async function exportMachines(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, additionalColumns: string[]) {
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  const allMachines = await sqldb.MACHINES.getMachinesList({UNIT_ID: unitInfo.UNIT_ID});

  const machines = allMachines.filter(item => item.MCHN_APPL !== 'iluminacao' && item.MACHINE_ID);
  const allDacsMachines = await sqldb.DACS_DEVICES.getExtraInfoListByUnit({ UNIT_ID: unitInfo.UNIT_ID });

  for (const machine of machines) {
    const machinesAdditionalParams = await sqldb.ADDITIONAL_MACHINE_PARAMETERS.getAllParametersByMachine({ MACHINE_ID: machine.MACHINE_ID });
    const dacsExported = [] as string[];
    const {dutInfo, hasAsset, dutDuo} = await exportAssetsFromMachine(machine, data, unitInfo, timezone, dacsExported, additionalColumns, machinesAdditionalParams);
    // Exporta dacs da máquina se não tiver ativo
    const dacsWithoutAsset = allDacsMachines.filter(item => (item.MACHINE_ID === machine.MACHINE_ID) && !dacsExported.includes(item.DAC_ID));
    const hasDacs = dacsWithoutAsset.length > 0;
    const damInfo = machine.DEV_AUT && isDam(machine.DEV_AUT) ? await sqldb.DAMS_DEVICES.getDamByCode({DEVICE_CODE: machine.DEV_AUT}) : null;

    for (const row of dacsWithoutAsset) {
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
        getDutInfo(dutInfo?.ROOM_NAME),
        getDutInfo(dutInfo?.RTYPE_NAME),
        '',
        '',
        '',
        '',
        '',
        getStringOrCharacter(row.DAC_COP),
        getStringOrCharacter(row.DAC_KW),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        getStringOrCharacter(row.DAC_ID),
        getStringOrCharacter(row.P0_SENSOR),
        getStringOrCharacter(row.P0_POSITN),
        getStringOrCharacter(row.P1_SENSOR),
        getStringOrCharacter(row.P1_POSITN),
        '',
        '',
        '',
        '',
        '',
        '',
      ];
      await exportAdditionalParams(data, rowData, additionalColumns, machinesAdditionalParams);
    }

    if (!hasAsset && !hasDacs) {
      const rowData = [
        'Máquina',
        getStringOrCharacter(unitInfo.UNIT_NAME),
        getStringOrCharacter(unitInfo.UNIT_ID),
        getStringOrCharacter(unitInfo.UNIT_CODE_CELSIUS),
        getStringOrCharacter(unitInfo.UNIT_CODE_API),    
        getStringOrCharacter(unitInfo.COUNTRY_NAME),
        getStringOrCharacter(unitInfo.STATE_ID),
        getStringOrCharacter(unitInfo.CITY_NAME),
        timezone?.area || '-',
        getStringOrCharacter(unitInfo.CONSTRUCTED_AREA),
        getUnitStatus(unitInfo.PRODUCTION),
        getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
        '',
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
        getDutInfo(dutInfo?.ROOM_NAME),
        getDutInfo(dutInfo?.RTYPE_NAME),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ];
      await exportAdditionalParams(data, rowData, additionalColumns, machinesAdditionalParams);
    }

  }
}

export function getUnitStatus(isProduction: boolean) {
  return isProduction ? 'Em produção' : 'Em instalação';  
}

export function getUnitLatLon(lat: string, lon: string, latLon: string) {
  return lat && lon ? latLon : '-';  
}

function getDutInfo(info: string) {
  return info || '';  
}

function getValveType(valveType: string) {
  if (valveType === 'ON-OFF') {
    return 'Válvula Fixa On-Off';
  }
  return 'Válvula Proporcional 0-10V';
}

export async function exportAdditionalParams(data: (string|number)[][], rowData: (string|number)[], additionalColumns: string[], additionalParams: { ID: number, COLUMN_NAME: string, COLUMN_VALUE: string }[] ){
  const lengthInputColumns = Object.keys(inputColumns).length;
  rowData.push(...Array(lengthInputColumns - rowData?.length).fill('-'));
  for (const additionalColumn of additionalColumns) {
    const param = additionalParams.find(param => param.COLUMN_NAME.toLowerCase() === additionalColumn.toLowerCase());

    if (param) {
      rowData.push(param.COLUMN_VALUE); 
    } else {
      rowData.push(''); 
    }
  }

  data.push(rowData);
}

export async function exportIlumination(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>) {
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  const illuminations = await sqldb.ILLUMINATIONS.getIllumInfoListUnionDmt({ UNIT_ID: unitInfo.UNIT_ID });
  const multiLines = []
  for (let i = 0; i < 108; i++) {
    multiLines.push('-')
  }
  for (const row of illuminations) {
    data.push([
      'Iluminação',
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
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
      getStringOrCharacter(unitInfo.ADDRESS),
      getStringOrCharacter(unitInfo.AMOUNT_PEOPLE),
      ...multiLines,
      row.ID,
      row.NAME,
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
      row.GRID_VOLTAGE,
      row.GRID_CURRENT,
      row.DEVICE_CODE,
      row.PORT,
      row.FEEDBACK,
      '-',
      '-',
      '-',
      '-',
    ]);
  }
}

export async function exportNobreak(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, additionalColumns: string[]) {
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});

  const nobreaks = await sqldb.NOBREAKS.getNobreakInfoListByUnitId({ UNIT_ID: [unitInfo.UNIT_ID] });
  const multiLines = []
  for (let i = 0; i < 108; i++) {
    multiLines.push('-')
  }
  for (const row of nobreaks) {
    const nobreakAdditionalParams = await sqldb.ADDITIONAL_NOBREAK_PARAMETERS.getAllParametersByNobreak({ NOBREAK_ID: row.ID });
    const rowData = [
      'Nobreak',
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
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
      getStringOrCharacter(unitInfo.ADDRESS),
      getStringOrCharacter(unitInfo.AMOUNT_PEOPLE),
      ...multiLines,
      row.ID,
      row.NAME,
      row.INSTALLATION_DATE,
      row.MANUFACTURER,
      row.MODEL,
      row.INPUT_VOLTAGE,
      row.OUTPUT_VOLTAGE,
      row.NOMINAL_POTENTIAL,
      row.NOMINAL_BATTERY_LIFE,
      row.INPUT_ELECTRIC_CURRENT,
      row.OUTPUT_ELECTRIC_CURRENT,
      row.NOMINAL_BATTERY_CAPACITY,
      '-',
      '-',
      row.DMT_CODE,
      row.PORT,
      '-',
      row.DAT_CODE,
      '-',
      '-',
      '-',
    ];
    await exportAdditionalParams(data, rowData, additionalColumns, nobreakAdditionalParams);
  }
}

function verifyVavsExportEnergy(vavsList: Awaited<ReturnType<typeof sqldb.VAVS.getVAVsInfoList>>, data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, timezone: Awaited<ReturnType<typeof sqldb.TIME_ZONES.getTimezone>>, latLon: string) {
  if(vavsList.length > 0) {
    vavsList.forEach((row) => {
    data.push([
      'Energia',
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
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
      '-',
      '-',
      '-',
      'VAV',
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
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      row.VAV_ID,
      '',
      '',
      '',
      '',
      '',
      row.ROOM_NAME,
      row.THERM_MANUF,
      row.THERM_MODEL,
      row.VALVE_MANUF,
      row.VALVE_MODEL,
      getValveType(row.VALVE_TYPE),
      row.BOX_MANUF,
      row.BOX_MODEL,
      '',
      '',
      '',
      '',
      '',
      ''
    ]);
  })
  }
}

function verifyFancoilsExportEnergy(fancoilList: Awaited<ReturnType<typeof sqldb.FANCOILS.getFancoilsInfoList>>, data: (string | number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, timezone: Awaited<ReturnType<typeof sqldb.TIME_ZONES.getTimezone>>, latLon: string) {
  if (fancoilList.length > 0) {
    fancoilList.forEach((row) => {
      data.push([
        'Energia',
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
        getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
        '-',
        '-',
        '-',
        'Fancoil',
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
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        row.FANCOIL_ID,
        '',
        '',
        '',
        '',
        '',
        '',
        row.THERM_MANUF,
        row.THERM_MODEL,
        row.VALVE_MANUF,
        row.VALVE_MODEL,
        getValveType(row.VALVE_TYPE),
        '',
        '',
        row.FANCOIL_MANUF,
        row.FANCOIL_MODEL,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
    })
  }
}

function verifyFilterCarrierExportEnergy(filterCarrierList: Awaited<ReturnType<typeof sqldb.DRIS.getList>>, data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, timezone: Awaited<ReturnType<typeof sqldb.TIME_ZONES.getTimezone>>, latLon: string) {
  if(filterCarrierList.length > 0){
    filterCarrierList.forEach((row) => {
      data.push([
        'Energia',
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
        getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
        '-',
        '-',
        '-',
        'Carrier ECOSPLIT',
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
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        row.DRI_ID,
        '-',
        '-',
        '-',
        '-',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
    })
  }
}

function verifyVarsCnfg(row: Awaited<ReturnType<typeof sqldb.ENERGY_DEVICES_INFO.getList>>[0], carrier: Awaited<ReturnType<typeof sqldb.DRIS.getList>>) {
  const varscnfg = row.ENERGY_DEVICE_ID ? JSON.parse(carrier.filter((item) => item.DRI_ID === row.ENERGY_DEVICE_ID).length && carrier.filter((item) => item.DRI_ID === row.ENERGY_DEVICE_ID)[0]?.VARSCFG) : null;
  const capacityTC = varscnfg ? varscnfg.varsList.filter((item: any) => item.name === 'Capacidade TC')[0]?.address?.value : null;
  const typeInstallation = varscnfg ? varscnfg.varsList.filter((item: any) => item.name === 'Tipo Instalação')[0]?.address?.value : null;

  return { capacityTC, typeInstallation };
}

function verifyEnergyMeterExportEnergy(energiMeterList: Awaited<ReturnType<typeof sqldb.ENERGY_DEVICES_INFO.getList>>, data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>, timezone: Awaited<ReturnType<typeof sqldb.TIME_ZONES.getTimezone>>, latLon: string, carrier: Awaited<ReturnType<typeof sqldb.DRIS.getList>>) {
  if(energiMeterList.length > 0){
    energiMeterList.forEach((row) => {
      const { capacityTC, typeInstallation } = verifyVarsCnfg(row, carrier)
      const typeInstallationOpts = {
        0: 'Rede Trifásica com neutro',
        1: 'Rede Trifásica sem neutro',
        2: 'Rede Bifásica'
      } as { [key: number] : string }

      data.push([
        'Energia',
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
        getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
        '-',
        '-',
        '-',
        'Medidor de Energia',
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
        '-',
        '-',
        '-',
        '-',
        row.ELECTRIC_CIRCUIT_ID,
        row.ESTABLISHMENT_NAME,
        row.ID,
        row.ENERGY_DEVICE_ID,
        row.SERIAL,
        row.MODEL,
        capacityTC ?? '',
        typeInstallationOpts[typeInstallation] ?? '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
    })
  }
}

export async function exportEnergy(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>) {
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  const vavs = await sqldb.VAVS.getVAVsInfoList({ unitIds: [unitInfo.UNIT_ID] });
  const fancoils = await sqldb.FANCOILS.getFancoilsInfoList({ unitIds: [unitInfo.UNIT_ID] });
  const idVAV = vavs.map((id) => id.VAV_ID)
  const energyMeter = await sqldb.ENERGY_DEVICES_INFO.getList({unitIds: [unitInfo.UNIT_ID]}, { addUnownedDevs: false });
  const energyId = energyMeter.map((id) => id.ENERGY_DEVICE_ID);
  const carrier = await sqldb.DRIS.getList({ unitIds: [unitInfo.UNIT_ID] });
  const filterCarrier = [];
  for(const item of carrier){
    if(!energyId.includes(item.DRI_ID) && !idVAV.includes(item.DRI_ID)){
      filterCarrier.push(item);
    }
  }

  verifyVavsExportEnergy(vavs, data, unitInfo, timezone, latLon);
  verifyFancoilsExportEnergy(fancoils, data, unitInfo, timezone, latLon);
  verifyFilterCarrierExportEnergy(filterCarrier, data, unitInfo, timezone, latLon);
  verifyEnergyMeterExportEnergy(energyMeter, data, unitInfo, timezone, latLon, carrier);
};

export async function exportWater(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>){
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;   
  const dmaInfo = await sqldb.DMAS_DEVICES.getDmaInfoByUnit({UNIT_ID: unitInfo.UNIT_ID});
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  if (dmaInfo) {
    const multiLines = []
    for (let i = 0; i < 97; i++) {
      multiLines.push('-')
    }
    data.push([
      'Água',
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
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
      getStringOrCharacter(unitInfo.ADDRESS),
      getStringOrCharacter(unitInfo.AMOUNT_PEOPLE),
      ...multiLines,
      dmaInfo.DMA_ID,
      dmaInfo.HYDROMETER_MODEL,
      dmaInfo.INSTALLATION_LOCATION,
      dmaInfo.INSTALLATION_DATE,
      dmaInfo.TOTAL_CAPACITY,
      dmaInfo.QUANTITY_OF_RESERVOIRS,
      '',
      '',
      '',
      '',
      '',
    ]);
  }
}

export async function exportEnvironment(data: (string|number)[][], unitInfo: Awaited<ReturnType<typeof sqldb.CLUNITS.getUnitInfo>>) {
  const latLon = `${unitInfo.LAT},${unitInfo.LON}`;
  const timezone = await sqldb.TIME_ZONES.getTimezone({TIMEZONE_ID: unitInfo.TIMEZONE_ID, TIMEZONE_AREA: unitInfo.TIMEZONE_AREA});
  const environments = await sqldb.ENVIRONMENTS.getEnvironmentsInfoList({UNIT_ID: unitInfo.UNIT_ID});

  for (const row of environments) {
    const dutInfo = row.DUT_CODE ? await sqldb.DUTS.getDevExtraInfo({DEV_ID: row.DUT_CODE}) : null;
    const dutDuoString = dutInfo && dutInfo.SENSOR_AUTOM ? 'Insuflação,Retorno' : 'Retorno,Insuflação'
    const dutDuo = !dutInfo || dutInfo.PLACEMENT !== 'DUO' ? '' : dutDuoString;
    data.push([
      'Ambiente',
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
      getUnitLatLon(unitInfo.LAT, unitInfo.LON, latLon),
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
      '-',
      '-',
      '-',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '-',
      '-',
      dutInfo?.PLACEMENT || '',
      dutDuo,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      dutInfo?.DEV_ID || '',
      '',
      '',
      '',
      '',
      '',
      row.ENVIRONMENT_NAME || '',
      dutInfo?.RTYPE_NAME || '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }
}

function verifyColumnExist(column: string) {
  if (column) {
    return column;
  }
  return '-';
}

/**
 * @swagger
 * /unified/export-unified-example:
 *   post:
 *     summary: Baixar documento exemplo de planilha
 *     description: Baixar documento exemplo de planilha
 *     tags:
 *       - Unified
 *     security:
 *      - Bearer: []
 *     parameters:
 *       - name: Req
 *         in: body
 *         description: Dados de envio
 *         schema:
 *           type: object
 *           properties:
 *     responses:
 *       200:
 *         description: arquivos baixados com sucesso.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Faltando parâmetros obrigatórios.
 *       403:
 *         description: Sem permissão para baixar exemplo de planilha
 *       500:
 *         description: Erro interno do servidor
 */

httpRouter.privateRoutes['/unified/export-unified-example'] = async function (_reqParams, _session, { res }) {
  const data = [[...inputColumnsLabels]];
  const tamanho: number = inputColumns.SOLUTION_TYPE.exampleList.length;

  for (let i = 0; i < tamanho; i++) {
    const novoExemplo: string[] = [
      verifyColumnExist(inputColumns.SOLUTION_TYPE.exampleList[i]),
      verifyColumnExist(inputColumns.UNIT_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.UNIT_ID.exampleList[i]),
      verifyColumnExist(inputColumns.UNIT_CODE_CELSIUS.exampleList[i]),
      verifyColumnExist(inputColumns.UNIT_CODE_API.exampleList[i]),
      verifyColumnExist(inputColumns.COUNTRY.exampleList[i]),
      verifyColumnExist(inputColumns.STATE_ID.exampleList[i]),
      verifyColumnExist(inputColumns.CITY_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.TIME_ZONE.exampleList[i]),
      verifyColumnExist(inputColumns.CONSTRUCTED_AREA.exampleList[i]),
      verifyColumnExist(inputColumns.UNIT_STATUS.exampleList[i]),
      verifyColumnExist(inputColumns.LATLONG.exampleList[i]),
      verifyColumnExist(inputColumns.ADDRESS.exampleList[i]),
      verifyColumnExist(inputColumns.AMOUNT_PEOPLE.exampleList[i]),
      verifyColumnExist(inputColumns.ICCID.exampleList[i]),
      verifyColumnExist(inputColumns.ACCESSPOINT.exampleList[i]),
      verifyColumnExist(inputColumns.MODEM.exampleList[i]),
      verifyColumnExist(inputColumns.MACACCESSPOINT.exampleList[i]),
      verifyColumnExist(inputColumns.MACREPEATER.exampleList[i]),
      verifyColumnExist(inputColumns.SIMCARD_PHOTO1.exampleList[i]),
      verifyColumnExist(inputColumns.SIMCARD_PHOTO2.exampleList[i]),
      verifyColumnExist(inputColumns.SIMCARD_PHOTO3.exampleList[i]),
      verifyColumnExist(inputColumns.SKETCH_1.exampleList[i]),
      verifyColumnExist(inputColumns.SKETCH_2.exampleList[i]),
      verifyColumnExist(inputColumns.SKETCH_3.exampleList[i]),
      verifyColumnExist(inputColumns.SKETCH_4.exampleList[i]),
      verifyColumnExist(inputColumns.SKETCH_5.exampleList[i]),
      verifyColumnExist(inputColumns.GROUP_ID.exampleList[i]),
      verifyColumnExist(inputColumns.GROUP_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.INSTALLATION_DATE.exampleList[i]),
      verifyColumnExist(inputColumns.MCHN_APPL.exampleList[i]),
      verifyColumnExist(inputColumns.GROUP_TYPE.exampleList[i]),
      verifyColumnExist(inputColumns.MCHN_BRAND.exampleList[i]),
      verifyColumnExist(inputColumns.FLUID_TYPE.exampleList[i]),
      verifyColumnExist(inputColumns.MACHINE_RATED_POWER.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DEVGROUPS_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DEVGROUPS_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DEVGROUPS_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DEVGROUPS_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DEVGROUPS_5.exampleList[i]),
      verifyColumnExist(inputColumns.DEV_AUTOM_ID.exampleList[i]),
      verifyColumnExist(inputColumns.PLACEMENT.exampleList[i]),
      verifyColumnExist(inputColumns.SENSORS_DUT_DUO.exampleList[i]),
      verifyColumnExist(inputColumns.DAM_INSTALLATION_LOCATION.exampleList[i]),
      verifyColumnExist(inputColumns.DAM_PLACEMENT.exampleList[i]),
      verifyColumnExist(inputColumns.DAM_T0_POSITION.exampleList[i]),
      verifyColumnExist(inputColumns.DAM_T1_POSITION.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_AUTOM_DEV_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_AUTOM_DEV_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_AUTOM_DEV_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_AUTOM_DEV_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_AUTOM_DEV_5.exampleList[i]),
      verifyColumnExist(inputColumns.DUT_ID.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DUT_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DUT_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DUT_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DUT_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DUT_5.exampleList[i]),
      verifyColumnExist(inputColumns.ROOM_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.RTYPE_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.DAT_ID.exampleList[i]),
      verifyColumnExist(inputColumns.AST_DESC.exampleList[i]),
      verifyColumnExist(inputColumns.AST_ROLE_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.MCHN_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.CAPACITY_PWR.exampleList[i]),
      verifyColumnExist(inputColumns.DAC_COP.exampleList[i]),
      verifyColumnExist(inputColumns.MCHN_KW.exampleList[i]),
      verifyColumnExist(inputColumns.EVAPORATOR_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.INSUFFLATION_SPEED.exampleList[i]),
      verifyColumnExist(inputColumns.COMPRESSOR_RLA.exampleList[i]),
      verifyColumnExist(inputColumns.EQUIPMENT_POWER.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_ASSET_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_ASSET_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_ASSET_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_ASSET_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_ASSET_5.exampleList[i]),
      verifyColumnExist(inputColumns.DEV_ID.exampleList[i]),
      verifyColumnExist(inputColumns.DAC_COMIS.exampleList[i]),
      verifyColumnExist(inputColumns.P0_SENSOR.exampleList[i]),
      verifyColumnExist(inputColumns.P0_POSITN.exampleList[i]),
      verifyColumnExist(inputColumns.P1_SENSOR.exampleList[i]),
      verifyColumnExist(inputColumns.P1_POSITN.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAC_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAC_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAC_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAC_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAC_5.exampleList[i]),
      verifyColumnExist(inputColumns.ELECTRIC_CIRCUIT_ID.exampleList[i]),
      verifyColumnExist(inputColumns.ELECTRIC_CIRCUIT_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.ENERGY_DEVICES_INFO_ID.exampleList[i]),
      verifyColumnExist(inputColumns.ID_MED_ENERGY.exampleList[i]),
      verifyColumnExist(inputColumns.NUM_SERIE_MED_ENERGY.exampleList[i]),
      verifyColumnExist(inputColumns.MODEL_MED_ENERGY.exampleList[i]),
      verifyColumnExist(inputColumns.CAPACITY_TCA.exampleList[i]),
      verifyColumnExist(inputColumns.INSTALLATION_ELETRICAL_TYPE.exampleList[i]),
      verifyColumnExist(inputColumns.SHIPPING_INTERVAL.exampleList[i]),
      verifyColumnExist(inputColumns.ROOM_VAV.exampleList[i]),
      verifyColumnExist(inputColumns.THERM_MANUF.exampleList[i]),
      verifyColumnExist(inputColumns.THERM_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.VALVE_MANUF.exampleList[i]),
      verifyColumnExist(inputColumns.VALVE_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.VALVE_TYPE.exampleList[i]),
      verifyColumnExist(inputColumns.BOX_MANUF.exampleList[i]),
      verifyColumnExist(inputColumns.BOX_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.FANCOIL_MANUF.exampleList[i]),
      verifyColumnExist(inputColumns.FANCOIL_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DRI_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DRI_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DRI_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DRI_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DRI_5.exampleList[i]),
      verifyColumnExist(inputColumns.DMA_ID.exampleList[i]),
      verifyColumnExist(inputColumns.HYDROMETER_MODEL.exampleList[i]),
      verifyColumnExist(inputColumns.INSTALLATION_LOCATION.exampleList[i]),
      verifyColumnExist(inputColumns.WATER_INSTALLATION_DATE.exampleList[i]),
      verifyColumnExist(inputColumns.TOTAL_CAPACITY.exampleList[i]),
      verifyColumnExist(inputColumns.TOTAL_RESERVOIRS.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMA_1.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMA_2.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMA_3.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMA_4.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMA_5.exampleList[i]),
      verifyColumnExist(inputColumns.UTILITY_ID.exampleList[i]),
      verifyColumnExist(inputColumns.UTILITY_NAME.exampleList[i]),
      verifyColumnExist(inputColumns.INSTALLATION_DATE_UTIL.exampleList[i]),
      verifyColumnExist(inputColumns.DISTRIBUTOR.exampleList[i]),
      verifyColumnExist(inputColumns.MODEL.exampleList[i]), 
      verifyColumnExist(inputColumns.ENTRY_VOLTAGE.exampleList[i]),
      verifyColumnExist(inputColumns.OUT_VOLTAGE.exampleList[i]),
      verifyColumnExist(inputColumns.POT_NOMINAL.exampleList[i]),
      verifyColumnExist(inputColumns.AUTON_NOMINAL.exampleList[i]),
      verifyColumnExist(inputColumns.INPUT_ELECTRIC_CURRENT.exampleList[i]),
      verifyColumnExist(inputColumns.OUTPUT_ELECTRIC_CURRENT.exampleList[i]),
      verifyColumnExist(inputColumns.NOMINAL_BATTERY_CAPACITY.exampleList[i]),
      verifyColumnExist(inputColumns.GRID_VOLTAGE.exampleList[i]),
      verifyColumnExist(inputColumns.MAINS_CURRENT.exampleList[i]),
      verifyColumnExist(inputColumns.ASSOCIATE_DEV.exampleList[i]),
      verifyColumnExist(inputColumns.ASSOCIATE_DEV_PORT.exampleList[i]),
      verifyColumnExist(inputColumns.FEEDBACK_DAL.exampleList[i]),
      verifyColumnExist(inputColumns.ASSOCIATE_ASSET.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DMT.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_DAL.exampleList[i]),
      verifyColumnExist(inputColumns.PHOTO_UTILITY.exampleList[i]),
    ];
    data.push(novoExemplo);
  }
  const buffer = createXlsx(data);
  res.append('Access-Control-Expose-Headers', 'content-disposition, filename');
  res.append('Content-Disposition', `attachment; filename="Unificada-Exemplo.xlsx"`);
  res.append('filename', `Unificada-Exemplo.xlsx`);
  res.append('Content-Type', `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`);
  res.status(200).end(buffer);

  return res;
};

function verifyVoltageDmt(checked: TableRow, errors: { message: string }[]) {
  if(checked.POT_NOMINAL && Number(checked.POT_NOMINAL) < 0) errors.push({ message: 'Potência Nominal (VA) Não pode ser negativo' });

  if(checked.ENTRY_VOLTAGE && !['127', '220', '380'].includes(checked.ENTRY_VOLTAGE)) errors.push({ message: 'A tensão de entrada precisa estar entre 127/220/380' });

  if(checked.OUT_VOLTAGE && !['127', '220', ].includes(checked.OUT_VOLTAGE)) errors.push({ message: 'A tensão de saida precisa estar entre 127/220' });
}

function verifyIdsNobreaks(checked: TableRow, errors: { message: string }[]) {
  if(!checked.UTILITY_ID && !checked.UTILITY_NAME) errors.push({ message: 'É necessario que o campo Id do Utilitario ou Nome do utilitario esteja preenchido.' })

  if(checked.ASSOCIATE_ASSET && (!checked.ASSOCIATE_ASSET.startsWith('DAT') || checked.ASSOCIATE_ASSET?.length !== 12)) errors.push({ message: 'Id do ativo inválido' });
  
  if(checked.ASSOCIATE_DEV && (!checked.ASSOCIATE_DEV.startsWith('DMT') || checked.ASSOCIATE_DEV?.length !== 12)) errors.push({ message: 'Id do DMT inválido' });
}

async function verifyNobreakUnit(checked: TableRow, errors: { message: string }[], clientId: number, unitsWillBeCreated: string[]) {
  if (unitsWillBeCreated.includes(checked.UNIT_NAME)) {
    return;
  }
  const unitData = await sqldb.CLUNITS.getUnitIdByUnitName({ UNIT_NAME: checked.UNIT_NAME, CLIENT_ID: clientId });
  const allowed = await allowedInsertionInUnit(unitData.UNIT_ID, checked.ASSOCIATE_DEV);
  if(!allowed) errors.push({ message: 'Impossível associar Nobreaks de unidades diferentes com o mesmo DMT.' });
}