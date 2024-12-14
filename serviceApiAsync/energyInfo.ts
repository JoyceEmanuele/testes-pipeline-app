
import * as httpRouter from './apiServer/httpRouter'
import { getAllowedUnitsView, getPermissionsOnUnit, getUserGlobalPermissions, checkDevEditPermission } from '../srcCommon/helpers/permissionControl';
import sqldb from '../srcCommon/db'
import { setGetDevInfo } from './devInfo'
import { logger } from '../srcCommon/helpers/logger';

httpRouter.privateRoutes['/energy/get-energy-info'] = async function (reqParams, session) {
    let clientIds: number[] = undefined;
    let unitIds: number[] = undefined;
    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
    else {
        const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
        clientIds = allowedClients;
        unitIds = allowedUnits;
    }

    const out = await sqldb.ENERGY_DEVICES_INFO.getList({
        serials: [reqParams.SERIAL],
        manufacturers: [reqParams.MANUFACTURER],
        clientIds,
        unitIds,
    }, {
        addUnownedDevs: !!session.permissions.MANAGE_UNOWNED_DEVS
    });

    const info = out.pop();

    return { info }
}

httpRouter.privateRoutes['/energy/get-energy-list'] = async function (reqParams, session) {
    if (reqParams.clientId) {
        reqParams.clientIds = [reqParams.clientId];
    }
    delete reqParams.clientId;

    if (reqParams.stateId) {
        reqParams.stateIds = [reqParams.stateId];
    }
    delete reqParams.stateId;

    if (reqParams.cityId) {
        reqParams.cityIds = [reqParams.cityId];
    }
    delete reqParams.cityId;

    if (reqParams.unitId) {
        reqParams.unitIds = [reqParams.unitId];
    }
    delete reqParams.unitId;

    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
    else {
        const { clientIds: allowedClients, unitIds: allowedUnits } = await getAllowedUnitsView(session);
        if (!reqParams.clientIds) { reqParams.clientIds = allowedClients; }
        reqParams.clientIds = reqParams.clientIds.filter(x => allowedClients.includes(x));
        if (allowedUnits && !reqParams.unitIds) { reqParams.unitIds = allowedUnits; }
        if (allowedUnits) reqParams.unitIds = reqParams.unitIds.filter(x => allowedUnits.includes(x));
    }

    const list = await sqldb.ENERGY_DEVICES_INFO.getList({
        serials: null,
        manufacturers: null,
        filterBynull: reqParams.filterByNull,
        ...reqParams,
    }, {
        addUnownedDevs: !!session.permissions.MANAGE_UNOWNED_DEVS
    });

    return { list }
}

