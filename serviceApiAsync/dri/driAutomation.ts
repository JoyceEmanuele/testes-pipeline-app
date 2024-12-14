import * as driInfo from '../../srcCommon/dri/driInfo';
import { DriProg, DriVarsConfig } from '../../srcCommon/types';

function verifyBac6000AmlnWorkaroundCommand(driCfg: DriVarsConfig, prog: DriProg, commands: string[]): void {
  if (driCfg.application.endsWith('bac-6000-amln') && prog.MODE === 'COOL') {
    commands.push(driInfo.getDriAutomationCommand(driCfg, undefined, 'Setpoint Temp 15').alias);
  }
}

function verifyMlnCoolCommand(driCfg: DriVarsConfig, prog: DriProg, commands: string[]): void {
  if (!driCfg.application.endsWith('bac-6000-amln')) {
    commands.push(driInfo.getDriAutomationCommand(driCfg, undefined, `Modo de operação Refrigerar`).alias);
  }
}

function getCarrierEcosplitAutomationCmdsByProg(
  prog: DriProg, driCfg: DriVarsConfig, commands: string[], defaultModeCmds: string[]
): void {
  const offCommand = driInfo.getDriAutomationCommand(driCfg, undefined, 'Turn OFF');
  if (offCommand) defaultModeCmds.push(offCommand.alias);
  if (prog.OPERATION === '1') {
    if (prog.MODE) {
      const command = driInfo.getDriAutomationCommand(driCfg, prog.MODE);
      command && commands.push(command.alias);
    }
    if (prog.SETPOINT) {
      const command = driInfo.getDriAutomationCommand(driCfg, `SET${prog.SETPOINT}`)
      command && commands.push(command.alias);
    }
  } else {
    offCommand && commands.push(offCommand.alias);
  }
}

function getFancoilAutomationCmdsByProg(
  prog: DriProg, driCfg: DriVarsConfig, commands: string[], defaultModeCmds: string[]
): void {
  const offCommand = driInfo.getDriAutomationCommand(driCfg, undefined, 'Status do termostato OFF');
  if (offCommand) defaultModeCmds.push(offCommand.alias);
  if (prog.OPERATION === '1') {
    const command = driInfo.getDriAutomationCommand(driCfg, undefined, 'Status do termostato ON');
    command && commands.push(command.alias);
    if (prog.MODE) {
      const commandMode = driInfo.getDriAutomationCommand(driCfg, undefined, `Modo de operação ${prog.MODE === 'COOL' ? 'Refrigerar' : 'Ventilar'}`);
      commandMode && commands.push(commandMode.alias);

      verifyBac6000AmlnWorkaroundCommand(driCfg, prog, commands)
    }
    if (prog.SETPOINT) {
      const commandSetpoint = driInfo.getDriAutomationCommand(driCfg, undefined, `Setpoint Temp ${prog.SETPOINT}`);
      commandSetpoint && commands.push(commandSetpoint.alias);
    }
  } else {
    offCommand && commands.push(offCommand.alias);
  }
}

function getVavAutomationCmdsByProg(
  prog: DriProg, driCfg: DriVarsConfig, commands: string[], defaultModeCmds: string[]
): void {
  const offCommand = driInfo.getDriAutomationCommand(driCfg, undefined, 'Status do termostato OFF');
  if (offCommand) defaultModeCmds.push(offCommand.alias);
  if (prog.OPERATION === '1') {
    const command = driInfo.getDriAutomationCommand(driCfg, undefined, 'Status do termostato ON');
    command && commands.push(command.alias);

    verifyMlnCoolCommand(driCfg, prog, commands);

    if (prog.SETPOINT) {
      const commandSetpoint = driInfo.getDriAutomationCommand(driCfg, undefined, `Setpoint Temp ${prog.SETPOINT}`);
      commandSetpoint && commands.push(commandSetpoint.alias);
    }
  } else {
    offCommand && commands.push(offCommand.alias);
  }
}

export function getAutomationDriCommandsByProg(prog: DriProg, driCfg: DriVarsConfig) {
  const commands = [] as string[];
  const defaultModeCmds = [] as string[];

  if (!driCfg?.automationList) return { commands, defaultModeCmds }

  if (driCfg.application === 'carrier-ecosplit') {
    getCarrierEcosplitAutomationCmdsByProg(prog, driCfg, commands, defaultModeCmds);
  }

  if (driCfg.application?.startsWith('vav')) {
    getVavAutomationCmdsByProg(prog, driCfg, commands, defaultModeCmds);
  }

  if (driCfg.application?.startsWith('fancoil')) {
    getFancoilAutomationCmdsByProg(prog, driCfg, commands, defaultModeCmds);
  }

  return { commands, defaultModeCmds }
}
