import { Image } from './Image.model';
export interface Environment {
    id: string;
    context: 'Climatizado' | 'Técnico';
    tag: string;
    name: string;
    location: string;
    type: string;
    evaporatorsCount: number;
    shouldEvaporatorsWorkFullTime: boolean;
    controllerTime: string;
    minTemperature: string;
    maxTemperature: string;
    areaInSquareMeters: string;
    environmentImages: Image[];
}
