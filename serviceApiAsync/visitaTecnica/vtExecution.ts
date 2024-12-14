import * as httpRouter from "../apiServer/httpRouter";
import sqldb from "../../srcCommon/db";
import servConfig from "../../configfile";
import * as multer from "multer";
import * as express from "express";
import * as uuid from "uuid";
import * as vtInfo from "../visitaTecnica/vtInfo"
import { today_shiftedYMD_s } from "../../srcCommon/helpers/dates";
import { DRT, Environment, Machine, Image, VisitData, Energy, WaterMeasurer, Rack, AccessPoint, ServedEnvironmentOrMachine } from "./models"

import { logger } from '../../srcCommon/helpers/logger';
import { sendToS3_vtImages } from "../../srcCommon/s3/connectS3";
import { getUploadedGeneric } from "../apiServer/getMultiparFiles";
import { getUserGlobalPermissions } from "../../srcCommon/helpers/permissionControl";

httpRouter.privateRoutes["/vt/upload-imgs"] = async function (
  reqParams,
  session,
  { req, res }
) {
  if (session.permissions.isUserManut) { } // OK
  else if (session.permissions.isAdminSistema) { } // OK
  else {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const images = await getUploadedPhoto(req, res);

  const imagesKey: string[] = await sendImageToS3(images);

  res.send(imagesKey);

  return res;
};

httpRouter.privateRoutes["/vt/pull"] = async function (reqParams, session) {
  var list_vts
  var deleted_vts
  // O Pull deve enviar somente as visitas maiores ou iguais ao dia de hoje. Se o técnico ainda não fez nenhuma sincronização
  // deverá enviar todas visitas com data de atualização maiores ou iguais à data atual.
  if (reqParams.lastPulledAt === undefined || reqParams.lastPulledAt === null) {
    // busca todas as visitas do técnico acima do dia de hoje
    list_vts = await sqldb.VISITATECNICA.getVisitaTecnica({
      USER: session.user,
      STATUS_ID: [1,4,5],
      VTDATE_ABOVE: today_shiftedYMD_s(),
    });
  }
  else{
    // busca todas as visitas do técnico acima do dia de hoje que foram criadas após o último pull
    list_vts = await sqldb.VISITATECNICA.getVisitaTecnica({
      USER: session.user,
      VTDATE_ABOVE: today_shiftedYMD_s(),
      STATUS_ID: [1,4,5],
      VTUPDATE: reqParams.lastPulledAt
    });

    // busca todas as visitas do técnico que foram deletadas após último pull
    deleted_vts = await sqldb.VISITATECNICA.getVisitaTecnica({
      USER: session.user,
      VTDELETED: '1',
      VTUPDATE: reqParams.lastPulledAt
    });
  }

  await deleteVTs(reqParams.lastPulledAt, session.user)

  return {
    timestamp: new Date().getTime(),
    changes: {
      visits: {
        created: list_vts.map((vt) => {
          return {
            id: vt.ID,
            s_id: vt.ID,
            client_id: vt.CLIENT_ID,
            unit_id: vt.UNIT_ID,
            tecnico_id: vt.TECNICO_ID,
            vtdate: vt.VTDATE,
            vttime: vt.VTTIME,
            ambientes: vt.AMBIENTES,
            maquinas: vt.MAQUINAS,
            caracteristica:
              vt.CARACTERISTICA && vt.CARACTERISTICA.length
                //? vt.CARACTERISTICA.split(";").map((e) => parseInt(e))
                ? JSON.stringify(vt.CARACTERISTICA.split(";").map((e) => parseInt(e)))
                : null,
            plantabaixa_image:
              vt.PLANTABAIXA_IMG && vt.PLANTABAIXA_IMG.length
                //? vt.PLANTABAIXA_IMG.split(";").map(
                    // (e) =>
                    //   `${servConfig.filesBucketUrl}/${servConfig.vtImagesBucketPath}${e}`
                  // )
                  ? JSON.stringify(vt.PLANTABAIXA_IMG.split(";").map(
                    (e) =>
                      `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
                  ))
                : null,
            autorizacao_image:
              vt.AUTORIZACAO_IMG && vt.AUTORIZACAO_IMG.length
                //? vt.AUTORIZACAO_IMG.split(";").map(
                    // (e) =>
                    //  `${servConfig.filesBucketUrl}/${servConfig.vtImagesBucketPath}${e}`
                  // )
                  ? JSON.stringify(vt.AUTORIZACAO_IMG.split(";").map(
                    (e) =>
                      `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
                  ))
                : null,
            observacao: vt.OBSERVACAO,
            observacao_reagendamento: vt.OBSERVACAO_REAGENDAMENTO,
            responsavel: vt.RESPONSAVEL,
            city_name: vt.CITY_NAME,
            client_name: vt.CLIENT_NAME,
            unit_name: vt.UNIT_NAME,
            unit_lat: vt.UNIT_LAT,
            unit_lon: vt.UNIT_LON,
            responsavel_nome: vt.RESPONSAVEL_NOME,
            responsavel_phone: vt.RESPONSAVEL_PHONE,
            tecnico_nome: vt.TECNICO_NOME,
            //TECNICO_SOBRENOME: vt.TECNICO_SOBRENOME,
            tecnico_phone: vt.TECNICO_PHONE,
            cidade_tecnico: vt.CIDADE_TECNICO,
            status_id: vt.STATUS_ID,
            status: vt.STATUS
            //VTUPDATE: vt.VTUPDATE
          }
        }
        ),
        updated:[],
        deleted:deleted_vts && deleted_vts.length ? deleted_vts.map((vt) => {
          return {
            id: vt.ID,
            s_id: vt.ID
          }
        }
        ) : [],
      }
    }
  };
};

httpRouter.privateRoutes["/vt/push"] = async function (reqParams , session) {
  const userIsAdmin = session.permissions.isAdminSistema;

  const lastPulled = new Date(reqParams.lastPulledAt);
  const idsChanged = [] as number[];
  let exist = false;

  if (reqParams.changes.visits.updated.length === 0) {
    return { success: true };
  }

  // Salva todos IDS que estão sendo enviados
  for (const row of reqParams.changes.visits.updated){
    idsChanged.push(Number(row.s_id))
  }

  // Seleciona a maior data de update entre os ids enviados, para saber se deverá alterar
  const vtsList = await sqldb.VISITATECNICA.getVTsUpdate({
    IDS: idsChanged,
    TECNICO_ID: userIsAdmin ? undefined : session.user,
  });
  if (vtsList.length !== idsChanged.length) {
    throw Error('Permission denied!').HttpStatus(403)
  }
  const dates = vtsList.map((vt) => vt.VTUPDATE || 0);
  const lastUpdated = Math.max(...dates);

  if (new Date(lastUpdated) > lastPulled ) {
    throw Error('Data de alteração de registros maior que data de último pull.').HttpStatus(500)
  }

  try {
    // Percorre Visitas Técnicas alteradas
    for (const row of reqParams.changes.visits.updated){


      await sqldb.VISITATECNICA.w_updateVisitaTecnica({
        ID: Number(row.s_id),
        STATUS_ID: row.status_id,
        // VTUPDATE: new Date().getTime(),
      }, session.user);
      const data = JSON.parse(row.data) as VisitData

      if (row.status_id === 3){

        // Percorre Ambientes
        for(const environment of data.climatizationAndRefrigeration.environments){

          // Insere ambiente
          var teste = await sqldb.VTENVIRONMENTS.environmentExist({ID: environment.id})
          exist = teste != null;
          await insertEnvironment(environment, row.s_id, exist, session.user)

          // Insere imagens de ambiente
          if (environment.hasOwnProperty('environmentImages')){
            for (const environmentImage of environment.environmentImages){
              exist = (await sqldb.VTENVIMAGES.envImageExist({ENV_ID: environment.id, URIS: environmentImage.uri })) != null;
              if (!exist)
              {
                await insertImage(environmentImage, environment.id, session.user, 'Environment')
              }
            }
          }
        }

        // Percorre Máquina
        for(const machine of data.climatizationAndRefrigeration.machines){

          // Insere Máquina
          exist = (await sqldb.VTMACHINES.machineExist({ID: machine.id})) != null;
          await insertMachine(machine, row.s_id, exist, session.user)

          // Inserção de imagens de Máquina
          await controlInsertMachineImages(machine, session.user)
        }

        // Insere energia
        if (data.energy != null){
          await insertEnergy(data.energy, row.s_id, session.user)
        }

        // Percorre Water Measurer
        for(const waterMeasurer of data.water.waterMeasurers){

          // Insere Máquina
          exist = (await sqldb.VTWATERMEASURERS.waterMeasurerExist({ID: waterMeasurer.id})) != null;
          await insertWaterMeasurer(waterMeasurer, row.s_id, exist, session.user)

          // Inserção de imagens de Máquina
          await controlInsertWaterMeasurerImages(waterMeasurer, session.user)
        }

        // Percorre DRTs
        for(const drt of data.network.drts){

          if (drt.environmentId.length > 0){

            // Insere DRT
            exist = (await sqldb.VTDRTS.drtExist({ID: drt.id})) != null;
            await insertDrt(drt, row.s_id, exist, session.user)

            // Inserção de imagens de DRT
            if (drt.hasOwnProperty('installationEnvironmentImages')){
              for (const installationEnvironmentImages of drt.installationEnvironmentImages){
                exist = (await sqldb.VTDRTIMAGES.drtImageExist({DRT_ID: drt.id, URIS: installationEnvironmentImages.uri })) != null;
                if (!exist)
                {
                  await insertImage(installationEnvironmentImages, drt.id, session.user, 'Z')
                }
              }
            }

            // Inserção de Racks de DRT
            for(const rack of drt.racks){

              if (rack.environmentId.length > 0){

                // Insere Rack
                exist = (await sqldb.VTRACKS.racksExist({ID: rack.id})) != null;
                await insertRack(rack, drt.id, exist, session.user)

                // Inserção de imagens de Rack
                if (rack.hasOwnProperty('installationEnvironmentImages')){
                  for (const installationEnvironmentImages of rack.installationEnvironmentImages){
                    exist = (await sqldb.VTRACKIMAGES.rackImageExist({RACK_ID: rack.id, URIS: installationEnvironmentImages.uri })) != null;
                    if (!exist)
                    {
                      await insertImage(installationEnvironmentImages, rack.id, session.user, 'Rack')
                    }
                  }
                }
              }

            }

            // Inserção de Access Points de DRT
            for(const accessPoint of drt.accessPoints){

              if (accessPoint.environmentId.length > 0){

                // Insere Access Point
                exist = (await sqldb.VTACCESSPOINTS.accesspointsExist({ID: accessPoint.id})) != null;
                await insertAccessPoint(accessPoint, drt.id, exist, session.user)

                // Inserção de imagens de access point
                if (drt.hasOwnProperty('installationEnvironmentImages')){
                  for (const installationEnvironmentImages of accessPoint.installationEnvironmentImages){
                    exist = (await sqldb.VTACCESSPOINTIMAGES.accessPointImageExist({ACCESSPOINT_ID: accessPoint.id, URIS: installationEnvironmentImages.uri })) != null;
                    if (!exist)
                    {
                      await insertImage(installationEnvironmentImages, accessPoint.id, session.user, 'AccessPoint')
                    }
                  }
                }

                // Inserção de served environment or machine de Access Point
                if (drt.hasOwnProperty('servedEnvironmentAndMachines')){
                  for (const servedEnvironmentAndMachines of accessPoint.servedEnvironmentAndMachines){
                    // Insere Served Environment or Machine
                    exist = (await sqldb.VTSERVEDENVIRONMENTMACHINE.servedeEnvironmentMachinesExist({ID: servedEnvironmentAndMachines.id})) != null;
                    await insertServedEnvironmentMarchine(servedEnvironmentAndMachines, accessPoint.id, exist, session.user)
                  }
                }
              }
            }
          }
        }

        //Inserção de relacionamento de maquinas. Feito após inserção de máquinas para evitar problema de chave estrangeira caso venha fora de ordem
        for(const machineRelations of data.climatizationAndRefrigeration.machines){

          if (machineRelations.hasOwnProperty('associatedMachines')){
            for (const associatedMachines of machineRelations.associatedMachines){
              exist = (await sqldb.VTMACHINEMACHINES.machineMachineExist({ ID_MACHINE: machineRelations.id, ID_ASSOCIETED: associatedMachines.value})) != null;
              if (!exist)
              {
                await sqldb.VTMACHINEMACHINES.w_addVtMachineMachines({
                  ID_MACHINE: machineRelations.id,
                  ID_ASSOCIETED: associatedMachines.value,
                }, session.user)
              }
            }
          }
          if (machineRelations.hasOwnProperty('associatedEnvs')){
            for (const associatedEnvs of machineRelations.associatedEnvs){
              exist = (await sqldb.VTMACHINEENVS.machineEnvExist({ID_MACHINE: machineRelations.id, ID_ENV: associatedEnvs.value})) != null;
              if (!exist)
              {
                await sqldb.VTMACHINEENVS.w_addVtMachineEnvs({
                  ID_MACHINE: machineRelations.id,
                  ID_ENV: associatedEnvs.value
                }, session.user)
              }
            }
          }
          if (machineRelations.hasOwnProperty('associatedEnvsLocalization')){
            for (const associatedEnvsLocalization of machineRelations.associatedEnvsLocalization){
              exist = (await sqldb.VTMACHINEENVSLOCATION.machineEnvLocationExist({ ID_MACHINE: machineRelations.id, ID_ENV: associatedEnvsLocalization.value})) != null;
              if (!exist)
              {
                await sqldb.VTMACHINEENVSLOCATION.w_addVtMachineEnvsLocation({
                  ID_MACHINE: machineRelations.id,
                  ID_ENV: associatedEnvsLocalization.value
                }, session.user)
              }
            }
          }
        }
      }
    }
  }
  catch (err){
    logger.error(`msg: ${err} - user: ${session.user} - params: ${JSON.stringify(reqParams)}`);
    throw err;
  }
  return { success: true };
};

async function sendImageToS3(images?: Buffer[]) {
  let imagesKey: string[] = [];

  if (images && images.length) {
    await Promise.all(
      images.map(async (img) => {
        const fileName = uuid.v4() + ".jpg";
        imagesKey.push(servConfig.filesBucket.vtImagesBucketPath + fileName);

        await sendToS3_vtImages(fileName, img)
        .catch((perr) => {
          logger.error("Error uploading data (S3): ", perr);
          throw Error("Error uploading data").HttpStatus(500);
        });
      })
    );
  }

  return imagesKey;
}

const photoUploadMW = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MiB
  storage: multer.memoryStorage(),
  // When using memory storage, the file info will contain a field called buffer that contains the entire file.
}).fields([{ name: "VT_IMGS", maxCount: 10 }]);

