/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin/Teams handlers                                           © 2016-2025 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';
const debug = Debug('app');

import { Database } from '@db/sqlite';
const db = new Database('deno-oak-boilerplate.db');


class TeamsHandlers {

    /**
     * GET /teams - render list teams page.
     *
     * Results can be filtered with URL query strings eg /teams?name=alpha.
     */
    static async renderTeamsList(ctx) {
        const qry = ctx.request.url.searchParams;

        try {
            // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
            // "Where field1 = :field1 And field2 = :field2"
            const filter = [ ...qry.keys() ].map(fld => `${fld} = :${fld}`).join(' and ');
            const sql = `
                Select TeamId, Name
                From Team
                Where ${filter || 'true'}
                Order By Name`;
            const teams = await db.prepare(sql).all(Object.fromEntries(qry.entries()));

            const context = {
                teams:      teams,
                $hideIf:    { guest: ctx.state.auth.user.role == 'guest' ? 'hide' : '' },
                $auth:      ctx.state.auth, // for nav menu
            };
            if (ctx.request.accepts('text/html', 'application/json') == 'application/json') return ctx.response.body = context; // for tests
            ctx.response.body = await ctx.state.handlebars.renderView('teams-list', context);
        } catch (err) {
            if (err.message.startsWith('no such column')) { // display unfiltered list, with error message
                const sql = `
                    Select TeamId, Name
                    From Team
                    Order By Namee`;
                const teams = await db.prepare(sql).all();

                const context = {
                    teams:      teams,
                    $error:     err.message,
                    $hideIf:    { guest: ctx.state.auth.user.role == 'guest' ? 'hide' : '' },
                    $auth:      ctx.state.auth, // for nav menu
                };
                ctx.response.body = await ctx.state.handlebars.renderView('teams-list', context);
            } else {
                throw err;
            }
        }
    }


    /**
     * GET /admin/teams/add - render add team page.
     */
    static async renderAddTeam(ctx) {
        const context = {
            ...ctx.state.session.get('flash').form,
            $error: ctx.state.session.get('flash').message,
            $auth:  ctx.state.auth, // for nav menu
        };
        ctx.response.body = await ctx.state.handlebars.renderView('teams-add', context);
    }

    /**
     * POST /admin/teams/add - process add team.
     */
    static async processTeamsAdd(ctx) {
        debug(`POST   ${ctx.state.reqId} /admin/teams/add`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const form = Object.fromEntries(await ctx.request.body.form());

        try {
            const sql = 'Insert Into Team (Name) Values (:name)';
            await db.prepare(sql).run(form);

            ctx.response.headers.set('X-Insert-Id', db.lastInsertRowId); // for tests
            ctx.response.redirect('/admin/teams'); // return to list of teams
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('flash', { form, error: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * GET /admin/teams/:id - render view/edit team details page.
     */
    static async renderEditTeam(ctx) {
        // team details
        const sql = 'Select TeamId, Name From Team Where TeamId = :id';
        const team = await db.prepare(sql).get({ id: ctx.params.id });
        if (!team) ctx.throw(404, 'Team not found');

        // team membership
        const sqlMembership = `
            Select Member.MemberId, Member.Firstname, Member.Lastname, TeamMember.TeamId
            From Member Inner Join TeamMember Using (MemberId)
            Where TeamId = :id
            Order By Firstname, Lastname`;
        const teamMembers = await db.prepare(sqlMembership).all({ id: ctx.params.id });

        // all members for add picklist)
        const sqlMembers = `
            Select MemberId, Firstname, Lastname
            From Member
            Order By Firstname, Lastname`;
        const members = await db.prepare(sqlMembers).all();

        const notTeamMembers = members.filter(m => !teamMembers.map(m => m.MemberId).includes(m.MemberId)); // eslint-disable-line no-shadow

        const context = {
            ...team,
            teamMembers:    teamMembers,
            notTeamMembers: notTeamMembers,
            $flash:         ctx.state.session.get('flash'),
            $hideIf:        { guest: ctx.state.auth.user.role == 'guest' ? 'hide' : '' },
            $disableIf:     { guest: ctx.state.auth.user.role == 'guest' ? 'disable' : '' },
            $auth:          ctx.state.auth, // for nav menu
        };
        if (ctx.request.accepts('text/html', 'application/json') == 'application/json') return ctx.response.body = context; // for tests
        ctx.response.body = await ctx.state.handlebars.renderView('teams-edit', context);
    }


    /**
     * POST /admin/teams/:id - process edit team.
     */
    static async processEditTeam(ctx) {
        debug(`POST   ${ctx.state.reqId} /admin/teams/${ctx.params.id}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const teamId = ctx.params.id;
        const form = Object.fromEntries(await ctx.request.body.form());

        // update team details
        try {
            const sql = 'Update Team Set Name = :name Where TeamId = :teamId';
            await db.prepare(sql).run({ ...form, teamId });

            ctx.response.redirect('/admin/teams'); // return to list of teams
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('flash', { form, error: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * DELETE /admin/teams/:id - process delete team (JS).
     */
    static async deleteTeam(ctx) {
        debug(`DELETE ${ctx.state.reqId} /admin/teams/${ctx.params.id}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const teamId = ctx.params.id;

        try {
            await db.prepare('Delete From TeamMember Where TeamId = :teamId').run({ teamId });
            await db.prepare('Delete From Team Where TeamId = :teamId').run({ teamId });
        } catch (err) {
            ctx.throw(403, err.message);
        }
        ctx.response.status = 204;
    }


    /**
     * PUT /admin/teams/:teamId/members/:memberId - add member to team (JS).
     */
    static async addTeamMember(ctx) {
        debug(`PUT    ${ctx.state.reqId} /admin/teams/${ctx.params.teamId}/members/${ctx.params.memberId}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const body = await ctx.request.body.json();

        try {
            const sql = 'Insert Into TeamMember(TeamId, MemberId, JoinedOn) Values (:teamId, :memberId, :joinedOn)';
            await db.prepare(sql).run({ ...ctx.params, ...body });
        } catch (err) {
            ctx.throw(403, err.message);
        }
        ctx.response.status = 201;
        ctx.response.body = { id: db.lastInsertRowId };
    }


    /**
     * DELETE /admin/teams/:teamId/members/:memberId - delete member from team (JS).
     */
    static async deleteTeamMember(ctx) {
        debug(`DELETE ${ctx.state.reqId} /admin/teams/${ctx.params.teamId}/members/${ctx.params.memberId}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        try {
            const sql = 'Delete From TeamMember Where TeamId = :teamId And MemberId = :memberId';
            await db.prepare(sql).run(ctx.params);
        } catch (err) {
            ctx.throw(403, err.message);
        }
        ctx.response.status = 204;
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamsHandlers;
