// Copia a URL da org e o token de acesso do Salesforce CLI para o .env.local,
// sem imprimir o token. Uso: npm run sf:env -- <alias>   (padrão: gina-dev)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const alias = process.argv[2] || 'gina-dev';
const envPath = new URL('../.env.local', import.meta.url);

const sf = (args) =>
  JSON.parse(
    execFileSync('sf', [...args, '--target-org', alias, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  ).result;

let result;
let accessToken;
try {
  // O `org display` das versões novas do CLI esconde o token; ele vem de
  // `org auth show-access-token`, que não pede confirmação com --json.
  result = sf(['org', 'display']);
  const token = sf(['org', 'auth', 'show-access-token']);
  accessToken = typeof token === 'string' ? token : token?.accessToken ?? token?.token;
} catch {
  console.error(`Não achei a org "${alias}". Rode antes: sf org login web --alias ${alias}`);
  process.exit(1);
}

// Um valor com espaços é aviso do CLI, não token.
if (!result?.instanceUrl || !accessToken || /\s/.test(accessToken)) {
  console.error('O CLI não devolveu URL e token. Faça o login de novo.');
  process.exit(1);
}

const values = {
  SALESFORCE_INSTANCE_URL: result.instanceUrl,
  SALESFORCE_ACCESS_TOKEN: accessToken,
};

const lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];
for (const [key, value] of Object.entries(values)) {
  const i = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}
writeFileSync(envPath, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });

console.log(`.env.local atualizado para ${result.username} (${result.instanceUrl}).`);
console.log('O token expira com a sessão; se a tela der erro 401, rode este comando de novo.');
