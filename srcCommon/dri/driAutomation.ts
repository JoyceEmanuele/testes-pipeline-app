import { DriProg, DriVarsConfig } from "../types";
import sqldb from '../db';

function parseVavAutomationCommands(
  commands: Awaited<ReturnType<typeof sqldb.VAV_BAC_AUTOMATION_COMMANDS.getCommandsList>>
): DriVarsConfig['automationList'] {
  return commands.map((command) => ({
    address: command.ADDRESS,
    alias: command.ALIAS,
    description: command.DESCRIPTION,
    value: command.VALUE,
  }));
};

function parseCarrierEcosplitAutomationCommands(
  commands: Awaited<ReturnType<typeof sqldb.CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.getCommandsList>>
): DriVarsConfig['automationList'] {
  return commands.map((command) => ({
    alias: command.ALIAS,
    array: command.ARRAY,
    description: command.DESCRIPTION,
  }))
}

export async function getFancoilCommandsAutomation(varsCfg: DriVarsConfig): Promise<DriVarsConfig['automationList']> {
  return getVavCommandsAutomation(varsCfg);
}

export async function getVavCommandsAutomation(varsCfg: DriVarsConfig): Promise<DriVarsConfig['automationList']> {
  const commands: Awaited<ReturnType<typeof sqldb.VAV_BAC_AUTOMATION_COMMANDS.getCommandsList>> = [];

  if (varsCfg.application.endsWith('bac-6000-amln')) {
    const bac6000AmlnCommands = await sqldb.VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS.getCommandsList();
    commands.push(...bac6000AmlnCommands);
  } else {
    const bacMlnCommands = await sqldb.VAV_BAC_AUTOMATION_COMMANDS.getCommandsList();
    commands.push(...bacMlnCommands);
  }

  return parseVavAutomationCommands(commands);
}

export async function getCarrierEcosplitCommandsAutomation(): Promise<DriVarsConfig['automationList']> {
  const commands = await sqldb.CARRIER_ECOSPLIT_AUTOMATION_COMMANDS.getCommandsList();

  return parseCarrierEcosplitAutomationCommands(commands);
}

export function parseDriScheduleToCards(schedules: Awaited<ReturnType<typeof sqldb.DRISCHEDS.getDriScheds>>): DriProg[] {
  return schedules.map((schedule) => ({
    ACTIVE: schedule.ACTIVE,
    BEGIN_TIME: schedule.BEGIN_TIME,
    DAYS: schedule.DAYS,
    DRI_ID: schedule.DRI_ID,
    END_TIME: schedule.END_TIME,
    MODE: schedule.MODE,
    OPERATION: schedule.OPERATION,
    SCHED_ID: schedule.SCHED_ID,
    SETPOINT: schedule.SETPOINT,
    EXCEPTION_DATE: schedule.EXCEPTION_DATE,
    EXCEPTION_REPEAT_YEARLY: schedule.EXCEPTION_REPEAT_YEARLY,
  }))
}
