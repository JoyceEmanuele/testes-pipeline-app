import * as httpRouter from '../apiServer/httpRouter'
import { inputColumns as inputColumns_assets } from './assets'
import { inputColumns as inputColumns_dacs } from './dacs'
import { inputColumns as inputColumns_dams } from './dams'
import { inputColumns as inputColumns_duts } from './duts'
import { inputColumns as inputColumns_dmas } from './dmas'
import { inputColumns as inputColumns_dris } from './dris'
import { inputColumns as inputColumns_roomtypes } from './roomtypes'
import { inputColumns as inputColumns_units } from './units'
import { inputColumns as inputColumns_supervisors } from './supervisors'
import { inputColumns as inputColumns_invoices } from './invoices'
import { inputColumns as inputColumns_unified } from './unified/unified'

type ReqParams = {
  assets?: boolean
  dacs?: boolean
  dams?: boolean
  dmas?: boolean
  duts?: boolean
  dris?: boolean
  units?: boolean
  roomtypes?: boolean
  supervisors?: boolean
  invoices?: boolean
  unified?: boolean
}

httpRouter.privateRoutes['/batch-input-columns'] = async function (reqParams, session) {
  if (session) { } // OK
  else throw Error('Permission denied!').HttpStatus(403)
  return {
    assets: returnAssets(reqParams),
    dacs: returnDacs(reqParams),
    dams: returnDams(reqParams),
    duts: returnDuts(reqParams),
    dmas: returnDmas(reqParams),
    dris: returnDris(reqParams),
    units: returnUnits(reqParams),
    roomtypes: returnRoomtypes(reqParams),
    supervisors: returnSupervisors(reqParams),
    invoices: returnInvoices(reqParams),
    unified: returnUnified(reqParams),
  };
}

function returnAssets(reqParams: ReqParams){
  return (reqParams.assets && inputColumns_assets) || undefined;
}

function returnDacs(reqParams: ReqParams){
  return (reqParams.dacs && inputColumns_dacs) || undefined;
}

function returnDams(reqParams: ReqParams){
  return (reqParams.dams && inputColumns_dams) || undefined;
}

function returnDuts(reqParams: ReqParams){
  return (reqParams.duts && inputColumns_duts) || undefined;
}

function returnDmas(reqParams: ReqParams){
  return (reqParams.dmas && inputColumns_dmas) || undefined;
}

function returnDris(reqParams: ReqParams){
  return (reqParams.dris && inputColumns_dris) || undefined;
}

function returnUnits(reqParams: ReqParams){
  return (reqParams.units && inputColumns_units) || undefined;
}

function returnRoomtypes(reqParams: ReqParams){  
  return (reqParams.roomtypes && inputColumns_roomtypes) || undefined;
}

function returnSupervisors(reqParams: ReqParams){
  return (reqParams.supervisors && inputColumns_supervisors) || undefined;
}

function returnInvoices(reqParams: ReqParams){
  return (reqParams.invoices && inputColumns_invoices) || undefined;
}

function returnUnified(reqParams: ReqParams){
  return (reqParams.unified && inputColumns_unified) || undefined;
}
