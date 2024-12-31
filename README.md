# Deno/Oak Basic App Boilerplate

This is a basic sample web application, but with sufficient principal elements of a complete application to enable it to serve as a boilerplate / starting-point for full applications, including:
- a public module, and a password-secured admin module
- SQL-based storage
- basic interactive ([CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)) tools for viewing, adding, editing, and deleting
- [JWT](https://jwt.io/)-based authentication/login

It uses Server-Side Rendering (SSR) based on the Oak framework and Handlebars templates, with client-side user interactions managed by native JavaScript interacting with the DOM (no client-side framework!).

It’s generally my starting point for new projects.

It builds on the simpler [Deno/Oak ‘hello-world’](https://github.com/chrisveness/deno-oak-boilerplate-1) and [Deno/Oak minimal app boilerplate](https://github.com/chrisveness/deno-oak-boilerplate-2) to make a basic example application which (while keeping things as simple as possible) extends those so that it:
- uses separate files for routes & handlers; uses handlebars templates, static content (js/css/img/etc), markdown; includes debug & tests
- sources data from a SQL database
- is subdivided into separate modules: in this case, just a public-website module, an ‘admin’ module, and an ‘auth’ module, each holding their own routes, handlers, templates, and static files
- uses native Deno test runner as examples of exercising server-side code (I use Puppeteer to test user interactions involving front-end JavaScript; not included in this sample app).

It reflects my own (highly opinionated!) preferences for structuring a Deno application:
- uses native JavaScript, not TypeScript (not everyone’s a fan!).
- Handlebars is used for Server-Side Rendering (SSR), hydrated with plain JavaScript (generally using `fetch()`).
- this sample app uses SQLite for self-contained simplicity; for production I use [npm:mysql2](https://www.npmjs.com/package/mysql2) (sometimes MongoDB).
- Deno comes with test runner built in, and assertions from the `@std` library.

It's pretty bare-bones. There’s no pretty styling! There’s no great UI. Just the bare building-blocks.

A REST API boilerplate is in a separate application.

### Implementation details

Modules would typically be distinguised by separate subdomains; for simplicity of configuration (using `localhost`), these modules are distinguished by the initial segment of the URL path.

There are some limited access rights: admins can edit details, guests can only view them (simplistic, but illustrative of possibilities). As a shorthand, the ‘edit’ pages also serve as ‘view’ pages: probably not realistic in a real system, but avoids bloat in this sample app.

I use lazy logging: simply [npm:debug](https://www.npmjs.com/package/debug), with [PM2](https://pm2.keymetrics.io) taking care of logs (in production).

In production, I would expect to use PM2 for `deno task start`. The `allow-ffi` argument is for SQLite.

This is updated from my [Koa Sample App](https://github.com/chrisveness/koa-sample-web-app-api-mysql), which was from my first exploration into using Node.js; it benefits from the experience of development of a range of applications using Node.js, but I now appreciate Deno being able to leverage the rich modern [JavaScript Web APIs](https://developer.mozilla.org/en-US/docs/Web/API).

This application uses native JavaScript, not TypeScript; TypeScript `d-ts` files are created from JSDoc comments, using

    $ tsc **/*.js --declaration --allowJs --emitDeclarationOnly --removeComments --outDir @types

(though I haven’t got this properly working yet).

To install & run locally

    $ git clone https://github.com/chrisveness/deno-oak-boilerplate-3.git
    $ cd deno-oak-boilerplate-3
    $ deno install
    $ deno task dev

The `.env` file can be adapted from `.env.example`.

### Philosophy

- Steve Jobs, _Interview with Business Week, 1998_: “That's been one of my mantras – focus and simplicity. Simple can be harder than complex: you have to work hard to get your thinking clean to make it simple. But it’s worth it in the end because once you get there, you can move mountains”.


- [Developers Rail Against JavaScript ‘Merchants of Complexity’](https://thenewstack.io/developers-rail-against-javascript-merchants-of-complexity).
