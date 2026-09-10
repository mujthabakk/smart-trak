import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { listDrivers, updateDriver } from '@/lib/api/drivers'
import type { Bus } from '@/types'

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

const UNASSIGNED = '__unassigned__'

interface AssignDriverDialogProps {
  bus: Bus
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * Assigning a driver to a bus goes through PATCH /drivers/:id (assigned_bus_id),
 * not PATCH /buses/:id — only the driver-side update runs syncBusAssignment,
 * which also evicts whichever other driver currently holds this bus and clears
 * this driver's own previous bus. Writing bus.driver_id directly would skip
 * that sync and leave the two tables pointing at each other inconsistently.
 */
export function AssignDriverDialog({ bus, open, onOpenChange }: AssignDriverDialogProps) {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['drivers'], queryFn: () => listDrivers() })
  const drivers = data?.drivers ?? []

  const [selected, setSelected] = useState(bus.driver_id ?? UNASSIGNED)

  // Reset the selection whenever the dialog (re)opens — same pattern
  // BusFormDialog/EditRouteDialog already use for "reset on reopen".
  const prevOpenRef = useRef(false)
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open
    if (open) setSelected(bus.driver_id ?? UNASSIGNED)
  }

  const assignMutation = useMutation({
    mutationFn: async (driverId: string | null) => {
      if (bus.driver_id && bus.driver_id !== driverId) {
        await updateDriver(bus.driver_id, { assigned_bus_id: null })
      }
      if (driverId) {
        await updateDriver(driverId, { assigned_bus_id: bus.id })
      }
    },
    onSuccess: () => {
      // Broad prefixes so both the list pages (['buses'], ['drivers']) and
      // the single-record detail pages (['bus', id], ['driver', id]) refetch.
      queryClient.invalidateQueries({ queryKey: ['buses'] })
      queryClient.invalidateQueries({ queryKey: ['bus'] })
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['driver'] })
      onOpenChange(false)
    },
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const selectedDriver = drivers.find((d) => d.id === selected)
  const replacingCurrentDriver = !!bus.driver_id && bus.driver_id !== selected
  const stealingFromAnotherBus = !!selectedDriver?.assigned_bus_id && selectedDriver.assigned_bus_id !== bus.id

  function handleSave() {
    const driverId = selected === UNASSIGNED ? null : selected

    const warnings: string[] = []
    if (replacingCurrentDriver && driverId) {
      warnings.push(`${bus.bus_number} is currently assigned to ${bus.driver_name}. This will reassign it to ${selectedDriver?.name}.`)
    } else if (replacingCurrentDriver && !driverId) {
      warnings.push(`This will unassign ${bus.driver_name} from ${bus.bus_number}.`)
    }
    if (stealingFromAnotherBus) {
      warnings.push(`${selectedDriver?.name} is currently assigned to bus ${selectedDriver?.assigned_bus_number}. This will reassign them to ${bus.bus_number} instead.`)
    }
    if (warnings.length > 0 && !window.confirm(`${warnings.join(' ')} Continue?`)) return

    assignMutation.mutate(driverId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Driver to {bus.bus_number}</DialogTitle>
          <DialogDescription>Choose which driver operates this bus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="assign-driver-select">Driver</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="assign-driver-select">
              <SelectValue placeholder="Select a driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {drivers.filter((d) => d.is_active).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                  {d.assigned_bus_id && d.assigned_bus_id !== bus.id ? ` (currently on ${d.assigned_bus_number})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={assignMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
