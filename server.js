/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Deno/Oak boilerplate-3: Basic Sample App          © 2024-2025 Chris Veness / Movable Type Ltd  */
/*                                                                                                */
/* Fairly basic example SSR sample app boilerplace building on boilerplace-2, with a structure of */
/* a larger app broken into modules.                                                              */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { Application } from '@oak/oak';
import { Session }     from 'oak_sessions';
import { Handlebars }  from '@danet/handlebars';
import Debug           from 'debug'; const debug = Debug('req');

import JwtAuth from './lib/jwt-auth.js';

import './init-db.js'; // load initial test data


const app = new Application({ Session });


// use oak sessions for flash messages
app.use(Session.initMiddleware());


// set environment (e.g. development / staging / production) for easy reference
app.use(async function setEnv(ctx, next) {
    ctx.state.env = Deno.env.get('ENV') || 'development';
    await next();
});


// set module = public / auth / admin / api - 'public' module is for anything not within a defined module
app.use(async function setModule(ctx, next) {
    // module is drived from 1st segment of path
    const seg1 = ctx.request.url.pathname.split('/')[1];

    switch (seg1) {
        case 'register': ctx.state.module = 'auth'; break;
        case 'sign-in':  ctx.state.module = 'auth'; break;
        case 'password': ctx.state.module = 'auth'; break;
        case 'profile':  ctx.state.module = 'auth'; break;
        case 'admin':    ctx.state.module = 'admin'; break;
        default:         ctx.state.module = 'public'; break;
    }
    // module could also be derived from subdomain: ctx.request.url.host.split('.')[0]

    await next();
});


// add request id to context; note - to decode hex IP to dotted-decimal: ip.match(/.{2}/g).map(byte => parseInt(byte, 16)).join('.')
app.use(async function responseTime(ctx, next) {
    const ip16 = ctx.request.ip.replace('::ffff:', '').split(/[.:]/).map(byte => (+byte).toString(16).padStart(2, '0')).join('');
    const ts36 = new Date().valueOf().toString(36).slice(-4); // last 4 digits gives 28 minutes resolution - longer than any reasonable request
    ctx.state.reqId = `${ip16}:${ts36}`;
    await next();
});


// serve static files (/img/*, /css/*, /js/*); allow browser to cache for 1 day (1 sec in dev)
app.use(async function serveStaticPublic(ctx, next) {
    // serve requested file if it exists within static/, otherwise continue
    const staticFile = [ 'css', 'img', 'js' ].includes(ctx.request.url.pathname.split('/')[1]);
    if (staticFile) {
        const opts = {
            root:   'static',                                             // generic static directory
            maxage: ctx.state.env == 'production' ? 1000*60*60*24 : 1000, // 24H, or 1 sec in dev
        };
        try { await ctx.send(opts); } catch { ctx.response.status = 404; };
    } else {
        await next();
    }
});


// set signed cookie keys for JWT cookie & session cookie
app.keys = [ 'deno-oak-boilerplate' ];


// log each request (excluding static files) & return request processing time in Server-Timing header
app.use(async function responseTime(ctx, next) {
    const moduleStaticFile = [ 'css', 'img', 'js' ].includes(ctx.request.url.pathname.split('/')[2]);
    if (!moduleStaticFile) {
        // map text/html... => 'html', application/json => 'json', */* => '*', undefined => '-'
        const acceptMedia = ctx.request.accepts()[0].startsWith('image') ? 'image' : ctx.request.accepts()[0].split(/[/,]/g)[1].padEnd(5) || '-    ';
        const url = truncate(`${ctx.request.url.pathname}${ctx.request.url.search}`, 64);
        debug(ctx.state.module.padEnd(6), ctx.state.reqId, ctx.request.method.padEnd(6), acceptMedia, url);
    }

    const now = performance.now();

    await next();

    ctx.response.headers.set('Server-Timing', `*;dur=${(performance.now() - now).toFixed(2)}`);
});


// handlebars configuration, stored in ctx.state for use in handlers
app.use(async function handlebarsConfig(ctx, next) {
    const config = {
        baseDir:       `mod-${ctx.state.module}/templates`,
        partialsDir:   'partials/',
        extname:       '.html',
        defaultLayout: null,
        cachePartials: ctx.state.env != 'development',
    };
    ctx.state.handlebars = new Handlebars(config);

    await next();
});


