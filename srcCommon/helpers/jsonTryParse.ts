import { logger } from '../helpers/logger';

export default function jsonTryParse<T> (asStr: string): T {
  if (!asStr) return null;
  try {
    return JSON.parse(asStr);
  } catch (err) {
    logger.error(err);
    return null;
  }
}
