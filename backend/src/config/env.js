require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  pgSsl: process.env.PGSSL === 'true',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  appUrl: process.env.APP_URL || 'http://localhost:5173/smart-trak',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'SmartTrack <no-reply@smarttrack.app>',
  },
  fcmCredentialsPath: process.env.FCM_CREDENTIALS_PATH || '',
  // Optional — the AI Assistant chat widget degrades to a clear "not
  // configured" message (rather than failing to boot) when this is unset.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