async function getUploadedPhoto(req: express.Request, res: express.Response) {
  const { files, body: _body } = await getUploadedGeneric(req, res, photoUploadMW);

  let img_buffer: Buffer[] = [];

  img_buffer = files["VT_IMGS"].map((img) => img.buffer);

  return img_buffer;
}

export async function insertEnvironment (environment: Environment, s_id: any, exist: any, user: any){
  // Verifica se ambientes existem
  if (exist)
  {
    await sqldb.VTENVIRONMENTS.w_updateVtEnvironment({
      ID: environment.id,
      VT_ID: s_id,
      ENVTYPE_ID: environment.context === 'Climatizado' ? 1 : 2,
      TAG: environment.tag,
      NAME: environment.name,
      LOCATION: environment.location,
      TYPE: environment.type,
      EVAPORATORS_COUNT: Number.isInteger(environment.evaporatorsCount) ?  environment.evaporatorsCount : 0,
      SHOULD_EVAPORATORS_WORK_FULLTIME: (environment.shouldEvaporatorsWorkFullTime ? 1 : 0),
      CONTROLLERTIME: environment.controllerTime,
      MINTEMPERATURE: environment.minTemperature,
      MAXTEMPERATURE: environment.maxTemperature,
      AREA_IN_SQUARE_METERS: environment.areaInSquareMeters,
    }, user)
  }
  else{
    await sqldb.VTENVIRONMENTS.w_addVtEnvironment({
      ID: environment.id,
      VT_ID: s_id,
      ENVTYPE_ID: environment.context === 'Climatizado' ? 1 : 2,
      TAG: environment.tag,
      NAME: environment.name,
      LOCATION: environment.location,
      TYPE: environment.type,
      EVAPORATORS_COUNT: Number.isInteger(environment.evaporatorsCount) ?  environment.evaporatorsCount : 0,
      SHOULD_EVAPORATORS_WORK_FULLTIME: (environment.shouldEvaporatorsWorkFullTime ? 1 : 0),
      CONTROLLERTIME: environment.controllerTime,
      MINTEMPERATURE: environment.minTemperature,
      MAXTEMPERATURE: environment.maxTemperature,
      AREA_IN_SQUARE_METERS: environment.areaInSquareMeters,
    }, user)
  }
}

