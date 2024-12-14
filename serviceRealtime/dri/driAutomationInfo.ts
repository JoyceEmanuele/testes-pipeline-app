import { getCarrierEcosplitCommandsAutomation, getFancoilCommandsAutomation, getVavCommandsAutomation } from "../../srcCommon/dri/driAutomation";
import { isApplicationAutomationByVarsCfg, MINIMUM_AUTOMATION_VERSION } from "../../srcCommon/dri/driInfo";
import { compareVersions, parseFirmwareVersion } from "../../srcCommon/helpers/fwVersion";
import { logger } from "../../srcCommon/helpers/logger";
import { DriVarsConfig } from "../../srcCommon/types";
import sqldb from '../../srcCommon/db';
import { sendDriVarConfig } from "../../srcCommon/iotMessages/devsCommands";

interface SetModbusRtuMap {
  'protocol': 'set_mdb_rtu_map';
  id: number;
  function: number;
  address: number[];
  value: number[];
  aliases: string[];
}

interface SetModbusTcpMap {
  'protocol': 'set_mdb_tcp_map';
  ip: string;
  id: number;
  function: number;
  address: number[];
  value: number[];
  aliases: string[];
}

interface SetUartFrame {
  'protocol': 'set_uart_frame';
  frame: number[];
  alias: string;
}

abstract class BuilderSetModbusMapBase<T extends SetModbusRtuMap | SetModbusTcpMap> {
  protected command: T;

  constructor(command: T) {
    this.command = command;
  }

  setAliasValue(address: number, value: number, alias: string): this {
    this.command.address.push(address);
    this.command.value.push(value);
    this.command.aliases.push(alias);
    return this;
  }

  build(): string {
    return JSON.stringify(this.command);
  }
}

class BuilderSetModbusRtuMap extends BuilderSetModbusMapBase<SetModbusRtuMap> {
  constructor() {
    super({
      "protocol": 'set_mdb_rtu_map',
      id: 1,
      function: 6,
      address: [],
      value: [],
      aliases: []
    });
  }
}

class BuilderSetModbusTcpMap extends BuilderSetModbusMapBase<SetModbusTcpMap> {
  constructor(ip: string) {
    super({
      "protocol": 'set_mdb_tcp_map',
      ip,
      id: 1,
      function: 6,
      address: [],
      value: [],
      aliases: []
    });
  }
}

class BuilderSetUartFrames {
  private readonly commands: SetUartFrame[];

  constructor() {
    this.commands = []
  }

  setAliasFrame(frame: number[], alias: string): this {
    this.commands.push({
      "protocol": 'set_uart_frame',
      alias,
      frame,
    });

    return this;
  }

  build(): string[] {
    return this.commands.map((command) => JSON.stringify(command));
  }
}

export async function saveAutomationCommandsVarsCfg(driId: number, varsCfg: DriVarsConfig): Promise<void> {
  const commands = [];
  if (varsCfg.application.startsWith('fancoil')) {
    commands.push(...await getFancoilCommandsAutomation(varsCfg));
  }
  if (varsCfg.application.startsWith('vav')) {
    commands.push(...await getVavCommandsAutomation(varsCfg));
  }

  if (varsCfg.application === 'carrier-ecosplit') {
    commands.push(...await getCarrierEcosplitCommandsAutomation());
  }

  varsCfg.automationList = commands;

  await sqldb.DRIS_DEVICES.w_updateInfo({
    ID: Number(driId),
    VARSCFG: varsCfg ? JSON.stringify(varsCfg) : null,
    LASTCFGSEND: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 19) + '-0300',
  }, '[SYSTEM]');
}

async function sendCarrierEcosplitAutomationCommand(driId: number, varsCfg: DriVarsConfig): Promise<string[]> {
  const commands = new BuilderSetUartFrames();

  if (!varsCfg.automationList || varsCfg.automationList.length === 0) {
    await saveAutomationCommandsVarsCfg(driId, varsCfg);
  }

  for (const { array, alias } of varsCfg.automationList) {
    if (!array) {
      const message = 'Frames dos comandos carrier-ecosplit não encontrados!'
      logger.error({
        message,
        varsCfg,
      })
      throw new Error(message).HttpStatus(400);
    }
    commands.setAliasFrame(JSON.parse(array), alias);
  }

  const commandsString = commands.build();
  return commandsString;
}

async function sendFancoilAutomationCommand(driId: number, varsCfg: DriVarsConfig): Promise<string> {
  return sendVavAutomationCommand(driId, varsCfg);
}

async function sendVavAutomationCommand(driId: number, varsCfg: DriVarsConfig): Promise<string> {
  if (!varsCfg.automationList || varsCfg.automationList.length === 0) {
    await saveAutomationCommandsVarsCfg(driId, varsCfg);
  }

  const command = varsCfg.protocol === 'modbus-rtu' ?
    new BuilderSetModbusRtuMap() :
    new BuilderSetModbusTcpMap('null');

  for (const { alias, address, value } of varsCfg.automationList) {
    command.setAliasValue(address, value, alias);
  }

  const commandString = command.build();

  return commandString;
}

export async function sendDriAutomationCommands(driId: number, deviceCode: string, varsCfg: DriVarsConfig, version: string, sendConfigs: boolean): Promise<string> {
  let commandData = '';
  const versionNumber = parseFirmwareVersion(version);

  if (compareVersions(versionNumber, MINIMUM_AUTOMATION_VERSION, false) < 0 || !isApplicationAutomationByVarsCfg(varsCfg)) {
    return commandData;
  }

  if (varsCfg.application === 'carrier-ecosplit') {
    const commands = await sendCarrierEcosplitAutomationCommand(driId, varsCfg);

    for (const command of commands) {
      commandData += command;
      if (sendConfigs) sendDriVarConfig(deviceCode, command, '[SYSTEM]');
    }
  }

  if (varsCfg.application.startsWith('fancoil')) {
    commandData = await sendFancoilAutomationCommand(driId, varsCfg);
    
    if (sendConfigs && commandData) sendDriVarConfig(deviceCode, commandData, '[SYSTEM]');
  }

  if (varsCfg.application.startsWith('vav')) {
    commandData = await sendVavAutomationCommand(driId, varsCfg);
    
    if (sendConfigs && commandData) sendDriVarConfig(deviceCode, commandData, '[SYSTEM]');
  }

  return commandData;

}