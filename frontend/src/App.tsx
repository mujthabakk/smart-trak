import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from '@/router'
import { store } from '@/store'
import { useAppDispatch } from '@/store/hooks'
import { initTheme } from '@/store/slices/themeSlice'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ThemeInitializer() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(initTheme())
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <ThemeInitializer />
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  )
}
