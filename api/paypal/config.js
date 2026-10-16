const { CLIENT_ID } = require('../_lib/paypal');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ clientId: CLIENT_ID });
};
