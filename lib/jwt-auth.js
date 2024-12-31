/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* JSON Web Token sign-in Authentication             © 2020-2024 Chris Veness / Movable Type Ltd  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import jwt   from 'jsonwebtoken';
import Debug from 'debug';
const debug = Debug('auth');


/**
 * This is a lightweight bearer-token authentication scheme. It is slightly analogous to OAuth2
 * Client Credentials Flow, though without the involvement of an OAuth2 Authorization Server.
 *
 * Once a user has signed in, it will 'keep' them 'signed in' by renewing short-lived JWT bearer
 * tokens, up to a limit of inactivity, after which the user will have to sign in again.
 *
 * Note there are 3 dimensions to user authentication: the JWT token, the cookie which stores it
 * for persistence between requests, and ctx.state.auth which provides authentication details to
 * functions processing a request; this module handles all three, there seems little benefit in
 * separating them.
 *
 * If greater functionality is required, more complex schemes such as OAuth2+OIDC can be used; q.v.
 *  - auth0.com/blog/complete-guide-to-nodejs-express-user-authentication,
 *  - auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them.
 */
class JwtAuth {

    static #TOKEN_LIFETIME = 60*60;         // period after which JWT will expire (1 hour)
    static #INACTIVITY_LIMIT = 60*60*24*30; // period of inactivity after which JWT will not be auto-renewed (30 days)

    /**
     * Set approval function to confirm JWT authentication token can be renewed.
     *
     * Bearer tokens cannot be revoked; this mechanism offers a way to cancel automatic renewal, if
     * such a security feature should be required, effectively blacklisting given JWT sub. The
     * approval function is invoked within verifyJwt() before a token is extended.
     *
     * example:
     *   JwtAuth.approvalRenewal = function(sub) {
     *       const [ [ user ] ] = await Db.execute('Select CancelRenewal From User Where UserId = :id', { id: sub });
     *       return !user.CancelRenewal;
     *   }
     *
     * @type {function(string):boolean}} Approval function taking JWT Subject Claim as parameter.
     */
    static #approvalFn = null;
    static set approveRenewal(approvalFunction) {
        this.#approvalFn = approvalFunction;
    }


