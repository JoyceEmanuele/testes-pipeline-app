import { logger } from "./logger";

export async function retryFunction(
  fn: Function,
  attempts: number
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      break;
    } catch (err) {
      logger.warn(
        `Erro na tentativa ${i + 1} de ${fn.name}: ${(err && (err as Error).message)}`
      );
      if (i === attempts - 1) {
        throw err;
      } else {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }
}