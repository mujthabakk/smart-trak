const crypto = require('crypto');
const QRCode = require('qrcode');

function generateQrCode(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

async function qrCodeToDataUrl(code) {
  return QRCode.toDataURL(code, { margin: 1, width: 256 });
}

module.exports = { generateQrCode, qrCodeToDataUrl };
