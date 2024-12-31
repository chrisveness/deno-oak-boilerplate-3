/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin/Members handlers                                         © 2016-2024 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';
const debug = Debug('app');

import { Database } from '@db/sqlite';
const db = new Database('deno-oak-boilerplate.db');


class MembersHandlers {

    /**
     * GET /members - render list members page.
     *
     * Results can be filtered with URL query strings eg /members?firstname=alice.
     */
    static async renderMembersList(ctx) {
        const qry = ctx.request.url.searchParams;

        try {
            // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
            // "Where field1 = :field1 And field2 = :field2"
            const filter = [ ...Object.keys(qry) ].map(fld => `${fld} = :${fld}`).join(' and ');
            const sql = `
                Select MemberId, Firstname, Lastname
                From Member
                Where ${filter || 'true'}
                Order By Firstname, Lastname`;
            const members = await db.prepare(sql).all(Object.fromEntries(qry.entries()));

            const context = {
                members:    members,
                $guestHide: ctx.state.auth.user.role == 'guest' ? 'hide' : '',
                $auth:      ctx.state.auth, // for nav menu
            };
            if (ctx.request.accepts('text/html', 'application/json') == 'application/json') return ctx.response.body = context; // for tests
            ctx.response.body = await ctx.state.handlebars.renderView('members-list', context);
        } catch (err) {
            if (err.message.startsWith('no such column')) { // display unfiltered list, with error message
                const sql = `
                    Select MemberId, Firstname, Lastname
                    From Member
                    Order By Firstname, Lastname`;
                const members = await db.prepare(sql).all();

                const context = {
                    members:    members,
                    $error:     err.message,
                    $guestHide: ctx.state.auth.user.role == 'guest' ? 'hide' : '',
                    $auth:      ctx.state.auth, // for nav menu
                };
                ctx.response.body = await ctx.state.handlebars.renderView('members-list', context);
            } else {
                throw err;
            }
        }
    }


    /**
     * GET /admin/members/add - render add member page.
     */
    static async renderAddMember(ctx) {
        const context = {
            ...ctx.state.session.get('flash')?.form,
            $error: ctx.state.session.get('flash')?.message,
            $auth:  ctx.state.auth, // for nav menu
        };
        ctx.response.body = await ctx.state.handlebars.renderView('members-add', context);
    }

    /**
     * POST /admin/members/add - process add member.
     */
    static async processAddMember(ctx) {
        debug(`POST   ${ctx.state.reqId} /admin/members/add`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const form = Object.fromEntries(await ctx.request.body.form());
        form.active = form.active ? true : false; // field supplied in post only when checked

        try {
            const sql = `
                Insert Into Member (Firstname, Lastname, Email, Active)
                            Values(:firstname,:lastname,:email,:active)`;
            await db.prepare(sql).run(form);

            ctx.response.headers.set('X-Insert-Id', db.lastInsertRowId); // for tests
            ctx.response.redirect('/admin/members'); // return to list of members
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('flash', { form, error: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * GET /admin/members/:id - render view/edit member details page.
     */
    static async renderEditMember(ctx) {
        // member details
        const sql = 'Select * From Member Where MemberId = :id';
        const member = await db.prepare(sql).get({ id: ctx.params.id });
        if (!member) ctx.throw(404, 'Member not found');

        // team membership
        const sqlMembership = `
            Select Team.TeamId, Team.Name, TeamMember.MemberId
            From Team Inner Join TeamMember Using (TeamId)
            Where MemberId = :id
            Order By Name`;
        const memberOfTeams = await db.prepare(sqlMembership).all({ id: ctx.params.id });

        // all teams (for add picklist)
        const sqlTeams = `
            Select TeamId, Name
            From Team
            Order By Name`;
        const teams = await db.prepare(sqlTeams).all();

        const notMemberOfTeams = teams.filter(t => !memberOfTeams.map(t => t.TeamId).includes(t.TeamId)); // eslint-disable-line no-shadow

        const context = {
            ...member,
            memberOfTeams:    memberOfTeams,
            notMemberOfTeams: notMemberOfTeams,
            $flash:           ctx.state.session.get('flash'),
            $guestHide:       ctx.state.auth.user.role == 'guest' ? 'hide' : '',
            $guestDisable:    ctx.state.auth.user.role == 'guest' ? 'disabled' : '',
            $auth:            ctx.state.auth, // for nav menu
        };
        if (ctx.request.accepts('text/html', 'application/json') == 'application/json') return ctx.response.body = context; // for tests
        ctx.response.body = await ctx.state.handlebars.renderView('members-edit', context);
    }


    /**
     * POST /admin/members/:id - process edit member.
     */
    static async processEditMember(ctx) {
        debug(`POST   ${ctx.state.reqId} /admin/members/${ctx.params.id}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const memberId = ctx.params.id;
        const form = Object.fromEntries(await ctx.request.body.form());
        form.active = form.active ? true : false; // field supplied in post only when checked

        // update member details
        try {
            const sql = `
                Update Member
                Set Firstname=:firstname, Lastname=:lastname, Email=:email, Active=:active
                Where MemberId = :memberId`;
            await db.prepare(sql).run({ ...form, memberId });

            ctx.response.redirect('/admin/members'); // return to list of members
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('flash', { form, error: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * DELETE /admin/members/:id - delete member (JS).
     */
    static async deleteMember(ctx) {
        debug(`DELETE ${ctx.state.reqId} /admin/members/${ctx.params.id}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const memberId = ctx.params.id;

        try {
            await db.prepare('Delete From TeamMember Where MemberId = :memberId').run({ memberId });
            await db.prepare('Delete From Member Where MemberId = :memberId').run({ memberId });
        } catch (err) {
            ctx.throw(403, err.message);
        }

        ctx.response.status = 204;
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default MembersHandlers;
