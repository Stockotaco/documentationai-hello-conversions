#!/usr/bin/env node
// Every `path` in documentation.json must resolve to a real .mdx file, and every
// .mdx file should be reachable from the nav. A path pointing at a missing file
// publishes a dead sidebar entry; an unlisted file is invisible on the site.
//
// Run: node scripts/check-nav.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nav = JSON.parse(readFileSync(join(root, 'documentation.json'), 'utf8'));

const listed = new Set();
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== 'object') return;
  if (typeof node.path === 'string') listed.add(node.path);
  Object.values(node).forEach(walk);
})(nav.navigation);

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (name.endsWith('.mdx')) out.push(relative(root, p).replace(/\.mdx$/, ''));
  }
  return out;
}

const onDisk = new Set(mdxFiles(root));
const problems = [];

for (const path of listed) {
  if (!existsSync(join(root, `${path}.mdx`))) {
    problems.push(`nav path "${path}" has no ${path}.mdx — dead sidebar entry`);
  }
}
for (const file of onDisk) {
  if (!listed.has(file)) {
    problems.push(`${file}.mdx is not in documentation.json — invisible on the site`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`nav check: OK (${listed.size} pages)`);
