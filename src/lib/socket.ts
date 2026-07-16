import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

let socket: Socket | null = null

/** Lazily connects the shared Socket.IO client, authenticated with the current JWT. */
export function getSocket(): Socket {
  if (socket) return socket

  const token = useAuthStore.getState().token
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
