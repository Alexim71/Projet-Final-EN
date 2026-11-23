const crypto = require('crypto');

module.exports = function requireDeviceToken(req, res, next) {
  const expected = process.env.IOT_DEVICE_TOKEN || '';
  const received = req.get('x-device-token') || '';

  if (!expected) {
    return res.status(503).json({ message: 'L’authentification IoT n’est pas configurée.' });
  }
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return res.status(401).json({ message: 'Appareil non autorisé.' });
  }
  return next();
};
