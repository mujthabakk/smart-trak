-- ---------------------------------------------------------------------------
-- Fields the mobile "Create Ticket" and "Mark Absent" screens show but the
-- schema never had a column for: a ticket's short subject line, and which
-- shift (morning/evening/full day) a leave request covers.
-- ---------------------------------------------------------------------------
ALTER TABLE support_tickets ADD COLUMN subject TEXT;
ALTER TABLE leaves ADD COLUMN shift TEXT CHECK (shift IN ('morning','evening','full_day'));
