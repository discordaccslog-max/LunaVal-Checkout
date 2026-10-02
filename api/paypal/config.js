module.exports = (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'PAYPAL_CLIENT_ID is not set' });
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ clientId });
};
