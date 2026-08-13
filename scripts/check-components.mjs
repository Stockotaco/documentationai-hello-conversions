#!/usr/bin/env node
// node scripts/check-components.mjs [file...]
//
// Fails on any JSX component an MDX page uses that Documentation.AI does not
// support. The site rejects the page at publish time with
// "<X> is not a supported component" — which is only discovered AFTER the push,
// on a repo that is live. This is that same check, before the commit.
//
// <Warning>, <Note>, <Info>, <Tip> and <Danger> are the ones that keep getting
// written (they exist in Mintlify and in most docs frameworks); here every
// admonition is a Callout with a `kind`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Authoritative list: the components documented in the documentation-ai skill
// (references/components.md). Add to it only when the skill gains a component.
const SUPPORTED = new Set([
  'Callout', 'Card', 'CodeGroup', 'Columns', 'Expandable', 'ExpandableGroup',
  'Iframe', 'Image', 'ParamField', 'Request', 'Response', 'ResponseField',
  'Step', 'Steps', 'Tab', 'Tabs', 'Update', 'Video',
  // Not in the skill reference, but used by Documentation.AI's own generated
  // pages here (features.mdx, changelog.mdx) — the platform supports them.
  'Board', 'BoardColumn', 'BoardCard',
]);

// What to write instead, for the mistakes that actually happen.
const SUGGEST = {
  Warning: '<Callout kind="warning">',
  Danger: '<Callout kind="alert">',
  Error: '<Callout kind="alert">',
  Note: '<Callout kind="note">',
  Info: '<Callout kind="info">',
  Tip: '<Callout kind="tip">',
  Check: '<Callout kind="success">',
  Success: '<Callout kind="success">',
  Accordion: '<Expandable title="…">',
  AccordionGroup: '<ExpandableGroup>',
  CardGroup: '<Columns>',
  Frame: '<Image src="…" />',
  Snippet: 'inline the content',
};

const root = new URL('..', import.meta.url).pathname;

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** Blank out fenced and inline code so a JSX example inside ``` isn't linted. */
function stripCode(src) {
  return src
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : mdxFiles(root);
let problems = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const stripped = stripCode(src);
  for (const m of stripped.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    const tag = m[1];
    if (SUPPORTED.has(tag)) continue;
    const line = stripped.slice(0, m.index).split('\n').length;
    const hint = SUGGEST[tag] ? ` — use ${SUGGEST[tag]}` : ` — supported: ${[...SUPPORTED].join(', ')}`;
    console.error(`✗ ${relative(root, file)}:${line}: <${tag}> is not a supported component${hint}`);
    problems++;
  }
}

if (problems) {
  console.error(`\n${problems} unsupported component use(s). The docs site rejects these at publish time.`);
  process.exit(1);
}
console.log(`components check: OK (${files.length} mdx files)`);