export async function insertMachine (machine: Machine, s_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTMACHINES.w_updateVtMachines({
      ID: machine.id,
      VT_ID: s_id,
      TYPE_ID: machine.context === 'Evaporadora' ? 1 : 2,
      UNIT_ID: (machine.unit === 'BTUh' ? 1 : (machine.unit === 'TR' ? 2 : 3)),
      TAG: machine.tag,
      TYPE: machine.type,
      MODEL: machine.model,
      BRAND: machine.brand,
      CYCLES: Number.isInteger(machine.cycles) ?  machine.cycles : 0,
      FRIGO_CAPACITY: machine.frigoCapacity,
      RATED_POWER: machine.ratedPower,
      TENSION: machine.tension,
      FLUID: machine.fluid,
      VALVE: machine.valve
    }, user)
  }
  else{
    await sqldb.VTMACHINES.w_addMachines({
      ID: machine.id,
      VT_ID: s_id,
      TYPE_ID: machine.context === 'Evaporadora' ? 1 : 2,
      UNIT_ID: (machine.unit === 'BTUh' ? 1 : (machine.unit === 'TR' ? 2 : 3)),
      TAG: machine.tag,
      TYPE: machine.type,
      MODEL: machine.model,
      BRAND: machine.brand,
      CYCLES: Number.isInteger(machine.cycles) ?  machine.cycles : 0,
      FRIGO_CAPACITY: machine.frigoCapacity,
      RATED_POWER: machine.ratedPower,
      TENSION: machine.tension,
      FLUID: machine.fluid,
      VALVE: machine.valve
    }, user)
  }
}

