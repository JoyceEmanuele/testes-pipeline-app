import { faker } from "@faker-js/faker";

export function getAllClientsEnabled() {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
        return {
            CLIENT_ID: Number(faker.string.numeric({ exclude: ['0'] })),
            CLIENT_NAME: faker.string.alphanumeric(),
        }
    })
}

export function mockReqParamsGetAllClients() {
    return {
        FILTER_BY_CLIENT_IDS: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => {
            return faker.number.int();
        }),
    }
}
