import { Image } from './Image.model';
export interface WaterMeasurer {
    id: string;
    situation: 'Individual' | 'Coletivo';
    brand: string;
    model: string;
    localization: string;
    floorLocalization: string;
    pipeDiameter: string;
    isPossibleToInstallOtherMeterWithTheGeneralMeasurerWithoutBuilding: boolean;
    wasTheTransmissionGivenByTheSxRadioTransmitterSuccessful: string;
    measurerEnvironment: Image[];
    measurerImages: Image[];
}
