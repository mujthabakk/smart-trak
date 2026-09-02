import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Reuses the same loader id/libraries as LiveMap.tsx so the Google Maps
// script is only ever loaded once across the app, regardless of how many of
// these are mounted.
const GOOGLE_MAP_LIBRARIES: ['places'] = ['places']
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 } // Dubai — used only until a location is set
const MAP_CONTAINER_STYLE = { width: '100%', height: '280px' }

interface LocationPickerProps {
  latitude?: number
  longitude?: number
  onChange: (lat: number, lng: number) => void
}

/** Map + address search for picking a lat/lng: click the map, drag the pin,
 * or search an address — all three converge on the same onChange(lat, lng).
 * Deliberately centers on `latitude`/`longitude` every render (unlike the
 * Live Map's deliberately-decoupled center) — a picker should always jump to
 * wherever the pin currently is, including once the parent's data finishes
 * loading asynchronously after this mounts. */
export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const position = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null

  // Manual-entry text fields, kept in sync with the pin whenever it moves via
  // map click/drag/search — but only ever pushed from OUR typing back up to
  // the parent once both fields parse to real numbers (see commitManualEntry).
  const [latText, setLatText] = useState(latitude != null ? String(latitude) : '')
  const [lngText, setLngText] = useState(longitude != null ? String(longitude) : '')
  useEffect(() => {
    setLatText(latitude != null ? String(latitude) : '')
    setLngText(longitude != null ? String(longitude) : '')
  }, [latitude, longitude])

  function commitManualEntry(nextLatText: string, nextLngText: string) {
    const lat = parseFloat(nextLatText)
    const lng = parseFloat(nextLngText)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onChange(lat, lng)
    }
  }

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      onChange(e.latLng.lat(), e.latLng.lng())
    },
    [onChange],
  )

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      onChange(e.latLng.lat(), e.latLng.lng())
    },
    [onChange],
  )

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace()
    const loc = place?.geometry?.location
    if (!loc) return
    onChange(loc.lat(), loc.lng())
  }

  if (!isLoaded) {
    return <div className="h-[280px] w-full animate-pulse rounded-xl bg-[var(--muted)]" />
  }

  return (
    <div className="space-y-2">
      <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={handlePlaceChanged}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input placeholder="Search for an address…" className="pl-9" />
        </div>
      </Autocomplete>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={position ?? DEFAULT_CENTER}
          zoom={position ? 15 : 10}
          onClick={handleMapClick}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        >
          {position && <Marker position={position} draggable onDragEnd={handleMarkerDragEnd} />}
        </GoogleMap>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="loc-picker-lat">Latitude</Label>
          <Input
            id="loc-picker-lat"
            type="number"
            step="any"
            value={latText}
            onChange={(e) => {
              setLatText(e.target.value)
              commitManualEntry(e.target.value, lngText)
            }}
            placeholder="25.1972"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-picker-lng">Longitude</Label>
          <Input
            id="loc-picker-lng"
            type="number"
            step="any"
            value={lngText}
            onChange={(e) => {
              setLngText(e.target.value)
              commitManualEntry(latText, e.target.value)
            }}
            placeholder="55.2744"
          />
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        Search an address, click the map, drag the pin, or type coordinates directly.
      </p>
    </div>
  )
}

export default LocationPicker