httpRouter.privateRoutes['/energy/set-energy-info'] = async function (reqParams, session) {
    if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;
    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
    else {
        const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
        if (!perms.canViewDevs) { throw Error('Not allowed').HttpStatus(403); }
    }

    if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;

    let energyDevId: string = null;

    if (reqParams.MANUFACTURER === 'Diel Energia') {
        if (reqParams.DRI_ID ) {
            if (reqParams.DRI_ID.length !== 12) throw Error('Id do DRI inválido').HttpStatus(400);
            if (!reqParams.MODEL) throw Error('Faltou o parâmetro: MODELO').HttpStatus(400);
        } 

        const driInf = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });
        const { userCanChangeClient, clientChanged } = await checkDevEditPermission(session, driInf, {
            CLIENT_ID: reqParams.CLIENT_ID,
            UNIT_ID: reqParams.UNIT_ID,
        });
        if (clientChanged && !userCanChangeClient) {
            throw Error('DRI pertence à outro cliente').HttpStatus(400);
        }
        energyDevId = reqParams.DRI_ID;
    }
    if (reqParams.MANUFACTURER === 'GreenAnt') {
        const { units, meters } = await httpRouter.privateRoutes['/clients/get-units-and-meters']({}, session);
        const units2 = units.map((unit) => {
            const meter = meters.find((meter) => meter.id === unit.GA_METER);
            return Object.assign(unit, { meter });
        });
        const associatedUnits = units2.filter((x) => x.meter);
        const freeMeters = meters.filter((meter) => !associatedUnits.some((unit) => unit.meter === meter));
        const meterSelected = freeMeters.find((meter) => meter.uid === reqParams.SERIAL);
        if (!meterSelected) throw Error('Serial do medidor não corresponde ao UID de um medidor GreeAnt disponível').HttpStatus(400);

        await httpRouter.privateRoutes['/clients/edit-unit']({
            UNIT_ID: reqParams.UNIT_ID,
            GA_METER: meterSelected.id,
        }, session);

        energyDevId = 'GA'.concat(meterSelected.id.toString());
    }

    const unitId = reqParams.UNIT_ID || null;
    let electricCircuitsId = reqParams.ELECTRIC_CIRCUIT_ID || null;

    let permissionAddNew;
    let permissionEditDev;
    if (energyDevId){
        const { userCanEditDev, userCanAddNewInfo } = await setGetDevInfo(session, {
            DEV_ID: energyDevId,
            UNIT_ID: reqParams.UNIT_ID,
            CLIENT_ID: reqParams.CLIENT_ID,
            allowInsert: energyDevId && (energyDevId.startsWith('DRI') || energyDevId.startsWith('GA')),
        });
        permissionAddNew = userCanAddNewInfo;
        permissionEditDev = userCanEditDev;
        const currentDevInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: reqParams.DRI_ID });

        /// Check de novo dispositivo
        if (!currentDevInfo) {
            if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
            const deviceInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: reqParams.DRI_ID});
            await sqldb.DRIS_DEVICES.w_insertIgnore({DEVICE_ID: deviceInfo.DEVICE_ID}, session.user);
        }
    }

    if (!electricCircuitsId && reqParams.ESTABLISHMENT_NAME) {
        const electricCircuitCurrent = await sqldb.ELECTRIC_CIRCUITS.getInfoByUnitAndEstablishmentName({UNIT_ID: unitId, ESTABLISHMENT_NAME: reqParams.ESTABLISHMENT_NAME})
        if(electricCircuitCurrent) {
            electricCircuitsId = electricCircuitCurrent.ID}            
        else{
            const inserted = await sqldb.ELECTRIC_CIRCUITS.w_insert({UNIT_ID: unitId, ESTABLISHMENT_NAME: reqParams.ESTABLISHMENT_NAME}, session.user);
            electricCircuitsId = inserted.insertId;
        }
    }
    else if (electricCircuitsId) {
        await sqldb.ELECTRIC_CIRCUITS.w_updateInfo({ID: electricCircuitsId, UNIT_ID: unitId, ESTABLISHMENT_NAME: reqParams.ESTABLISHMENT_NAME || `Quadro do ${energyDevId}`}, session.user);
    }

    const driDevice = energyDevId ? await sqldb.DRIS_DEVICES.getDriDeviceInfo({DEVICE_CODE: energyDevId}) : null;
    if (energyDevId && !driDevice) throw Error('Could not find device!').HttpStatus(500);

    if (reqParams.ENERGY_DEVICES_INFO_ID) {
        await sqldb.ENERGY_DEVICES_INFO.w_updateById({ ID: reqParams.ENERGY_DEVICES_INFO_ID, MODEL: reqParams.MODEL, SERIAL: reqParams.SERIAL}, session.user);
    }
    else if (!energyDevId) {
        const energyDevicesInfoCurrent = await sqldb.ENERGY_DEVICES_INFO.getEnergyDeviceByElectricCircuit(({ELECTRIC_CIRCUIT_ID: electricCircuitsId}))
        if (!energyDevicesInfoCurrent) await sqldb.ENERGY_DEVICES_INFO.insert({ ELECTRIC_CIRCUIT_ID: electricCircuitsId, SERIAL: reqParams.SERIAL, MANUFACTURER: reqParams.MANUFACTURER, MODEL: reqParams.MODEL}, session.user);
    }

    const unitMeters = await sqldb.ENERGY_DEVICES_INFO.getList({
        clientIds: [reqParams.CLIENT_ID],
        unitIds: [reqParams.UNIT_ID],
    }, {
        addUnownedDevs: true
    });

    /// Check de novo medidor
    if (energyDevId) {
        const driEnergyMeter = await sqldb.DRIS_ENERGY_DEVICES.getDevExtraInfo({DEVICE_CODE: energyDevId})
        const greenAntEnergyMeter = await sqldb.GREENANT_ENERGY_DEVICES.getDevExtraInfo({GREENANT_CODE: energyDevId})
        const energyMeterCurrent = driEnergyMeter || greenAntEnergyMeter;

        if (!unitMeters.find((meter) => meter.ENERGY_DEVICE_ID === energyDevId && meter.MANUFACTURER === reqParams.MANUFACTURER)) {
            if (!permissionAddNew) throw Error('Permission denied').HttpStatus(403);
            unitMeters.forEach(async (meter) => {
                const deviceCurrent = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: meter.ENERGY_DEVICE_ID });            
                if(deviceCurrent){
                    await sqldb.DEVICES_UNITS.w_deleteRow({ DEVICE_ID: deviceCurrent.ID }, session.user);
                }
            })
            let energyDeviceID = null as number;
            if(reqParams.ENERGY_DEVICES_INFO_ID){
                energyDeviceID = reqParams.ENERGY_DEVICES_INFO_ID
            }
            else {
                const energyDeviceIDCurrent = await sqldb.ENERGY_DEVICES_INFO.getEnergyDeviceByElectricCircuit({ELECTRIC_CIRCUIT_ID: electricCircuitsId})
                if(energyDeviceIDCurrent) energyDeviceID = energyDeviceIDCurrent.ID
                else{
                    const energyDeviceInfo = await sqldb.ENERGY_DEVICES_INFO.insert({ ELECTRIC_CIRCUIT_ID:  electricCircuitsId, SERIAL: reqParams.SERIAL, MANUFACTURER: reqParams.MANUFACTURER, MODEL: reqParams.MODEL}, session.user);
                    energyDeviceID = energyDeviceInfo.insertId
                }        
            }
        
            if(reqParams.MANUFACTURER === 'Diel Energia'){
                const driDevice = await sqldb.DRIS_DEVICES.getDriDeviceInfo({DEVICE_CODE: energyDevId})
                    if (!driDevice) throw Error('Could not find device!').HttpStatus(500);
                if (driDevice.DRI_ENERGY_DEVICE_ID) {
                    await sqldb.DRIS_ENERGY_DEVICES.w_delete({DEVICE_CODE: energyDevId}, session.user);
                }
                await sqldb.DRIS_ENERGY_DEVICES.w_insert({DRI_DEVICE_ID: driDevice.DRI_DEVICE_ID, ENERGY_DEVICES_INFO_ID: energyDeviceID}, session.user);
            }
            if(reqParams.MANUFACTURER === 'GreenAnt'){
                await sqldb.GREENANT_ENERGY_DEVICES.w_insert({GREENANT_CODE: energyDevId, ENERGY_DEVICES_INFO_ID: energyDeviceID }, session.user);
            }
            if(energyMeterCurrent){
                if(energyMeterCurrent.MANUFACTURER === 'Diel Energia'){
                    await sqldb.DRIS_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
                } 
                else if(energyMeterCurrent.MANUFACTURER === 'GreenAnt'){
                    await sqldb.GREENANT_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);                        
                } 
                await sqldb.ENERGY_DEVICES_INFO.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
                await sqldb.ELECTRIC_CIRCUITS.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
            }
    
        } 
        else {
            if (!permissionEditDev) throw Error('Permission denied').HttpStatus(403); 
            if(electricCircuitsId){
            await sqldb.ENERGY_DEVICES_INFO.w_update({ ENERGY_DEVICE_CODE: reqParams.DRI_ID, ELECTRIC_CIRCUIT_ID: electricCircuitsId, MODEL: reqParams.MODEL, SERIAL: reqParams.SERIAL}, session.user);
            }
            else{
                if(reqParams.MANUFACTURER === 'Diel Energia'){
                    await sqldb.DRIS_ENERGY_DEVICES.w_delete({DEVICE_CODE: reqParams.DRI_ID}, session.user);                    
                }                
                else if(reqParams.MANUFACTURER === 'GreenAnt'){
                    await sqldb.GREENANT_ENERGY_DEVICES.w_delete({GREENANT_CODE: reqParams.DRI_ID}, session.user);
                }
                await sqldb.ENERGY_DEVICES_INFO.w_deleteFromCode({ENERGY_DEVICE_CODE: reqParams.DRI_ID}, session.user);
            }
        }
    }
    
    return "OK"
}

