// Prices live on the server so the browser can't change what gets charged.
// Keep these in sync with PRODUCT / SHIPPING_OPTIONS in public/index.html.
const PRODUCT = { name: 'LUNAVAL SUBSCRIPTION - LIFETIME', price: 49.99 };
const SHIPPING_OPTIONS = {
  'usps-free':     { label: 'USPS Standard', price: 0.00 },
  'fedex-express': { label: 'FedEx Express', price: 5.99 }
};
const CURRENCY = 'USD';

const BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set');
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${data.error_description || res.status}`);
  return data.access_token;
}

async function paypalPost(path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
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

module.exports = { PRODUCT, SHIPPING_OPTIONS, CURRENCY, paypalPost, paypalError };
