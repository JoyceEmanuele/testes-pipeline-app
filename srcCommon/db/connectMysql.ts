import * as mysql from 'mysql'
import servConfig from '../../configfile'

import { logger } from '../helpers/logger';

let pool: mysql.Pool = null
export function queryFormat (query: string, values: {[k:string]:any}): string {
  if (!values) {
    // logger.info(query)
    return query
  }
  const sentence = query.replace(/\:(\w+)/g, (txt, key) => {
    if (values.hasOwnProperty(key)) {
      return mysql.escape(values[key])
    }
    return txt
  })
  // logger.info(sentence)
  return sentence
}

function getPool (): mysql.Pool {
  if (!pool) {
    const opts = Object.assign({
      connectionLimit: 20,
      queryFormat: queryFormat,
    }, servConfig.mysqlConfig) // host, user, password, database
    pool = mysql.createPool(opts)
    pool.on('connection', function (connection) {
      connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))")
    });
  }
  return pool
}

export function execute (sentence: string, parameters?: {[k:string]:any}): Promise<{ affectedRows: number, insertId: number }> {
  return query(sentence, parameters) as any
}

export async function querySingle<T> (sentence: string, parameters?: {[k:string]:any}): Promise<T|null> {
  const rows: any[] = await query(sentence, parameters)
  if (rows.length === 1) return rows[0]
  if (rows.length === 0) return null
  throw Error('Invalid database result').HttpStatus(500).DebugInfo({ sentence, parameters })
}

export async function queryFirst<T> (sentence: string, parameters?: {[k:string]:any}): Promise<T|null> {
  const rows: any[] = await query(sentence, parameters)
  if (rows.length >= 1) return rows[0]
  if (rows.length === 0) return null
  throw Error('Invalid database result').HttpStatus(500).DebugInfo({ sentence, parameters })
}

export function query<T={[k:string]:any}> (sentence: string, parameters?: {[k:string]:any}): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getPool().query(sentence, parameters, (error, results, fields) => {
      if (error) {
        logger.error({
          sentence, 
          parameters,
          ...error
        });
        return reject(error)
      }
      // results.affectedRows
      // results.changedRows
      return resolve(results)
    })
  })
}

function getQuery (sentence: string, parameters: {[k:string]:any}) {
  const query = getPool().query(sentence, parameters)
  // query
  // .on('error', function(err) {
  //   // Handle error, an 'end' event will be emitted after this as well
  // })
  // .on('fields', function(fields) {
  //   // the field packets for the rows to follow
  // })
  // .on('result', function(row) {
  //   // Pausing the connnection is useful if your processing involves I/O
  //   connection.pause();

  //   processRow(row, function() {
  //     connection.resume();
  //   });
  // })
  // .on('end', function() {
  //   // all rows have been received
  // });
  return query
}

function close () {
  // connection.end();
  getPool().end((err: any) => {
    // all connections in the pool have ended
    if (err) { logger.info(err) }
  })
}

// pool.getConnection((err, connection) => {
//   if (err) throw err // not connected!
//   logger.info('connected as id ' + connection.threadId);

//   // Use the connection
//   connection.query('SELECT 1 + 1 AS solution, something FROM sometable', function (error, results, fields) {
//     // When done with the connection, release it.
//     connection.release()

//     // Handle error after the release.
//     if (error) throw error

//     // Don't use the connection here, it has been returned to the pool.
//     logger.info('The solution is: ', results[0].solution);
//   })
// })


// connection.beginTransaction(function(err) {
//   if (err) { throw err; }
//   connection.query('INSERT INTO posts SET title=?', title, function (error, results, fields) {
//     if (error) {
//       return connection.rollback(function() {
//         throw error;
//       });
//     }

//     var log = 'Post ' + results.insertId + ' added';

//     connection.query('INSERT INTO log SET data=?', log, function (error, results, fields) {
//       if (error) {
//         return connection.rollback(function() {
//           throw error;
//         });
//       }
//       connection.commit(function(err) {
//         if (err) {
//           return connection.rollback(function() {
//             throw err;
//           });
//         }
//         logger.info('success!');
//       });
//     });
//   });
// });