httpRouter.privateRoutes['/energy/set-energy-list-info'] = async function (reqParams, session) {
    if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;
    if (session.permissions.VIEW_ALL_CLIENTS_DACS_GROUPS_UNITS) { } // OK
    else {
        const perms = await getPermissionsOnUnit(session, reqParams.CLIENT_ID, reqParams.UNIT_ID);
        if (!perms.canViewDevs) { throw Error('Not allowed').HttpStatus(403); }
    }

    if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;

    let isAllFromDiel = true;
    
    reqParams.meters.forEach((meter) => {
        if(meter.MANUFACTURER !== 'Diel Energia') isAllFromDiel = false;
    })

    if(reqParams.meters.length > 1 && !isAllFromDiel)  throw Error('Múltiplos medidores disponível apenas para DME.').HttpStatus(400);

    for(const energyMeter of reqParams.meters){
        let energyDevId: string = null;
        if (energyMeter.MANUFACTURER === 'Diel Energia') {
            if (energyMeter.DRI_ID ) {
                if (energyMeter.DRI_ID.length !== 12) throw Error('Id do DRI inválido').HttpStatus(400);
                if (!energyMeter.MODEL) throw Error('Faltou o parâmetro: MODELO').HttpStatus(400);
            }
            const driInf = await sqldb.DRIS.getBasicInfo({ driId: energyMeter.DRI_ID });
            if (driInf && driInf.CLIENT_ID && (driInf.CLIENT_ID !== reqParams.CLIENT_ID)) {
                throw Error('DRI pertence à outro cliente').HttpStatus(400);
            }
            energyDevId = energyMeter.DRI_ID;
        }
        if (energyMeter.MANUFACTURER === 'GreenAnt') {
            const { units, meters } = await httpRouter.privateRoutes['/clients/get-units-and-meters']({}, session);
            const units2 = units.map((unit) => {
                const meter = meters.find((meter) => meter.id === unit.GA_METER);
                return Object.assign(unit, { meter });
            });
            const associatedUnits = units2.filter((x) => x.meter);
            const freeMeters = meters.filter((meter) => !associatedUnits.some((unit) => unit.meter === meter));
            const meterSelected = freeMeters.find((meter) => meter.uid === energyMeter.SERIAL);
            if (!meterSelected) throw Error('Serial do medidor não corresponde ao UID de um medidor GreeAnt disponível').HttpStatus(400);

            await httpRouter.privateRoutes['/clients/edit-unit']({
                UNIT_ID: reqParams.UNIT_ID,
                GA_METER: meterSelected.id,
            }, session);

            energyDevId = 'GA'.concat(meterSelected.id.toString());
        }
        
        const unitMeters = await sqldb.ENERGY_DEVICES_INFO.getList({
            clientIds: [reqParams.CLIENT_ID],
            unitIds: [reqParams.UNIT_ID],
        }, {
            addUnownedDevs: true
        });

        const meterInfo = unitMeters.find( meter => meter.ENERGY_DEVICE_ID === energyDevId);
        let electricCircuitsId = meterInfo !== undefined ? (meterInfo.ELECTRIC_CIRCUIT_ID || null) : null;
        const unitId = reqParams.UNIT_ID || null;

        if (!electricCircuitsId && unitId) {
            const electricCircuitCurrent = await sqldb.ELECTRIC_CIRCUITS.getInfoByUnitAndEstablishmentName({UNIT_ID: unitId, ESTABLISHMENT_NAME: energyMeter.ESTABLISHMENT_NAME || `Quadro do ${energyDevId}`})
            if(electricCircuitCurrent) {
                electricCircuitsId = electricCircuitCurrent.ID
            }
            else{
                const inserted = await sqldb.ELECTRIC_CIRCUITS.w_insert({UNIT_ID: unitId, ESTABLISHMENT_NAME: energyMeter.ESTABLISHMENT_NAME || `Quadro do ${energyDevId}`}, session.user);
                electricCircuitsId = inserted.insertId;
            }
        }
        else if (electricCircuitsId) {
            await sqldb.ELECTRIC_CIRCUITS.w_updateInfo({ID: electricCircuitsId, UNIT_ID: unitId, ESTABLISHMENT_NAME: energyMeter.ESTABLISHMENT_NAME || `Quadro do ${energyDevId}`}, session.user);
        }

        if (energyDevId){
            const driEnergyMeter = await sqldb.DRIS_ENERGY_DEVICES.getDevExtraInfo({DEVICE_CODE: energyDevId})
            const greenAntEnergyMeter = await sqldb.GREENANT_ENERGY_DEVICES.getDevExtraInfo({GREENANT_CODE: energyDevId})
            const energyMeterCurrent = driEnergyMeter || greenAntEnergyMeter;
            const { userCanEditDev, userCanAddNewInfo } = await setGetDevInfo(session, {
                DEV_ID: energyDevId,
                UNIT_ID: reqParams.UNIT_ID,
                CLIENT_ID: reqParams.CLIENT_ID,
                allowInsert: energyDevId && (energyDevId.startsWith('DRI') || energyDevId.startsWith('GA')),
            });

            const currentDevInfo = await sqldb.DRIS_DEVICES.getDriDeviceInfo({ DEVICE_CODE: energyMeter.DRI_ID });
            /// Check de novo dispositivo
            if (!currentDevInfo) {
                if (!userCanAddNewInfo) throw Error('Permission denied').HttpStatus(403);
                const deviceInfo = await sqldb.DEVICES.getDevicesInfo({DEVICE_CODE: energyMeter.DRI_ID});
                await sqldb.DRIS_DEVICES.w_insertIgnore({DEVICE_ID: deviceInfo.DEVICE_ID}, session.user);   
            }
    
            const driDevice = await sqldb.DRIS_DEVICES.getDriDeviceInfo({DEVICE_CODE: energyDevId})
            if (!driDevice) throw Error('Could not find device!').HttpStatus(500);

            /// Check de novo medidor
            if (!unitMeters.find((meter) => (meter.ENERGY_DEVICE_ID === energyDevId && meter.MANUFACTURER === energyMeter.MANUFACTURER))) {
                if (!userCanAddNewInfo && !userCanEditDev) throw Error('Permission denied').HttpStatus(403);
                unitMeters.forEach(async (meter) => {
                    const deviceCurrent = await sqldb.DEVICES.getIdByCode({ DEVICE_CODE: meter.ENERGY_DEVICE_ID });
                    if(deviceCurrent){
                        await sqldb.DEVICES_UNITS.w_deleteRow({ DEVICE_ID: deviceCurrent.ID }, session.user);
                    }
                }) 
                let energyDeviceID = null as number;
                const energyDeviceIDCurrent = await sqldb.ENERGY_DEVICES_INFO.getEnergyDeviceByElectricCircuit({ELECTRIC_CIRCUIT_ID: electricCircuitsId})
                if(energyDeviceIDCurrent) energyDeviceID = energyDeviceIDCurrent.ID
                else {
                    const energyDeviceInfo = await sqldb.ENERGY_DEVICES_INFO.insert({ ELECTRIC_CIRCUIT_ID:  electricCircuitsId, SERIAL: energyMeter.SERIAL, MANUFACTURER: energyMeter.MANUFACTURER, MODEL: energyMeter.MODEL}, session.user);
                    energyDeviceID = energyDeviceInfo.insertId     
                }                
                
                if(energyMeter.MANUFACTURER === 'Diel Energia'){
                    const driDevice = await sqldb.DRIS_DEVICES.getDriDeviceInfo({DEVICE_CODE: energyDevId})
                        if (!driDevice) throw Error('Could not find device!').HttpStatus(500);
                    if (driDevice.DRI_ENERGY_DEVICE_ID) {
                        await sqldb.DRIS_ENERGY_DEVICES.w_delete({DEVICE_CODE: energyDevId}, session.user);
                    }
                    await sqldb.DRIS_ENERGY_DEVICES.w_insert({DRI_DEVICE_ID: driDevice.DRI_DEVICE_ID, ENERGY_DEVICES_INFO_ID: energyDeviceID }, session.user);
                }
                if(energyMeter.MANUFACTURER === 'GreenAnt'){
                    await sqldb.GREENANT_ENERGY_DEVICES.w_insert({GREENANT_CODE: energyDevId, ENERGY_DEVICES_INFO_ID: energyDeviceID }, session.user);
                }
                if(energyMeterCurrent){
                    if(energyMeterCurrent.MANUFACTURER === 'Diel Energia'){
                        await sqldb.DRIS_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
                    } 
                    else if(energyMeterCurrent.MANUFACTURER === 'GreenAnt'){
                        await sqldb.GREENANT_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);                        
                    } 
                    await sqldb.ENERGY_DEVICES_INFO.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
                    await sqldb.ELECTRIC_CIRCUITS.w_deleteFromUnit({UNIT_ID: energyMeterCurrent.UNIT_ID},session.user);
                }
                
            } else {
                if (!userCanEditDev) throw Error('Permission denied').HttpStatus(403);
                if(electricCircuitsId){
                    await sqldb.ENERGY_DEVICES_INFO.w_update({ ENERGY_DEVICE_CODE: energyMeter.DRI_ID, ELECTRIC_CIRCUIT_ID: electricCircuitsId, MODEL: energyMeter.MODEL, SERIAL: energyMeter.SERIAL}, session.user);
                }
                else{
                    if(energyMeter.MANUFACTURER === 'Diel Energia'){
                        await sqldb.DRIS_ENERGY_DEVICES.w_delete({DEVICE_CODE: energyMeter.DRI_ID}, session.user);                    
                    }                
                    else if(energyMeter.MANUFACTURER === 'GreenAnt'){
                        await sqldb.GREENANT_ENERGY_DEVICES.w_delete({GREENANT_CODE: energyMeter.DRI_ID}, session.user);
                    }
                    await sqldb.ENERGY_DEVICES_INFO.w_deleteFromCode({ENERGY_DEVICE_CODE: energyMeter.DRI_ID}, session.user);
                }
            }
        }
    }

    return "OK"
}

