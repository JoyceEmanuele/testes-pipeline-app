import { faker } from '@faker-js/faker';
import sqldb from '../../../srcCommon/db';

export const generateHealthHist = (assetId?: number): Awaited<ReturnType<typeof sqldb.ASSETS_HEALTH_HIST.getList>> => {
    const devId = faker.string.alpha();
    const generateSingleHealthEntry = () => ({
        DEV_ID: devId,
        DAT_REPORT: faker.date.recent().getTime(),
        H_INDEX: faker.helpers.arrayElement([1, 2, 4, 25, 50, 75, 100]),
        H_DESC: faker.word.adjective(),
        P_CAUSES_ID: faker.number.int({min: 1}),
        P_CAUSES: faker.helpers.multiple(() => faker.number.int({min: 1})).join(','),
        CT_ID: faker.number.int({min: 1, max: 5}),
        TYPECHANGE: faker.string.alpha(),
        UNIT_ID: faker.number.int({min: 1}),
        DAT_BEGMON: faker.date.recent().toISOString(),
        HEALTH_HIST_ID: faker.number.int({min: 1}),
        ASSET_ID: assetId || faker.number.int({min: 1})
      });

    return faker.helpers.multiple(generateSingleHealthEntry);
}