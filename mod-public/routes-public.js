/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Public Routes                                                  © 2024-2025 Chris Veness / MTL  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { Router } from '@oak/oak';

const router = new Router();

import HandlersPublic from './handlers-public.js';
router.get( '/',        ctx => ctx.response.redirect('/readme'));
router.get( '/readme',  HandlersPublic.getReadme);
router.get( '/contact', HandlersPublic.getContact);
router.post('/contact', HandlersPublic.postContact);

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.routes();
