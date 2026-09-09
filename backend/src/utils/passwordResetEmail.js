const { query } = require('../config/db');
const env = require('../config/env');
const mailer = require('./mailer');

function buildEmailHtml({ name, otp }) {
  const resetUrl = `${env.appUrl}/#/otp`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f4c81;">Reset your SmartTrack password</h2>
      <p>Hi ${name},</p>
      <p>Use this verification code to reset your password. It expires in 10 minutes.</p>
      <p style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0f4c81; background: #f3f4f6; padding: 12px 20px; border-radius: 8px;">${otp}</span>
      </p>
      <p style="text-align: center;"><a href="${resetUrl}">Enter this code at ${resetUrl}</a></p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  `;
}

/**
 * Emails a password-reset OTP (self-service "forgot password" flow, and an
 * admin-triggered "send reset link" from a student/driver profile) and logs
 * the attempt to email_logs regardless of whether SMTP is configured —
 * mirrors userCredentialsEmail.js's exact pattern, just for a one-time code
 * instead of a full login/temp-password pair.
 */
async function emailPasswordResetOtp({ id, name, email, school_id }, otp) {
  const subject = 'Reset your SmartTrack password';
  const html = buildEmailHtml({ name, otp });

  const mailResult = await mailer.sendMail({ to: email, subject, html });
  const status = mailResult.delivered ? 'sent' : mailer.isConfigured() ? 'failed' : 'logged_only';

  const { rows: logRows } = await query(
    `INSERT INTO email_logs (school_id, user_id, recipient_email, subject, body, trigger_type, status, error_message)
     VALUES ($1,$2,$3,$4,$5,'password_reset',$6,$7) RETURNING *`,
    [school_id || null, id, email, subject, html, status, mailResult.reason || null]
  );

  return { status, log: logRows[0] };
}

module.exports = { emailPasswordResetOtp };
