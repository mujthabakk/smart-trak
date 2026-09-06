/** "Today" as YYYY-MM-DD in a given IANA timezone — en-CA formats that way natively. */
function todayInTimezone(timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Adds `days` calendar days to a 'YYYY-MM-DD' string — pure date-component
 * arithmetic (via Date.UTC), not a wall-clock/instant shift, so it's safe
 * regardless of the caller's own timezone or DST. */
function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Intl.supportedValuesOf('timeZone') only lists CANONICAL zone names — it
 * excludes widely-used valid aliases like 'UTC' and 'Asia/Kolkata' (whose
 * canonical forms are 'Etc/UTC' and 'Asia/Calcutta'), so checking against
 * that list rejects perfectly valid, commonly-picked timezones. Actually
 * trying to construct a formatter is the correct validity check — it
 * throws only for genuinely unknown zone names, resolving aliases exactly
 * like real usage (todayInTimezone, etc.) already does. */
function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

module.exports = { todayInTimezone, addDaysToDateString, isValidTimezone };
