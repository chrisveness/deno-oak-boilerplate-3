/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin/Register handlers                                        © 2019-2025 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import SQLite from 'node:sqlite';
import Debug  from 'debug'; const debug = Debug('register');

const db = new SQLite.DatabaseSync('app.db');


import Mail from '../lib/mail.js';


class HandlersRegister {

    /**
     * GET /register - render registration page.
     */
    static async renderRegister(ctx) {
        const context = {
            $flash: ctx.state.session.get('error'),
            $auth:  ctx.state.auth, // for 'currently signed-in' message
        };
        ctx.response.body = await ctx.state.handlebars.renderView('register', context);
    }


    /**
     * POST /register - process registration.
     */
    static async processRegister(ctx) {
        const form = Object.fromEntries(await ctx.request.body.form());
        debug('POST /register', form.username);

        try {
            const sql = 'Insert Into User (Firstname, Lastname, Email, Role) Values (:firstname, :lastname, :username, \'guest\')';
            db.prepare(sql).run(form);

            // send registration confirmation e-mail
            const template = await Deno.readTextFile('./mod-public/templates/register.email.md');
            const context = {
                firstname: form.firstname,
                origin:    ctx.request.headers.get('origin'),
            };
            await Mail.sendMarkdownTemplate({ to: form.email }, 'Deno Oak Boilerplate Registration', template, context);
        } catch (err) {
            ctx.state.session.flash('error', { form, errmsg: err.message });
            return ctx.response.redirect(ctx.request.url);
        }

        ctx.state.session.flash('register', { form });
        ctx.response.redirect('/password/reset-request');
    }


    /**
     * GET /register/available - return 200 if query field/value available, 403 if it is in use.
     *
     * Return 200 if username / e-mail belongs to current signed-in user (e.g. editing profile).
     */
    static getRegisterAvailable(ctx) {
        const qry = Object.fromEntries(ctx.request.url.searchParams);
        // username & email are currently synonymous
        if (qry.username) {
            const sql = 'Select UserId From User Where Email = :username And UserId != :id';
            const user = db.prepare(sql).get({ username: qry.username, id: ctx.state.auth?.user.userid||0 });
            ctx.response.status = user ? 403 : 200;
            return;
        }
        if (qry.email) {
            const sql = 'Select UserId From User Where Email = :email And id != :id';
            const user = db.prepare(sql).get({ email: qry.email, id: ctx.state.auth?.user.userid||0 });
            ctx.response.status = user ? 403 : 200;
            return;
        }

        ctx.response.status = 406; // Not Acceptable
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default HandlersRegister;
