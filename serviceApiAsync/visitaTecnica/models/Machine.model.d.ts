import { Image } from './Image.model';
import { Option } from './Option.model';
export interface Machine {
    id: string;
    context: 'Evaporadora' | 'Condensadora';
    tag: string;
    type: string;
    model: string;
    brand: string;
    cycles: number;
    frigoCapacity: string;
    unit: 'BTUh' | 'TR' | 'HP';
    ratedPower: string;
    tension: string;
    fluid: string;
    valve: string;
    associatedMachines: Option[];
    associatedEnvs: Option[];
    associatedEnvsLocalization: Option[];
    evaporatorPlateImages: Image[];
    condenserPlateImages: Image[];
    environmentCondenserImages: Image[];
    environmentEvaporatorImages: Image[];
    electricCommandImages: Image[];
    valveImages: Image[];
    compressorsImages: Image[];
}
