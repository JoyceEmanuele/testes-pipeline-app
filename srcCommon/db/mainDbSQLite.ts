import * as BetterSqlite3 from 'better-sqlite3';
import { queryFormat } from './connectMysql';

const db = new BetterSqlite3('maindb.sqlite', {});

export async function execute (sentence: string, parameters?: {[k:string]:any}): Promise<{ affectedRows: number, insertId: number }> {
  const stmt = db.prepare(queryFormat(sentence, parameters || {}));
  const resp = stmt.run();
  return { affectedRows: resp.changes, insertId: resp.lastInsertRowid as number };
}

export async function query<T={[k:string]:any}> (sentence: string, parameters?: {[k:string]:any}): Promise<T[]> {
  const stmt = db.prepare(queryFormat(sentence, parameters || {}));
  return stmt.all() as T[];
}

export async function querySingle<T> (sentence: string, parameters?: {[k:string]:any}): Promise<T> {
  const rows: any[] = await query(sentence, parameters);
  if (rows.length === 1) return rows[0];
  if (rows.length === 0) return null;
  throw Error('Invalid database result').HttpStatus(500).DebugInfo({ sentence, parameters });
}

export async function queryFirst<T> (sentence: string, parameters?: {[k:string]:any}): Promise<T> {
  const rows: any[] = await query(sentence, parameters);
  if (rows.length >= 1) return rows[0];
  if (rows.length === 0) return null;
  throw Error('Invalid database result').HttpStatus(500).DebugInfo({ sentence, parameters });
}
