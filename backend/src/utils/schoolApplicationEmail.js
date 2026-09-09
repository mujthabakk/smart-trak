const { masterPool } = require('../config/db');
const env = require('../config/env');
const mailer = require('./mailer');

function buildEmailHtml({ schoolName, applicantName, applicantEmail, applicantPhone, planName }) {
  const reviewUrl = `${env.appUrl}/#/super-admin/schools`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f4c81;">New school application</h2>
      <p><strong>${schoolName}</strong> just applied through the self-service onboarding page and is waiting for approval.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Applicant</td><td style="padding: 6px 0;">${applicantName || '—'}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;">${applicantEmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td style="padding: 6px 0;">${applicantPhone}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Plan</td><td style="padding: 6px 0;">${planName}</td></tr>
      </table>
      <p><a href="${reviewUrl}" style="display: inline-block; background: #0f4c81; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">Review in Super Admin</a></p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">No admin credentials have been issued yet — those go out automatically once you approve the school.</p>
    </div>
  `;
}

/**
 * Notifies every super_admin by email when a new school applies through the
 * public "Onboard your school" flow — schools.service.js's apply() always
 * creates the row as 'pending', and previously nothing told anyone it needed
 * review. Logged to email_logs on the master DB (apply()/create() are
 * platform-level, not tenant-scoped — same reasoning as schools.service.js's
 * own explicit masterPool usage), one row per super_admin recipient.
 * Best-effort: a mail failure must never fail the applicant's signup.
 */
async function emailNewSchoolApplication(school, applicant) {
  const { rows: admins } = await masterPool.query("SELECT id, email FROM users WHERE role = 'super_admin'");
  if (!admins.length) return [];

  const subject = `New school application: ${school.name}`;
  const html = buildEmailHtml({
    schoolName: school.name,
    applicantName: applicant.admin_name,
    applicantEmail: applicant.email,
    applicantPhone: applicant.phone,
    planName: applicant.plan_name,
  });

  return Promise.all(admins.map(async (admin) => {
    try {
      const mailResult = await mailer.sendMail({ to: admin.email, subject, html });
      const status = mailResult.delivered ? 'sent' : mailer.isConfigured() ? 'failed' : 'logged_only';
      await masterPool.query(
        `INSERT INTO email_logs (school_id, user_id, recipient_email, subject, body, trigger_type, status, error_message)
         VALUES ($1,$2,$3,$4,$5,'school_application',$6,$7)`,
        [school.id, admin.id, admin.email, subject, html, status, mailResult.reason || null]
      );
      return { admin_id: admin.id, status };
    } catch (err) {
      console.error(`Failed to email super_admin ${admin.email} about new school application:`, err.message);
      return { admin_id: admin.id, status: 'failed' };
    }
  }));
}

module.exports = { emailNewSchoolApplication };
