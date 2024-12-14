import * as httpRouter from "../apiServer/httpRouter";
import sqldb from "../../srcCommon/db";
import servConfig from "../../configfile";
import * as multer from "multer";
import * as express from "express";
import * as uuid from "uuid";
import { today_shiftedYMD_s } from "../../srcCommon/helpers/dates";

import { logger } from '../../srcCommon/helpers/logger';
import { sendToS3_vtImages } from "../../srcCommon/s3/connectS3";
import { getUploadedGeneric } from "../apiServer/getMultiparFiles";

enum VTSTATUS {
  AGENDADO = 1,
  EMANDAMENTO = 2,
  AGUARDANDOAPROVACAO = 3,
  FINALIZADO = 4,
  REAGENDADO = 5,
  REAGENDAMENTOSOLICITADO = 6,
}

httpRouter.privateRoutes["/vt/set-vt-info"] = async function (
  reqParams,
  session,
  { req, res }
) {
  const { plantabaixa_img_buffer, autorizacao_img_buffer, requestBody } =
    await getUploadedPhoto(req, res);
  reqParams = requestBody as typeof reqParams;

  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.CLIENT_ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing CLIENT_ID."
    ).HttpStatus(400);
  if (!reqParams.UNIT_ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing UNIT_ID."
    ).HttpStatus(400);
  if (!reqParams.CARACTERISTICA)
    throw Error(
      "There was an error!\nInvalid properties. Missing CARACTERISTICA_ID."
    ).HttpStatus(400);
  if (!reqParams.TECNICO_ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing TECNICO_ID."
    ).HttpStatus(400);
  if (!reqParams.VTDATE)
    throw Error(
      "There was an error!\nInvalid properties. Missing VTDATE."
    ).HttpStatus(400);
  if (!reqParams.VTTIME)
    throw Error(
      "There was an error!\nInvalid properties. Missing VTTIME."
    ).HttpStatus(400);

  if (!reqParams.AMBIENTES) reqParams.AMBIENTES = null;
  if (!reqParams.MAQUINAS) reqParams.MAQUINAS = null;
  if (!reqParams.OBSERVACAO) reqParams.OBSERVACAO = null;

  const {
    plantaBaixaImgs,
    autorizacaoImgs,
  } = await sendImageToS3(
    plantabaixa_img_buffer,
    autorizacao_img_buffer
  );

  await sqldb.VISITATECNICA.w_addVisitaTecnica({
    CLIENT_ID: (reqParams.CLIENT_ID || null) && Number(reqParams.CLIENT_ID),
    UNIT_ID: (reqParams.UNIT_ID || null) && Number(reqParams.UNIT_ID),
    CARACTERISTICA: ((reqParams.CARACTERISTICA instanceof Array) ? reqParams.CARACTERISTICA.join(';') : reqParams.CARACTERISTICA) || null,
    TECNICO_ID: reqParams.TECNICO_ID,
    RESPONSAVEL: session.user,
    VTDATE: reqParams.VTDATE,
    VTTIME: reqParams.VTTIME,
    VTUPDATE: new Date().getTime(),
    AMBIENTES: (reqParams.AMBIENTES || null) && Number(reqParams.AMBIENTES),
    MAQUINAS: (reqParams.MAQUINAS || null) && Number(reqParams.MAQUINAS),
    PLANTABAIXA_IMG: plantaBaixaImgs.join(";"),
    AUTORIZACAO_IMG: autorizacaoImgs.join(";"),
    OBSERVACAO: reqParams.OBSERVACAO,
  }, session.user);

  res.send("Insert OK!");

  return res;
};

