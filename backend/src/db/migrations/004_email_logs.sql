-- Tracks every email the system attempts to send (e.g. school-approval
-- credentials), regardless of whether SMTP is configured — so admins can
-- always see what content was generated, who it was addressed to, and
-- whether it was actually delivered.
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY DEFAULT next_code('EML'),
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'logged_only')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_school_id ON email_logs(school_id);
