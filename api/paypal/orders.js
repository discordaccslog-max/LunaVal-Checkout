const { PRODUCT, CURRENCY, paypalPost, paypalError } = require('../_lib/paypal');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source } = req.body || {};
  const money = n => ({ currency_code: CURRENCY, value: n.toFixed(2) });

  const order = {
    intent: 'CAPTURE',
    purchase_units: [{
      description: PRODUCT.name,
      // Card buyers don't give PayPal an email, so keep it on the order.
      custom_id: typeof email === 'string' ? email.trim().slice(0, 127) || undefined : undefined,
      amount: { ...money(PRODUCT.price), breakdown: { item_total: money(PRODUCT.price) } },
      items: [{ name: PRODUCT.name, quantity: '1', unit_amount: money(PRODUCT.price), category: 'DIGITAL_GOODS' }]
    }]
  };
  if (source === 'card-fields') {
    order.payment_source = { card: { attributes: { verification: { method: 'SCA_WHEN_REQUIRED' } } } };
  } else {
    // PayPal's hosted card button: don't ask for a shipping address on a digital product.
    order.application_context = { shipping_preference: 'NO_SHIPPING' };
  }

  try {
    const { ok, status, data } = await paypalPost('/v2/checkout/orders', order);
    if (!ok) {
      console.error('PayPal create order failed', status, JSON.stringify(data));
      return res.status(status).json(paypalError(data));
    }
    res.status(200).json({ id: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start payment. Please try again.' });
  }
};
