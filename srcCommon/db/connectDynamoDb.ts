import {
  DynamoDBClient,
  CreateTableCommand, CreateTableCommandInput,
  ListTablesCommand, ListTablesCommandInput,
} from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput,
  PutCommand, PutCommandInput, PutCommandOutput,
  GetCommand, GetCommandOutput, GetCommandInput,
  UpdateCommand, UpdateCommandInput, UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb"; // ES6 import
import servConfig from '../../configfile'

// "endpoint": "http://dynamodb.us-east-1.amazonaws.com",
// AWS.config.update(servConfig.awsConfig)
// let docClient: AWS.DynamoDB.DocumentClient = null
const ddbClient = servConfig.awsConfig && new DynamoDBClient({
  region: servConfig.awsConfig.dynamoDbRegion,
  credentials: {
    accessKeyId: servConfig.awsConfig.accessKeyId,
    secretAccessKey: servConfig.awsConfig.secretAccessKey,
    sessionToken: servConfig.awsConfig.sessionToken || undefined,
  }
});
const docClient = ddbClient && DynamoDBDocumentClient.from(ddbClient);

export async function putDynamoItem (tableName: string, item: any, conditionalExpression: string): Promise<PutCommandOutput> {
  const params: PutCommandInput = {
    TableName: tableName,
    Item: item,
    ConditionExpression: conditionalExpression
  }
  return docClient.send(new PutCommand(params))
}

