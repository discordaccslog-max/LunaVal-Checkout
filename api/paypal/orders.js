const { PRODUCT, SHIPPING_OPTIONS, CURRENCY, paypalPost, paypalError } = require('../_lib/paypal');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { shipping, source, email, address = {} } = req.body || {};
  const ship = SHIPPING_OPTIONS[shipping];
  if (!ship) return res.status(400).json({ error: 'Choose a shipping method.' });

  const money = n => ({ currency_code: CURRENCY, value: n.toFixed(2) });
  const fullName = [str(address.firstName, 140), str(address.lastName, 140)].filter(Boolean).join(' ');

  const purchaseUnit = {
    description: PRODUCT.name,
    // Card and Apple Pay buyers don't give PayPal an email, so keep it on the order.
    custom_id: str(email, 127) || undefined,
    amount: {
      ...money(PRODUCT.price + ship.price),
      breakdown: { item_total: money(PRODUCT.price), shipping: money(ship.price) }
    },
    items: [{ name: PRODUCT.name, quantity: '1', unit_amount: money(PRODUCT.price) }],
    shipping: {
      method: ship.label,
      name: { full_name: fullName },
      address: {
        address_line_1: str(address.line1, 300),
        address_line_2: str(address.line2, 300) || undefined,
        admin_area_2: str(address.city, 120),
        admin_area_1: str(address.state, 300),
        postal_code: str(address.zip, 60),
        country_code: 'US'
      }
    }
  };

  const order = { intent: 'CAPTURE', purchase_units: [purchaseUnit] };
  if (source === 'card-fields') {
    order.payment_source = { card: { attributes: { verification: { method: 'SCA_WHEN_REQUIRED' } } } };
  } else if (source === 'paypal') {
    order.payment_source = {
      paypal: { experience_context: { shipping_preference: 'SET_PROVIDED_ADDRESS', user_action: 'PAY_NOW', brand_name: 'Lunaval' } }
    };
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
