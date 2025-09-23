/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Password Reset handlers                           © 2024-2025 Chris Veness / Movable Type Ltd  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Scrypt         from 'scrypt-kdf';
import crypto         from 'node:crypto';
import { Database }   from '@db/sqlite';
import Debug          from 'debug';
const db = new Database('deno-oak-boilerplate.db');
const debug = Debug('password');

import Mail from '../lib/mail.js';


/*
 * Password reset sequence is:
 * - GET  /password/reset-request
 * - POST /password/reset-request with email; 302 ->
 * - GET  /password/reset-request-confirm
 * - e-mail is sent to 'email' with reset link '/password/reset/{token}'
 * - GET  /password/reset/{token}
 * - POST /password/reset/{token} with password & passwordConfirm; 302 ->
 * - GET  /password/reset/confirm
 */


class PasswordResetHandlers {

    /**
     * GET /password/reset-request - render request password reset page
     */
    static async renderResetRequest(ctx) {
        // console.info(ctx);
        const context = {
            $flash: ctx.state.session.get('register'),
        };
        ctx.response.body = await ctx.state.handlebars.renderView('password-reset-request', context);
    }

    /**
     * POST /password/reset-request - process request password reset.
     *
     * Send e-mail with password reset link.
     */
    static async processResetRequest(ctx) {
        const form = Object.fromEntries(await ctx.request.body.form());
        const sqlUser = `
            Select UserId, Firstname, Email, Password
            From User
            Where Email = :username`;
        const user = await db.prepare(sqlUser).get({ username: form.username });

        // current timestamp for token expiry in base36
        const now = Math.floor(Date.now()/1000).toString(36);

        // random sha256 hash; 1st 8 chars of hash in base36 gives 42 bits of entropy
        // note: do createHash() before checking if user exists to mitigate against timing attacks
        const hash = crypto.createHash('sha256').update(Math.random().toString());
        const rndHash = parseInt(hash.digest('hex'), 16).toString(36).slice(0, 8);
        const token = now+'-'+rndHash; // note use timestamp first so it is easier to identify old tokens in db

        if (!user) {
            ctx.state.session.flash('flash', { email: 'notfound' });
            ctx.response.redirect('/password/reset-request-confirm');
            return;
        }

        // record reset request in db
        const sqlUpdate = `
            Update User
            Set PasswordResetToken = :token
            Where UserId = :id`;
        await db.prepare(sqlUpdate).run({ id: user.UserId, token: token });

        // send e-mail with generated token
        const template = await Deno.readTextFile('./mod-auth/templates/password-reset.email.md');
        const context = {
            name:   user.Firstname,
            origin: ctx.request.headers.get('origin'),
            token:  token,
        };
        await Mail.sendMarkdownTemplate({ to: user.Email }, 'Deno Oak Boilerplate Password Reset', template, context);

        debug('reset-request', user.Email, `/password/reset/${token}`);

        ctx.response.headers.set('X-Reset-Token', token); // for testing
        ctx.response.redirect('/password/reset-request-confirm');
    }


    /**
     * GET /password/reset-request-confirm - render request password reset confirmation page
     */
    static async renderResetRequestConfirm(ctx) {
        ctx.response.body = await ctx.state.handlebars.renderView('password-reset-request-confirm');
    }


    /**
     * GET /password/reset/:token - render password reset page
     */
    static async renderReset(ctx) {
        const token = ctx.params.token;

        // check token is good
        const user = await PasswordResetHandlers.#userForResetToken(token);
        if (!user) {
            ctx.response.body = await ctx.state.handlebars.renderView('password-reset', { badToken: true });
            return;
        }

        // const context = Object.assign({}, ctx.flash.formdata, { valid: true }); // TODO: flash
        ctx.response.body = await ctx.state.handlebars.renderView('password-reset');
    }


    /**
     * POST /password/reset/:token - process password reset
     */
    static async processReset(ctx) {
        const token = ctx.params.token;
        const form = Object.fromEntries(await ctx.request.body.form());

        // check token is good
        const user = await PasswordResetHandlers.#userForResetToken(token);
        if (!user) {
            ctx.response.body = await ctx.state.handlebars.renderView('password-reset', { badToken: true });
            return;
        }

        // set the password and clear the password reset token
        const hash = (await Scrypt.kdf(form.password, { logN: 15 })).toString('base64');
        const sql = `
            Update User
            Set Password = :hash, PasswordResetToken = null
            Where UserId = :id`;
        await db.prepare(sql).run({ id: user.UserId, hash: hash });

        debug('reset', user.username, ctx.params.token);

        ctx.response.redirect('/password/reset/confirm');
    }


    /**
     * GET /password/reset/confirm - render password reset confirmation page
     */
    static async renderResetConfirm(ctx) {
        ctx.response.body = await ctx.state.handlebars.renderView('password-reset-confirm');
    }

    /**
     * Return whether reset token is valid (requested and not expired), and if so returns user details.
     *
     * @param   {string} token - The reset token to be checked.
     * @returns {object} User if token is valid, otherwise null.
     */
    static async #userForResetToken(token) {
        const sql = `
            Select UserId, Email, Password
            From User
            Where PasswordResetToken = :token`;
        const user = await db.prepare(sql).get({ token: token });

        if (!user) return null; // token not found

        // the token is a timestamp in base36 and a hash separated by a hyphen
        const [ timestamp ] = token.split('-'); // (we don't need the hash here)

        // check token is not expired
        if (Date.now()/1000 - parseInt(timestamp, 36) > 60*60*24) {
            await db.prepare('Update User Set PasswordResetToken = Null Where PasswordResetToken = :token').run({ token });
            return null; // over 24 hours old: clear token & return null
        }

        // all checks out!
        return user;
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default PasswordResetHandlers;