httpRouter.privateRoutes['/energy/get-energy-combo-opts'] = async function (reqParams, session) {
    const manufacturersList = await sqldb.ENERGY_MANUFACTURERS.getList({});
    const modelsList = await sqldb.ENERGY_METER_MODELS.getList({});

    return {
        manufacturersList,
        modelsList,
    };
}


httpRouter.privateRoutes['/energy/delete-energy-info'] = async function (reqParams, session) {
    if (<any>reqParams.CLIENT_ID === '') reqParams.CLIENT_ID = null;
    const perms = getUserGlobalPermissions(session);
    if (perms.deleteClientUnitsMachinesRooms) { } // OK
    else {
        throw Error('Not allowed').HttpStatus(403);
    }

    let energyDevId: string = null;
    

    if (reqParams.MANUFACTURER === 'Diel Energia') {
        if (reqParams.DRI_ID.length !== 12) throw Error('Id do DRI inválido').HttpStatus(400);
        const driInf = await sqldb.DRIS.getBasicInfo({ driId: reqParams.DRI_ID });
        if (driInf && driInf.CLIENT_ID && (driInf.CLIENT_ID !== reqParams.CLIENT_ID)) {
            throw Error('DRI pertence à outro cliente').HttpStatus(400);
        }
        energyDevId = reqParams.DRI_ID;
    }
    if (reqParams.MANUFACTURER === 'GreenAnt') {
        const { units, meters } = await httpRouter.privateRoutes['/clients/get-units-and-meters']({}, session);

        const meterSelected = meters.find((meter) => meter.uid === reqParams.SERIAL);
        if (!meterSelected) throw Error('Serial do medidor não corresponde ao UID de um medidor GreeAnt disponível').HttpStatus(400);

       await sqldb.CLUNITS.w_update({ UNIT_ID: reqParams.UNIT_ID, GA_METER: null}, session.user);

       energyDevId = 'GA'.concat(meterSelected.id.toString());
    }
    const electricCircuitId = await sqldb.ELECTRIC_CIRCUITS.getInfoDeviceCode({DEVICE_CODE: energyDevId})
    if (reqParams.MANUFACTURER === 'Diel Energia') await sqldb.DRIS_ENERGY_DEVICES.w_delete({ DEVICE_CODE: energyDevId }, session.user);        
    if (reqParams.MANUFACTURER === 'GreenAnt') await sqldb.GREENANT_ENERGY_DEVICES.w_delete({ GREENANT_CODE: energyDevId }, session.user);
    if (electricCircuitId?.ID) {
        await sqldb.ENERGY_DEVICES_INFO.w_deleteByElectricCircuitId({ ELECTRIC_CIRCUIT_ID: electricCircuitId.ID }, session.user);
        await deleteElectricCircuits(electricCircuitId.ID, session.user);
    }
    return "DELETED"
}

