import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { clerkAppearance } from './lib/clerkTheme.js'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to client/.env.local.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
        <App />
        <Toaster position="top-center" reverseOrder={false} />
        <Analytics />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
