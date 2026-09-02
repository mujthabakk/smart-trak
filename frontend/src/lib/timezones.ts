/** Timezones relevant to this app's current market (Gulf/South Asia), plus
 * UTC as a neutral fallback. The backend accepts any IANA zone Intl knows
 * about (schools.validation.js), this is just a curated picker list. */
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST, UTC+3)' },
  { value: 'Asia/Qatar', label: 'Doha (AST, UTC+3)' },
  { value: 'Asia/Kuwait', label: 'Kuwait (AST, UTC+3)' },
  { value: 'Asia/Bahrain', label: 'Bahrain (AST, UTC+3)' },
  { value: 'Asia/Muscat', label: 'Muscat (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
  { value: 'UTC', label: 'UTC' },
]

export const DEFAULT_TIMEZONE = 'Asia/Dubai'
