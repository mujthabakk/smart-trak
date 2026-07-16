const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.phone, u.role, u.school_id,
         s.name AS school_name, u.avatar, u.fcm_token, u.created_at, u.last_login
  FROM users u
  LEFT JOIN schools s ON s.id = u.school_id
`;

function toUserResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    role: row.role,
    school_id: row.school_id || undefined,
    school_name: row.school_name || undefined,
    avatar: row.avatar || undefined,
    fcm_token: row.fcm_token || undefined,
    created_at: row.created_at,
    last_login: row.last_login || undefined,
  };
}

async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return toUserResponse(rows[0]);
}

async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  await query('UPDATE users SET last_login = now() WHERE id = $1', [user.id]);
  return findUserById(user.id);
}

async function createOtp(email) {
  const user = await findUserByEmail(email);
  if (!user) throw ApiError.notFound('No account found with that email');
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    'INSERT INTO password_resets (user_id, otp_code, expires_at) VALUES ($1, $2, $3)',
    [user.id, otp, expiresAt]
  );
  return { userId: user.id, otp };
}

async function verifyOtp(email, otp) {
  const user = await findUserByEmail(email);
  if (!user) throw ApiError.notFound('No account found with that email');
  const { rows } = await query(
    `SELECT * FROM password_resets
     WHERE user_id = $1 AND otp_code = $2 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, otp]
  );
  if (!rows[0]) throw ApiError.badRequest('Invalid or expired verification code');
  return rows[0];
}

async function resetPassword(email, otp, newPassword) {
  const resetRow = await verifyOtp(email, otp);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetRow.user_id]);
  await query('UPDATE password_resets SET consumed_at = now() WHERE id = $1', [resetRow.id]);
}

module.exports = {
  toUserResponse,
  findUserByEmail,
  findUserById,
  verifyCredentials,
  createOtp,
  verifyOtp,
  resetPassword,
};