httpRouter.privateRoutes["/vt/update-vt-info"] = async function (
  reqParams,
  session,
  { req, res }
) {
  const { plantabaixa_img_buffer, autorizacao_img_buffer, requestBody } =
    await getUploadedPhoto(req, res);
  reqParams = requestBody as typeof reqParams;

  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing ID."
    ).HttpStatus(400);

  const vt = await sqldb.VISITATECNICA.getVisitaTecnica({ ID: Number(reqParams.ID) }).then(vt => {
    return vt[0]
  });

  // Permite editar a VT somente se o status é agendado e a data da visita é maior que a data de hoje
  if ((vt.STATUS_ID !== VTSTATUS.AGENDADO) || (new Date(vt.VTDATE + '00:00:00') > new Date()))
    throw Error("There was an error!\nYou cannot edit this VT.").HttpStatus(
      400
    );

  if (!reqParams.CLIENT_ID) reqParams.CLIENT_ID = null;
  if (!reqParams.UNIT_ID) reqParams.UNIT_ID = null;
  if (!reqParams.CARACTERISTICA) reqParams.CARACTERISTICA = null;
  if (!reqParams.TECNICO_ID) reqParams.TECNICO_ID = null;
  if (!reqParams.VTDATE) reqParams.VTDATE = null;
  if (!reqParams.VTTIME) reqParams.VTTIME = null;
  if (!reqParams.AMBIENTES) reqParams.AMBIENTES = null;
  if (!reqParams.MAQUINAS) reqParams.MAQUINAS = null;
  if (!reqParams.OBSERVACAO) reqParams.OBSERVACAO = null;

  // TODO: Deletar as imagens e enviar novamente

  const {
    plantaBaixaImgs,
    autorizacaoImgs,
  } = await sendImageToS3(
    plantabaixa_img_buffer,
    autorizacao_img_buffer
  );

  await sqldb.VISITATECNICA.w_updateVisitaTecnica({
    ID: Number(reqParams.ID),
    CLIENT_ID: (reqParams.CLIENT_ID || null) && Number(reqParams.CLIENT_ID),
    UNIT_ID: (reqParams.UNIT_ID || null) && Number(reqParams.UNIT_ID),
    CARACTERISTICA: ((reqParams.CARACTERISTICA instanceof Array) ? reqParams.CARACTERISTICA.join(';') : reqParams.CARACTERISTICA) || null,
    TECNICO_ID: reqParams.TECNICO_ID,
    VTDATE: reqParams.VTDATE,
    VTTIME: reqParams.VTTIME,
    AMBIENTES: (reqParams.AMBIENTES || null) && Number(reqParams.AMBIENTES),
    MAQUINAS: (reqParams.MAQUINAS || null) && Number(reqParams.MAQUINAS),
    PLANTABAIXA_IMG: plantaBaixaImgs.join(";"),
    AUTORIZACAO_IMG: autorizacaoImgs.join(";"),
    OBSERVACAO: reqParams.OBSERVACAO,
  }, session.user);

  res.send("Update OK");

  return res;
};

httpRouter.privateRoutes["/vt/reschedule-vt"] = async function (
  reqParams,
  session,
  { req, res }
) {
  const { plantabaixa_img_buffer, autorizacao_img_buffer, requestBody } =
    await getUploadedPhoto(req, res);
  reqParams = requestBody as typeof reqParams;

  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing ID."
    ).HttpStatus(400);

  const vt = await sqldb.VISITATECNICA.getVisitaTecnica({ ID: Number(reqParams.ID) }).then(vt => {
    return vt[0]
  });

  // Permite reagendar a VT somente se o status é reagendamento solicitado
  if (vt.STATUS_ID !== VTSTATUS.REAGENDAMENTOSOLICITADO)
    throw Error(
      "There was an error!\nYou cannot reschedule this VT."
    ).HttpStatus(400);

  if (!reqParams.CLIENT_ID) reqParams.CLIENT_ID = null;
  if (!reqParams.UNIT_ID) reqParams.UNIT_ID = null;
  if (!reqParams.CARACTERISTICA) reqParams.CARACTERISTICA = null;
  if (!reqParams.TECNICO_ID) reqParams.TECNICO_ID = null;
  if (!reqParams.VTDATE) reqParams.VTDATE = null;
  if (!reqParams.VTTIME) reqParams.VTTIME = null;
  if (!reqParams.AMBIENTES) reqParams.AMBIENTES = null;
  if (!reqParams.MAQUINAS) reqParams.MAQUINAS = null;
  if (!reqParams.OBSERVACAO) reqParams.OBSERVACAO = null;

  // TODO: Deletar as imagens e enviar novamente

  const {
    plantaBaixaImgs,
    autorizacaoImgs,
  } = await sendImageToS3(
    plantabaixa_img_buffer,
    autorizacao_img_buffer
  );

  await sqldb.VISITATECNICA.w_updateVisitaTecnica({
    ID: Number(reqParams.ID),
    CLIENT_ID: (reqParams.CLIENT_ID || null) && Number(reqParams.CLIENT_ID),
    UNIT_ID: (reqParams.UNIT_ID || null) && Number(reqParams.UNIT_ID),
    STATUS_ID: VTSTATUS.REAGENDADO,
    CARACTERISTICA: ((reqParams.CARACTERISTICA instanceof Array) ? reqParams.CARACTERISTICA.join(';') : reqParams.CARACTERISTICA) || null,
    TECNICO_ID: reqParams.TECNICO_ID,
    VTDATE: reqParams.VTDATE,
    VTTIME: reqParams.VTTIME,
    AMBIENTES: (reqParams.AMBIENTES || null) && Number(reqParams.AMBIENTES),
    MAQUINAS: (reqParams.MAQUINAS || null) && Number(reqParams.MAQUINAS),
    PLANTABAIXA_IMG: plantaBaixaImgs.join(";"),
    AUTORIZACAO_IMG: autorizacaoImgs.join(";"),
    OBSERVACAO: reqParams.OBSERVACAO,
  }, session.user);

  res.send("Reschedule OK");

  return res;
};

