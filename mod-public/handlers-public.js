/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Public Handlers                                                     © 2024 Chris Veness / MTL  */
/*                                                                                                */
/* The 'public' module handles any URLs not prefixed by specific module name - typically used for */
/* wider range of unauthenticated pages with no specific prefix / subdomain.                      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { marked }         from 'marked';
import { JSDOM as JsDom } from 'jsdom'; // until DOMParser available in Deno
import Debug              from 'debug';
const debug = Debug('app');


class Handlers {

    // /**
    //  * GET / - render index page.
    //  */
    // static async index(ctx) {
    //     debug('index');
    //     const context = {
    //         time:   new Date().toISOString(),
    //         envvar: Deno.env.get('MY_ENV_VAR'),
    //     };
    //     ctx.response.body = await ctx.state.handlebars.renderView('index', context);
    // }


    /**
     * GET /readme - render README.md page
     */
    static async readme(ctx) {
        debug('readme');
        const readmeMd = await Deno.readTextFile('./README.md');
        const readmeHtml = marked.parse(readmeMd);
        const readmeDom = new JsDom(readmeHtml).window.document;
        const h1 = readmeDom.querySelector('h1')?.textContent;

        const context = { title: h1, h1: h1, content: readmeHtml.replace(/<h1.+h1>/, '') };
        ctx.response.body = await ctx.state.handlebars.renderView('markdown', context);
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Handlers;
