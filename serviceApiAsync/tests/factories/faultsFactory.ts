import { faker } from '@faker-js/faker';
import { DetectedFaultInfo, FaultsActs } from '../../../srcCommon/types';
import sqldb from '../../../srcCommon/db';
import changeHealth from '../../../srcCommon/helpers/changeHealth';
import falhaRep from '../../../serviceHealth/extServices/falhaRep';
import { getKnownFaults } from '../../../serviceHealth/faultDetection';


type reqParamsProps = {
    dacs_id: string[]
}

export function generateListDacs(reqParams: reqParamsProps) {
    return {
        list: [
            {
                DAC_ID: faker.string.alphanumeric(),
                bt_id: faker.string.alphanumeric(),
                DAC_NAME: faker.person.firstName(),
                CITY_ID: faker.string.alphanumeric(),
                CITY_NAME: faker.location.city(),
                STATE_ID: faker.string.alphanumeric(),
                STATE_NAME: faker.location.state(),
                GROUP_ID: faker.number.int(),
                GROUP_NAME: faker.person.firstName(),
                UNIT_ID: faker.number.int(),
                UNIT_NAME: faker.person.firstName(),
                LAT: faker.location.latitude(),
                LON: faker.location.longitude(),
                H_INDEX: faker.number.int(),
                H_DATE: faker.date.past().toISOString(),
                DAC_APPL: faker.person.jobArea(),
                DAC_TYPE: faker.person.jobType(),
                DAC_ENV: faker.person.jobDescriptor(),
                SELECTED_L1_SIM: faker.person.jobArea(),
                CLIENT_NAME: faker.person.firstName(),
                CLIENT_ID: faker.number.int(),
                DAC_KW: faker.number.int(),
                DAC_COMIS: faker.person.jobDescriptor(),
                AUTOM_HW: faker.person.jobDescriptor(),
                AUTOM_DISAB: faker.number.int(),
                FAULTSDATA: faker.person.jobDescriptor(),
                H_DESC: faker.person.jobDescriptor(),
                P_CAUSES: faker.person.jobDescriptor(),
                H_OFFL: faker.person.jobDescriptor(),
                CAPACITY_PWR: faker.number.int(),
                CAPACITY_UNIT: faker.person.jobDescriptor(),
                TARIFA_KWH: faker.number.int(),
                FLUID_TYPE: faker.person.jobDescriptor(),
                P0_POSITN: faker.person.jobDescriptor(),
                P0_SENSOR: faker.person.jobDescriptor(),
                P1_POSITN: faker.person.jobDescriptor(),
                P1_SENSOR: faker.person.jobDescriptor(),
                P0_MULT: faker.number.int(),
                P0_OFST: faker.number.int(),
                P1_MULT: faker.number.int(),
                P1_OFST: faker.number.int(),
                TYPECHANGE: faker.person.jobDescriptor(),
                HEAT_EXCHANGER_ID: faker.number.int(),
            }
        ]
    }
};

export function generateListDacsAlerts(sucess: boolean) {
    if (!sucess) {
        return 'error'
    } else {
        return {
            list: [
                {
                    dac_id: faker.string.alphanumeric(),
                    fault: faker.person.jobDescriptor(),
                    first_detected: faker.date.past().toISOString(),
                    last_detected: faker.date.past().toISOString(),
                }
            ]
        }
    }
}

export function generateListFaultsActs(
    id_state_pairs: [string, FaultsActs[string]['lastAction']][],
    max_fault_age_days?: number,
): FaultsActs {
    const validStates: FaultsActs[string]['lastAction'][] = ['APPROVED', 'REJECTED', 'ERASED', 'RESTAB_WAITING', 'RESTAB_PENDING', 'RESTABLISHED', 'PENDING']
    return Object.fromEntries(id_state_pairs.map(([id, state]) => {
        const lastRise = faker.date.past().getTime();
        return [id, {
            lastAction: state || faker.helpers.arrayElement(validStates),
            firstRiseTS: faker.date.between({from: 1, to: lastRise}).getTime(),
            lastRiseTS: lastRise,
            lastActionTime: faker.date.recent( { days: max_fault_age_days } ).getTime(),
        }]
    }))
}

