#!/usr/bin/env node
/**
 * Apply a migration SQL file to the Supabase database.
 *
 * Migrations in this repo used to be pasted into the Supabase SQL editor by
 * hand, which meant a schema change could only land when Mark was at a
 * keyboard, and nothing recorded what had actually been run. This applies one
 * by name and writes it to a ledger table so the same file cannot be applied
 * twice.
 *
 * PostgREST, which the app itself uses, cannot do this: it exposes tables and
 * functions, not DDL. So this goes through Supabase's Management API instead,
 * which needs a personal access token rather than the service-role key.
 *
 * Setup, once: create a token at https://supabase.com/dashboard/account/tokens
 * and put it in .env.local (which is gitignored) as
 *
 *   SUPABASE_ACCESS_TOKEN="sbp_..."
 *
 * Deliberately local only. It is not in the cloud routines' environment, so an
 * unattended overnight run cannot alter the schema on its own.
 *
 * Usage:
 *   node scripts/migrate.mjs --status
 *   node scripts/migrate.mjs migration-add-task-status.sql --dry-run
 *   node scripts/migrate.mjs migration-add-task-status.sql
 *   node scripts/migrate.mjs migration-x.sql --unattended   # for the night round
 *
 * --unattended is the mode the overnight rounds run in. It allows a migration
 * to ADD things and nothing else: no row data may be touched and nothing may be
 * dropped or tightened. See ALLOWED below for the exact line.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env.local, fall back to the real environment
  }
  return env;
}

const env = loadEnv();
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;

function die(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) die('No SUPABASE_URL. Expected it in .env.local.');

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

const NO_TOKEN =
  'No SUPABASE_ACCESS_TOKEN.\n' +
  '  Create one at https://supabase.com/dashboard/account/tokens and add it to\n' +
  '  .env.local as SUPABASE_ACCESS_TOKEN="sbp_...". The service-role key cannot\n' +
  '  do this; PostgREST has no way to run DDL.';

/** Run SQL against the project and return the rows the last statement produced. */
async function sql(query) {
  if (!TOKEN) die(NO_TOKEN);
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase said ${res.status}: ${text.slice(0, 600)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const LEDGER = `
  create table if not exists schema_migrations (
    name        text primary key,
    checksum    text not null,
    applied_at  timestamptz not null default now()
  );
`;

async function applied() {
  await sql(LEDGER);
  const rows = await sql('select name, checksum, applied_at from schema_migrations order by applied_at;');
  return Array.isArray(rows) ? rows : [];
}

/**
 * What an unattended run may do.
 *
 * Additive DDL only. Nobody is watching an overnight round, so it may give the
 * database new places to put things and nothing else: no row data touched, so a
 * bad migration cannot destroy or rewrite Mark's tasks, and nothing dropped or
 * tightened, so it cannot break the running app either. That leaves the failure
 * mode of an unattended migration at "an unused column exists", which is
 * recoverable at leisure.
 *
 * Backfills, deletions, drops and NOT NULL tightening stay attended: run them
 * from a chat, where someone can read the result.
 */
const ALLOWED = [
  /^create\s+(unique\s+)?index(\s+concurrently)?\s+/,
  /^create\s+table\s+/,
  /^create\s+(or\s+replace\s+)?view\s+/,
  /^alter\s+table\s+\S+\s+add\s+(column|constraint)\s+/,
  /^comment\s+on\s+/,
];

/** Strip comments and string literals, then split into statements. */
function statements(body) {
  const bare = body
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
  return bare
    .split(';')
    .map(s => s.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean);
}

function refusedFor(body) {
  return statements(body).filter(s => !ALLOWED.some(rx => rx.test(s)));
}

function migrationFiles() {
  return readdirSync(ROOT).filter(f => /^migration-.*\.sql$/.test(f)).sort();
}

async function status() {
  const rows = await applied();
  const seen = new Set(rows.map(r => r.name));
  console.log('\n  Recorded by this tool:');
  if (!rows.length) console.log('    (none yet)');
  for (const r of rows) console.log(`    ${r.applied_at.slice(0, 19).replace('T', ' ')}  ${r.name}`);
  const rest = migrationFiles().filter(f => !seen.has(f));
  console.log('\n  Not recorded here:');
  for (const f of rest) console.log(`    ${f}`);
  console.log(
    '\n  Note: files predating this tool were pasted into the SQL editor by hand,\n' +
    '  so "not recorded" does not mean "not applied". Check the schema before\n' +
    '  re-running any of them.\n',
  );
}

async function apply(file, { dryRun, unattended }) {
  const name = basename(file);
  const path = join(ROOT, name);
  let body;
  try {
    body = readFileSync(path, 'utf8');
  } catch {
    die(`No such migration: ${name}`);
  }
  const checksum = createHash('sha256').update(body).digest('hex').slice(0, 16);

  if (unattended) {
    const refused = refusedFor(body);
    if (refused.length) {
      die(
        `${name} cannot be applied by an unattended run.\n\n` +
        '  An overnight round may only add things: create table, create index,\n' +
        '  create view, alter table add column or add constraint, comment on.\n' +
        '  These statements are none of those:\n\n' +
        refused.map(s => `    ${s.slice(0, 120)}${s.length > 120 ? '...' : ''};`).join('\n') +
        '\n\n  Apply this one from a chat, where someone can read the result.',
      );
    }
  }

  // A dry run touches nothing, so it works before the token exists.
  if (dryRun) {
    console.log(`\n  Would apply ${name} (${checksum}):\n`);
    console.log(body.split('\n').map(l => `    ${l}`).join('\n'));
    return;
  }

  const rows = await applied();
  const already = rows.find(r => r.name === name);
  if (already) {
    if (already.checksum !== checksum) {
      die(
        `${name} was already applied on ${already.applied_at.slice(0, 10)}, but the file has\n` +
        '  changed since. Write a new migration rather than editing an applied one.',
      );
    }
    console.log(`\n  ${name} was already applied on ${already.applied_at.slice(0, 10)}. Nothing to do.\n`);
    return;
  }

  // One transaction, so a failure half way leaves nothing behind and the
  // ledger cannot claim a migration that did not land. Postgres cannot run
  // every statement inside a transaction (CREATE INDEX CONCURRENTLY is the
  // one that bites); no migration here needs to, and a file that does should
  // be applied by hand.
  const wrapped = [
    'begin;',
    body,
    `insert into schema_migrations (name, checksum) values ('${name}', '${checksum}');`,
    'commit;',
  ].join('\n');

  console.log(`\n  Applying ${name}...`);
  await sql(wrapped);
  console.log(`  Applied and recorded (${checksum}).\n`);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const unattended = args.includes('--unattended');
const target = args.find(a => !a.startsWith('--'));

try {
  if (args.includes('--status') || !target) {
    await status();
  } else {
    await apply(target, { dryRun, unattended });
  }
} catch (err) {
  die(err.message);
}
