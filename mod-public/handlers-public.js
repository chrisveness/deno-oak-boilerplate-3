/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Public Handlers                                                © 2024-2025 Chris Veness / MTL  */
/*                                                                                                */
/* The 'public' module handles any URLs not prefixed by specific module name - typically used for */
/* wider range of unauthenticated pages with no specific prefix / subdomain.                      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { marked }    from 'marked';
import { DOMParser } from 'linkedom';
import Debug         from 'debug';
const debug = Debug('app');


class Handlers {

    /**
     * GET /readme - render README.md page
     */
    static async getReadme(ctx) {
        const readmeMd = await Deno.readTextFile('./README.md');
        const readmeHtml = marked.parse(readmeMd);
        const readmeDom = new DOMParser().parseFromString(readmeHtml, 'text/html');
        const h1 = readmeDom.querySelector('h1')?.textContent;

        const context = { title: h1, h1: h1, content: readmeHtml.replace(/<h1.+h1>/, '') };
        ctx.response.body = await ctx.state.handlebars.renderView('markdown', context);
    }


    /**
     * GET /contact - render contact page.
     */
    static async getContact(ctx) {
        const context = {
            $flash: ctx.state.session.get('contact'),
        };
        ctx.response.body = await ctx.state.handlebars.renderView('contact', context);
    }

    /**
     * POST /contact - process contact page.
     */
    static async postContact(ctx) {
        const form = Object.fromEntries((await ctx.request.body.form()));
        debug(`POST   ${ctx.state.reqId} /contact`, form.email);

        ctx.state.session.flash('contact', form); // display entered form values in contact page

        ctx.response.redirect('/contact');
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Handlers;
