/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Registration Routes                                                 © 2024 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint-disable space-in-parens */

import { Router } from '@oak/oak';

const router = new Router();

import HandlersRegister from './handlers-register.js';
router.get( '/register',           HandlersRegister.renderRegister);
router.post('/register',           HandlersRegister.processRegister);
router.get( '/register/available', HandlersRegister.getRegisterAvailable);

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.routes();
