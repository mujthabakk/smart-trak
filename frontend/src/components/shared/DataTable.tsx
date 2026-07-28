import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search, Inbox, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
  accessor?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T
  onRowClick?: (row: T) => void
  searchable?: boolean
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  toolbar?: ReactNode
  className?: string
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  onRowClick,
  searchable = false,
  searchKeys,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or search.',
  toolbar,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let rows = data
    if (searchable && query.trim()) {
      const q = query.toLowerCase()
      const keys = searchKeys ?? (columns.map((c) => c.key) as (keyof T)[])
      rows = rows.filter((row) =>
        keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
      )
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      rows = [...rows].sort((a, b) => {
        const av = col?.accessor ? col.accessor(a) : (a[sortKey as keyof T] as string | number)
        const bv = col?.accessor ? col.accessor(b) : (b[sortKey as keyof T] as string | number)
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return rows
  }, [data, query, searchable, searchKeys, columns, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className={cn('rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden', className)}>
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-[var(--border)]">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClassName}>
                {col.sortable ? (
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition-colors uppercase"
                  >
                    {col.header}
                    <ArrowUpDown size={12} className={cn(sortKey === col.key && 'text-[var(--primary)]')} />
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
                    <Inbox size={26} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{emptyTitle}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xs">{emptyDescription}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paged.map((row, i) => (
              <TableRow
                key={keyField ? String(row[keyField]) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row, i) : String(row[col.key as keyof T] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-4 p-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)]">
            Showing <span className="font-medium text-[var(--foreground)]">{safePage * pageSize + 1}</span>–
            <span className="font-medium text-[var(--foreground)]">{Math.min((safePage + 1) * pageSize, filtered.length)}</span> of{' '}
            <span className="font-medium text-[var(--foreground)]">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-medium text-[var(--foreground)] px-2 tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