    /**
     * Record the sign-in payload in a JSON Web Token valid for token-lifetime (e.g. 1 hour) in a
     * cookie valid for inactivity-limit (e.g. 30 days), and save the payload in ctx.state.auth.
     *
     * This 'signs-in' a user.
     *
     * To be invoked every time a user signs in with their username & password.
     *
     * @param {object} ctx - Koa/Oak context.
     * @param {number|string} sub - JWT subject claim (e.g. user id).
     * @param {object} data - data to be recorded in JWT & ctx.state.auth (e.g. userid, username, role, etc).
     */
    static async saveJwt(ctx, sub=null, data={}) {
        debug('jwt: record payload (explicit sign-in)', sub, data.username);

        const jwtCookieName = process.env.JWT_COOKIE;
        const jwtSecretKey = process.env.JWT_SECRET_KEY;
        if (!jwtCookieName) throw new Error('No JWT_COOKIE set');
        if (!jwtSecretKey) throw new Error('No JWT_SECRET_KEY set');

        // record the payload in a JSON Web Token
        const payload = { sub, data }; // iat, exp will be added automatically
        const token = jwt.sign(payload, jwtSecretKey, { expiresIn: this.#TOKEN_LIFETIME }); // using HS256 algorithm

        // record the token in signed cookie set to last for inactivity-limit (e.g. 30 days)
        const options = { signed: true, httpOnly: false, expires: new Date(Date.now() + 1000*this.#INACTIVITY_LIMIT) };
        await ctx.cookies.set(jwtCookieName, token, options);

        // record the payload data in ctx.state.auth
        ctx.state.auth = data;
    }


    /**
     * Verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * The JWT is a bearer token able to confirm it was generated after a successful sign-in.
     *
     * Tokens are issued with token-lifetime (e.g. 1 hour) validity:
     *  - if the validation check succeeds, the JWT payload is recorded in ctx.state.auth
     *  - if the validation check fails just because it's expired but is otherwise valid (and it is
     *    less than inactivity-limit (e.g. 30 days) old), it is extended for a further 1 hour,
     *    the payload data recorded in ctx.state.auth, and the cookie updated
     *  - if the validation check fails entirely, a 401 error is thrown.
     *
     * The user will have to sign in again after inactivity-limit (e.g. 30 days) inactivity; if they
     * return to the site within the inactivity-limit, the JWT will auto-renew.
     *
     * @param   {object} ctx - Koa/Oak context.
     * @returns {boolean} True if JWT verifies (payload recorded in ctx.state.auth), false otherwise.
     */
    static async verifyJwt(ctx) {
        const jwtCookieName = process.env.JWT_COOKIE;
        const jwtSecretKey = process.env.JWT_SECRET_KEY;
        if (!jwtCookieName) throw new Error('No JWT_COOKIE set');
        if (!jwtSecretKey) throw new Error('No JWT_SECRET_KEY set');

        const options = { signed: true, sameSite: 'strict', httpOnly: false };
        const token = await ctx.cookies.get(jwtCookieName, options);

        // no cookie? either new to the site, or cookie has expired
        if (!token) return false;

        // verify JWT sign-in token - will throw on invalid token
        try {
            const payload = jwt.verify(token, jwtSecretKey); // using HS256

            // valid token: 'sign in' user by recording payload in ctx.state.auth
            ctx.state.auth = payload.data;

            debug('jwt: verify ok', Object.entries(ctx.state.auth.user).map(e => e.join(':')).join(', '));
        } catch (err) {
            // verify failed - retry with ignore expire option
            debug('jwt: verify failed', err.name, err.message, new Date(err.expiredAt).toISOString()); // TODO: retain?
            try {
                const payload = jwt.verify(token, jwtSecretKey, { ignoreExpiration: true, maxAge: this.#INACTIVITY_LIMIT }); // using HS256 algorithm
                delete payload.iat; // don't need JWT issued at
                delete payload.exp; // don't need JWT expiry

                // valid token except for exp: check there is no block on renewal
                if (this.#approvalFn && !this.#approvalFn(payload.sub)) return false; // renewal is blacklisted

                // valid token except for exp: 'sign in' user by recording payload in ctx.state.auth
                ctx.state.auth = payload.data;

                // ... re-issue a replacement token for a further 1 hour
                const newToken = jwt.sign(payload, jwtSecretKey, { expiresIn: this.#TOKEN_LIFETIME });
                // ... and store new token in cookie with same 30-day lifetime
                options.expires = new Date(Date.now() + 1000*this.#INACTIVITY_LIMIT); // renew up to inactivity-limit
                await ctx.cookies.set(jwtCookieName, newToken, { overwrite: true, ...options });
                debug('jwt: extended verify ok', `for ${payload.data.userid}: extend by`, this.#TOKEN_LIFETIME, 'to', new Date(jwt.decode(newToken).exp*1000).toISOString().slice(0, -5));
            } catch (e) {
                debug('jwt: re-verify failed', e.name, e.message);
                // delete the cookie holding the JSON Web Token
                await ctx.cookies.set(jwtCookieName, null, options);
                // and report the error (TokenExpiredError shouldn't happen with cookie expiring at same limit, but...)
                if (e.name == 'TokenExpiredError') ctx.throw(401, 'Session expired: please sign in again');
                if (e.name) ctx.throw(401, `${e.name}: ${e.message}`); // e.g. JsonWebTokenError, NotBeforeError
                throw e;
            }
        }

        return true; // payload is now recorded in ctx.state.auth
    }


    /**
     * Cancel JWT / sign-out user.
     *
     * In fact, as the JWT is a bearer token, it cannot be revoked, but this cancels ctx.state.auth,
     * signing-out the user from the current session, and cancels the cookie holding the JWT.
     *
     * @param {object} ctx - Koa/Oak context.
     */
    static async cancelJwt(ctx) {
        const jwtCookieName = process.env.JWT_COOKIE;
        if (!jwtCookieName) throw new Error('No JWT_COOKIE set');

        ctx.state.auth = null;                                        // cancel auth of current session
        await ctx.cookies.set(jwtCookieName, null, { signed: true }); // delete the cookie holding the JSON Web Token
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default JwtAuth;
