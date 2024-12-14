import type { SendMailOptions } from 'nodemailer'
import servConfig from '../../configfile'
import sqldb from '../db';
import { now_shiftedTS_s } from '../helpers/dates'

export async function simple (logData: { user: string}, to: string[], subject: string, emailBody: string, bcc?: string[]) {
  if (!to) return;
  to = to.filter((destEmail) => (/^\S+@\S+\.\S+$/).test(destEmail));
  if (to.length === 0) { return; }

  const mailData: SendMailOptions = {
    from: `"Plataforma Celsius 360" <${servConfig.nodemailer.auth.user}>`,
    to,
    bcc, // [`"Diel Energia" <${servConfig.nodemailer.auth.user}>`, '"Carlos Langoni" <carlos.langoni@dielenergia.com>'],
    subject,
    html: emailBody
    // text: 'Hello world?', // plain text body
    // attachments: pdfsList && pdfsList.map(path => ({ path }))
  };

  await sqldb.EMAILSEND.w_insert({
    CATEGORY: null, // Este campo pode ser usado para priorizar emails de notificações, por exemplo. Por enquanto não é usado.
    EMAIL_DATA: JSON.stringify(mailData),
    LAST_TRY: null,
    DAT_SEND: now_shiftedTS_s(),
  }, logData.user);
}
