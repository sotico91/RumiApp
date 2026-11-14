// Minimal Google Play Developer API client using the service account in credentials/.
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'com.sotico91.rumiapp';
const sa = JSON.parse(readFileSync(new URL('../../credentials/play-service-account.json', import.meta.url)));
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key, 'base64url');
  const r = await fetch(sa.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${head}.${claim}.${sig}` });
  return (await r.json()).access_token;
}

export async function api(method, path, body) {
  const t = await token();
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}${path}`, {
    method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} ${r.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

// CLI: node scripts/play/play.mjs <METHOD> <path> [jsonBody]
if (process.argv[1]?.endsWith('play.mjs') && process.argv[2]) {
  const [, , m, p, b] = process.argv;
  console.log(JSON.stringify(await api(m, p, b && JSON.parse(b)), null, 2));
}
