import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'

import { GoogleMapsProvider } from './lib/GoogleMapsProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleMapsProvider>
    <I18nProvider>
        <App />
      </I18nProvider>
    </GoogleMapsProvider>
  </StrictMode>,
)
