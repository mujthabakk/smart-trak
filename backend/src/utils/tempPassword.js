const crypto = require('crypto');

/** A random, reasonably strong temporary password — same crypto.randomBytes
 * primitive already used for OTPs in auth.service.js, but a real password
 * (not a 6-digit code) since this is what a guest driver actually logs in
 * with, not a one-time verification step. */
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url'); // 12 chars, [A-Za-z0-9_-]
}

module.exports = { generateTempPassword };
