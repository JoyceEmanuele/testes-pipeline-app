import { ControlMsgDRI } from "../../../srcCommon/types/devicesMessages";
import { SchedulerExceptionJSON, SchedulerWeekJSON } from "../../devsScheduler";

type Schedule = { start: string, end: string, mode: string };
type Exception = { date: string, schedule?: Schedule };
export const getSchedulerMessageWeekDaysMode = (weekDaysSchedule: Schedule, weekend?: { sunday?: Schedule, saturday?: Schedule }): Record<string, string> => {
  const { start, end, mode } = weekDaysSchedule;
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  const scheduleSaturday = weekend?.saturday ?
    `{\"start\":\"${weekend.saturday.start}\",\"end\":\"${weekend.saturday.end}\",\"mode\":[\"${weekend.saturday.mode}\"]}`
    : '';
  const scheduleSunday = weekend?.sunday ?
    `{\"start\":\"${weekend.sunday.start}\",\"end\":\"${weekend.sunday.end}\",\"mode\":[\"${weekend.sunday.mode}\"]}`
    : '';

  let response: Record<string, string> = {
    saturday: `{\"default_mode\":[\"OFF\"], \"schedule\":[${scheduleSaturday}]}`,
    sunday: `{\"default_mode\":[\"OFF\"], \"schedule\":[${scheduleSunday}]}`
  };

  for (const weekDay of weekDays) {
    response[weekDay] = `{\"default_mode\":[\"OFF\"], \"schedule\":[{\"start\":\"${start}\",\"end\":\"${end}\",\"mode\":[\"${mode}\"]}]}`;
  }

  return response;
}

export function scheduleVerificationMockMessagesEmpty(driId: string): ControlMsgDRI[] {
  const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return weekDays.map((weekDay) => ({
    dev_id: driId,
    msgtype: "get-scheduler-info-week",
    weekday: weekDay,
    machine: 0,
    data: "{\"default_mode\":[\"OFF\"], \"schedule\":[]}"
  } as ControlMsgDRI));
}

export function scheduleVerificationMockMessages(driId: string, additionalInput?: Record<string, string>): ControlMsgDRI[] {
  const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return weekDays.map((weekDay) => {
    const defaultData = "{\"default_mode\":[\"OFF\"], \"schedule\":[{\"start\":\"00:00\",\"end\":\"23:59\",\"mode\":[\"SET24\"]}]}";
    const data = additionalInput && Object.keys(additionalInput).includes(weekDay) ? additionalInput[weekDay] : defaultData;

    return {
      dev_id: driId,
      msgtype: "get-scheduler-info-week",
      weekday: weekDay,
      machine: 0,
      data: data,
    } as ControlMsgDRI
  });
}

export function exceptionVerificationMockMessagesEmpty(driId: string): ControlMsgDRI[] {
  return [
    {
      dev_id: driId,
      msgtype: "get-scheduler-info-exceptions",
      machine: 0,
      data: "{}"
    }
  ] as unknown as ControlMsgDRI[];
}

export function exceptionVerificationMockMessages(driId: string, date: string, additionalData?: Exception[]): ControlMsgDRI[] {
  const defaultData = `\"${date}\":{\"default_mode\":[\"OFF\"],\"schedule\":[{\"start\":\"00:00\",\"end\":\"23:59\",\"mode\":[\"SET24\"]}]}`;
  const additional = additionalData?.map((exception) => {
    const schedule = exception.schedule ? `{\"start\":\"${exception.schedule.start}\",\"end\":\"${exception.schedule.end}\",\"mode\":[\"${exception.schedule.mode}\"]}` : '';
    return `\"${exception.date}\":{\"default_mode\":[\"OFF\"],\"schedule\":[${schedule}]}`;
  }).join(',');
  const additionalText = additional ? `, ${additional}` : '';

  const data = `{${defaultData}${additionalText}}`;

  return [
    {
      dev_id: driId,
      msgtype: "get-scheduler-info-exceptions",
      machine: 0,
      data: data
    }
  ] as unknown as ControlMsgDRI[];
}

export function setScheduleMockMessageEmpty(driId: string): ControlMsgDRI[] {
  return [
    {
      json_status: true,
      msgtype: "echo_json_scheduler",
      json_data: JSON.stringify({
        msgtype: "set-scheduler-week",
        machine: 0,
        days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        default_mode: ["OFF"],
        schedule: []
      }),
      dev_id: driId
    }
  ] as unknown as ControlMsgDRI[];
}

export function setScheduleMockMessages(driId: string, schedulerInputs?: SchedulerWeekJSON[]): ControlMsgDRI[] {
  const baseControlMsg = {
    json_status: true,
    msgtype: "echo_json_scheduler",
    json_data: JSON.stringify({
      msgtype: "set-scheduler-week",
      machine: 0,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      default_mode: ["OFF"],
      schedule: [
        {
          start: "00:00",
          end: "23:59",
          mode: ["SET24"]
        }
      ]
    }),
    dev_id: driId
  } as ControlMsgDRI;

  return schedulerInputs?.length > 0 ? schedulerInputs.map((input) => ({
    ...baseControlMsg,
    json_data: JSON.stringify(input),
  }))
    : [baseControlMsg];
}

export function setExceptionMockMessageEmpty(driId: string): ControlMsgDRI[] {
  return [
    {
      json_status: true,
      msgtype: "echo_json_scheduler",
      json_data: {
        msgtype: "set-scheduler-exceptions",
        machine: 0,
        exceptions: {}
      },
      dev_id: driId
    }
  ] as unknown as ControlMsgDRI[];
}

export function setExceptionMockMessage(driId: string, date: string, exceptionInput?: SchedulerExceptionJSON['exceptions']): ControlMsgDRI[] {
  return [
    {
      json_status: true,
      msgtype: "echo_json_scheduler",
      json_data: {
        msgtype: "set-scheduler-exceptions",
        machine: 0,
        exceptions: {
          [date]: {
            default_mode: ['OFF'],
            schedule: [
              {
                start: "00:00",
                end: "23:59",
                mode: ["SET24"]
              }
            ]
          },
          ...(exceptionInput ?? {}),
        }
      },
      dev_id: driId
    }
  ] as unknown as ControlMsgDRI[];
}
