/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin Routes                                                        © 2024 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint-disable space-in-parens */

import { Router } from '@oak/oak';

const router = new Router();

router.get('/admin', async ctx => ctx.response.body = await ctx.state.handlebars.renderView('admin-home', { $auth: ctx.state.auth }));

import HandlersMembers from './handlers-members.js';

router.get(   '/admin/members',     HandlersMembers.renderMembersList); // render list members page
router.get(   '/admin/members/add', HandlersMembers.renderAddMember);   // render add member page
router.post(  '/admin/members/add', HandlersMembers.processAddMember);  // process add member
router.get(   '/admin/members/:id', HandlersMembers.renderEditMember);  // render view/edit member details page
router.post(  '/admin/members/:id', HandlersMembers.processEditMember); // process edit member
router.delete('/admin/members/:id', HandlersMembers.deleteMember);      // delete member (JS)

import HandlersTeams from './handlers-teams.js';

router.get(   '/admin/teams',                           HandlersTeams.renderTeamsList);  // render list teams page
router.get(   '/admin/teams/add',                       HandlersTeams.renderAddTeam);    // render add a new member page
router.post(  '/admin/teams/add',                       HandlersTeams.processTeamsAdd);  // process add member
router.get(   '/admin/teams/:id',                       HandlersTeams.renderEditTeam);   // render view member details page
router.post(  '/admin/teams/:id',                       HandlersTeams.processEditTeam);  // process edit member
router.delete('/admin/teams/:id',                       HandlersTeams.deleteTeam);       // process delete member
router.put(   '/admin/teams/:teamId/members/:memberId', HandlersTeams.addTeamMember);    // add member to team (JS)
router.delete('/admin/teams/:teamId/members/:memberId', HandlersTeams.deleteTeamMember); // delete member from team (JS)

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.routes();
