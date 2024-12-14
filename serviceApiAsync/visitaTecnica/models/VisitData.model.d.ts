import { DRT } from './DRT.model';
import { Energy } from './Energy.model';
import { Environment } from './Environment.model';
import { Machine } from './Machine.model';
import { WaterMeasurer } from './WaterMeasurer.model';
export interface VisitData {
    climatizationAndRefrigeration: {
        environments: Environment[];
        machines: Machine[];
    };
    energy: Energy;
    water: {
        waterMeasurers: WaterMeasurer[];
    };
    network: {
        drts: DRT[];
    };
}
