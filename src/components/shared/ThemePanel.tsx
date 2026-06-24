import { X, Check, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Theme } from '@/types'

interface ThemePanelProps {
  open: boolean
  onClose: () => void
}

export function ThemePanel({ open, onClose }: ThemePanelProps) {
  const { theme, setTheme, colorMode, toggleColorMode } = useThemeStore()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-[var(--card)] border-l border-[var(--border)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Appearance</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Choose your theme</p>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Theme grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                Color Theme
              </p>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((t) => {
                  const isActive = theme === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as Theme)}
                      className={cn(
                        'relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md focus:outline-none',
                        isActive
                          ? 'border-[var(--primary)] shadow-md'
                          : 'border-[var(--border)] hover:border-[var(--primary)]/40',
                      )}
                    >
                      {/* Active checkmark */}
                      {isActive && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-sm">
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                      )}

                      {/* Color swatches */}
                      <div className="flex gap-1.5 mb-2.5">
                        {t.preview.map((color, i) => (
                          <div
                            key={i}
                            className="h-5 rounded-md flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">
                        {t.label}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">
                        {t.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dark/Light toggle */}
            <div className="border-t border-[var(--border)] px-5 py-4">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                Color Mode
              </p>
              <button
                onClick={toggleColorMode}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {colorMode === 'dark' ? (
                    <Moon size={16} className="text-[var(--primary)]" />
                  ) : (
                    <Sun size={16} className="text-[var(--primary)]" />
                  )}
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                {/* Toggle pill */}
                <div
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors duration-200',
                    colorMode === 'dark' ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]',
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                      colorMode === 'dark' ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </div>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default ThemePanel
