const { query } = require('../config/db');
const env = require('../config/env');
const mailer = require('./mailer');

function buildEmailHtml({ schoolName, name, email, password }) {
  const loginUrl = `${env.appUrl}/#/login`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f4c81;">Welcome to SmartTrack</h2>
      <p>Hi ${name},</p>
      <p>${schoolName ? `Your console for <strong>${schoolName}</strong> is ready.` : 'Your SmartTrack account is ready.'} Here are your login details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Login URL</td><td style="padding: 6px 0;"><a href="${loginUrl}">${loginUrl}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;">${email}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Temporary Password</td><td style="padding: 6px 0;"><strong>${password}</strong></td></tr>
      </table>
      <p>Please sign in and change your password as soon as possible.</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you weren't expecting this email, you can ignore it.</p>
    </div>
  `;
}

/**
 * Emails a user's login credentials (used right after creating a user, and
 * whenever a super_admin/school_admin resets someone's password) and logs
 * the attempt to email_logs regardless of whether SMTP is configured.
 * `password` must be the plaintext — callers already have it at the moment
 * they set it, since only the bcrypt hash is ever persisted afterwards.
 */
async function emailUserCredentials({ id, name, email, school_id }, password, { triggerType }) {
  let schoolName = null;
  if (school_id) {
    const { rows } = await query('SELECT name FROM schools WHERE id = $1', [school_id]);
    schoolName = rows[0]?.name || null;
  }

  const subject = schoolName ? `Your SmartTrack login for ${schoolName}` : 'Your SmartTrack login credentials';
  const html = buildEmailHtml({ schoolName, name, email, password });

  const mailResult = await mailer.sendMail({ to: email, subject, html });
  const status = mailResult.delivered ? 'sent' : mailer.isConfigured() ? 'failed' : 'logged_only';

  const { rows: logRows } = await query(
    `INSERT INTO email_logs (school_id, user_id, recipient_email, subject, body, trigger_type, status, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [school_id || null, id, email, subject, html, triggerType, status, mailResult.reason || null]
  );

  return { status, log: logRows[0] };
}

module.exports = { emailUserCredentials };
