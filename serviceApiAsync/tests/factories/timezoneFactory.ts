import { faker } from '@faker-js/faker';
import * as momentTimezone from 'moment-timezone';

export function generateRandomTimezone() {
    const timezones = momentTimezone.tz.names();

    return timezones[Math.floor(Math.random() * timezones.length)];
  }

export function mockTimezoneInfo( fakeTimezoneId?: number){
 return {
    TIMEZONE_ID: fakeTimezoneId || Number(faker.string.numeric({ exclude: ['0'] })),
    TIMEZONE_OFFSET: faker.number.int({ min: -12, max: 12 }),
    TIMEZONE_AREA: generateRandomTimezone()
 }
}

export function mockOffsetInfo(){
  return faker.number.int({ min: -12, max: 12 })
}

export function mockAllinfo() {
  return {
    id: Number(faker.string.numeric({ exclude: ['0'] })),
    offset: Number(faker.string.numeric({ exclude: ['0'] })),
    area: faker.string.numeric({ exclude: ['0'] }),
    posix: faker.string.numeric({ exclude: ['0'] }),
    dst_abreviation: faker.string.numeric({ exclude: ['0'] }),
    abreviation_zone: faker.string.numeric({ exclude: ['0'] }),
}
}