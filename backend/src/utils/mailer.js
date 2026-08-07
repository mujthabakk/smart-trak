const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function isConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Sends an email if SMTP is configured. If it isn't (e.g. local dev with no
 * SMTP_* env vars set), this is a no-op that reports back so the caller can
 * still log the email content instead of silently pretending it was sent.
 */
async function sendMail({ to, subject, html }) {
  if (!isConfigured()) {
    return { delivered: false, reason: 'SMTP not configured' };
  }
  try {
    await getTransporter().sendMail({ from: env.smtp.from, to, subject, html });
    return { delivered: true };
  } catch (err) {
    return { delivered: false, reason: err.message };
  }
}

module.exports = { sendMail, isConfigured };
