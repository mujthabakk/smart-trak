const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in kilometers. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Speed in km/h implied by two consecutive GPS pings. Pings under 1 second
 * apart are treated as 0 (GPS jitter would otherwise blow up to nonsense
 * speeds when dividing by a near-zero time delta); anything implying an
 * unrealistic bus speed is clamped, since GPS noise can occasionally imply
 * a large jump between two points recorded moments apart.
 */
function impliedSpeedKmh(prev, next) {
  if (!prev) return 0;
  const elapsedHours = (next.recordedAt.getTime() - prev.recordedAt.getTime()) / 3_600_000;
  if (elapsedHours <= 1 / 3600) return 0;
  const distanceKm = haversineKm(prev.latitude, prev.longitude, next.latitude, next.longitude);
  return Math.min(distanceKm / elapsedHours, 160);
}

module.exports = { haversineKm, impliedSpeedKmh };
