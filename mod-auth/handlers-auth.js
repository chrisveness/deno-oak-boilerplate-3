/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Auth handlers - Sign-in/out, profile managment.                © 2023-2025 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Scrypt     from 'scrypt-kdf';
import { Buffer } from 'node:buffer';
import SQLite     from 'node:sqlite';
import Debug      from 'debug'; const debug = Debug('auth');

import JwtAuth from '../lib/jwt-auth.js';

const db = new SQLite.DatabaseSync('app.db');


class AuthHandlers {

    /**
     * GET /sign-in(.*) - render user sign in page.
     *
     * A url can be supplied after the 'sign-in', to specify a redirect after a successful sign-in.
     *
     * If user is already signed in, redirect is applied.
     */
    static async renderSignIn(ctx) {
        // if already signed in and redirect supplied, simply redirect there
        if (ctx.state.auth && ctx.request.url.pathname != '/sign-in') {
            return ctx.response.redirect(ctx.request.url.pathname.replace('/sign-in', ''));
        }

        const context = {
            $flash: ctx.state.session.get('fail'), // for 'not recognised' flash message
            $auth:  ctx.state.auth,                // for 'already signed-in' message
        };
        ctx.response.body = await ctx.state.handlebars.renderView('sign-in', context);
    }

    /**
     * POST /sign-in[/...] - process user sign-in.
     *
     * If URL provided after '/sign-in', redirect to that URL, otherwise to user's home page.
     *
     * If user authenticates, create JSON Web Token & record it in a signed cookie for subsequent
     * requests, and record the auth data in ctx.state.auth.
     */
    static async processSignIn(ctx) {
        const form = Object.fromEntries((await ctx.request.body.form()));
        if (Object.keys(form).sort().join(',') != 'password,username') ctx.throw(401, 'username/password must be supplied');

        const sql = `
            Select UserId, Email, Password, Role
            From User
            Where Email = :email`;
        const user = db.prepare(sql).get({ email: form.username });

        // always invoke verify() (whether email found or not) to mitigate against timing attacks on sign-in function
        const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
        let passwordMatch = null;
        try {
            passwordMatch = await Scrypt.verify(Buffer.from(passwordHash, 'base64'), form.password);
        } catch (err) {
            if (err instanceof RangeError) passwordMatch = false; // "Invalid key"
            if (!(err instanceof RangeError)) ctx.throw(401, err);
        }

        if (!user || !passwordMatch) {
            // sign-in failed: redisplay sign-in page with sign-in fail message
            debug(ctx.state.reqId, 'sign-in ✗', form.username);
            ctx.state.session.flash('fail', { form, msg: 'Username / password not recognised' });
            return ctx.response.redirect(ctx.request.url.pathname); // redirect to current path, with flash data to refill fields
        }

        // submitted credentials validate: create JWT & record it in a cookie to 'sign in' user
        debug('sign-in ', user.UserId, user.Email);
        const auth = {
            userid:   user.UserId, // to get user details
            username: user.Email,  // make username available without db query
            role:     user.Role,   // make role available without db query
        };
        await JwtAuth.saveJwt(ctx, user.UserId, { user: auth });

        // if we were provided with a redirect URL after the /sign-in, redirect there, otherwise secure home page
        const home = user.Role == 'admin' ? '/admin' : '/';
        const href = ctx.request.url.pathname=='/sign-in' ? home : ctx.request.url.pathname.replace('/sign-in', '');
        ctx.response.redirect(href);
    }


    /**
     * GET /sign-out - sign out user
     */
    static async processSignOut(ctx) {
        debug('sign-out', ctx.state.auth?.user.username);

        await JwtAuth.cancelJwt(ctx);

        ctx.response.redirect('/sign-in');
    }


    /**
     * GET /profile
     */
    static async renderProfile(ctx) {
        const sql = `
            Select UserId, Firstname, Lastname, Email, Role
            From User
            Where Email = :email`;
        const user = db.prepare(sql).get({ email: ctx.state.auth.user.username });

        const context = {
            ...user,
            $auth: ctx.state.auth, // for nav menu
        };
        ctx.response.body = await ctx.state.handlebars.renderView('profile', context);
    }

    /**
     * POST /profile
     */
    static async processProfile(ctx) {
        debug(`POST /profile/${ctx.params.id}`);

        const form = Object.fromEntries(await ctx.request.body.form());

        const sql = `
            Update User
            Set Firstname = :firstname, Lastname = :lastname, Email = :username
            Where UserId = :id`;
        db.prepare(sql).run(form);

        ctx.response.redirect('/admin');
    }
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default AuthHandlers;
