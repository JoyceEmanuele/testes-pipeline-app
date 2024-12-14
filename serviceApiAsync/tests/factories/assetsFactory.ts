import { faker } from "@faker-js/faker";

export function mockVerifyRatedPowerMachineParams(updateMachineRatedPower: boolean, guaranteeChangeRatedPower: boolean = false) {
    const newRatedPowerAsset = faker.number.int({ min: 1, max: 50});
    let oldRatedPowerAsset = faker.number.int({ min: 1, max: 50});
    if (guaranteeChangeRatedPower) {
        while (newRatedPowerAsset == oldRatedPowerAsset) {
            oldRatedPowerAsset = faker.number.int({ min: 1, max: 50});
        }
    }
    return {
        newRatedPowerAsset,
        oldRatedPowerAsset,
        machineId: Number(faker.string.numeric({ exclude: ['0'] })),
        updateMachineRatedPower,
        userId: faker.string.alphanumeric(),
    }
}
