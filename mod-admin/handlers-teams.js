/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin/Teams handlers                                           © 2016-2025 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import SQLite from 'node:sqlite';
import Debug  from 'debug'; const debug = Debug('app');

const db = new SQLite.DatabaseSync('app.db');


class TeamsHandlers {

    /**
     * GET /teams - render list teams page.
     *
     * Results can be filtered with URL query strings eg /teams?name=alpha.
     */
    static async renderTeamsList(ctx) {
        const qry = Object.fromEntries(ctx.request.url.searchParams);
        const tblFlds = db.prepare('pragma table_info(Team)').all().map(fld => fld.name.toLowerCase());
        const qryFldsOk = Object.keys(qry).every(el => tblFlds.includes(el.toLowerCase()));


        // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
        // "Where field1 = :field1 And field2 = :field2"
        const filter = qryFldsOk ? Object.keys(qry).map(fld => `${fld} = :${fld}`).join(' and ') : '';
        const sql = `
            Select TeamId, Name
            From Team
            Where ${filter || 'true'}
            Order By Name`;
        const teams = db.prepare(sql).all(qryFldsOk ? qry : {});

        const context = {
            teams:   teams,
            $error:  qryFldsOk ? '' : `Unrecognised field in ${Object.keys(qry)}`,
            $hideIf: { guest: ctx.state.auth.user.role == 'guest' ? 'hide' : '' },
            $auth:   ctx.state.auth, // for nav menu
        };
        if (ctx.request.accepts('text/html', 'application/json') == 'application/json') return ctx.response.body = context; // for tests
        ctx.response.body = await ctx.state.handlebars.renderView('teams-list', context);
    }


    /**
     * GET /admin/teams/add - render add team page.
     */
    static async renderAddTeam(ctx) {
        const context = {
            $flash: ctx.state.session.get('error'),
            $auth:  ctx.state.auth, // for nav menu
        };
        ctx.response.body = await ctx.state.handlebars.renderView('teams-add', context);
    }

    /**
     * POST /admin/teams/add - process add team.
     */
    static async processTeamsAdd(ctx) {
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const form = Object.fromEntries(await ctx.request.body.form());

        debug(`POST   ${ctx.state.reqId} /admin/teams/add`, form.name);

        try {
            const sql = 'Insert Into Team (Name) Values (:name)';
            const info = db.prepare(sql).run(form);

            ctx.response.headers.set('X-Insert-Id', info.lastInsertRowid); // for tests
            ctx.response.redirect('/admin/teams'); // return to list of teams
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('error', { form, errmsg: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * GET /admin/teams/:id - render view/edit team details page.
     */
    static async renderEditTeam(ctx) {
        // team details
        const sql = 'Select TeamId, Name From Team Where TeamId = :id';
        const team = db.prepare(sql).get({ id: ctx.params.id });
        if (!team) ctx.throw(404, 'Team not found');

        // team membership
        const sqlMembership = `
            Select Member.MemberId, Member.Firstname, Member.Lastname, TeamMember.TeamId
            From Member Inner Join TeamMember Using (MemberId)
            Where TeamId = :id
            Order By Firstname, Lastname`;
        const teamMembers = db.prepare(sqlMembership).all({ id: ctx.params.id });

        // all members for add picklist)
        const sqlMembers = `
            Select MemberId, Firstname, Lastname
            From Member
            Order By Firstname, Lastname`;
        const members = db.prepare(sqlMembers).all();

        const notTeamMembers = members.filter(m => !teamMembers.map(m => m.MemberId).includes(m.MemberId)); // eslint-disable-line no-shadow

        const context = {
            ...team,
            teamMembers:    teamMembers,
            notTeamMembers: notTeamMembers,
            $flash:         ctx.state.session.get('error'),
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
            db.prepare(sql).run({ ...form, teamId });

            ctx.response.redirect('/admin/teams'); // return to list of teams
        } catch (err) {
            // stay on same page to report error (with current filled fields)
            ctx.state.session.flash('error', { form, errmsg: err.message });
            ctx.response.redirect(ctx.request.url.pathname);
        }
    }


    /**
     * DELETE /admin/teams/:id - process delete team (JS).
     */
    static deleteTeam(ctx) {
        debug(`DELETE ${ctx.state.reqId} /admin/teams/${ctx.params.id}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        const teamId = ctx.params.id;

        try {
            db.prepare('Delete From TeamMember Where TeamId = :teamId').run({ teamId });
            db.prepare('Delete From Team Where TeamId = :teamId').run({ teamId });
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
            db.prepare(sql).run({ ...ctx.params, ...body });
        } catch (err) {
            ctx.throw(403, err.message);
        }
        ctx.response.status = 201;
        ctx.response.body = { id: db.lastInsertRowId };
    }


    /**
     * DELETE /admin/teams/:teamId/members/:memberId - delete member from team (JS).
     */
    static deleteTeamMember(ctx) {
        debug(`DELETE ${ctx.state.reqId} /admin/teams/${ctx.params.teamId}/members/${ctx.params.memberId}`);
        if (ctx.state.auth.user.role != 'admin') ctx.throw(403, 'User management requires admin privileges');

        try {
            const sql = 'Delete From TeamMember Where TeamId = :teamId And MemberId = :memberId';
            db.prepare(sql).run(ctx.params);
        } catch (err) {
            ctx.throw(403, err.message);
        }
        ctx.response.status = 204;
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamsHandlers;
