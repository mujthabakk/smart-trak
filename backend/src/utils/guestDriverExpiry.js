/** Shared by auth.service.js (login) and trips.service.js (trip-start,
 * defense in depth) so the two enforcement points can't drift apart.
 * `driver` needs guest_validity_type/guest_expires_at/guest_max_trips/
 * guest_trips_used selected. */
function isGuestExpired(driver) {
  if (driver.guest_validity_type === 'days') {
    return driver.guest_expires_at && new Date(driver.guest_expires_at) < new Date();
  }
  if (driver.guest_validity_type === 'trips') {
    return driver.guest_trips_used >= driver.guest_max_trips;
  }
  return false;
}

module.exports = { isGuestExpired };
