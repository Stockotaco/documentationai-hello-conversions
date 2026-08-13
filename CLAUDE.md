# CLAUDE.md

The public docs site for **Hello Conversions**, published at documentation.ai. MDX pages plus `api-reference/openapi.yaml`, navigation in `documentation.json`. Content is grounded in the source repo at `../hello-conversions-v2` (`apps/api/src/routes/*`, `apps/web/src/app/*`) — when the two disagree, the source is right and the page is stale.

**This repo is live.** There is no CI and no staging: what lands on `main` is what the site publishes, and the site validates at publish time. A bad page is discovered by the site rejecting it, after the push. So run the check before committing.

## Before committing

```bash
git config core.hooksPath .githooks     # once per clone — wires the checks below
npm install                             # once per clone — the openapi check needs `yaml`
npm run check                           # both checks over the whole repo
```

Individually: `node scripts/check-components.mjs [file...]` (defaults to every `.mdx`), `node scripts/check-nav.mjs` (nav ↔ files agree), and `node scripts/check-openapi.mjs <file|dir>`. The pre-commit hook runs each against the staged files of its kind.

`api-reference/openapi.yaml` is currently **unreferenced by the nav on purpose** — there is no public REST API yet, only the MCP server. The file and its checker stay for when there is one.

## Components

Only the Documentation.AI set is supported: `Callout`, `Card`, `CodeGroup`, `Columns`, `Expandable`, `ExpandableGroup`, `Iframe`, `Image`, `ParamField`, `Request`, `Response`, `ResponseField`, `Step`, `Steps`, `Tab`, `Tabs`, `Update`, `Video`.

**Every admonition is a `Callout` with a `kind`** (`info`, `alert`, `warning`, `tip`, `note`, `success`). `<Warning>`, `<Note>`, `<Info>`, `<Tip>`, `<Danger>` are Mintlify components that most docs frameworks accept and this one rejects — they are the recurring mistake, and `scripts/check-components.mjs` exists to catch them. Same for `<Accordion>` (use `Expandable`) and `<CardGroup>` (use `Columns`).

Full component reference: the `documentation-ai` skill.

## OpenAPI

An unquoted comma or colon inside a YAML flow mapping — `{ name: id, in: query, description: Raw upstream detail, when there is one. }` — is *valid YAML*. It parses into `description: "Raw upstream detail"` plus a junk key `when there is one.` with a null value, so a parse check passes and the site then rejects the whole spec with "must NOT have additional properties". Quote any flow-mapping string containing `,` or `:`. `scripts/check-openapi.mjs` catches exactly this — it flags null-valued keys and unknown keys on parameter objects.

## Navigation

A new page is invisible until it is listed in `documentation.json` under the right tab/group. `path` is the file path without the `.mdx` extension.

## Pushing

The remote is HTTPS and belongs to the `Stockotaco` GitHub account, while `../hello-conversions-v2` is pushed as `VisionLabs24`:

```bash
gh auth switch --user Stockotaco   # the VisionLabs24 account gets a 403 here
git push origin main
gh auth switch --user VisionLabs24 # switch back afterwards
```

Doc changes ship **with** the code change they describe — a user-facing feature, route, request/response shape, auth rule, or setup step that changed in `../hello-conversions-v2` and isn't reflected here means the published site is wrong.
