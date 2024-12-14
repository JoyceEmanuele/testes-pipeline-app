import { faker } from '@faker-js/faker';

interface NotifInfo {
  NOTIF_ID: number
  NAME: string
  FILT_DEVS: string
  COND_VAR: string
  COND_OP: string
  COND_VAL: string
  COND_SECONDARY_VAL: string
  CREATED_BY: string
  NOTIF_MSG: string
  CLIENT_ID: number
  COND_PARS: string
}

interface NotifInfoProps {
  NOTIF_ID: number
}

export function generateNotifInfo(props: NotifInfoProps) {
  return {
    NOTIF_ID: props.NOTIF_ID,
    NAME: faker.word.noun(),
    FILT_DEVS: faker.word.noun(),
    COND_VAR: faker.word.noun(),
    COND_OP: faker.word.noun(),
    CREATED_BY: faker.internet.email(),
    NOTIF_MSG: faker.hacker.phrase(),
    CLIENT_ID: faker.number.int({min: 1}),
    COND_PARS: faker.hacker.phrase(),
  }
}