export async function controlInsertMachineImages (machine: Machine, user: any){
  var exist = false
  if (machine.hasOwnProperty('evaporatorPlateImages')){
    for (const evaporatorPlateImage of machine.evaporatorPlateImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: evaporatorPlateImage.uri})) != null;
      if (!exist)
      {
        await insertImage(evaporatorPlateImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('condenserPlateImages')){
    for (const condenserPlateImage of machine.condenserPlateImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: condenserPlateImage.uri})) != null;
      if (!exist)
      {
        await insertImage(condenserPlateImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('environmentCondenserImages')){
    for (const environmentCondenserImage of machine.environmentCondenserImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: environmentCondenserImage.uri})) != null;
      if (!exist)
      {
        await insertImage(environmentCondenserImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('environmentEvaporatorImages')){
    for (const environmentEvaporatorImage of machine.environmentEvaporatorImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: environmentEvaporatorImage.uri})) != null;
      if (!exist)
      {
        await insertImage(environmentEvaporatorImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('electricCommandImages')){
    for (const electricCommandImage of machine.electricCommandImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: electricCommandImage.uri})) != null;
      if (!exist)
      {
        await insertImage(electricCommandImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('valveImages')){
    for (const valveImage of machine.valveImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: valveImage.uri})) != null;
      if (!exist)
      {
        await insertImage(valveImage, machine.id, user, 'Machine')
      }
    }
  }
  if (machine.hasOwnProperty('compressorsImages')){
    for (const compressorsImage of machine.compressorsImages){
      exist = (await sqldb.VTMACHINEIMAGES.machineImageExist({MACHINE_ID: machine.id, URIS: compressorsImage.uri})) != null;
      if (!exist)
      {
        await insertImage(compressorsImage, machine.id, user, 'Machine')
      }
    }
  }
}