export function generateDetectedFaultInfo(validFaultIds: string[], opts?: {isRise?: boolean, isRestab?: boolean, autoApprove?: boolean},): DetectedFaultInfo {
    const faultLevels = [25, 50, 75];
    const faultId = faker.helpers.arrayElement(validFaultIds);
    return {
        autoApprove: (opts && opts.autoApprove) || faker.datatype.boolean(),
        faultId: faultId,
        faultLevel: faker.helpers.arrayElement(faultLevels),
        faultName: faultId, // faultName == faultId é ok
        restab: (opts && opts.isRestab) || faker.datatype.boolean(),
        rise: (opts && opts.isRise) || faker.datatype.boolean(),
        condDesc: faker.word.adjective(),
    }
}

export function generateHealthStatus(
    id_state_pairs: [string, FaultsActs[string]['lastAction']][],
    assetId?: number,
    max_fault_age_days?: number
): NonNullable<Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH.getAssetHealthStatus>>>  {
    const fa = generateListFaultsActs(id_state_pairs, max_fault_age_days);
    const newAssetId = assetId || Number(faker.string.numeric({ exclude: ['0']}));
    return {
        DEV_ID: faker.string.alpha(),
        DAC_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0'] })),
        CLIENT_ID: Number(faker.string.numeric({ exclude: ['0']})),
        UNIT_ID: Number(faker.string.numeric({ exclude: ['0']})),
        MACHINE_ID: Number(faker.string.numeric({ exclude: ['0']})),
        H_DESC: faker.helpers.arrayElement(id_state_pairs)[0],
        P_CAUSES: faker.number.int().toString(),
        FAULTS_DATA: JSON.stringify(fa),
        H_INDEX: faker.helpers.arrayElement([25, 50, 75, 100]),
        H_OFFL: "",
        ASSET_ID: newAssetId,
        ASSET_HEALTH_HIST_ID: Number(faker.string.numeric({ exclude: ['0']})),
        H_DAT_REPORT: faker.date.recent().getTime(),
        H_TYPECHANGE: faker.string.alpha(),
        DUT_DUO_ID: faker.number.int({min:0}),
        DUT_DEVICE_ID: faker.number.int({min:0}),
        ASSET_APPLICATION: faker.string.alpha(),
        MACHINE_APPLICATION: faker.string.alpha(),
        ASSET_ROLE: faker.string.alpha(),
    }
}

export function generateDacsExtraInfo(devId:string, id_state_pairs: [string, FaultsActs[string]['lastAction']][], unitId?: number, clientId?: number): Awaited<ReturnType<typeof sqldb.DACS_DEVICES.getExtraInfo>> {
    return {
        DAC_DEVICE_ID: Number(faker.string.numeric({ exclude: ['0']})),
        CLIENT_ID: clientId != null ? clientId : faker.number.int(),
        UNIT_ID: unitId != null ? unitId : faker.number.int(),
        GROUP_ID: faker.number.int(),
        GROUP_NAME: faker.company.buzzNoun(),
        UNIT_NAME: faker.commerce.department(),
        CLIENT_NAME: faker.company.name(),
        DAC_ID: devId,
        DAC_APPL: faker.string.alphanumeric(),
        DAC_TYPE: faker.string.alphanumeric(),
        DAC_NAME: faker.word.noun(),
        DAC_COMIS: "1",
        DAM_DISABLED: 1,
        DAT_BEGMON: faker.date.past().toISOString(),
        FAULTSCFG: "",
        FLUID_TYPE: faker.string.alphanumeric(),
        FAULTS_DATA: JSON.stringify(generateListFaultsActs(id_state_pairs)),
        H_DESC: faker.helpers.arrayElement(id_state_pairs)[0],
        H_INDEX: faker.helpers.arrayElement([4 ,25, 50, 75, 100]),
        H_DAT_REPORT: Math.floor(faker.date.recent().getTime() / 1000),
        H_TYPECHANGE: faker.helpers.arrayElement(['FDD', 'Manual']),
        P0_MULT_QUAD: faker.number.float({min: -0.00005, max: 0.00005}),
        P0_MULT_LIN: faker.number.float({min: 0.0001, max: 0.05}),
        P0_OFST: faker.number.float({min: -3, max: 0}),
        P1_MULT_QUAD: faker.number.float({min: -0.00005, max: 0.00005}),
        P1_MULT_LIN: faker.number.float({min: 0.0001, max: 0.05}),
        P1_OFST: faker.number.float({min: -3, max: 0}),
        P0_POSITN: faker.datatype.boolean().toString(),
        P1_POSITN: faker.datatype.boolean().toString(),
        P0_SENSOR: faker.string.alphanumeric(),
        P1_SENSOR: faker.string.alphanumeric(),
        SELECTED_L1_SIM: "",
        T0_T1_T2: "",
        ASSET_ID: Number(faker.string.numeric({ exclude: ['0']})),
        DEVICE_ID: Number(faker.string.numeric({ exclude: ['0']})),
        HEAT_EXCHANGER_ID: Number(faker.string.numeric({ exclude: ['0']})),
        ASSET_ROLE: "CONDENSER"
    }
}

