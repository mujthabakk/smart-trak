-- A driver can now REQUEST a bus transfer (just a reason, no replacement bus
-- chosen yet) instead of only an admin creating a fully-formed transfer
-- directly. A requested transfer has no new_bus_id/authorised_by until an
-- admin assigns a bus, so both must become nullable, and 'requested' is
-- added as the first stage of the status lifecycle.
ALTER TABLE bus_transfers ALTER COLUMN new_bus_id DROP NOT NULL;
ALTER TABLE bus_transfers ALTER COLUMN authorised_by DROP NOT NULL;
ALTER TABLE bus_transfers ADD COLUMN requested_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bus_transfers DROP CONSTRAINT bus_transfers_status_check;
ALTER TABLE bus_transfers ADD CONSTRAINT bus_transfers_status_check
  CHECK (status IN ('requested', 'initiated', 'in_progress', 'completed'));
