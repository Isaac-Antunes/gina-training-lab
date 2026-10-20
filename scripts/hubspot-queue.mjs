#!/usr/bin/env node
/**
 * CLI: HubSpot -> deterministic review queue.
 *
 * Offline (fixture/export):
 *   npm run hubspot:queue -- playground/hubspot-exemplo.json --today 2026-10-19
 *
 * Live (read-only API; requires HUBSPOT_ACCESS_TOKEN):
 *   HUBSPOT_ACCESS_TOKEN=... npm run hubspot:queue -- --live --max-records 500
 *
 * The command only reads contacts/deals and prints a human-approval queue.
 * It never writes to HubSpot and never sends a customer message.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { importHubSpotDataset } from '../src/integrations/hubspot/toGina.ts';
import { fetchHubSpotDataset } from '../src/integrations/hubspot/client.ts';
import { renderQueueCsv, renderQueueMarkdown } from '../src/integrations/queue/reviewQueue.ts';

function usage() {
  console.log(`Usage: npm run hubspot:queue -- <dataset.json | --live> [options]

Offline dataset shape:
  { "contacts": [{ "id": "...", "properties": { ... } }],
    "deals":    [{ "id": "...", "properties": { ... },
                   "associations": { "contacts": { "results": [{ "id": "..." }] } } }] }

Options:
  --live                 Fetch read-only from the HubSpot API (needs HUBSPOT_ACCESS_TOKEN)
  --max-records N        Cap per object type in live mode (default: 1000)
  --today YYYY-MM-DD     Reference date (default: today, UTC)
  --format md|csv        Output format (default: md)
  --out PATH             Write the report to a file
  --won-stages a,b,c     Deal stages considered won (default: closedwon,closed_won,won,...)
  --strict               Exit 2 if any deal could not be mapped
  --help                 Show this help

Required token scopes (read-only): crm.objects.contacts.read, crm.objects.deals.read.
`);
}

function parseArgs(argv) {
  const args = {
    file: null,
    live: false,
    today: null,
    format: 'md',
    out: null,
    maxRecords: 1000,
    wonStages: null,
    strict: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--live') {
      args.live = true;
    } else if (arg === '--strict') {
      args.strict = true;
    } else if (['--today', '--format', '--out', '--max-records', '--won-stages'].includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        console.error(`Missing value for ${arg}`);
        process.exit(2);
      }
      i += 1;
      if (arg === '--today') args.today = value;
      else if (arg === '--format') args.format = value;
      else if (arg === '--out') args.out = value;
      else if (arg === '--max-records') args.maxRecords = Number(value);
      else args.wonStages = value.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(2);
    } else if (!args.file) {
      args.file = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!args.live && !args.file) {
    usage();
    process.exit(2);
  }
  if (!['md', 'csv'].includes(args.format)) {
    console.error('--format must be "md" or "csv"');
    process.exit(2);
  }
  if (args.today && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    console.error('--today must be YYYY-MM-DD');
    process.exit(2);
  }
  if (!Number.isFinite(args.maxRecords) || args.maxRecords <= 0) {
    console.error('--max-records must be a positive number');
    process.exit(2);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const today = args.today ? new Date(`${args.today}T00:00:00Z`) : new Date();
if (Number.isNaN(today.getTime())) {
  console.error('Invalid --today date');
  process.exit(2);
}

let dataset;
try {
  if (args.live) {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) {
      console.error('HUBSPOT_ACCESS_TOKEN is required for --live mode (read-only private app token).');
      process.exit(2);
    }
    dataset = await fetchHubSpotDataset({ token, maxRecords: args.maxRecords });
  } else {
    dataset = JSON.parse(readFileSync(args.file, 'utf8'));
  }
} catch (error) {
  console.error(`Cannot load HubSpot dataset: ${error.message}`);
  process.exit(2);
}

const result = importHubSpotDataset(dataset, {
  today,
  closedWonStages: args.wonStages ?? undefined,
});

for (const warning of result.queue.warnings) {
  console.error(`⚠ ${warning.message}`);
}
for (const error of result.errors) {
  console.error(`✗ ${error.message}`);
}
if (args.strict && result.errors.length > 0) {
  console.error(`\n${result.errors.length} deal(s) não mapeado(s). Nada foi gerado (--strict).`);
  process.exit(2);
}

const output = args.format === 'csv' ? renderQueueCsv(result) : renderQueueMarkdown(result);
if (args.out) {
  writeFileSync(args.out, output, 'utf8');
  console.error(`Wrote ${args.out} (${result.queue.actionable.length} item(s) needing action, ${result.queue.customerCount} customer(s) evaluated).`);
} else {
  process.stdout.write(output);
}