httpRouter.privateRoutes["/vt/get-vt-info"] = async function (
  reqParams,
  session
) {
  const userIsAdmin = session.permissions.isAdminSistema;

  const vt = await sqldb.VISITATECNICA.getVisitaTecnica({
    ID: reqParams.ID,
    USER: userIsAdmin ? undefined : session.user,
  }).then(e => {
    return e[0]
  });

  return {
    ID: vt.ID,
    CLIENT_ID: vt.CLIENT_ID,
    UNIT_ID: vt.UNIT_ID,
    TECNICO_ID: vt.TECNICO_ID,
    VTDATE: vt.VTDATE,
    VTTIME: vt.VTTIME,
    AMBIENTES: vt.AMBIENTES,
    MAQUINAS: vt.MAQUINAS,
    CARACTERISTICA:
      vt.CARACTERISTICA && vt.CARACTERISTICA.length
        ? vt.CARACTERISTICA.split(";").map((e) => parseInt(e))
        : null,
    PLANTABAIXA_IMG:
      vt.PLANTABAIXA_IMG && vt.PLANTABAIXA_IMG.length
        ? vt.PLANTABAIXA_IMG.split(";").map(
            (e) =>
              `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
          )
        : null,
    AUTORIZACAO_IMG:
      vt.AUTORIZACAO_IMG && vt.AUTORIZACAO_IMG.length
        ? vt.AUTORIZACAO_IMG.split(";").map(
            (e) =>
              `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
          )
        : null,
    OBSERVACAO: vt.OBSERVACAO,
    OBSERVACAO_REAGENDAMENTO: vt.OBSERVACAO_REAGENDAMENTO,
    RESPONSAVEL: vt.RESPONSAVEL,
    CITY_NAME: vt.CITY_NAME,
    CLIENT_NAME: vt.CLIENT_NAME,
    UNIT_NAME: vt.UNIT_NAME,
    UNIT_LAT: vt.UNIT_LAT,
    UNIT_LON: vt.UNIT_LON,
    RESPONSAVEL_NOME: vt.RESPONSAVEL_NOME,
    TECNICO_NOME: vt.TECNICO_NOME,
    TECNICO_PHONE: vt.TECNICO_PHONE,
    CIDADE_TECNICO: vt.CIDADE_TECNICO,
  };
};

