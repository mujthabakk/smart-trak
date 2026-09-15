-- ---------------------------------------------------------------------------
-- Buses, routes, and drivers become independent entities. There is no more
-- "pre-assign a bus to a route" or "pre-assign a driver to a bus" step — the
-- only place a bus + driver + route are ever linked together is a `trips`
-- row, created live when a driver scans in and starts a trip. Any "current
-- bus/driver of this route" or "current bus" a driver is on is now derived
-- from the most recent in-progress trip, not a persisted column.
-- ---------------------------------------------------------------------------
ALTER TABLE buses DROP CONSTRAINT IF EXISTS fk_buses_driver;
DROP INDEX IF EXISTS idx_buses_driver_id;
ALTER TABLE buses DROP COLUMN IF EXISTS driver_id;

DROP INDEX IF EXISTS idx_drivers_assigned_bus_id;
ALTER TABLE drivers DROP COLUMN IF EXISTS assigned_bus_id;

DROP INDEX IF EXISTS idx_routes_bus_id;
ALTER TABLE routes DROP COLUMN IF EXISTS bus_id;
ALTER TABLE routes DROP COLUMN IF EXISTS driver_id;
