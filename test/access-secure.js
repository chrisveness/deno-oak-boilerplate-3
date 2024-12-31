/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Tests - Access: secure                                              © 2024 Chris Veness / MTL  */
/*                                                                                                */
/* Usage:                                                                                         */
/*   $ deno test -NE --env-file test/access-secure.js                                             */
/*                                                                                                */
/* Expects web server to be running on localhost:8080; auth credentials from .env file.           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { assert, assertEquals } from '@std/assert';

const origin = 'http://localhost:8080';


Deno.test('Access: secure', async function(t) {
    const cookie = {};

    await t.step('Sign-in failure (bad e-mail)', async function() {
        const [ username, password ] = process.env.TESTUSR_GUEST.split('/'); // eslint-disable-line no-unused-vars
        const form = new URLSearchParams({ username: 'unauth@user.com', password });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        await response.body.cancel();
    });

    await t.step('Sign-in failure (bad password)', async function() {
        const [ username, password ] = process.env.TESTUSR_GUEST.split('/'); // eslint-disable-line no-unused-vars
        const form = new URLSearchParams({ username, password: 'ihaventgotapassword' });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        await response.body.cancel();
    });

    await t.step('Sign in', async function() {
        const [ username, password ] = process.env.TESTUSR_GUEST.split('/');
        const form = new URLSearchParams({ username, password });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/');

        // Deno fetch() doesn't retain cookies across redirects as browsers do; have to supply auth
        // cookie on each request, checking manual redirect on POST requests
        const jwtSetCookie = response.headers.getSetCookie().filter(c => c.startsWith(process.env.JWT_COOKIE)); // cookie+sig
        Object.assign(cookie, { Cookie: jwtSetCookie.map(c => c.split(';')[0]).join('; ') }); // strip cookie attrs

        await response.body.cancel();
    });

    // public pages are available also when logged in

    await t.step('public html page', async function() {
        const response = await fetch(`${origin}/readme`, { headers: cookie });
        assert(response.ok, response.status);
        assertEquals(response.headers.get('content-type'), 'text/html; charset=UTF-8');
        await response.body.cancel();
    });

    await t.step('public static page', async function() {
        const response = await fetch(`${origin}/css/base.css`, { headers: cookie });
        assert(response.ok, response.status);
        assertEquals(response.headers.get('content-type'), 'text/css; charset=UTF-8');
        assertEquals(response.headers.get('cache-control'), 'max-age=1');
        await response.body.cancel();
    });

    await t.step('public non-existant page', async function() {
        const response = await fetch(`${origin}/nonexistant-page`, { headers: cookie });
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

    await t.step('public non-existant static', async function() {
        const response = await fetch(`${origin}/css/nonexistant.css`, { headers: cookie });
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

    // secure pages are available only when logged in

    await t.step('secure html page', async function() {
        const response = await fetch(`${origin}/admin/members`, { headers: cookie });
        assertEquals(response.status, 200);
        await response.body.cancel();
    });

    await t.step('secure static', async function() {
        const response = await fetch(`${origin}/admin/css/admin.css`, { headers: cookie });
        assertEquals(response.status, 200);
        await response.body.cancel();
    });

    await t.step('secure non-existant page -> 404', async function() {
        const response = await fetch(`${origin}/admin/doesntexist`, { headers: cookie });
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

    await t.step('secure non-existant static -> 404', async function() {
        const response = await fetch(`${origin}/admin/css/doesntexist.css`, { headers: cookie });
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

});
