import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { COUNTRY_OPTIONS, isoCodeForCountryName, lookupPostalCode } from '@/lib/geo'

interface AddressFieldsProps {
  idPrefix: string
  country: string
  city: string
  state: string
  postCode: string
  onCountryChange: (value: string) => void
  onCityChange: (value: string) => void
  onStateChange: (value: string) => void
  onPostCodeChange: (value: string) => void
  cityStateRequired?: boolean
}

/**
 * Country select first, then Post/ZIP code — on blur it looks up city/state
 * via zippopotam.us and fills them in (still editable, since some countries
 * have no postal code system at all and the lookup can miss).
 */
export function AddressFields({
  idPrefix, country, city, state, postCode,
  onCountryChange, onCityChange, onStateChange, onPostCodeChange, cityStateRequired,
}: AddressFieldsProps) {
  const [looking, setLooking] = useState(false)

  async function handlePostCodeBlur() {
    const isoCode = isoCodeForCountryName(country)
    if (!isoCode || !postCode.trim()) return
    setLooking(true)
    const result = await lookupPostalCode(isoCode, postCode)
    setLooking(false)
    if (result) {
      if (result.city) onCityChange(result.city)
      if (result.state) onStateChange(result.state)
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-country`}>Country</Label>
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger id={`${idPrefix}-country`}><SelectValue placeholder="Select a country" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {COUNTRY_OPTIONS.map((c) => (
              <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-postcode`}>Post / ZIP code</Label>
        <Input
          id={`${idPrefix}-postcode`}
          value={postCode}
          placeholder="00000"
          onChange={(e) => onPostCodeChange(e.target.value)}
          onBlur={handlePostCodeBlur}
        />
        {looking && <p className="text-xs text-[var(--muted-foreground)]">Looking up city/state…</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City{cityStateRequired ? ' *' : ''}</Label>
        <Input
          id={`${idPrefix}-city`} value={city} placeholder="Dubai" required={cityStateRequired}
          onChange={(e) => onCityChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-state`}>State / Emirate{cityStateRequired ? ' *' : ''}</Label>
        <Input
          id={`${idPrefix}-state`} value={state} placeholder="Dubai" required={cityStateRequired}
          onChange={(e) => onStateChange(e.target.value)}
        />
      </div>
    </>
  )
}
