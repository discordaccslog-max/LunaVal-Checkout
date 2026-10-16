const { paypalPost, paypalError } = require('../_lib/paypal');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderID } = req.body || {};
  if (typeof orderID !== 'string' || !/^[A-Z0-9]{5,40}$/.test(orderID)) return res.status(400).json({ error: 'Invalid order ID.' });

  try {
    const { ok, status, data } = await paypalPost(`/v2/checkout/orders/${orderID}/capture`, {});
    if (!ok) {
      console.error('PayPal capture failed', status, JSON.stringify(data));
      return res.status(status).json(paypalError(data));
    }
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    if (data.status !== 'COMPLETED' || !capture || !['COMPLETED', 'PENDING'].includes(capture.status)) {
      return res.status(402).json({ error: 'Your payment was declined. Please try another card or payment method.', issue: capture?.status || data.status });
    }
    res.status(200).json({ orderID: data.id, captureID: capture.id, status: capture.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not complete payment. Please try again.' });
  }
};
