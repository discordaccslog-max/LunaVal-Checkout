// Prices live on the server so the browser can't change what gets charged.
// Keep in sync with the order summary in public/index.html.
const PRODUCT = { name: 'LUNAVAL SUBSCRIPTION', price: 32.99 };
const CURRENCY = 'USD';

// The client ID is public (it's sent to every browser in the PayPal SDK URL).
// The secret must only ever come from the PAYPAL_CLIENT_SECRET environment variable.
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'BAAuwBQgHhXSwD_GS5vvf6ABXo09DRMIRUgkoJaZ1zRY1gmo1nuWRkXLjhBRDIrIxr238alKCk7ToS7DH0';

const HOSTS = { live: 'https://api-m.paypal.com', sandbox: 'https://api-m.sandbox.paypal.com' };
let baseUrl = HOSTS[process.env.PAYPAL_ENV] || null;

async function requestToken(base, auth) {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  return { res, data: await res.json().catch(() => ({})) };
}

// Uses PAYPAL_ENV when set; otherwise tries live, then sandbox, and remembers which one accepted the keys.
async function getAccessToken() {
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new Error('PAYPAL_CLIENT_SECRET is not set');
  const auth = Buffer.from(`${CLIENT_ID}:${secret}`).toString('base64');
  for (const base of baseUrl ? [baseUrl] : [HOSTS.live, HOSTS.sandbox]) {
    const { res, data } = await requestToken(base, auth);
    if (res.ok) { baseUrl = base; return data.access_token; }
    if (res.status !== 401) throw new Error(`PayPal auth failed: ${data.error_description || res.status}`);
  }
  throw new Error('PayPal rejected the client ID / secret');
}

async function paypalPost(path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Turns a PayPal error response into something safe to show the buyer.
function paypalError(data) {
  const detail = data && data.details && data.details[0];
  return {
    error: (detail && detail.description) || (data && data.message) || 'Payment could not be processed.',
    issue: (detail && detail.issue) || (data && data.name) || 'UNKNOWN'
  };
}

module.exports = { PRODUCT, CURRENCY, CLIENT_ID, paypalPost, paypalError };
