const crypto = require('crypto');
const QRCode = require('qrcode');

function generateQrCode(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

/**
 * Deterministic QR code derived from a stable seed key instead of random
 * bytes. Used by db/seed.js so demo fleet/route/student QR codes stay
 * identical across reseeds — printed/scanned codes shouldn't go stale just
 * because the dev DB got wiped and reseeded again.
 */
function generateSeedQrCode(prefix, seedKey) {
  const hash = crypto.createHash('sha256').update(seedKey).digest('hex').slice(0, 16).toUpperCase();
  return `${prefix}-${hash}`;
}

async function qrCodeToDataUrl(code) {
  return QRCode.toDataURL(code, { margin: 1, width: 256 });
}

module.exports = { generateQrCode, generateSeedQrCode, qrCodeToDataUrl };
