#!/usr/bin/env node
/**
 * CLI: import a purchase spreadsheet and print Gina's deterministic review queue.
 *
 * Usage:
 *   npm run crm:queue -- playground/csv-exemplo-compras.csv
 *   npm run crm:queue -- compras.csv --today 2026-10-19 --format csv --out fila.csv
 *
 * Options:
 *   --today YYYY-MM-DD   Reference date for recency math (default: today, UTC)
 *   --format md|csv      Output format (default: md; csv only includes actionable items)
 *   --out PATH           Write the report to a file instead of stdout
 *   --skip-invalid       Keep valid rows and report invalid ones (default: fail)
 *   --help               Show this help
 *
 * No network, no LLM, no customer message. The output is a review queue for a
 * human owner, using the same engine as the Salesforce integration.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  importPurchaseCsv,
  renderQueueCsv,
  renderQueueHtml,
  renderQueueMarkdown,
  renderQueueWhatsApp,
} from '../src/integrations/csv/purchaseCsv.ts';

function usage() {
  console.log(`Usage: npm run crm:queue -- <compras.csv> [options]

Options:
  --today YYYY-MM-DD   Data de referência (padrão: hoje, UTC)
  --format md|csv|html|whatsapp  Formato da saída (padrão: md)
  --out PATH           Grava o relatório em arquivo em vez de imprimir
  --skip-invalid       Mantém linhas válidas e reporta as inválidas
  --require-proof      Bloqueia consentimento 'granted' sem data + texto de prova
  --help               Mostra esta ajuda

Exemplo de planilha (uma linha por compra):
  cliente_id,nome,telefone,consentimento,consent_proof_at,consent_proof_text,data_compra,valor,contatos_ignorados,observacoes
  c-1,Ana Lima,+5511999990000,sim,2026-10-01,28.50,0,"compra na loja"
`);
}

function parseArgs(argv) {
  const args = { file: null, today: null, format: 'md', out: null, skipInvalid: false, requireProof: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--skip-invalid') {
      args.skipInvalid = true;
    } else if (arg === '--require-proof') {
      args.requireProof = true;
    } else if (arg === '--today' || arg === '--format' || arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        console.error(`Missing value for ${arg}`);
        process.exit(2);
      }
      i += 1;
      if (arg === '--today') args.today = value;
      else if (arg === '--format') args.format = value;
      else args.out = value;
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
  if (!args.file) {
    usage();
    process.exit(2);
  }
  if (!['md', 'csv', 'html', 'whatsapp'].includes(args.format)) {
    console.error('--format must be md, csv, html or whatsapp');
    process.exit(2);
  }
  if (args.today && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    console.error('--today must be YYYY-MM-DD');
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

let csvText;
try {
  csvText = readFileSync(args.file, 'utf8');
} catch (error) {
  console.error(`Cannot read ${args.file}: ${error.message}`);
  process.exit(2);
}

const result = importPurchaseCsv(csvText, {
  today,
  skipInvalid: args.skipInvalid,
  requireConsentProof: args.requireProof,
});

for (const warning of result.queue.warnings) {
  console.error(`⚠ ${warning.line === null ? 'arquivo' : `linha ${warning.line}`}: ${warning.message}`);
}
for (const error of result.errors) {
  console.error(`✗ ${error.line === null ? 'arquivo' : `linha ${error.line}`}: ${error.message}`);
}
if (result.errors.length > 0 && !args.skipInvalid) {
  console.error(`\n${result.errors.length} linha(s) inválida(s). Corrija a planilha ou use --skip-invalid. Nada foi gerado.`);
  process.exit(2);
}

const output = args.format === 'csv'
  ? renderQueueCsv(result)
  : args.format === 'html'
    ? renderQueueHtml(result)
    : args.format === 'whatsapp'
      ? renderQueueWhatsApp(result)
      : renderQueueMarkdown(result);
if (args.out) {
  writeFileSync(args.out, output, 'utf8');
  const actionable = result.queue.actionable.length;
  console.error(`Wrote ${args.out} (${actionable} item(s) needing action, ${result.queue.customerCount} customer(s) evaluated).`);
} else {
  process.stdout.write(output);
}
