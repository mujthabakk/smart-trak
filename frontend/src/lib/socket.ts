import { io, type Socket } from 'socket.io-client'
import { store } from '@/store'
import type { BusStatusSummary } from '@/types'

let socket: Socket | null = null

/** Lazily connects the shared Socket.IO client, authenticated with the current JWT. */
export function getSocket(): Socket {
  if (socket) return socket

  const token = store.getState().auth.token
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export interface BusLocationEvent {
  trip_id: string
  bus_id: string
  latitude: number
  longitude: number
  speed: number
  current_stop?: string
  status: 'not_started' | 'in_progress' | 'completed'
  recorded_at: string
}

/** Pushed immediately when a trip starts/ends via the REST API, so the Live
 * Map doesn't have to wait on the next GPS ping (which may never arrive) to
 * notice the bus should flip to running/idle. */
export interface TripStatusEvent {
  trip_id: string
  bus_id: string
  status: 'not_started' | 'in_progress' | 'completed'
}

/** One student's recomputed Bus Status cards, pushed whenever their
 * attendance or trip status changes — consumed by the student/parent mobile
 * app, not this web app, but typed here to document the socket contract. */
export type BusStatusEvent = BusStatusSummary
