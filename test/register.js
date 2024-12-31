/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Tests - Register, password reset                                    © 2024 Chris Veness / MTL  */
/*                                                                                                */
/* Usage:                                                                                         */
/*   $ deno test -NE --env-file test/register.js                                                  */
/*                                                                                                */
/* Expects web server to be running on localhost:8080; auth credentials from .env file.           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { assert, assertEquals } from '@std/assert';
import { JSDOM as JsDom }       from 'jsdom'; // until DOMParser available in Deno

const origin = 'http://localhost:8080';

const user = {
    firstname: 'Test',
    lastname:  new Date().toISOString().slice(0, 19),
    username:  `test${new Date().toISOString().slice(0, 19).replace(/\D/g, '')}@user.com`,
};


Deno.test('Register, password reset', async function(t) {
    const cookie = {};
    let token = null;

    await t.step('Register', async function() {
        const form = new URLSearchParams(user);
        const response = await fetch(`${origin}/register`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/password/reset-request');

        // Deno fetch() doesn't retain cookies across redirects as browsers do; have to supply auth
        // cookie on each request, checking manual redirect on POST requests
        const jwtSetCookie = response.headers.getSetCookie().filter(c => c.startsWith('session')); // cookie+sig
        Object.assign(cookie, { Cookie: jwtSetCookie.map(c => c.split(';')[0]).join('; ') }); // strip cookie attrs
        await response.body.cancel();
    });

    await t.step('Password reset request page', async function() {
        const response = await fetch(`${origin}/password/reset-request`, { headers: cookie });
        assert(response.ok, response.status);
        assertEquals(response.headers.get('content-type'), 'text/html; charset=UTF-8');
        const html = await response.text();
        const doc = new JsDom(html).window.document;
        const msg = doc.querySelector('form ul li').innerHTML;
        assert(msg.includes('Welcome to Deno Oak Boilerplate!')); // initial password set
        const email = doc.querySelector('form input#username').value;
        assertEquals(email, user.username);                          // prefilled email
    });

    await t.step('Request password reset', async function() {
        const form = new URLSearchParams({ username: user.username });
        const response = await fetch(`${origin}/password/reset-request`, { method: 'POST', body: form, headers: cookie, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/password/reset-request-confirm');
        token = response.headers.get('x-reset-token');
        await response.body.cancel();
    });

    await t.step('Password reset from link in e-mail', async function() {
        const form = new URLSearchParams({ password: 'mynewpassword' });
        const response = await fetch(`${origin}/password/reset/${token}`, { method: 'POST', body: form, headers: cookie, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/password/reset/confirm');
        await response.body.cancel();
    });

    await t.step('Sign in', async function() {
        const form = new URLSearchParams({ username: user.username, password: 'mynewpassword' });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/');
        await response.body.cancel();
    });

});
