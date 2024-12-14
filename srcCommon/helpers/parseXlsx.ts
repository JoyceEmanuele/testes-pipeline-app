import xlsx from 'node-xlsx';
// import { parse as csvParser } from '@fast-csv/parse';

export default function parseXlsx (blob: Buffer) {
  const workSheetsFromBuffer = xlsx.parse(blob);
  return workSheetsFromBuffer[0].data as (number|string)[][];
}

// export function parseCsv (csvString: string): Promise<{ lines: string[][] }> {
//   return new Promise((resolve, reject) => {
//     const lines = [];
//     const stream = csvParser({ delimiter: '\t', ignoreEmpty: true });
//     stream.on('error', reject);
//     // stream.on('headers', (v) => { headers = v; });
//     stream.on('data', (row) => lines.push(row));
//     stream.on('end', (rowCount: number) => resolve({ lines }));
//     stream.write(csvString);
//     stream.end();
//   })
// }

export function createXlsx (data: any[][]) {
  // const data = [[1, 2, 3], [true, false, null, 'sheetjs'], ['foo', 'bar', new Date('2014-02-19T14:30Z'), '0.3'], ['baz', null, 'qux']];
  return xlsx.build([{ name: "Planilha", data: data, options: {} }]); // Returns a buffer
}
