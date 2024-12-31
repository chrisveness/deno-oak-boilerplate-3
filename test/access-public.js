/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Tests - Access: public                                              © 2024 Chris Veness / MTL  */
/*                                                                                                */
/* Usage:                                                                                         */
/*   $ deno test -N test/access-public.js                                                         */
/*                                                                                                */
/* Expects web server to be running on localhost:8080.                                            */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { assert, assertEquals } from '@std/assert';

const origin = 'http://localhost:8080';


Deno.test('Access: public', async function(t) {

    // public pages

    await t.step('public home page (-> readme)', async function() {
        const response = await fetch(`${origin}`, { redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/readme');
        await response.body.cancel();
    });

    await t.step('public html page', async function() {
        const response = await fetch(`${origin}/readme`);
        assert(response.ok, response.status);
        assertEquals(response.headers.get('content-type'), 'text/html; charset=UTF-8');
        await response.body.cancel();
    });

    await t.step('public static page', async function() {
        const response = await fetch(`${origin}/css/base.css`);
        assert(response.ok, response.status);
        assertEquals(response.headers.get('content-type'), 'text/css; charset=UTF-8');
        assertEquals(response.headers.get('cache-control'), 'max-age=1');
        await response.body.cancel();
    });

    await t.step('public non-existant page', async function() {
        const response = await fetch(`${origin}/nonexistant-page`);
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

    await t.step('public non-existant static', async function() {
        const response = await fetch(`${origin}/css/nonexistant.css`);
        assertEquals(response.status, 404);
        await response.body.cancel();
    });

    // secure pages are available only when logged in

    await t.step('secure html page -> sign-in', async function() {
        const response = await fetch(`${origin}/admin/members`, { redirect: 'manual' });
        assertEquals(response.status, 302); // don't expose presence/absence of secure pages
        assertEquals(response.headers.get('location'), '/sign-in/admin/members');
        await response.body.cancel();
    });

    await t.step('secure static -> sign-in', async function() {
        const response = await fetch(`${origin}/admin/css/admin.css`, { redirect: 'manual' });
        assertEquals(response.status, 302);// don't expose presence/absence of secure static pages
        assertEquals(response.headers.get('location'), '/sign-in/admin/css/admin.css');
        await response.body.cancel();
    });

    await t.step('secure non-existant page -> sign-in', async function() {
        const response = await fetch(`${origin}/admin/doesntexist`, { redirect: 'manual' });
        assertEquals(response.status, 302); // don't expose presence/absence of secure pages
        assertEquals(response.headers.get('location'), '/sign-in/admin/doesntexist');
        await response.body.cancel();
    });

    await t.step('secure non-existant static -> sign-in', async function() {
        const response = await fetch(`${origin}/admin/css/doesntexist.css`, { redirect: 'manual' });
        assertEquals(response.status, 302); // don't expose presence/absence of secure static pages
        assertEquals(response.headers.get('location'), '/sign-in/admin/css/doesntexist.css');
        await response.body.cancel();
    });

});
