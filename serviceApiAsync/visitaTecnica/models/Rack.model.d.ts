import { Image } from './Image.model';
export interface Rack {
    id: string;
    environmentId: string;
    distanceToAp: string;
    comments: string;
    installationEnvironmentImages: Image[];
}
