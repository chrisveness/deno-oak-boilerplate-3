/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Send out e-mail using Nodemailer.                 © 2017-2024 Chris Veness / Movable Type Ltd  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import nodemailer         from 'nodemailer';
import Handlebars         from 'handlebars';
import { marked }         from 'marked';
import Debug              from 'debug';
const debug = Debug('mail');


/**
 * Class to send various types of e-mail - plain, html, markdown, html-template, markdown-template.
 * Templated e-mails are processed by Handlebars (handlebarsjs.com), markdown by marked (marked.js.org).
 *
 *  SMTP connection details are obtained from SMTP_CONNECTION environment variable - either as e.g.
 *    service=gmail; auth.user=me@gmail.com; auth.pass=mypw
 *  or as e.g.
 *    host=smtp.mailhost.com; port=587; auth.user=myusername; auth.pass=mypassword
 * For gmail, the service=gmail method will require 'less secure apps' to be enabled, or Oauth2
 * can be used.
 *
 * See nodemailer.com/smtp, nodemailer.com/usage/using-gmail, nodemailer.com/smtp/oauth2.
 */
class Mail {

    static #connection;

    /**
     * Return SMTP transporter.
     */
    static #transport() {
        if (this.#connection) return this.#connection;

        // transport connection parameters in YAML style
        // e.g. host: smtp.send.com, port: 465, username: me@user.com, password: mypw
        const smtpConnection = Deno.env.get('SMTP_CONNECTION');
        const cxn = Object.fromEntries(smtpConnection.split(',').map(prop => prop.split(':').map(x => x.trim())));

        const options = {
            host:   cxn.host,
            port:   cxn.port,
            secure: cxn.port == 465,
            auth:   {
                user: cxn.username,
                pass: cxn.password,
            },
        };
        const defaults = {
            from: Deno.env.get('SMTP_FROM'),
        };

        this.#connection = nodemailer.createTransport(options, defaults);

        return this.#connection;
    }


    /**
     * Send plain-text e-mail.
     *
     * @param {object} to - E-mail recipient(s); to/cc/bcc parameters bag.
     * @param {string} subject - E-mail subject line.
     * @param {string} text - Text content for plain-text e-mail body.
     */
    static async sendPlainText(to, subject, text) {
        // don't send e-mail to live recipient in dev/staging: instead log to console & bail out
        if (Deno.env.get('ENV') != 'production') return debug(`‘${subject}’ not sent to ${to.to}`);

        const message = {
            ...to,   // to/cc/bcc [possibly from if other than default]
            subject: subject,
            text:    text,
        };

        // send out e-mail
        const info = await Mail.#transport().sendMail(message);
        debug('sendPlain', to, subject, `accepted: ${info.accepted}`, `response: ${info.response}`);
    }


    /**
     * Send e-mail with processed markdown Handlebars template as body, with template variables
     * supplied in 'context'.
     *
     * @param {object} to - E-mail recipient(s); to/cc/bcc parameters bag.
     * @param {string} subject - E-mail subject line.
     * @param {string} template - Handlebars Markdown template for e-mail body.
     * @param {object} context - Context for evaluation of template.
     */
    static async sendMarkdownTemplate(to, subject, template, context) {
        // don't send e-mail to live recipient in dev/staging: instead log to console & bail out
        if (Deno.env.get('ENV') != 'production') return debug(`‘${subject}’ not sent to ${to.to}`);

        const emailMd = Handlebars.compile(template)(context); // handlemars substitutions
        const emailHtml = marked.parse(emailMd);               // convert MD to HTML

        const message = {
            ...to,   // to/cc/bcc [possibly from if other than default]
            subject: subject,
            text:    emailMd,
            html:    emailHtml,
        };

        // send out e-mail
        const info = await this.#transport().sendMail(message);
        debug('sendMarkdownTemplate', to, subject, `accepted: ${info.accepted}`, `response: ${info.response}`);
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Mail;
