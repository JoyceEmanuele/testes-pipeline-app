import { FullProg_v4 } from "../../../srcCommon/helpers/scheduleData";
import { faker } from '@faker-js/faker'

function generateDayProg(): FullProg_v4['week']['mon'] {
    return {
        permission: faker.helpers.arrayElement(['forbid', 'allow']),
        start: `${faker.number.int({min: 0, max: 23})}:${faker.number.int({min: 0, max: 59})}`,
        end: `${faker.number.int({min: 0, max: 23})}:${faker.number.int({min: 0, max: 59})}`,
        clearProg: faker.datatype.boolean()
    }
}

export function generateFullProg(): FullProg_v4 {
    return {
        version: 'v4',
        week: {
            mon: generateDayProg(),
            tue: generateDayProg(),
            wed: generateDayProg(),
            thu: generateDayProg(),
            fri: generateDayProg(),
            sat: generateDayProg(),
            sun: generateDayProg(),
        }, 
    }
}