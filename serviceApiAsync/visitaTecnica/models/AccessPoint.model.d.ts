import { Image } from './Image.model';
import { ServedEnvironmentOrMachine } from './ServedEnvironmentOrMachine.model';
export interface AccessPoint {
    id: string;
    type: 'Interno' | 'Externo';
    environmentId: string;
    distanceToAp: string;
    comments: string;
    installationEnvironmentImages: Image[];
    servedEnvironmentAndMachines: ServedEnvironmentOrMachine[];
}
