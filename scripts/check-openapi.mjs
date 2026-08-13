#!/usr/bin/env node
// Lint OpenAPI datafiles for the failure class that YAML parsing does NOT catch:
// an unquoted comma inside a flow mapping.
//
//   description: Distinct visitors, not clicks.
//
// inside `{ ... }` is valid YAML and parses as TWO keys — `description:
// "Distinct visitors"` and a junk key `not clicks.` with a null value. The file
// loads fine, so a parse check passes, and the docs site then rejects the whole
// spec with "must NOT have additional properties". Same trap for `:` in prose.
//
// Flags: keys with null values (the tell-tale of a split string), and unknown
// keys on parameter objects. Both are cheap structural checks over the parsed
// tree — no schema validator or network needed.
//
// Run: node scripts/check-openapi.mjs [file|dir ...]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const PARAM_KEYS = new Set([
  'name', 'in', 'description', 'required', 'deprecated', 'allowEmptyValue',
  'style', 'explode', 'allowReserved', 'schema', 'example', 'examples',
  'content', '$ref',
]);

const findings = [];

function walk(node, path, file) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, file));
    return;
  }
  if (!node || typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    // A null value almost never appears on purpose in these specs; it is what a
    // comma-split prose string leaves behind.
    if (value === null && key !== 'default' && key !== 'example') {
      findings.push(`${file} ${path}: key "${key}" has a null value — likely an unquoted comma or colon in a flow mapping`);
    }
  }
  walk(Object.values(node), path, file);
}

function checkFile(file) {
  let doc;
  try {
    doc = parse(readFileSync(file, 'utf8'));
  } catch (e) {
    findings.push(`${file}: YAML did not parse — ${e.message}`);
    return;
  }
  if (!doc || typeof doc !== 'object') return;

  for (const [route, methods] of Object.entries(doc.paths || {})) {
    for (const [method, op] of Object.entries(methods || {})) {
      if (!op || typeof op !== 'object') continue;
      for (const [i, param] of (op.parameters || []).entries()) {
        if (!param || typeof param !== 'object') continue;
        for (const key of Object.keys(param)) {
          if (!PARAM_KEYS.has(key)) {
            findings.push(`${file} ${method.toUpperCase()} ${route} parameters[${i}]: unknown key "${key}" — a comma inside an unquoted description splits it into one`);
          }
        }
      }
    }
  }
  walk(doc, '$', file);
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('usage: node scripts/check-openapi.mjs <file|dir> ...');
  process.exit(2);
}
for (const target of targets) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const f of readdirSync(target)) {
      if (f.endsWith('.yaml') || f.endsWith('.yml')) checkFile(join(target, f));
    }
  } else {
    checkFile(target);
  }
}

if (findings.length) {
  for (const f of findings) console.error(`✗ ${f}`);
  console.error(`\n${findings.length} problem(s)`);
  process.exit(1);
}
console.log('openapi check: OK');
