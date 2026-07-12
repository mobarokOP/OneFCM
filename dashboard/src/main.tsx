import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import App from './App'
import './index.css'

// Exported so route modules / hooks can prefetch (queryClient.prefetchQuery).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Data is considered fresh for 60s — avoids refetch storms on navigation.
      staleTime: 60_000,
      // Keep unused cache entries for 5 minutes so back-navigation is instant.
      gcTime: 5 * 60_000,
      // Keep previous data while a query key changes (pagination, filters) so
      // list pages don't flash skeletons. For fresh queries prev is undefined,
      // which behaves exactly like no placeholder — detail pages unaffected.
      placeholderData: (prev: unknown) => prev,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </BrowserRouter>
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  </React.StrictMode>,
)
