import { AccessPoint } from './AccessPoint.model';
import { Image } from './Image.model';
import { Rack } from './Rack.model';
export interface DRT {
    id: string;
    environmentId: string;
    installationEnvironmentImages: Image[];
    racks: Rack[];
    accessPoints: AccessPoint[];
}