export async function insertEnergy (energy: Energy, s_id: any, user: any){

  const energyExist = await sqldb.VTENERGIES.energyExist({VT_ID: s_id})
  var energyId
  if (energyExist != null){
    energyId = energyExist.ID
  }
  else{
    const insertedEnergy = await sqldb.VTENERGIES.w_addEnergies({
      VT_ID: s_id
    }, user)
    energyId = insertedEnergy.insertId
  }

  // Inserção de imagens de energia
  await controlInsertEnergyImages(energy, energyId, user)
}

export async function controlInsertEnergyImages (energy: Energy, energyId: number, user: any){
  var exist = false
  if (energy.hasOwnProperty('electricalBoardImages')){
    for (const electricalBoardImages of energy.electricalBoardImages){
      exist = (await sqldb.VTENERGYIMAGES.energyImageExist({ENERGY_ID: energyId, URIS: electricalBoardImages.uri})) != null;
      if (!exist)
      {
        await insertImage(electricalBoardImages, energyId, user, 'Energy')
      }
    }
  }
  if (energy.hasOwnProperty('electricalBoardEnvironmentImages')){
    for (const electricalBoardEnvironmentImages of energy.electricalBoardEnvironmentImages){
      exist = (await sqldb.VTENERGYIMAGES.energyImageExist({ENERGY_ID: energyId, URIS: electricalBoardEnvironmentImages.uri})) != null;
      if (!exist)
      {
        await insertImage(electricalBoardEnvironmentImages, energyId, user, 'Energy')
      }
    }
  }
  if (energy.hasOwnProperty('measurerImages')){
    for (const measurerImages of energy.measurerImages){
      exist = (await sqldb.VTENERGYIMAGES.energyImageExist({ENERGY_ID: energyId, URIS: measurerImages.uri})) != null;
      if (!exist)
      {
        await insertImage(measurerImages, energyId, user, 'Energy')
      }
    }
  }
  if (energy.hasOwnProperty('generalCircuitBreakerImages')){
    for (const generalCircuitBreakerImages of energy.generalCircuitBreakerImages){
      exist = (await sqldb.VTENERGYIMAGES.energyImageExist({ENERGY_ID: energyId, URIS: generalCircuitBreakerImages.uri})) != null;
      if (!exist)
      {
        await insertImage(generalCircuitBreakerImages, energyId, user, 'Energy')
      }
    }
  }
  if (energy.hasOwnProperty('cablesOrBusesImages')){
    for (const cablesOrBusesImages of energy.electricalBoardImages){
      exist = (await sqldb.VTENERGYIMAGES.energyImageExist({ENERGY_ID: energyId, URIS: cablesOrBusesImages.uri})) != null;
      if (!exist)
      {
        await insertImage(cablesOrBusesImages, energyId, user, 'Energy')
      }
    }
  }
}


