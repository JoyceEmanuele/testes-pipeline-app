import * as express from 'express'

export interface ExtraRouteParams { req: express.Request, res: express.Response }

export type BinaryRouteResponse = express.Response;

export type ReferenceType = 'DACS'|'DAMS'|'DUTS'|'DRIS'|'DMAS'|'DALS'|'DMTS'|'SIMCARDS'|'ASSETS'|'MACHINES'|'LAAGER'|'ILLUMINATIONS'|'NOBREAKS'|'SKETCHES';