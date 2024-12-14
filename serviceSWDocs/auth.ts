import * as fs from 'node:fs';
import * as express from 'express';
import * as dielServices from '../srcCommon/dielServices';
import sqldb from '../srcCommon/db';
import { logger } from '../srcCommon/helpers/logger';

const loginHtml = fs.readFileSync('./serviceSWDocs/login.html', 'utf8');

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  Promise.resolve().then(async () => {
    const authCookieRaw = req.headers.cookie && req.headers.cookie
      .split(';').map(x => x.trim())
      .find(x => x.startsWith('dielauth='));
    if (!authCookieRaw) {
      res.redirect(`/login?to=${encodeURIComponent(req.originalUrl)}`);
      return;
    }
    const authHeader = authCookieRaw && decodeURIComponent(authCookieRaw.split('=')[1].trim());
    if (!authHeader) { res.status(401).send('No Authorization header'); return }
    const { authenticatedUser } = await dielServices.authInternalApi('/diel-internal/auth/check-auth-header', { authHeader: authHeader });
    const userInfo = await sqldb.DASHUSERS.getUserData_password({ USER: authenticatedUser.userId });
    const isDielAdmin = (userInfo.PERMS_U || '').includes('[A]');
    if (isDielAdmin) {
      next();
    } else {
      res.status(500).end('Auth error');
    }
  })
  .catch((err) => {
    logger.error(err);
    res.status(401).send('Auth error');
  })
}

export function authEndpoint(req: express.Request, res: express.Response) {
  Promise.resolve().then(async () => {
    const body = req.body;
    const authenticatedUser = await dielServices.authInternalApi('/diel-internal/auth/check-user-password', { userId: body.userId, password: body.password });
    const { token } = await dielServices.authInternalApi('/diel-internal/auth/generate-jwt-token', { user: authenticatedUser.session?.user });
    res.cookie('dielauth', `JWT ${token}`);
    res.status(200).end(`OK`);
  })
  .catch((err) => {
    logger.error(err);
    res.status(401).send('Auth error');
  })
}

export function loginPage(_req: express.Request, res: express.Response) {
  res.status(200).send(loginHtml);
}
