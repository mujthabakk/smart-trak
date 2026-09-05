-- lost_found_items.bus_id/driver_id were NOT NULL, but the module's own
-- validation/routes already treat both as optional and let a school_admin
-- (with no driver_id of their own) or a report with no known bus create an
-- item — making every such create fail with a NOT NULL violation.
ALTER TABLE lost_found_items ALTER COLUMN bus_id DROP NOT NULL;
ALTER TABLE lost_found_items ALTER COLUMN driver_id DROP NOT NULL;
