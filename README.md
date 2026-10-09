# sv

## GitHub reaction image freshness

The `/badge` endpoint must send `Cache-Control: max-age=0, no-cache, no-store,
must-revalidate`. In live tests, GitHub's Camo proxy cached responses without
`max-age=0` despite the other directives. Keep the explicit zero TTL.

After deploying this change, an image cached with the old headers may need a
**one-time** `PURGE` request to its exact `camo.githubusercontent.com` URL. Changing
the origin headers does not invalidate an existing proxy response. A new query
parameter in the Markdown's image URL also creates a new cache key, but does not
need to change on each reaction once the corrected headers are in effect.

Counts update when an image is requested (page load/reload or return after a
reaction). An already-open GitHub page does not poll for changes. The automatic
purge fallback is rate-limited; transient failures retry without dropping votes
arriving during an in-flight purge. It cannot discover images on private GitHub
pages without access.

### Repeatable validation

Requires Node.js 24+ and the project's Playwright Chromium installation.

```sh
node --test scripts/test-camo-purge.mjs
pnpm exec playwright test
node scripts/probe-github-cache.mjs https://plusmark.ilverism.workers.dev
node scripts/probe-browser-cache.mjs https://plusmark.ilverism.workers.dev
```

The live probes create isolated widgets and remove their test votes afterward
(the empty test widgets remain). GitHub's Markdown API supplies real Camo URLs;
the probes reuse those URLs without cache-busting or repeated purges. A non-GitHub
return URL prevents automatic purges from masking the result. The browser probe
serves GitHub-rendered HTML on localhost and exercises two separate visitors,
12 reaction clicks and 12 observer reloads with normal browser caching enabled.
It tests the real image proxy, not GitHub's surrounding page/navigation code.
JSON measurements and a browser screenshot are saved in `.cache-probes/`.

Acceptance target: every tested change visible on the first load within five
seconds. On October 8, 2026, the pre-fix image remained stale for over 60 seconds;
after propagation, the header fix passed all 26 browser image loads in 0.22–0.79
seconds. A pre-existing stale image passed three changes in 0.42–0.43 seconds after
one purge. These measurements cover one network region, not a global latency SLA.

The existing Thumbs Up/Thumbs Down URLs supplied from the issue were also tested
through Camo with a browser: four count changes appeared on the first reload in
0.22–2.30 seconds, and both test votes were removed. They already had the new
headers and needed no purge. One initial browser run timed out waiting for an
image response; a diagnostic run and the repeat completed successfully. The
private GitHub issue itself was inaccessible to the test browser, so navigation
within GitHub's authenticated UI still needs a manual check.

---

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.15.3 create --template minimal --types ts --add eslint playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:cloudflare+cfTarget:workers" drizzle="database:sqlite+sqlite:libsql" mdsvex paraglide="languageTags:en, es+demo:no" mcp="ide:vscode+setup:remote" --install pnpm PlusMark
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
