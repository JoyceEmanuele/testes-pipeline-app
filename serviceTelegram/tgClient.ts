import servconfig from "./configfile";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { logger } from '../srcCommon/helpers/logger';
import { API_Internal } from "./api-interface";

let initialWait = 0;
let client: TelegramClient|null = null;

export async function start() {
  if (!servconfig.telegramService.sessionString) {
    throw Error("ERR-TELEGRAM-13: É necessário configurar uma conta antes de iniciar o serviço");
  }
  initialWait = Date.now() + (10 * 1000);
  const stringSession = new StringSession(servconfig.telegramService.sessionString);
  client = new TelegramClient(stringSession, servconfig.telegramService.apiId, servconfig.telegramService.apiHash, {
    connectionRetries: 30,
  });

  await client.start({
    phoneNumber: async () => {
      return servconfig.telegramService.myNumber;
    },
    password: async () => {
      // return await input.text("Please enter your password: ");
      throw Error("ERROR23-TELEGRAM - There should not be password");
    },
    phoneCode: async () => {
      // return await input.text("Please enter the code you received: ");
      throw Error("ERROR27-TELEGRAM - There should be already a session configured");
    },
    onError: (err: unknown) => {
      logger.error(err);
    },
  });
  logger.info("Telegram service connected");
}

export const sendMessageTo: API_Internal['/diel-internal/telegram/send-message-to'] = async function (reqParams) {
  const response = await sendMessage(reqParams.phoneNumber, reqParams.msgText);
  return { success: true };
}

async function sendMessage (phoneNumber: string, msgText: string) {
  if ((!msgText) || (!phoneNumber)) throw Error("ERR-TELEGRAM-46: Telegram message and number cannot be empty");

  const now = Date.now();
  if (now < initialWait) {
    await new Promise(r => setTimeout(r, (initialWait - now)));
  }
  if (!client) return null;

  await client.getDialogs();
  client.setParseMode('html');

  try {
    const response = await client.sendMessage(phoneNumber, { message: msgText, linkPreview: false });
    return response;
  } catch (err) {
    console.error(err);
    const username = await tg_ResolvePhone(phoneNumber);
    if (!username) {
      throw err;
    }
    const response = await client.sendMessage(`@${username}`, { message: msgText, linkPreview: false });
    return response;
  }
}

export const sendMessageToMultiple: API_Internal['/diel-internal/telegram/send-message-to-multiple'] = async function (reqParams) {
  await Promise.all(
    reqParams.phoneNumbers.map((phoneNumber) => sendMessage(phoneNumber, reqParams.msgText))
  );
  return { success: true };
}

export const health_check: API_Internal['/health_check'] = async function (_reqParams) {
  return 'Alive';
}

async function tg_ResolvePhone(phoneNumber: string) {
  const result = await client.invoke(
    new Api.contacts.ResolvePhone({
      phone: phoneNumber,
    })
  );
  const userInfo = result?.users?.[0] as Api.User;
  const username = userInfo?.username;
  if (username) {
    console.log(`Username for ${phoneNumber} is @${username}`);
  } else {
    console.log('DBG-TG-97');
    console.log(result); // prints the result
  }
  return username;
}
