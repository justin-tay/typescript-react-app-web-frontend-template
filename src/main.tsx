import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AriaRouterProvider } from '@/app/AriaRouterProvider.tsx'
import './index.css'
import App from '@/app/App.tsx'
import { APP_NAME } from '@/config'

// index.html has a static title for before scripts load; the configured name wins after.
document.title = APP_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AriaRouterProvider>
        <App />
      </AriaRouterProvider>
    </BrowserRouter>
  </StrictMode>,
)