export async function insertWaterMeasurer (waterMeasurer: WaterMeasurer, s_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTWATERMEASURERS.w_updateVtWaterMeasurers({
      ID: waterMeasurer.id,
      VT_ID: s_id,
      SITUATION: waterMeasurer.situation,
      BRAND: waterMeasurer.brand,
      MODEL: waterMeasurer.model,
      LOCALIZATION: waterMeasurer.localization,
      FLOORLOCALIZATION: waterMeasurer.floorLocalization,
      PIPEDIAMETER: waterMeasurer.pipeDiameter,
      INSTALLOTHERMETERWITHOUTBUILDING: waterMeasurer.isPossibleToInstallOtherMeterWithTheGeneralMeasurerWithoutBuilding === true ? "1" : "0" ,
      TRANSMISSIONGIVENSUCCESSFULY: waterMeasurer.wasTheTransmissionGivenByTheSxRadioTransmitterSuccessful
    }, user)
  }
  else{
    await sqldb.VTWATERMEASURERS.w_addWaterMeasurer({
      ID: waterMeasurer.id,
      VT_ID: s_id,
      SITUATION: waterMeasurer.situation,
      BRAND: waterMeasurer.brand,
      MODEL: waterMeasurer.model,
      LOCALIZATION: waterMeasurer.localization,
      FLOORLOCALIZATION: waterMeasurer.floorLocalization,
      PIPEDIAMETER: waterMeasurer.pipeDiameter,
      INSTALLOTHERMETERWITHOUTBUILDING: waterMeasurer.isPossibleToInstallOtherMeterWithTheGeneralMeasurerWithoutBuilding === true ? "1" : "0" ,
      TRANSMISSIONGIVENSUCCESSFULY: waterMeasurer.wasTheTransmissionGivenByTheSxRadioTransmitterSuccessful
    }, user)
  }
}

