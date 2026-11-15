/* Local or isolated HTTPS staging only. Never mount this server in production. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStagingOrigin, stagingRuntimeEnabled, stagingStatusResult } from './dex-swap-staging-runtime-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const stagingOrigin = parseStagingOrigin(process.env.SWAP_STAGING_ORIGIN ?? 'http://127.0.0.1:4173');
// The isolated test harness MUST remain off unless manually opted in.
// This does not change public Swap/DEX flags or enable any production path.
const localRuntimeApproved = stagingRuntimeEnabled(process.env);
const prefix = '/__staging_jupiter/';
const pins = {
  'plugin-1.0.18.js': 'aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy',
  'plugin-1.0.18-app.js': '6biewkmJfDzET07cdGWHy+jwuhkI+oP98oqqwrvEHTiGUY/SqbybduLkiD5cawE+',
  'plugin-1.0.18-Tailwind.css': 'Ong35s4t7omIls1bLzrmmM3B2jLwHx4XINBaK6iLZvpqpYoGOv9i5YbTTzW5Ssl4',
  'plugin-1.0.18-Jupiter.css': 'YYdqEnPj2Ekofq4mqijjNRPv7oDEQjVbHk4iYVY0OdwmIoB0U7cV8105vO2eoTXB',
  'scoped-preflight-v4.css': 'j68Cx7NTIAPq+c1/H8kj6ROqZcz4eOgjXYHyNNDylErckJyx/jeBRvVYnGNSNHCS'
};
const hash = bytes => createHash('sha384').update(bytes).digest('base64');
const assets = new Map();
// No vendor network, asset rehosting, or wallet-capable code is fetched in the
// default-OFF state. Only an explicit isolated staging opt-in may fetch pins.
if (localRuntimeApproved) {
  for (const [name, expected] of Object.entries(pins)) {
    const response = await fetch('https://plugin.jup.ag/' + name, {
      redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Cannot download ' + name);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== expected) throw new Error('Integrity mismatch: ' + name);
    assets.set(prefix + name, bytes);
  }
}
function replaceRequired(source, search, replacement) {
  const output = source.replace(search, replacement);
  if (output === source) throw new Error('Staging patch did not match: ' + search);
  return output;
}
const bootstrapPath = prefix + 'plugin-1.0.18.js';
const host = await readFile(resolve(root, 'dex/provider-managed-swap.mjs'), 'utf8');
const config = await readFile(resolve(root, 'swap-config.js'), 'utf8');
let stagedHost = host;
let stagedConfig = config;
// The disabled-by-default staging host serves the exact production OFF config
// and does not patch the production provider loader or rehost vendor assets.
if (localRuntimeApproved) {
  let bootstrap = assets.get(bootstrapPath).toString();
  bootstrap = replaceRequired(bootstrap, '||"https://plugin.jup.ag"', '||' + JSON.stringify(stagingOrigin.origin + prefix.slice(0, -1)));
  bootstrap = replaceRequired(bootstrap, /https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/, prefix + 'fonts.css');
  assets.set(bootstrapPath, Buffer.from(bootstrap));
  assets.set(prefix + 'fonts.css', Buffer.alloc(0));
  stagedHost = replaceRequired(host, '"terminal.jup.ag"', JSON.stringify(stagingOrigin.hostname));
  stagedHost = replaceRequired(stagedHost, /^const SCRIPT_PATH = .*$/m, 'const SCRIPT_PATH = /^\\/__staging_jupiter\\/plugin-1\\.0\\.18\\.js$/;');
  stagedHost = replaceRequired(stagedHost.replace(/\r\n/g, '\n'), 'url.protocol !== "https:" || url.hostname !== OFFICIAL_TERMINAL_HOST ||\n        url.port', 'url.origin !== ' + JSON.stringify(stagingOrigin.origin) + ' || url.hostname !== OFFICIAL_TERMINAL_HOST');
  stagedHost = replaceRequired(stagedHost, 'displayMode: "integrated",', 'displayMode: "integrated", autoConnect: false,');
  stagedConfig = replaceRequired(config, /managedProvider: Object.freeze\(\{[\s\S]*?\}\)/, 'managedProvider: Object.freeze(' + JSON.stringify({
    enabled: true, runtimeApproved: true, provider: 'jupiter-terminal', scriptUrl: stagingOrigin.origin + bootstrapPath,
    integrity: 'sha384-' + hash(bootstrap)
  }) + ')');
}
const mime = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };

createServer(async (request, response) => {
  try {
    const path = new URL(request.url, stagingOrigin).pathname;
    // Mirror the merged production approval contract, only on this isolated
    // staging origin. A failed request, other method or default-off state
    // must never cause an in-site wallet widget to initialize.
    if (path === '/swap-runtime-status.json') {
      const status = stagingStatusResult(request.method, localRuntimeApproved);
      response.writeHead(status.status, status.headers).end(status.body);
      return;
    }
    const page = path === '/swap/' || path === '/dex/';
    if (request.method === 'GET' && /^\/(swap|dex)(?:\/index\.html)?$/i.test(path)) {
      const route = path.split('/')[1].toLowerCase();
      response.writeHead(308, { Location: '/' + route + '/', 'Cache-Control': 'no-store' }).end();
      return;
    }
    const file = resolve(root, '.' + path + (page ? 'index.html' : ''));
    if (request.method !== 'GET' || !file.startsWith(resolve(root) + sep) ||
        (!page && extname(file).toLowerCase() === '.html') ||
        path.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404).end();
      return;
    }
    let body = assets.get(path);
    if (path === '/dex/provider-managed-swap.mjs') body = stagedHost;
    if (path === '/swap-config.js') body = stagedConfig;
    if (body === undefined && !path.startsWith(prefix) && mime[extname(file)]) body = await readFile(file);
    if (body === undefined) {
      response.writeHead(404).end();
      return;
    }
    const headers = { 'Content-Type': mime[extname(file)], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
    if (page) {
      const inline = [...body.toString().matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
        .filter(match => match[1].trim()).map(match => "'sha384-" + hash(match[1].replace(/\r\n?/g, '\n')) + "'");
      const scripts = ['/swap-config.js', '/dex/swap-amount.js', '/dex/provider-managed-swap.mjs',
        '/dex/premium-terminal.js', bootstrapPath, prefix + 'plugin-1.0.18-app.js'];
      headers['Content-Security-Policy'] = 'script-src ' + scripts.map(path => stagingOrigin.origin + path).concat(inline).join(' ') +
        "; object-src 'none'; base-uri 'none'; worker-src 'none'; frame-src 'none'";
    }
    response.writeHead(200, headers).end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
}).listen(Number(process.env.SWAP_STAGING_PORT ?? 4173), '127.0.0.1', () => {
  console.log('Swap staging ready: ' + stagingOrigin.origin);
});
