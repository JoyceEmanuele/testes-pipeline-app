import * as nodemailer from 'nodemailer'
import type { SendMailOptions } from 'nodemailer'
import servConfig from '../../configfile'
import { logger } from '../../srcCommon/helpers/logger';
import sqldb from '../../srcCommon/db';
import * as recurrentTasks from '../../srcCommon/helpers/recurrentTasks';

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport(servConfig.nodemailer as any);
// const transporter_debug = nodemailer.createTransport(servConfig.nodemailer_debug)

export function startService() {
  recurrentTasks.runLoop({
    taskName: "EMAIL-SENDER",
    initialDelay_ms: 10 * 1000,
    iterationPause_ms: 5 * 1000,
    hideIterationsLog: true,
  }, async (opts) => {
    let houveErro = 0;
    let sucesso = 0;
    let numPendentes = 0;
    try {
      const pendentes = await sqldb.EMAILSEND.getListPending({});
      numPendentes = pendentes.length;
      if (pendentes.length > 0) {
        opts.logBackgroundTask(`Iniciando envio de ${pendentes.length} email(s) pendente(s)`);
      }
      for (const email of pendentes) {
        await sqldb.EMAILSEND.w_update({
          EML_ID: email.EML_ID,
          LAST_TRY: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substring(0, 23),
        }, '[SYSTEM]');
        let mailData: SendMailOptions;
        try {
          mailData = JSON.parse(email.EMAIL_DATA);
          mailData.from = `"Plataforma Celsius 360" <${servConfig.nodemailer.auth.user}>`;
          if (servConfig.isProductionServer) {
            await transporter.sendMail(mailData);
            // logger.info('Message sent: %s', info.messageId);
            // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
            delete mailData.html;
          } else { logger.info('Email NÃO enviado:') }
          logger.info(JSON.stringify(mailData));
          await sqldb.EMAILSEND.w_deleteRow({
            EML_ID: email.EML_ID,
          }, '[SYSTEM]');
          sucesso += 1;
        } catch (err) {
          logger.error(`ERR-EMAIL-SENDER: From:${mailData && mailData.from} - To:${mailData && mailData.to} - Subject:${mailData && mailData.subject} - ${err}`);
          logger.error(err);
          houveErro += 1;
          await new Promise (resolve => setTimeout(resolve, 15 * 1000));
        }
      }
    } catch (err) {
      logger.error(`ERR-EMAIL-SENDER: ${err}`);
      logger.error(err);
      houveErro = -1;
    }

    if (numPendentes || houveErro) {
      opts.logBackgroundTask(`Envio de emails concluído ${houveErro ? 'COM ERRO!' : 'sem erros.'} Fila=${numPendentes} Sucesso=${sucesso} Erros=${houveErro}`);
    }

    // 5 seconds between loops (or 3 minutes if errors)
    opts.iterationPause_ms = houveErro ? (3 * 60 * 1000) : (5 * 1000);
  });
}