export async function checkElectricCircuitsTree (qPars: { unitId: number, electricCircuitId?: number, electricCircuitIdSource?: number, establishment_name?: string }, sessionUser: string) {    
    const electricCircuitsInfo = await sqldb.ELECTRIC_CIRCUITS.getInfoByUnit({UNIT_ID: qPars.unitId})
    if(!qPars.electricCircuitIdSource && qPars.electricCircuitId && qPars.unitId){
        const circuitInfo = await sqldb.ELECTRIC_CIRCUITS.getInfoByID({ELECTRIC_CIRCUIT_ID: qPars.electricCircuitId})
        if(qPars.establishment_name !== circuitInfo.ESTABLISHMENT_NAME){
            await sqldb.ELECTRIC_CIRCUITS.w_updateInfo({ID: qPars.electricCircuitId, UNIT_ID: qPars.unitId , ESTABLISHMENT_NAME: qPars.establishment_name}, sessionUser)
        }        
        return qPars.electricCircuitId;
    }

    // Caso esteja incluindo dentro de um Circuito Elétrico existente 
    else if(qPars.electricCircuitIdSource && !qPars.electricCircuitId && qPars.unitId){
            // Insere dentro da tabela de Circuitos Elétricos
            const electricCircuits = await sqldb.ELECTRIC_CIRCUITS.w_insert({UNIT_ID: qPars.unitId, ESTABLISHMENT_NAME: qPars.establishment_name}, '[SYSTEM]');

            // Insere como filho do circuito existente
            await sqldb.ELECTRIC_CIRCUITS_TREE.w_insertChild({ELECTRIC_CIRCUIT_SOURCE_ID: qPars.electricCircuitIdSource, ELECTRIC_CIRCUIT_CHILD_ID: electricCircuits.insertId}, sessionUser)

            // Cria mais um row do pai sem filho 
            await sqldb.ELECTRIC_CIRCUITS_TREE.w_insert_Source({ELECTRIC_CIRCUIT_SOURCE_ID: qPars.electricCircuitId}, sessionUser)

            // Cria mais uma row do filho (agora pai) sem filho
            await sqldb.ELECTRIC_CIRCUITS_TREE.w_insert_Source({ELECTRIC_CIRCUIT_SOURCE_ID: electricCircuits.insertId}, sessionUser)

            return electricCircuits.insertId     
    }

    else if (!qPars.electricCircuitIdSource && !qPars.electricCircuitId && qPars.unitId){ 
        const isCreate = electricCircuitsInfo.find((electricCircuit) => electricCircuit.ESTABLISHMENT_NAME === qPars.establishment_name)
        if(!isCreate){      
            // Insere dentro da tabela de Circuitos Elétricos
            const electricCircuits = await sqldb.ELECTRIC_CIRCUITS.w_insert({UNIT_ID: qPars.unitId, ESTABLISHMENT_NAME: qPars.establishment_name}, '[SYSTEM]'); 

            // Cria mais uma row sem filho
            await sqldb.ELECTRIC_CIRCUITS_TREE.w_insert_Source({ELECTRIC_CIRCUIT_SOURCE_ID: electricCircuits.insertId}, sessionUser)

            return electricCircuits.insertId
        } 
        return isCreate.ID;    
    }
    else return null 
}

