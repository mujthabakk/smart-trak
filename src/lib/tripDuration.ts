import type { Trip } from '@/types'

export function tripDurationMinutes(started: string, ended?: string): number {
  const endMs = ended ? new Date(ended).getTime() : Date.now()
  const startMs = new Date(started).getTime()
  return Math.max(0, Math.round((endMs - startMs) / 60000))
}

/** e.g. "45 min", "1h 30m" */
export function formatTripDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function isLongTrip(minutes: number): boolean {
  return minutes >= 60
}

export function getDisplayTripForBus(busId: string, trips: Trip[]): Trip | undefined {
  const busTrips = trips.filter((t) => t.bus_id === busId)
  const active = busTrips.find((t) => t.status === 'in_progress')
  if (active) return active
  const completed = busTrips
    .filter((t) => t.status === 'completed' && t.started_at && t.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())
  return completed[0]
}

export function getDisplayTripForRoute(routeId: string, trips: Trip[]): Trip | undefined {
  const routeTrips = trips.filter((t) => t.route_id === routeId)
  const active = routeTrips.find((t) => t.status === 'in_progress')
  if (active) return active
  const completed = routeTrips
    .filter((t) => t.status === 'completed' && t.started_at && t.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())
  return completed[0]
}

export interface TripDurationDisplay {
  label: string
  minutes: number
  isLive: boolean
  isLong: boolean
}

export function getTripDurationDisplay(trip: Trip): TripDurationDisplay {
  const isLive = trip.status === 'in_progress'
  const minutes = tripDurationMinutes(trip.started_at ?? '', isLive ? undefined : trip.ended_at)
  return {
    label: formatTripDurationMinutes(minutes),
    minutes,
    isLive,
    isLong: isLongTrip(minutes),
  }
}

export function getBusTripDurationDisplay(busId: string, trips: Trip[]): TripDurationDisplay | null {
  const trip = getDisplayTripForBus(busId, trips)
  if (!trip?.started_at) return null
  return getTripDurationDisplay(trip)
}

export function getRouteTripDurationDisplay(routeId: string, trips: Trip[]): TripDurationDisplay | null {
  const trip = getDisplayTripForRoute(routeId, trips)
  if (!trip?.started_at) return null
  return getTripDurationDisplay(trip)
}