export async function controlInsertWaterMeasurerImages (waterMeasurer: WaterMeasurer, user: any){
  var exist = false
  if (waterMeasurer.hasOwnProperty('measurerEnvironment')){
    for (const measurerEnvironment of waterMeasurer.measurerEnvironment){
      exist = (await sqldb.VTWATERMEASURERIMAGES.waterMeasurerImageExist({WATERMEASURERS_ID: waterMeasurer.id, URIS: measurerEnvironment.uri})) != null;
      if (!exist)
      {
        await insertImage(measurerEnvironment, waterMeasurer.id, user, 'WaterMeasurer')
      }
    }
  }
  if (waterMeasurer.hasOwnProperty('measurerImages')){
    for (const measurerImages of waterMeasurer.measurerImages){
      exist = (await sqldb.VTWATERMEASURERIMAGES.waterMeasurerImageExist({WATERMEASURERS_ID: waterMeasurer.id, URIS: measurerImages.uri})) != null;
      if (!exist)
      {
        await insertImage(measurerImages, waterMeasurer.id, user, 'WaterMeasurer')
      }
    }
  }
}

export async function insertDrt (drt: DRT, s_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTDRTS.w_updateVtDrts({
      ID: drt.id,
      VT_ID: s_id,
      ENVIRONMENT_ID: drt.environmentId
    }, user)
  }
  else{
    await sqldb.VTDRTS.w_addDrts({
      ID: drt.id,
      VT_ID: s_id,
      ENVIRONMENT_ID: drt.environmentId
    }, user)
  }
}

export async function insertRack (rack: Rack, drt_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTRACKS.w_updateVtRacks({
      ID: rack.id,
      DRT_ID: drt_id,
      ENVIRONMENT_ID: rack.environmentId,
      DISTANCETOAP: rack.distanceToAp ,
      COMMENTS: rack.comments
    }, user)
  }
  else{
    await sqldb.VTRACKS.w_addRacks({
      ID: rack.id,
      DRT_ID: drt_id,
      ENVIRONMENT_ID: rack.environmentId,
      DISTANCETOAP: rack.distanceToAp ,
      COMMENTS: rack.comments
    }, user)
  }
}