httpRouter.privateRoutes["/vt/list-vt-byStatus"] = async function (
  reqParams,
  session
) {
  const regularUser = !session.permissions.isAdminSistema;
  const list_vts = await sqldb.VISITATECNICA.getVisitaTecnica({
    STATUS_ID: reqParams.STATUS_ID,
    USER: regularUser ? session.user : undefined,
    VTDATE: regularUser ? today_shiftedYMD_s() : undefined,
  });

  return list_vts.map(vt => {
    return {
      ID: vt.ID,
      CLIENT_ID: vt.CLIENT_ID,
      UNIT_ID: vt.UNIT_ID,
      TECNICO_ID: vt.TECNICO_ID,
      VTDATE: vt.VTDATE,
      VTTIME: vt.VTTIME,
      AMBIENTES: vt.AMBIENTES,
      MAQUINAS: vt.MAQUINAS,
      CARACTERISTICA:
        vt.CARACTERISTICA && vt.CARACTERISTICA.length
          ? vt.CARACTERISTICA.split(";").map((e) => parseInt(e))
          : null,
      PLANTABAIXA_IMG:
        vt.PLANTABAIXA_IMG && vt.PLANTABAIXA_IMG.length
          ? vt.PLANTABAIXA_IMG.split(";").map(
              (e) =>
                `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
            )
          : null,
      AUTORIZACAO_IMG:
        vt.AUTORIZACAO_IMG && vt.AUTORIZACAO_IMG.length
          ? vt.AUTORIZACAO_IMG.split(";").map(
              (e) =>
                `${servConfig.filesBucket.url}/${servConfig.filesBucket.vtImagesBucketPath}${e}`
            )
          : null,
      OBSERVACAO: vt.OBSERVACAO,
      OBSERVACAO_REAGENDAMENTO: vt.OBSERVACAO_REAGENDAMENTO,
      RESPONSAVEL: vt.RESPONSAVEL,
      CITY_NAME: vt.CITY_NAME,
      CLIENT_NAME: vt.CLIENT_NAME,
      UNIT_NAME: vt.UNIT_NAME,
      UNIT_LAT: vt.UNIT_LAT,
      UNIT_LON: vt.UNIT_LON,
      RESPONSAVEL_NOME: vt.RESPONSAVEL_NOME,
      RESPONSAVEL_PHONE: vt.RESPONSAVEL_PHONE,
      TECNICO_NOME: vt.TECNICO_NOME,
      TECNICO_SOBRENOME: vt.TECNICO_SOBRENOME,
      TECNICO_PHONE: vt.TECNICO_PHONE,
      CIDADE_TECNICO: vt.CIDADE_TECNICO,
      STATUS_ID: vt.STATUS_ID,
      STATUS: vt.STATUS
    };
  });
};

httpRouter.privateRoutes["/vt/list-vt-caracteristicas"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  const list_characteristic =
    await sqldb.VISITATECNICA.getCaracteristicasVisitaTecnica();

  return list_characteristic;
};

httpRouter.privateRoutes["/vt/approve-vt"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing ID."
    ).HttpStatus(400);

  const vt = await sqldb.VISITATECNICA.getVisitaTecnica({ ID: reqParams.ID }).then(vt => {
    return vt[0]
  });

  // Permite reagendar a VT somente se o status é reagendamento solicitado
  if (vt.STATUS_ID !== VTSTATUS.AGUARDANDOAPROVACAO)
    throw Error("There was an error!\nYou cannot approve this VT.").HttpStatus(
      400
    );

  await sqldb.VISITATECNICA.w_updateVisitaTecnica({
    ID: reqParams.ID,
    STATUS_ID: VTSTATUS.FINALIZADO,
  }, session.user);

  return "Approve OK";
};

httpRouter.privateRoutes["/vt/delete-vt"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing ID."
    ).HttpStatus(400);

  // Como a visita pode já estar com o técnico, necessário setar flag de deletada (VTDELETED) para '1'
  // para que na próxima sincronização seja deletada também do aparelho
  await sqldb.VISITATECNICA.w_updateVisitaTecnica({ID: reqParams.ID, VTDELETED: '1'}, session.user);

  return "Delete OK";
};

httpRouter.privateRoutes["/vt/technician-vt"] = async function (
  reqParams,
  session
) {
  if (!session.permissions.isAdminSistema)
    throw Error("Permission denied!").HttpStatus(403);

  if (!reqParams.ID)
    throw Error(
      "There was an error!\nInvalid properties. Missing VT ID."
    ).HttpStatus(400);

  const technician = await sqldb.VISITATECNICA.getTecnico({
    ID: reqParams.ID,
  });

  return technician;
};

async function sendImageToS3(plantabaixa_img?: Buffer[], autorizacao_img?: Buffer[]) {
  let plantaBaixaImgs: string[] = [];

  if (plantabaixa_img && plantabaixa_img.length) {
    await Promise.all(
      plantabaixa_img.map(async (img) => {
        const fileName = "vt-planB-" + uuid.v4() + ".jpg";
        plantaBaixaImgs.push(fileName);
  
        await sendToS3_vtImages(fileName, img)
        .catch((perr) => {
          logger.error("Error uploading planta baixa images to (S3): ", perr);
          throw Error("Error uploading data").HttpStatus(500);
        });
      })
    );
  }

  let autorizacaoImgs: string[] = [];

  if (autorizacao_img && autorizacao_img.length) {
    await Promise.all(
      autorizacao_img.map(async (img) => {
        const fileName = "vt-aut-" + uuid.v4() + ".jpg";
        autorizacaoImgs.push(fileName);
  
        await sendToS3_vtImages(fileName, img)
        .catch((perr) => {
          logger.error("Error uploading autorização images to (S3): ", perr);
          throw Error("Error uploading data").HttpStatus(500);
        });
      })
    );
  }

  return { plantaBaixaImgs, autorizacaoImgs };
}

const photoUploadMW = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MiB
  storage: multer.memoryStorage(),
  // When using memory storage, the file info will contain a field called buffer that contains the entire file.
}).fields([
  { name: "PLANTABAIXA_IMG", maxCount: 3 },
  { name: "AUTORIZACAO_IMG", maxCount: 3 },
]);

async function getUploadedPhoto(req: express.Request, res: express.Response) {
  const { files, body } = await getUploadedGeneric(req, res, photoUploadMW);

  let plantabaixa_img_buffer: Buffer[] = [];

  if (
    files &&
    files["PLANTABAIXA_IMG"] &&
    files["PLANTABAIXA_IMG"].length
  ) {
    plantabaixa_img_buffer = files["PLANTABAIXA_IMG"].map(
      (img) => img.buffer
    );
  }

  let autorizacao_img_buffer: Buffer[] = [];

  if (
    files &&
    files["AUTORIZACAO_IMG"] &&
    files["AUTORIZACAO_IMG"].length
  ) {
    autorizacao_img_buffer = files["AUTORIZACAO_IMG"].map(
      (img) => img.buffer
    );
  }

  return {
    plantabaixa_img_buffer,
    autorizacao_img_buffer,
    requestBody: body,
  };
}

export async function removingClient (qPars: { CLIENT_ID: number }, userId: string) {
  const list = await sqldb.VISITATECNICA.getListFromClient({ CLIENT_ID: qPars.CLIENT_ID });
  for (const { ID } of list) {
    await deleteVT(ID, userId);
  }
  // await sqldb.VISITATECNICA.w_deleteFromClient({ CLIENT_ID: qPars.CLIENT_ID }, userId);
}

export async function removingUnit (qPars: { UNIT_ID: number }, userId: string) {
  const list = await sqldb.VISITATECNICA.getListFromUnit({ UNIT_ID: qPars.UNIT_ID });
  for (const { ID } of list) {
    await deleteVT(ID, userId);
  }
  // await sqldb.VISITATECNICA.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID }, userId);
}

export async function removingUser (qPars: { USER_ID: string }, userId: string) {
  const list = await sqldb.VISITATECNICA.getListFromUser({ USER_ID: qPars.USER_ID });
  for (const { ID } of list) {
    await deleteVT(ID, userId);
  }
  // await sqldb.VISITATECNICA.w_deleteFromUser({ USER_ID: qPars.USER_ID }, userId);
}

export async function deleteVT (ID: number, userId: string) {

  // Seleciona machines e environments da VT para deletar
  const environments = await sqldb.VTENVIRONMENTS.getVtEnvironments({VT_ID: ID})
  const machines = await sqldb.VTMACHINES.getVtMachines({VT_ID: ID})
  const energy = await sqldb.VTENERGIES.getVtEnergies({VT_ID: ID})
  const waterMeasurers = await sqldb.VTWATERMEASURERS.getVtWaterMeasurers({VT_ID: ID})
  const drts = await sqldb.VTDRTS.getVtDrts({VT_ID: ID})
  var racks
  var accessPoints

  // Para cada environment deleta registros filhos relacionados
  for(const environment of environments) {
    await sqldb.VTENVIMAGES.w_deleteVtEnvImages({ENV_ID: environment.ID}, userId)
    await sqldb.VTMACHINEENVS.w_deleteVtMachineEnvs2({ ID_ENV: environment.ID }, userId);
    await sqldb.VTMACHINEENVSLOCATION.w_deleteVtMachineEnvsLocation2({ ID_ENV: environment.ID }, userId);
  }

  // Para cada machine deleta registros filhos relacionados
  for(const machine of machines) {
    await sqldb.VTMACHINEIMAGES.w_deleteVtMachineImages({MACHINE_ID: machine.ID}, userId)
    await sqldb.VTMACHINEENVS.w_deleteVtMachineEnvs({ID_MACHINE: machine.ID}, userId)
    await sqldb.VTMACHINEENVSLOCATION.w_deleteVtMachineEnvsLocation({ID_MACHINE: machine.ID}, userId)
    await sqldb.VTMACHINEMACHINES.w_deleteVtMachineMachines({ID_MACHINE: machine.ID}, userId)
  }

  // Deleta imagens relacionadas à energia
  if (energy !== null){
    await sqldb.VTENERGYIMAGES.w_deleteVtEnergyImages({ENERGY_ID: energy.ID}, userId)
  }

  // Para cada water measurer deleta registros filhos relacionados
  for(const waterMEasurer of waterMeasurers){
    await sqldb.VTWATERMEASURERIMAGES.w_deleteVtWaterMeasurerImages({WATERMEASURERS_ID: waterMEasurer.ID}, userId)
  }

  // Para cada Drt deleta registros filhos relacionados
  for (const drt of drts){
    await sqldb.VTDRTIMAGES.w_deleteVtDrtImages({DRT_ID: drt.ID}, userId)

    // Para cada Rack da DRT deleta registro filhos relacionados e em seguida deleta os Racks
    racks = await sqldb.VTRACKS.getVtRacks({DRT_ID: drt.ID})
    for (const rack of racks){
      await sqldb.VTRACKIMAGES.w_deleteVtRackImages({RACK_ID: rack.ID}, userId)
    }
    await sqldb.VTRACKS.w_deleteVtRacks({DRT_ID: drt.ID}, {VTRACKIMAGES: true}, userId)

    // Para cada Access Point da DRT deleta registro filhos relacionados e em seguida deleta os Access Points
    accessPoints = await sqldb.VTACCESSPOINTS.getVtAccesspoints({DRT_ID: drt.ID})
    for (const accessPoint of accessPoints) {
      await sqldb.VTACCESSPOINTIMAGES.w_deleteVtAccessPointImages({ACCESSPOINT_ID: accessPoint.ID}, userId)
      await sqldb.VTSERVEDENVIRONMENTMACHINE.w_deleteVtServedeEnvironmentMachines({ACCESSPOINT_ID: accessPoint.ID}, userId)
    }
    await sqldb.VTACCESSPOINTS.w_deleteVtAccesspoints({DRT_ID: drt.ID}, {VTACCESSPOINTIMAGES: true, VTSERVEDENVIRONMENTMACHINE: true}, userId)
  }

  // Deleta DRTs da Visita Técnica
  await sqldb.VTDRTS.w_deleteVtDrts({VT_ID: ID}, {VTDRTIMAGES: true, VTRACKS: true, VTACCESSPOINTS: true}, userId)

  // Deleta Environments da Visita Técnica
  await sqldb.VTENVIRONMENTS.w_deleteVtEnvironment({VT_ID: ID}, {
    VTENVIMAGES: true,
    VTMACHINEENVS: true,
    VTMACHINEENVSLOCATION: true,
    VTDRTS: true,
    VTRACKS: true,
    VTACCESSPOINTS: true,
  }, userId)

  // Deleta Machines da Visita Ténica
  await sqldb.VTMACHINES.w_deleteVtMachines({ VT_ID: ID }, {
    VTMACHINEIMAGES: true,
    VTMACHINEENVS: true,
    VTMACHINEENVSLOCATION: true,
    VTMACHINEMACHINES: true,
  }, userId);

  // Deleta Energies da Visita Ténica
  await sqldb.VTENERGIES.w_deleteVtEnergies({ VT_ID: ID }, {VTENERGYIMAGES: true}, userId);

  // Deleta Water Measurers da Visita Ténica
  await sqldb.VTWATERMEASURERS.w_deleteVtWaterMeasurers({VT_ID: ID}, {VTWATERMEASURERIMAGES: true}, userId);

  // Após deletar tudo relacionado à visita ténica, delete-a
  await sqldb.VISITATECNICA.w_deleteVisitaTecnica({ ID: ID }, {
    VTENVIRONMENTS: true,
    VTMACHINES: true,
    VTENERGIES: true,
    VTWATERMEASURERS: true,
    VTDRTS: true,
  }, userId);

}
