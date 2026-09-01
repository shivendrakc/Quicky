import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { initLookogs, log } from './lib/lookogs-client'

initLookogs({
  apiKey: '6ced2a3a7dfdbee5b4de597ee46e305212be55342c1fd2ad544f4be417c096d8',
  serviceName: 'quickship-frontend',
})

log('QuickShip started up', 'INFO', { test: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