export async function insertAccessPoint (accessPoint: AccessPoint, drt_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTACCESSPOINTS.w_updateVtAccesspoints({
      ID: accessPoint.id,
      DRT_ID: drt_id,
      ENVIRONMENT_ID: accessPoint.environmentId,
      TYPE: accessPoint.type,
      DISTANCETOAP: accessPoint.distanceToAp ,
      COMMENTS: accessPoint.comments
    }, user)
  }
  else{
    await sqldb.VTACCESSPOINTS.w_addVtAccesspoints({
      ID: accessPoint.id,
      DRT_ID: drt_id,
      ENVIRONMENT_ID: accessPoint.environmentId,
      TYPE: accessPoint.type,
      DISTANCETOAP: accessPoint.distanceToAp ,
      COMMENTS: accessPoint.comments
    }, user)
  }
}

export async function insertServedEnvironmentMarchine (servedEnvironmentMachine: ServedEnvironmentOrMachine, accessPoint_id: any, exist: any, user: any){
  if (exist){
    await sqldb.VTSERVEDENVIRONMENTMACHINE.w_updateVtServedeEnvironmentMachines({
      ID: servedEnvironmentMachine.id,
      ACCESSPOINT_ID: accessPoint_id,
      TYPE: servedEnvironmentMachine.type,
      TAG: servedEnvironmentMachine.tag,
      SIGNALQUALITY: servedEnvironmentMachine.signalQuality,
      DISTANCETOAP: servedEnvironmentMachine.apDistance,
      COMMENTS:  servedEnvironmentMachine.comments
    }, user)
  }
  else{
    await sqldb.VTSERVEDENVIRONMENTMACHINE.w_addServedeEnvironmentMachines({
      ID: servedEnvironmentMachine.id,
      ACCESSPOINT_ID: accessPoint_id,
      TYPE: servedEnvironmentMachine.type,
      TAG: servedEnvironmentMachine.tag,
      SIGNALQUALITY: servedEnvironmentMachine.signalQuality,
      DISTANCETOAP: servedEnvironmentMachine.apDistance,
      COMMENTS:  servedEnvironmentMachine.comments
    }, user)
  }
}

export async function insertImage (image: Image, objectId: any, user: any, type: string){
    if (type === 'Environment'){
      await sqldb.VTENVIMAGES.w_addVtEnvImages({
        ENV_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'Machine'){
      await sqldb.VTMACHINEIMAGES.w_addVtMachineImages({
        MACHINE_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'Energy'){
      await sqldb.VTENERGYIMAGES.w_addVtEnergyImages({
        ENERGY_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'WaterMeasurer'){
      await sqldb.VTWATERMEASURERIMAGES.w_addVtWaterMeasurerImages({
        WATERMEASURERS_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'Drt'){
      await sqldb.VTDRTIMAGES.w_addVtDrtImages({
        DRT_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'Rack'){
      await sqldb.VTRACKIMAGES.w_addVtRackImages({
        RACK_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
    else if (type === 'AccessPoint'){
      await sqldb.VTACCESSPOINTIMAGES.w_addVtAccessPointImages({
        ACCESSPOINT_ID: objectId,
        CONTEXT: image.context,
        URIS: image.uri,
      }, user)
    }
}

export async function deleteVTs (lastPulledAt: number, user: string) {

  // busca todas as visitas do técnico que podem ser apagadas
  var can_deleted_vts = await sqldb.VISITATECNICA.getVisitaTecnica({
    USER: user,
    VTDELETED: '1',
    VTDELETED_DATE_UNDER: lastPulledAt
  });

  for(const vt of can_deleted_vts) {
    await vtInfo.deleteVT(vt.ID, user)
  }
}
