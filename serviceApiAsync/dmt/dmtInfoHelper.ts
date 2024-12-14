import sqldb from '../../srcCommon/db';

export async function getNobreakDmtsCircuitPorts(reqParams: { clientIds?: number[], unitIds?: number[] }) {
  const circuitPorts = await sqldb.DMTS_NOBREAK_CIRCUITS.getList({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });

  const ports: Map<number, { PORT: number }[]> = new Map();

  for (const row of circuitPorts) {
    const newItem = {
      PORT: row.PORT,
    };
    const dmtPorts = ports.get(row.DMT_ID);
    if (!dmtPorts) {
      ports.set(row.DMT_ID, [newItem]);
    } else {
      dmtPorts.push(newItem);
    }
  }

  return ports;
}

export async function getNobreakDmtsNobreakPorts(reqParams: { clientIds?: number[], unitIds?: number[] }) {
  const nobreakPorts = await sqldb.DMTS_NOBREAKS.getList({
    clientIds: reqParams.clientIds,
    unitIds: reqParams.unitIds,
  });

  const ports: Map<number, { NOBREAK_ID: number, PORT: number }[]> = new Map();

  for (const row of nobreakPorts) {
    const newItem = {
      NOBREAK_ID: row.NOBREAK_ID,
      PORT: row.PORT,
    };
    const dmtPorts = ports.get(row.DMT_ID);
    if (!dmtPorts) {
      ports.set(row.DMT_ID, [newItem]);
    } else {
      dmtPorts.push(newItem);
    }
  }

  return ports;
}