export function generateFaultsDefs(fault_ids?: string[]): Awaited<ReturnType<typeof falhaRep['/definitions-fault']>> {
    const ids = fault_ids || faker.word.words().split(' ')
    return {
        defs: ids.map((id) => {
            return {
                fault_id: id,
                gravity: faker.helpers.arrayElement(['Red', 'Orange', 'Yellow']),
                approval_type: faker.helpers.arrayElement(["FULL_AUTO", "FULL_MANUAL", "AUTO_FAULT_ONLY", "AUTO_RESTAB_ONLY"]),
                name: id
            }
        })
    }
}

export function generateKnownFaults(fault_ids?: string[]): Awaited<ReturnType<typeof getKnownFaults>> {
    const ids = fault_ids || faker.word.words().split(' ');
    const faultDefs = generateFaultsDefs(ids);
    return Object.fromEntries(faultDefs.defs.map((x) => [x.fault_id, {
        faultId: x.fault_id,
        faultName: x.name,
        faultLevel: changeHealth(x.gravity)
      }]))
}

export function generateDetectedFaults(faultIds: string[]): Awaited<ReturnType<typeof falhaRep['/detected-faults/dev']>> {
    const selected = faker.helpers.arrayElements(faultIds);
    return {
        list: selected.map((id) => {
            return {
                fault_id: id,
                last_det: faker.date.recent().getTime() / 1000,
                last_restab: faker.date.recent().getTime() / 1000,
                first_det: faker.date.recent().getTime() / 1000
            }
        })
    }
}

export function generateFdetected(faultIds?: string[]): {
    id: string;
    faultName: string;
    origin: string;
    faultLevel: number;
    lastActionTime: number;
    lastAction: "APPROVED" | "REJECTED" | "ERASED" | "RESTAB_WAITING" | "RESTAB_PENDING" | "RESTABLISHED" | "RESTAB_REJECTED" | "PENDING";
    lastDet: number;
    lastRiseTS: number;
    firstRiseTS: number;
}[] {
    const detected = generateDetectedFaults(faultIds);
    const knownFaults = generateKnownFaults(faultIds);
    return detected.list.map((x) => ({
        id: x.fault_id,
        faultName: knownFaults[x.fault_id].faultName,
        origin: 'Repentina V2',
        faultLevel: knownFaults[x.fault_id].faultLevel,
        lastDet: x.last_det,
        lastRiseTS: x.last_det,
        firstRiseTS: x.first_det,
        lastActionTime: Number(faker.date.recent()),
        lastAction: faker.helpers.arrayElement([
            "APPROVED",
            "ERASED",
            "PENDING",
            "REJECTED",
            'RESTABLISHED',
            'RESTAB_PENDING',
            'RESTAB_REJECTED',
            'RESTAB_WAITING'
        ]),
    }))
}

interface DacsEnabled {
    dev_id?: string,
}

export function generateListDacsEnabled(reqParams: DacsEnabled) {
    return {
        list: [{
            id: faker.string.numeric(),
            dev_id: reqParams.dev_id,
            fault_id: faker.string.alphanumeric,
            enabled: faker.datatype.boolean,
            description: faker.string.alpha(),
            user: faker.person.firstName,
            client: faker.person.firstName,
            unit: faker.person.firstName,
            unit_id: faker.number.int,
            timestamp: faker.date.past().toISOString(),
        }]
    }
}

export function generateListDacsEnabledAll() {
    return {
        list: [{
            id: faker.string.numeric(),
            dev_id: faker.string.alphanumeric,
            fault_id: faker.string.alphanumeric,
            enabled: faker.datatype.boolean,
            description: faker.string.alpha(),
            user: faker.person.firstName,
            client: faker.person.firstName,
            unit: faker.person.firstName,
            unit_id: faker.number.int,
            timestamp: faker.date.past().toISOString(),
        }]
    }
}

export function generateEnableFaults() {
    return {
            dev_id: faker.string.alpha(),
            fault_id: faker.string.alpha(),
            enabled: faker.datatype.boolean,
            description: faker.string.alpha(),
            user: faker.person.firstName,
            client: faker.person.firstName,
            unit: faker.person.firstName,
            unit_id: faker.number.int,
    }
}