export async function deleteElectricCircuits (electricCircuitId: number, sessionUser: string) {  

    const circuitInfo = await sqldb.ELECTRIC_CIRCUITS.getInfoByID({ELECTRIC_CIRCUIT_ID: electricCircuitId})
    
    if(circuitInfo.UNIT_ID){
        // Delete circuito que esteja como pai
        await sqldb.ELECTRIC_CIRCUITS_TREE.w_deleteSource({ELECTRIC_CIRCUIT_SOURCE_ID: circuitInfo.ID}, sessionUser)
        // Delete circuito que esteja como filho
        await sqldb.ELECTRIC_CIRCUITS_TREE.w_deleteChild({ELECTRIC_CIRCUIT_CHILD_ID: circuitInfo.ID}, sessionUser)
        // Delete circuito da tabela de Circuitos
        await sqldb.ELECTRIC_CIRCUITS.w_deleteRow({ID: circuitInfo.ID}, sessionUser)
    }   

}

export async function deleteUnitElectricCircuits (qPars: { UNIT_ID: number }, userId: string) {
    await sqldb.ELECTRIC_CIRCUITS_MACHINES.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.ELECTRIC_CIRCUITS_ILLUMINATIONS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.ELECTRIC_CIRCUITS_NOBREAKS.w_deleteFromUnit({ UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.DRIS_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.GREENANT_ENERGY_DEVICES.w_deleteFromUnit({UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.ENERGY_DEVICES_INFO.w_deleteFromUnit({UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.ELECTRIC_CIRCUITS_TREE.w_deleteFromUnit({UNIT_ID: qPars.UNIT_ID}, userId);
    await sqldb.ELECTRIC_CIRCUITS.w_deleteFromUnit({UNIT_ID: qPars.UNIT_ID}, userId);
  }