// handle thrown (or uncaught) exceptions anywhere down the line
app.use(async function handleErrors(ctx, next) {
    try {

        await next();

    } catch (err) {
        if (!err.status && ctx.state.env == 'production') console.error('ERR', new Date().toISOString(), ctx.request.url.href, err); // uncaught production error: log stack
        if (ctx.state.env == 'production') delete err.stack; // don't leak sensitive info in response!

        ctx.response.status = err.status || 500;

        // HTML requests throwing errors will present an HTML error page; for Ajax calls to get a JSON
        // error response, the 'accept' header should be set to 'application/json' (note a browser
        // request will include not just 'text/html' but also '*/*', so check preferred, not just
        // 'application/json')
        const preferredMimeType = ctx.request.accepts('text/html', 'application/json');
        if (preferredMimeType == 'application/json') { // return a json object reporting the error
            ctx.response.body = { name: err.name, message: err.message };
        } else { // regular html page being served; render error page (or redirect to sign-in for 401)
            switch (err.status) {
                case 401: // Unauthorised (eg expired/invalid JWT auth token)
                    ctx.response.redirect(`/sign-in${ctx.request.url}`);
                    break;
                case 404: // Not Found
                    if (err.message == 'Not Found') err.message = 'Couldn’t find that one!...'; // personalised 404
                    ctx.response.body = await ctx.state.handlebars.renderView('../../mod-public/templates/404-not-found', { err, $auth: ctx.state.auth });
                    break;
                default:
                    if (err.status <= 499) { // 4xx errors (e.g. Forbidden, Not Allowed, Conflict)
                        err.statusOwnProperty = err.status; // status is not an 'own property', handlebars refuses access
                        ctx.response.body = await ctx.state.handlebars.renderView('../../mod-public/templates/4xx-client-side-error', { err, $auth: ctx.state.auth });
                    } else {                 // 5xx errors: uncaught or programming errors
                        console.error('E5xx', err);
                        ctx.response.body = await ctx.state.handlebars.renderView('../../mod-public/templates/500-internal-server-error', { err, $auth: ctx.state.auth });
                    }
                    break;
            }
        }
        ctx.response.status = err.status || 500;
    }
});


// set CORS Access-Control for TODO!
app.use(async function preflight(ctx, next) {
    // set Allow-Origin to request origin; ctx.request.origin is as set by Nginx proxy_pass, but
    // ctx.request.headers.origin holds the original request origin - note this could be restricted
    // by white-list or black-list for extra security
    ctx.response.headers.set('Allow', 'OPTIONS, HEAD, GET');
    ctx.response.headers.set('Access-Control-Allow-Origin', ctx.request.headers.get('origin'));
    ctx.response.headers.set('Access-Control-Allow-Credentials', true);
    ctx.response.headers.set('Access-Control-Allow-Headers', 'Authorization');
    ctx.response.headers.set('Vary', 'Origin');
    if (ctx.request.method == 'OPTIONS') return ctx.response.status = 204; // pre-flight request

    await next();
});


// ------------ routing


import routesPublic   from './mod-public/routes-public.js';
import routesRegister from './mod-auth/routes-register.js';
import routesAuth     from './mod-auth/routes-auth.js';
import routesPassword from './mod-auth/routes-password.js';
import routesAdmin    from './mod-admin/routes-admin.js';

app.use(routesPublic);

// auth / password functions depend on whether user is signed in

app.use(async function verifyJwt(ctx, next) {
    await JwtAuth.verifyJwt(ctx); // leaves JWT auth data in ctx.state.auth if already signed in
    await next();
});

// /register/available depends on whether user signed in or not
app.use(routesRegister);

// remaining routes require user to be signed in...
app.use(routesAuth);
app.use(routesPassword);


app.use(async function verifySignedIn(ctx, next) {
    if (ctx.state.auth) {
        await next();
    } else {
        // within public module, return a 404
        if (ctx.state.module == 'public') ctx.throw(404);
        // in secure modules, don't reveal whether pagees exist, just redirect to sign-in
        ctx.response.redirect('/sign-in'+ctx.request.url.pathname);
    }
});

// ... as subsequent modules require authentication

// serve static files within secure modules (/<mod>/img/*, /<mod>/css/*, /<mod>/js/*)
app.use(async function serveStaticSecure(ctx, next) {
    // serve requested file if it exists within module's static/, otherwise continue
    const staticFile = [ 'css', 'img', 'js' ].includes(ctx.request.url.pathname.split('/')[2]);
    if (staticFile) {
        const opts = {
            root:   `mod-${ctx.state.module}/static`,                          // module static directory
            path:   ctx.request.url.pathname.slice(ctx.state.module.length+1), // path without module prefix
            maxage: ctx.state.env == 'production' ? 1000*60*60*24 : 1000,      // 24H, or 1 sec in dev
        };
        await ctx.send(opts);
    } else {
        await next();
    }
});

// routes for admin module
app.use(routesAdmin);

// end of the line: 404 status for any resource not found
app.use(function notFound(ctx) {
    ctx.throw(404); // required for standard 404 handling
    // note no 'next'
});

// create server
app.addEventListener('listen', function() {
    const addr = Deno.networkInterfaces().filter(i => i.family == 'IPv4').map(i => i.address).join('/');
    console.info(`Deno/Oak Boilerplate-3 server listening on ${addr}:8080 @ ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`);
});
await app.listen({ port: 8080 });

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/** limit s to l characters, appending ellipsis if truncated */
function truncate(s, l) { return s?.length>l ? s.slice(0, l-1)+'…' : s; }
