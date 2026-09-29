import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AriaRouterProvider } from '@/app/AriaRouterProvider.tsx'
import './index.css'
import App from '@/app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AriaRouterProvider>
        <App />
      </AriaRouterProvider>
    </BrowserRouter>
  </StrictMode>,
)
