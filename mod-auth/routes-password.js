/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Auth Password routes (public)                                       © 2024 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint-disable space-in-parens */

import { Router } from '@oak/oak';

const router = new Router();

import HandlersPasswordReset from './handlers-password-reset.js';

router.get( '/password/reset-request',         HandlersPasswordReset.renderResetRequest);
router.post('/password/reset-request',         HandlersPasswordReset.processResetRequest);
router.get( '/password/reset-request-confirm', HandlersPasswordReset.renderResetRequestConfirm);
router.get( '/password/reset/confirm',         HandlersPasswordReset.renderResetConfirm);
router.get( '/password/reset/:token',          HandlersPasswordReset.renderReset);
router.post('/password/reset/:token',          HandlersPasswordReset.processReset);

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.routes();
