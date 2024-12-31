/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Tests - Members/Teams: CRUD                                         © 2024 Chris Veness / MTL  */
/*                                                                                                */
/* Usage:                                                                                         */
/*   $ deno test -NE --env-file test/members-teams-crud.js                                        */
/*                                                                                                */
/* Expects web server to be running on localhost:8080; auth credentials from .env file.           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { assertEquals } from '@std/assert';

const origin = 'http://localhost:8080';


Deno.test('Members/Teams: CRUD', async function(t) {
    const cookie = {};
    let memberId = null;
    let teamId = null;

    await t.step('Sign in (guest)', async function() {
        const [ username, password ] = process.env.TESTUSR_GUEST.split('/');
        const form = new URLSearchParams({ username, password });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/');

        // Deno fetch() doesn't resend cookies as browsers do; have to supply auth cookie on each request,
        // checking manual redirect on POST requests
        const jwtSetCookie = response.headers.getSetCookie().filter(c => c.startsWith(process.env.JWT_COOKIE)); // cookie+sig
        Object.assign(cookie, { Cookie: jwtSetCookie.map(c => c.split(';')[0]).join('; ') }); // strip set-cookie attributes

        await response.body.cancel();
    });

    await t.step('Add member not available', async function() {
        const form = new URLSearchParams({
            firstname: 'Test',
            lastname:  'User',
            email:     'test@user.com',
        });
        const headers = { ...cookie };
        const response = await fetch(`${origin}/admin/members/add`, { method: 'POST', body: form, headers, redirect: 'manual' });
        assertEquals(response.status, 403);
        await response.body.cancel();
    });

    await t.step('Sign in (admin)', async function() {
        const [ username, password ] = process.env.TESTUSR_ADMIN.split('/');
        const form = new URLSearchParams({ username, password });
        const response = await fetch(`${origin}/sign-in`, { method: 'POST', body: form, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/admin');

        const jwtSetCookie = response.headers.getSetCookie().filter(c => c.startsWith(process.env.JWT_COOKIE)); // cookie+sig
        Object.assign(cookie, { Cookie: jwtSetCookie.map(c => c.split(';')[0]).join('; ') }); // strip set-cookie attributes

        await response.body.cancel();
    });

    await t.step('Add member', async function() {
        const form = new URLSearchParams({
            firstname: 'Test',
            lastname:  'User',
            email:     'test@user.com',
        });
        const headers = { ...cookie };
        const response = await fetch(`${origin}/admin/members/add`, { method: 'POST', body: form, headers, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/admin/members');
        memberId = response.headers.get('x-insert-id');
        await response.body.cancel();
    });

    await t.step('View member in list', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/members`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.members.find(member => member.Firstname == 'Test').Lastname, 'User');
    });

    await t.step('View member in filtered list', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/members?firstname=test`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.members.find(member => member.Firstname == 'Test').Lastname, 'User');
    });

    await t.step('View member details', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/members/${memberId}`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.Email, 'test@user.com');
    });

    await t.step('Update member', async function() {
        const form = new URLSearchParams({
            firstname: 'Test',
            lastname:  'User',
            email:     'testnewemail@user.com',
        });
        const headers = { ...cookie };
        const response = await fetch(`${origin}/admin/members/${memberId}`, { method: 'POST', body: form, headers, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/admin/members');
        await response.body.cancel();
    });

    await t.step('View updated member', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/members/${memberId}`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.Email, 'testnewemail@user.com');
    });

    await t.step('Add team', async function() {
        const form = new URLSearchParams({
            name: 'Test-team',
        });
        const headers = { ...cookie };
        const response = await fetch(`${origin}/admin/teams/add`, { method: 'POST', body: form, headers, redirect: 'manual' });
        assertEquals(response.status, 302);
        assertEquals(response.headers.get('location'), '/admin/teams');
        teamId = response.headers.get('x-insert-id');
        await response.body.cancel();
    });

    await t.step('View team in list', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/teams`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.teams.find(member => member.Name == 'Test-team').Name, 'Test-team');
    });

    await t.step('View team in filtered list', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/teams?name=test-team`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.teams.find(team => team.Name == 'Test-team').Name, 'Test-team');
    });

    await t.step('View team details', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/teams/${teamId}`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.Name, 'Test-team');
    });

    await t.step('Add member to team', async function() {
        const form = JSON.stringify({
            joinedOn: new Date(),
        });
        const headers = { Accept: 'application/json', ...cookie };
        const response = await fetch(`${origin}/admin/teams/${teamId}/members/${memberId}`, { method: 'PUT', body: form, headers });
        assertEquals(response.status, 201);
        await response.body.cancel();
    });

    await t.step('View membership in member details', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/members/${memberId}`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.memberOfTeams.find(team => team.TeamId == teamId).Name, 'Test-team');
    });

    await t.step('View membership in team details', async function() {
        const headers = { Accept: 'application/json', ...cookie }; // request context in place of html
        const response = await fetch(`${origin}/admin/teams/${teamId}`, { headers });
        assertEquals(response.status, 200);
        const context = await response.json();
        assertEquals(context.teamMembers.find(member => member.MemberId == memberId).Firstname, 'Test');
    });

    await t.step('Delete member from team', async function() {
        const headers = { Accept: 'application/json', ...cookie };
        const response = await fetch(`${origin}/admin/teams/${teamId}/members/${memberId}`, { method: 'DELETE', headers });
        assertEquals(response.status, 204);
    });

    await t.step('Delete member', async function() {
        const headers = { Accept: 'application/json', ...cookie };
        const response = await fetch(`${origin}/admin/members/${memberId}`, { method: 'DELETE', headers });
        assertEquals(response.status, 204);
    });

    await t.step('Delete team', async function() {
        const headers = { Accept: 'application/json', ...cookie };
        const response = await fetch(`${origin}/admin/teams/${teamId}`, { method: 'DELETE', headers });
        assertEquals(response.status, 204);
    });

});
