type SessionData = void;


export default interface API_invoice {  
  ['/invoice/upload-invoice']: (reqParams: {
    clientData: {
      invoiceAuthToken: string,
      unitId: number
    },
    json: any,
    pdfFile?: string,
  }, session: SessionData) => Promise<{}>
}
