import * as httpRouter from '../apiServer/httpRouter'
import { getPermissionsOnUnit } from '../../srcCommon/helpers/permissionControl';
import sqldb from '../../srcCommon/db'
import { SessionData } from '../../srcCommon/types';

httpRouter.privateRoutes['/clients/add-new-association'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.UNIT_ID) throw Error('Missing parameter: UNIT_ID').HttpStatus(400)
  if (!reqParams.ASSOC_NAME) throw Error('Missing parameter: ASSOC_NAME').HttpStatus(400)
  if (!reqParams.GROUPS || reqParams.GROUPS.length === 0) throw Error('Missing parameter: MACHINES').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (!perms.canManageDevs) {
    throw Error('Permission denied!').HttpStatus(403)
  }

  const unitInfo = await sqldb.CLUNITS.getUnitBasicInfo({
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
  });
  if (!unitInfo || (unitInfo.CLIENT_ID !== reqParams.CLIENT_ID)) {
    throw Error('Invalid UNIT_ID!').HttpStatus(400)
  }

  const machineIds = reqParams.GROUPS.map((machine) => machine.GROUP_ID);

  const machinesToAdd = await sqldb.MACHINES.getMachinesList({ MACHINE_IDS: machineIds });
  if (machinesToAdd.length !== reqParams.GROUPS.length) {
    throw Error('Alguma máquina selecionada não foi encontrada').HttpStatus(404);
  }
  if (!machinesToAdd.every((machine) => machine.UNIT_ID === unitInfo.UNIT_ID)) {
    throw Error('Todos as máquinas devem pertencer à mesma unidade').HttpStatus(400);
  }
  const machinesInAssoc = await sqldb.ASSOC_MACHINES.getAllMachines({ UNIT_ID: reqParams.UNIT_ID });
  const machineIdsInAssoc = machinesInAssoc.map((machine) => machine.GROUP_ID);
  machineIds.forEach((machineId, index) => {
    if (machineIdsInAssoc.includes(machineId)) {
      throw Error(`A máquina ${machinesInAssoc[index].GROUP_NAME} já está cadastrada em outro agrupamento`).HttpStatus(400);
    }
  })

  const { insertId } = await sqldb.ASSOCIATIONS.w_insert({
    NAME: reqParams.ASSOC_NAME,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
  }, session.user);

  await Promise.all(reqParams.GROUPS.map((machine) => {
    return sqldb.ASSOC_MACHINES.w_insert({ ASSOC_ID: insertId, MACHINE_ID: machine.GROUP_ID, POSITION: machine.POSITION }, session.user);
  }))

  const machines = await sqldb.ASSOC_MACHINES.getMachines({ ASSOC_ID: insertId });

  const machinesWithDamId = []
  for(const machine of machines) {
    machinesWithDamId.push({...machine, DAM_ID: (machine.DEV_AUT.startsWith('DAM') || machine.DEV_AUT.startsWith('DAC')) && machine.DEV_AUT})
  }

  const response = {
    ASSOC_ID: insertId,
    ASSOC_NAME: reqParams.ASSOC_NAME,
    UNIT_ID: reqParams.UNIT_ID,
    CLIENT_ID: reqParams.CLIENT_ID,
    GROUPS: machinesWithDamId,
  }

  return response;
}

httpRouter.privateRoutes['/clients/get-associations-list'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID && !reqParams.UNIT_ID) throw Error('Missing parameter: CLIENT_ID OR UNIT_ID').HttpStatus(400)

  if (!session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) {

    if ((!reqParams.CLIENT_ID) && reqParams.UNIT_ID) {reqParams.CLIENT_ID = await checkUnitInfo(reqParams)}
    const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);

    if (!reqParams.CLIENT_ID || !perms.canViewDevs) {
      throw Error('Permission denied!').HttpStatus(403)
    }
  }

  const associationsList = await sqldb.ASSOCIATIONS.getAssocsList({ CLIENT_ID: reqParams.CLIENT_ID, UNIT_ID: reqParams.UNIT_ID });

  const response = await Promise.all(associationsList.map(async (assocInfo) => {
    const machines = await sqldb.ASSOC_MACHINES.getMachines({ ASSOC_ID: assocInfo.ASSOC_ID });
    const machinesWithDamId = []
    for(const machine of machines) {
      machinesWithDamId.push({...machine, DAM_ID: machine.DEV_AUT ? checkMachineDevAut(machine.DEV_AUT) && machine.DEV_AUT : null })
    }
    return { ...assocInfo, GROUPS: machinesWithDamId }
  }))

  return { list: response };
}