export async function updateDynamoItem (tableName: string, primaryKeyName: string, primaryKeyValue: string, partialKeyName: string, partialKeyValue:string, item: any): Promise<UpdateCommandOutput> {
  const { updateExpression, expressionAttribute, expressionAttributeNames } = prepareUpdate(item);
  const input: UpdateCommandInput = {
    Key: {
      [primaryKeyName]: primaryKeyValue,
      [partialKeyName]: partialKeyValue
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeValues: expressionAttribute,
    ExpressionAttributeNames: expressionAttributeNames,
    TableName: tableName,
  };

  return await docClient.send(new UpdateCommand(input))
}

export function prepareUpdate(item: { [key: string]: any }) {
  const updateExpression: string[] = [];
  const expressionAttribute: { [key: string]: any } = {};
  const expressionAttributeNames: { [key: string]: any } = {};
  Object.keys(item).forEach((key) => {
    const placeholder = `:p${key}`;
    const alias = `#a${key}`;
    updateExpression.push(`${alias} = ${placeholder}`);
    expressionAttribute[placeholder] = item[key];
    expressionAttributeNames[alias] = key;
  });
  return { updateExpression, expressionAttribute, expressionAttributeNames };
}

export async function getDynamoItem (tableName: string, primaryKeyName: string, primaryKeyValue: string, partialKeyName: string, partialKeyValue: string): Promise<GetCommandOutput> {
  const params: GetCommandInput = {
    TableName: tableName,
    Key: {
      [primaryKeyName]: primaryKeyValue,
      [partialKeyName]: partialKeyValue
    },
  }
  return docClient.send(new GetCommand(params))
}

export async function listTables () {
  const pars: ListTablesCommandInput = {
    Limit: 100,
  };
  let tableNames: string[] = [];
  while(true) {
    const response = await ddbClient.send(new ListTablesCommand(pars));
    tableNames = tableNames.concat(response.TableNames);

    if (response.LastEvaluatedTableName) {
      pars.ExclusiveStartTableName = response.LastEvaluatedTableName;
      continue;
    }

    break;
  }
  return tableNames;
}

export async function createTable (tableName: string) {
  // tableName = 'DAM30121XXXX_RAW'
  const pars: CreateTableCommandInput = {
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: 'dev_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'dev_id', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    // BillingMode: 'PROVISIONED',
    // ProvisionedThroughput: {
    //   ReadCapacityUnits: 5,
    //   WriteCapacityUnits: 5,
    // },
  };
  const response = await ddbClient.send(new CreateTableCommand(pars));
  return response;
}

// async function putDynamoItem (tableName: string, item: any): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
//   if (!servConfig.isProductionServer) return null;
//   // if (!docClient) {
//   //   docClient = new AWS.DynamoDB.DocumentClient()
//   // }

//   return new Promise((resolve, reject) => {
//     docClient.putItem({ TableName: tableName, Item: item }, (err, data) => {
//       if (err) {
//         return reject(err)
//       } else {
//         return resolve(data)
//       }
//     })
//   })
// }

// async function deleteDynamoItem (reqPars: AWS.DynamoDB.DocumentClient.DeleteItemInput): Promise<AWS.DynamoDB.DocumentClient.DeleteItemOutput> {
//   if (!servConfig.isProductionServer) return null;
//   if (!docClient) {
//     docClient = new AWS.DynamoDB.DocumentClient()
//   }

//   return new Promise((resolve, reject) => {
//     docClient.delete(reqPars, (err, data) => {
//       if (err) {
//         return reject(err)
//       } else {
//         return resolve(data)
//       }
//     })
//   })
// }

// async function deleteDynamoItems (tableName: string, itemsKeys: AWS.DynamoDB.DocumentClient.Key[]): Promise<AWS.DynamoDB.DocumentClient.BatchWriteItemOutput> {
//   if (!servConfig.isProductionServer) return null;
//   if (!docClient) {
//     docClient = new AWS.DynamoDB.DocumentClient()
//   }

//   const reqPars: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
//     RequestItems: {
//       [tableName]: itemsKeys.map((Key) => ({ DeleteRequest: { Key } }))
//     }
//   };

//   return new Promise((resolve, reject) => {
//     docClient.batchWrite(reqPars, (err, data) => {
//       if (err) {
//         return reject(err)
//       } else {
//         return resolve(data)
//       }
//     })
//   })
// }

export function sortCompar_betweenInc (qPars: { date_begin: string, date_end: string }) {
  return { sortCompar: `BETWEEN :date_begin AND :date_end`, date_begin: qPars.date_begin, date_end: qPars.date_end }
}
export function sortCompar_since (qPars: { date_begin: string }) {
  return { sortCompar: `>= :date_begin`, date_begin: qPars.date_begin }
}
export function sortCompar_exact (qPars: { date_exact: string }) {
  return { sortCompar: `= :date_exact`, date_exact: qPars.date_exact }
}
export function sortCompar_beginsWith (qPars: { date_begin: string }) {
  return { sortCompar: `BETWEEN :date_begin AND :date_end`, date_begin: qPars.date_begin, date_end: qPars.date_begin + 'ZZZ' }
}

export function prepareQuery (qPars: {
  tableName: string
  selectedPropsList: string[]|null
  partKeyName: string
  sortKeyName: string
  partKeyValue: string
  sortCompar: string
  date_begin?: string
  date_end?: string
  date_exact?: string
  filterExpression?: string
  additionalFilter?: string
  booleanValue?: boolean
}) {
  // if (!docClient) {
  //   docClient = new AWS.DynamoDB.DocumentClient()
  // }

  const ExpressionAttributeNames: { [k: string]: string } = {};
  const ProjectionExpression = qPars.selectedPropsList && qPars.selectedPropsList.map(propName => {
    if (reservedWords.includes(propName.toUpperCase())) {
      ExpressionAttributeNames[`#${propName}`] = propName;
      return `#${propName}`
    }
    return propName;
  }).join(',');
  let partKeyName = qPars.partKeyName;
  if (reservedWords.includes(partKeyName.toUpperCase())) {
    if (!ExpressionAttributeNames[`#${partKeyName}`]) ExpressionAttributeNames[`#${partKeyName}`] = partKeyName;
    partKeyName = `#${partKeyName}`;
  }
  let sortKeyName = qPars.sortKeyName;
  if (reservedWords.includes(sortKeyName.toUpperCase())) {
    if (!ExpressionAttributeNames[`#${sortKeyName}`]) ExpressionAttributeNames[`#${sortKeyName}`] = sortKeyName;
    sortKeyName = `#${sortKeyName}`;
  }

  const hasAttributeNames = Object.keys(ExpressionAttributeNames).length > 0;
  const params: QueryCommandInput = {
    TableName: qPars.tableName,
    KeyConditionExpression: `(${partKeyName} = :partKeyValue) AND (${sortKeyName} ${qPars.sortCompar})`,
    ExpressionAttributeValues: {
      ':partKeyValue': qPars.partKeyValue,
    }
  }
  if (ProjectionExpression) params.ProjectionExpression = ProjectionExpression;
  if (hasAttributeNames) params.ExpressionAttributeNames = ExpressionAttributeNames;
  if (qPars.date_begin) params.ExpressionAttributeValues[':date_begin'] = qPars.date_begin;
  if (qPars.date_end) params.ExpressionAttributeValues[':date_end'] = qPars.date_end;
  if (qPars.date_exact) params.ExpressionAttributeValues[':date_exact'] = qPars.date_exact;
  if (qPars.booleanValue != null) params.ExpressionAttributeValues[':booleanValue'] = qPars.booleanValue;
  
  if (qPars.filterExpression) params.FilterExpression = qPars.filterExpression;

  const dynamoFetcher = {
    finished: false,
    continuesAfter: null as string,

    async getPage () {
      if (this.finished) {
        throw Error('Query already finished!').HttpStatus(500)
      }
      // if (solicitacaoEmCurso[params.TableName] && solicitacaoEmCurso[params.TableName] > Date.now()) {
      //   throw Error('There is another request being processed!').HttpStatus(500)
      // }
      // solicitacaoEmCurso[params.TableName] = Date.now() + 8000;

      const isContinuation = !!this.continuesAfter;
      if (isContinuation) {
        params.ExpressionAttributeValues[':date_begin'] = this.continuesAfter;
      }

      const data = await docClient.send(new QueryCommand(params))
      // solicitacaoEmCurso[params.TableName] = null

      if (isContinuation && (data.Items.length > 0)) {
        data.Items = data.Items.slice(1);
      }
      this.continuesAfter = data.LastEvaluatedKey && data.LastEvaluatedKey[qPars.sortKeyName];
      this.finished = !data.LastEvaluatedKey;

      return data;
    }
  }

  return dynamoFetcher;
}

const reservedWords = [
'ABORT',
'ABSOLUTE',
'ACTION',
'ADD',
'AFTER',
'AGENT',
'AGGREGATE',
'ALL',
'ALLOCATE',
'ALTER',
'ANALYZE',
'AND',
'ANY',
'ARCHIVE',
'ARE',
'ARRAY',
'AS',
'ASC',
'ASCII',
'ASENSITIVE',
'ASSERTION',
'ASYMMETRIC',
'AT',
'ATOMIC',
'ATTACH',
'ATTRIBUTE',
'AUTH',
'AUTHORIZATION',
'AUTHORIZE',
'AUTO',
'AVG',
'BACK',
'BACKUP',
'BASE',
'BATCH',
'BEFORE',
'BEGIN',
'BETWEEN',
'BIGINT',
'BINARY',
'BIT',
'BLOB',
'BLOCK',
'BOOLEAN',
'BOTH',
'BREADTH',
'BUCKET',
'BULK',
'BY',
'BYTE',
'CALL',
'CALLED',
'CALLING',
'CAPACITY',
'CASCADE',
'CASCADED',
'CASE',
'CAST',
'CATALOG',
'CHAR',
'CHARACTER',
'CHECK',
'CLASS',
'CLOB',
'CLOSE',
'CLUSTER',
'CLUSTERED',
'CLUSTERING',
'CLUSTERS',
'COALESCE',
'COLLATE',
'COLLATION',
'COLLECTION',
'COLUMN',
'COLUMNS',
'COMBINE',
'COMMENT',
'COMMIT',
'COMPACT',
'COMPILE',
'COMPRESS',
'CONDITION',
'CONFLICT',
'CONNECT',
'CONNECTION',
'CONSISTENCY',
'CONSISTENT',
'CONSTRAINT',
'CONSTRAINTS',
'CONSTRUCTOR',
'CONSUMED',
'CONTINUE',
'CONVERT',
'COPY',
'CORRESPONDING',
'COUNT',
'COUNTER',
'CREATE',
'CROSS',
'CUBE',
'CURRENT',
'CURSOR',
'CYCLE',
'DATA',
'DATABASE',
'DATE',
'DATETIME',
'DAY',
'DEALLOCATE',
'DEC',
'DECIMAL',
'DECLARE',
'DEFAULT',
'DEFERRABLE',
'DEFERRED',
'DEFINE',
'DEFINED',
'DEFINITION',
'DELETE',
'DELIMITED',
'DEPTH',
'DEREF',
'DESC',
'DESCRIBE',
'DESCRIPTOR',
'DETACH',
'DETERMINISTIC',
'DIAGNOSTICS',
'DIRECTORIES',
'DISABLE',
'DISCONNECT',
'DISTINCT',
'DISTRIBUTE',
'DO',
'DOMAIN',
'DOUBLE',
'DROP',
'DUMP',
'DURATION',
'DYNAMIC',
'EACH',
'ELEMENT',
'ELSE',
'ELSEIF',
'EMPTY',
'ENABLE',
'END',
'EQUAL',
'EQUALS',
'ERROR',
'ESCAPE',
'ESCAPED',
'EVAL',
'EVALUATE',
'EXCEEDED',
'EXCEPT',
'EXCEPTION',
'EXCEPTIONS',
'EXCLUSIVE',
'EXEC',
'EXECUTE',
'EXISTS',
'EXIT',
'EXPLAIN',
'EXPLODE',
'EXPORT',
'EXPRESSION',
'EXTENDED',
'EXTERNAL',
'EXTRACT',
'FAIL',
'FALSE',
'FAMILY',
'FETCH',
'FIELDS',
'FILE',
'FILTER',
'FILTERING',
'FINAL',
'FINISH',
'FIRST',
'FIXED',
'FLATTERN',
'FLOAT',
'FOR',
'FORCE',
'FOREIGN',
'FORMAT',
'FORWARD',
'FOUND',
'FREE',
'FROM',
'FULL',
'FUNCTION',
'FUNCTIONS',
'GENERAL',
'GENERATE',
'GET',
'GLOB',
'GLOBAL',
'GO',
'GOTO',
'GRANT',
'GREATER',
'GROUP',
'GROUPING',
'HANDLER',
'HASH',
'HAVE',
'HAVING',
'HEAP',
'HIDDEN',
'HOLD',
'HOUR',
'IDENTIFIED',
'IDENTITY',
'IF',
'IGNORE',
'IMMEDIATE',
'IMPORT',
'IN',
'INCLUDING',
'INCLUSIVE',
'INCREMENT',
'INCREMENTAL',
'INDEX',
'INDEXED',
'INDEXES',
'INDICATOR',
'INFINITE',
'INITIALLY',
'INLINE',
'INNER',
'INNTER',
'INOUT',
'INPUT',
'INSENSITIVE',
'INSERT',
'INSTEAD',
'INT',
'INTEGER',
'INTERSECT',
'INTERVAL',
'INTO',
'INVALIDATE',
'IS',
'ISOLATION',
'ITEM',
'ITEMS',
'ITERATE',
'JOIN',
'KEY',
'KEYS',
'LAG',
'LANGUAGE',
'LARGE',
'LAST',
'LATERAL',
'LEAD',
'LEADING',
'LEAVE',
'LEFT',
'LENGTH',
'LESS',
'LEVEL',
'LIKE',
'LIMIT',
'LIMITED',
'LINES',
'LIST',
'LOAD',
'LOCAL',
'LOCALTIME',
'LOCALTIMESTAMP',
'LOCATION',
'LOCATOR',
'LOCK',
'LOCKS',
'LOG',
'LOGED',
'LONG',
'LOOP',
'LOWER',
'MAP',
'MATCH',
'MATERIALIZED',
'MAX',
'MAXLEN',
'MEMBER',
'MERGE',
'METHOD',
'METRICS',
'MIN',
'MINUS',
'MINUTE',
'MISSING',
'MOD',
'MODE',
'MODIFIES',
'MODIFY',
'MODULE',
'MONTH',
'MULTI',
'MULTISET',
'NAME',
'NAMES',
'NATIONAL',
'NATURAL',
'NCHAR',
'NCLOB',
'NEW',
'NEXT',
'NO',
'NONE',
'NOT',
'NULL',
'NULLIF',
'NUMBER',
'NUMERIC',
'OBJECT',
'OF',
'OFFLINE',
'OFFSET',
'OLD',
'ON',
'ONLINE',
'ONLY',
'OPAQUE',
'OPEN',
'OPERATOR',
'OPTION',
'OR',
'ORDER',
'ORDINALITY',
'OTHER',
'OTHERS',
'OUT',
'OUTER',
'OUTPUT',
'OVER',
'OVERLAPS',
'OVERRIDE',
'OWNER',
'PAD',
'PARALLEL',
'PARAMETER',
'PARAMETERS',
'PARTIAL',
'PARTITION',
'PARTITIONED',
'PARTITIONS',
'PATH',
'PERCENT',
'PERCENTILE',
'PERMISSION',
'PERMISSIONS',
'PIPE',
'PIPELINED',
'PLAN',
'POOL',
'POSITION',
'PRECISION',
'PREPARE',
'PRESERVE',
'PRIMARY',
'PRIOR',
'PRIVATE',
'PRIVILEGES',
'PROCEDURE',
'PROCESSED',
'PROJECT',
'PROJECTION',
'PROPERTY',
'PROVISIONING',
'PUBLIC',
'PUT',
'QUERY',
'QUIT',
'QUORUM',
'RAISE',
'RANDOM',
'RANGE',
'RANK',
'RAW',
'READ',
'READS',
'REAL',
'REBUILD',
'RECORD',
'RECURSIVE',
'REDUCE',
'REF',
'REFERENCE',
'REFERENCES',
'REFERENCING',
'REGEXP',
'REGION',
'REINDEX',
'RELATIVE',
'RELEASE',
'REMAINDER',
'RENAME',
'REPEAT',
'REPLACE',
'REQUEST',
'RESET',
'RESIGNAL',
'RESOURCE',
'RESPONSE',
'RESTORE',
'RESTRICT',
'RESULT',
'RETURN',
'RETURNING',
'RETURNS',
'REVERSE',
'REVOKE',
'RIGHT',
'ROLE',
'ROLES',
'ROLLBACK',
'ROLLUP',
'ROUTINE',
'ROW',
'ROWS',
'RULE',
'RULES',
'SAMPLE',
'SATISFIES',
'SAVE',
'SAVEPOINT',
'SCAN',
'SCHEMA',
'SCOPE',
'SCROLL',
'SEARCH',
'SECOND',
'SECTION',
'SEGMENT',
'SEGMENTS',
'SELECT',
'SELF',
'SEMI',
'SENSITIVE',
'SEPARATE',
'SEQUENCE',
'SERIALIZABLE',
'SESSION',
'SET',
'SETS',
'SHARD',
'SHARE',
'SHARED',
'SHORT',
'SHOW',
'SIGNAL',
'SIMILAR',
'SIZE',
'SKEWED',
'SMALLINT',
'SNAPSHOT',
'SOME',
'SOURCE',
'SPACE',
'SPACES',
'SPARSE',
'SPECIFIC',
'SPECIFICTYPE',
'SPLIT',
'SQL',
'SQLCODE',
'SQLERROR',
'SQLEXCEPTION',
'SQLSTATE',
'SQLWARNING',
'START',
'STATE',
'STATIC',
'STATUS',
'STORAGE',
'STORE',
'STORED',
'STREAM',
'STRING',
'STRUCT',
'STYLE',
'SUB',
'SUBMULTISET',
'SUBPARTITION',
'SUBSTRING',
'SUBTYPE',
'SUM',
'SUPER',
'SYMMETRIC',
'SYNONYM',
'SYSTEM',
'TABLE',
'TABLESAMPLE',
'TEMP',
'TEMPORARY',
'TERMINATED',
'TEXT',
'THAN',
'THEN',
'THROUGHPUT',
'TIME',
'TIMESTAMP',
'TIMEZONE',
'TINYINT',
'TO',
'TOKEN',
'TOTAL',
'TOUCH',
'TRAILING',
'TRANSACTION',
'TRANSFORM',
'TRANSLATE',
'TRANSLATION',
'TREAT',
'TRIGGER',
'TRIM',
'TRUE',
'TRUNCATE',
'TTL',
'TUPLE',
'TYPE',
'UNDER',
'UNDO',
'UNION',
'UNIQUE',
'UNIT',
'UNKNOWN',
'UNLOGGED',
'UNNEST',
'UNPROCESSED',
'UNSIGNED',
'UNTIL',
'UPDATE',
'UPPER',
'URL',
'USAGE',
'USE',
'USER',
'USERS',
'USING',
'UUID',
'VACUUM',
'VALUE',
'VALUED',
'VALUES',
'VARCHAR',
'VARIABLE',
'VARIANCE',
'VARINT',
'VARYING',
'VIEW',
'VIEWS',
'VIRTUAL',
'VOID',
'WAIT',
'WHEN',
'WHENEVER',
'WHERE',
'WHILE',
'WINDOW',
'WITH',
'WITHIN',
'WITHOUT',
'WORK',
'WRAPPED',
'WRITE',
'YEAR',
'ZONE',
];
