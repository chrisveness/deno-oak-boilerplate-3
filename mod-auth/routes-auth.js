/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Authentication routes                                               © 2024 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint-disable space-in-parens */

import { Router } from '@oak/oak';

const router = new Router();

import Auth from './handlers-auth.js';

// note url allowed after '/sign-in' to redirect to after successful login
router.get( /^\/sign-in(.*)/, Auth.renderSignIn);   // render user sign-in page
router.post(/^\/sign-in(.*)/, Auth.processSignIn);  // process user sign-in
router.post(/^\/sign-in(.*)/, Auth.processSignIn);  // process user sign-in
router.get( '/sign-out',      Auth.processSignOut); // sign out

router.get( '/profile', Auth.renderProfile);  // render profile page
router.post('/profile', Auth.processProfile); // process profile update

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.routes();