httpRouter.privateRoutes['/clients/get-association-info'] = async function (reqParams, session) {
  if (!reqParams.ASSOC_ID) throw Error('Missing parameter: ASSOC_ID').HttpStatus(400)

  const assocInfo = await sqldb.ASSOCIATIONS.getBasicInfo({ ASSOC_ID: reqParams.ASSOC_ID });
  if (!assocInfo) throw Error('Association not found').HttpStatus(404)

  const perms = await getPermissionsOnUnit(session, assocInfo.CLIENT_ID, assocInfo.UNIT_ID);
  if (perms.canViewDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const machines = await sqldb.ASSOC_MACHINES.getMachines({ ASSOC_ID: assocInfo.ASSOC_ID });
  const machinesWithDamId = []
  for(const machine of machines) {
    machinesWithDamId.push({...machine, DAM_ID: (machine.DEV_AUT.startsWith('DAM') || machine.DEV_AUT.startsWith('DAC')) && machine.DEV_AUT})
  }

  return { ...assocInfo, GROUPS: machinesWithDamId }
}

httpRouter.privateRoutes['/clients/remove-association'] = async function (reqParams, session) {
  if (!reqParams.ASSOC_ID) throw Error('Missing parameter: ASSOC_ID').HttpStatus(400)
  const assocInfo = await sqldb.ASSOCIATIONS.getBasicInfo({ ASSOC_ID: reqParams.ASSOC_ID })
  if (!assocInfo) { throw Error('Association not found').HttpStatus(400) }

  const perms = await getPermissionsOnUnit(session, assocInfo.CLIENT_ID, assocInfo.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  await sqldb.ASSOC_MACHINES.w_delete({ ASSOC_ID: reqParams.ASSOC_ID }, session.user);
  const { affectedRows } = await sqldb.ASSOCIATIONS.w_deleteRow({ ID: reqParams.ASSOC_ID }, session.user);

  return `DELETED ` + affectedRows
}

httpRouter.privateRoutes['/clients/edit-association'] = async function (reqParams, session) {
  if (!reqParams.CLIENT_ID) throw Error('Missing parameter: CLIENT_ID').HttpStatus(400)
  if (!reqParams.UNIT_ID) throw Error('Missing parameter: UNIT_ID').HttpStatus(400)
  if (!reqParams.ASSOC_ID) throw Error('Missing parameter: ASSOC_ID').HttpStatus(400)

  const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
  if (perms.canManageDevs) {
    // OK
  }
  else throw Error('Permission denied!').HttpStatus(403)

  const { affectedRows } = await sqldb.ASSOCIATIONS.w_update({ ID: reqParams.ASSOC_ID, NAME: reqParams.ASSOC_NAME }, session.user);
  if (reqParams.GROUPS) {
    const currentMachines = await sqldb.ASSOC_MACHINES.getMachinesBasicInfo({ ASSOC_ID: reqParams.ASSOC_ID });
    if (reqParams.GROUPS !== currentMachines) {

      const machinesInAssociations = await sqldb.ASSOC_MACHINES.getAllMachines({ UNIT_ID: reqParams.UNIT_ID });
      const machineInAssociationsBasicInfo = machinesInAssociations.map((machine) => ({ GROUP_ID: machine.GROUP_ID, POSITION: machine.POSITION }))
        .filter((machine) => !currentMachines.map(({ GROUP_ID }) => GROUP_ID).includes(machine.GROUP_ID));
      const machineIdsInAssociations = machineInAssociationsBasicInfo.map((machine) => machine.GROUP_ID);
      reqParams.GROUPS.map(({ GROUP_ID }) => GROUP_ID).forEach((machineId, index) => {
        if (machineIdsInAssociations.includes(machineId)) {
          throw Error(`A máquina ${machinesInAssociations[index].GROUP_NAME} já está cadastrada em outro agrupamento`).HttpStatus(400);
        }
      })
       
      await sqldb.ASSOC_MACHINES.w_delete({ ASSOC_ID: reqParams.ASSOC_ID }, session.user);
      await Promise.all(reqParams.GROUPS.map((machine: { GROUP_ID: number, POSITION: number }) => sqldb.ASSOC_MACHINES.w_insert({
        ASSOC_ID: reqParams.ASSOC_ID,
        MACHINE_ID: machine.GROUP_ID,
        POSITION: machine.POSITION
      }, session.user)));
    }
  }

  const response = await httpRouter.privateRoutes['/clients/get-association-info']({ ASSOC_ID: reqParams.ASSOC_ID }, session);

  return response;
}

export async function removingClient(params: { CLIENT_ID: number }, userId: string) {
  const list = await sqldb.ASSOCIATIONS.getAssocsList({ CLIENT_ID: params.CLIENT_ID });
  const associationIds = list.map((assoc) => assoc.ASSOC_ID);
  if (associationIds.length > 0) {
    await sqldb.ASSOC_MACHINES.w_deleteMany({ ASSOC_IDS: associationIds }, userId);
  }
  await sqldb.ASSOCIATIONS.w_deleteFromClient({ CLIENT_ID: params.CLIENT_ID }, userId);
}

export async function removingUnit(params: { UNIT_ID: number }, userId: string) {
  const list = await sqldb.ASSOCIATIONS.getAssocsList({ UNIT_ID: params.UNIT_ID });
  const associationIds = list.map((assoc) => assoc.ASSOC_ID);
  if (associationIds.length > 0) {
    await sqldb.ASSOC_MACHINES.w_deleteMany({ ASSOC_IDS: associationIds }, userId);
  }
  await sqldb.ASSOCIATIONS.w_deleteFromUnit({ UNIT_ID: params.UNIT_ID }, userId);
}

//trocar uso dessa função
// export async function removingGroup(params: { GROUP_ID: number }, session: SessionData) {
//   const association = await sqldb.ASSOC_MACHINES.getMachineAssoc({ MACHINE_ID: params.GROUP_ID });
//   if (association) {
//     const { ASSOC_ID } = association;
//     await sqldb.ASSOC_MACHINES.w_delete({ ASSOC_ID }, session.user);
//     await sqldb.ASSOCIATIONS.w_deleteRow({ ID: ASSOC_ID }, session.user);
//   }
// }

export async function removingMachine(params: { MACHINE_ID: number }, session: SessionData) {
  const association = await sqldb.ASSOC_MACHINES.getMachineAssoc({ MACHINE_ID: params.MACHINE_ID });
  if (association) {
    const { ASSOC_ID } = association;
    await sqldb.ASSOC_MACHINES.w_delete({ ASSOC_ID }, session.user);
    await sqldb.ASSOCIATIONS.w_deleteRow({ ID: ASSOC_ID }, session.user);
  }
}

function checkMachineDevAut(machineDevAut: string) {
 return (machineDevAut.startsWith('DAM') || machineDevAut.startsWith('DAC'))
}

async function checkUnitInfo(reqParams:{
  CLIENT_ID?: number,
  UNIT_ID?: number
}) {
  const unitInfo = await sqldb.CLUNITS.getUnitInfo({ UNIT_ID: reqParams.UNIT_ID });
   return unitInfo && unitInfo.CLIENT_ID;  
}
