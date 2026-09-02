/** "Today" as YYYY-MM-DD in a given IANA timezone — en-CA formats that way natively. */
function todayInTimezone(timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

module.exports = { todayInTimezone };
