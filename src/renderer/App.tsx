import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/Layout/AppShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
