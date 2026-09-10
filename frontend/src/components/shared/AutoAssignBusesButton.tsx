import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Wand2, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { updateRoute } from '@/lib/api/routes'
import type { Route, Bus } from '@/types'

interface AssignPair {
  route: Route
  bus: Bus
  isReassignment: boolean
}

/**
 * Pairs each route needing a bus with an available bus that already has a
 * driver (bus+driver travel together — see buses.driver_id/drivers.assigned_bus_id
 * sync in the backend). Routes/buses that are already correctly paired are
 * left untouched so re-running this is a no-op unless something changed.
 */
function computeAssignmentPairs(routes: Route[], buses: Bus[]): AssignPair[] {
  const eligibleBuses = buses.filter((b) => !!b.driver_id)

  const locked = new Set<string>() // bus ids already correctly assigned
  const toAssign: Route[] = []
  for (const route of routes) {
    const bus = route.bus_id ? eligibleBuses.find((b) => b.id === route.bus_id) : undefined
    if (bus && route.driver_id === bus.driver_id) {
      locked.add(bus.id)
    } else {
      toAssign.push(route)
    }
  }

  const availableBuses = eligibleBuses
    .filter((b) => !locked.has(b.id))
    .sort((a, b) => a.bus_number.localeCompare(b.bus_number))
  const sortedToAssign = [...toAssign].sort((a, b) => a.name.localeCompare(b.name))

  const pairs: AssignPair[] = []
  const count = Math.min(sortedToAssign.length, availableBuses.length)
  for (let i = 0; i < count; i++) {
    const route = sortedToAssign[i]
    const bus = availableBuses[i]
    pairs.push({ route, bus, isReassignment: !!route.bus_id || !!route.driver_id })
  }
  return pairs
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

interface AutoAssignBusesButtonProps {
  routes: Route[]
  buses: Bus[]
}

export function AutoAssignBusesButton({ routes, buses }: AutoAssignBusesButtonProps) {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pairs, setPairs] = useState<AssignPair[]>([])

  const assignMutation = useMutation({
    mutationFn: async (pairsToApply: AssignPair[]) => {
      await Promise.all(
        pairsToApply.map(({ route, bus }) =>
          updateRoute(route.id, { bus_id: bus.id, driver_id: bus.driver_id }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['buses'] })
    },
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  function handleClick() {
    if (routes.length === 0) {
      window.alert('No routes found. Please add a route first, then come back to auto-assign buses.')
      return
    }
    if (buses.length === 0) {
      window.alert('No buses found. Please add a bus first, then come back to auto-assign buses.')
      return
    }
    const eligibleBuses = buses.filter((b) => !!b.driver_id)
    if (eligibleBuses.length === 0) {
      window.alert('None of your buses have a driver assigned yet. Please assign drivers to buses first, then come back to auto-assign routes.')
      return
    }

    const computed = computeAssignmentPairs(routes, buses)
    if (computed.length === 0) {
      window.alert('All routes are already assigned to a bus and driver — nothing to do.')
      return
    }
    setPairs(computed)
    setConfirmOpen(true)
  }

  function handleConfirm() {
    setConfirmOpen(false)
    assignMutation.mutate(pairs)
  }

  const reassignCount = pairs.filter((p) => p.isReassignment).length

  return (
    <>
      <Button variant="outline" onClick={handleClick} disabled={assignMutation.isPending}>
        {assignMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
        Auto-Assign Buses
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 size={18} className="text-[var(--primary)]" />
              Auto-Assign Buses to Routes
            </DialogTitle>
            <DialogDescription>
              This will assign {pairs.length} bus{pairs.length === 1 ? '' : 'es'} (with their drivers) to{' '}
              {pairs.length === 1 ? 'route' : 'routes'}.
              {reassignCount > 0 && ' Some of these already have a bus or driver assigned — confirming will reassign them.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
            {pairs.map(({ route, bus, isReassignment }) => (
              <div
                key={route.id}
                className="flex items-center justify-between gap-2 rounded-md bg-[var(--muted)]/40 px-2.5 py-1.5 text-sm"
              >
                <span className="truncate font-medium text-[var(--foreground)]">{route.name}</span>
                <div className="flex flex-shrink-0 items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <ArrowRight size={12} />
                  <span className="font-medium text-[var(--foreground)]">{bus.bus_number}</span>
                  {bus.driver_name && <span>· {bus.driver_name}</span>}
                  {isReassignment && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">Reassign</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirm}>
              {reassignCount > 0 ? 'Reassign & Assign' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
