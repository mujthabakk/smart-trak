import { Country } from 'country-state-city'

export interface CountryOption {
  name: string
  isoCode: string
}

export const COUNTRY_OPTIONS: CountryOption[] = Country.getAllCountries()
  .map((c) => ({ name: c.name, isoCode: c.isoCode }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function isoCodeForCountryName(name: string): string | undefined {
  return COUNTRY_OPTIONS.find((c) => c.name === name)?.isoCode
}

export interface PostalLookupResult {
  city: string
  state: string
}

/**
 * Looks up city/state for a postal code via the free zippopotam.us API.
 * Returns null if there's no match — including countries with no postal
 * code system at all (e.g. the UAE), where the field just stays editable.
 */
export async function lookupPostalCode(countryIsoCode: string, postalCode: string): Promise<PostalLookupResult | null> {
  const code = postalCode.trim()
  if (!countryIsoCode || !code) return null
  try {
    const res = await fetch(`https://api.zippopotam.us/${countryIsoCode.toLowerCase()}/${encodeURIComponent(code)}`)
    if (!res.ok) return null
    const data = await res.json()
    const place = data?.places?.[0]
    if (!place) return null
    return { city: place['place name'] || '', state: place['state'] || '' }
  } catch {
    return null
  }
}
