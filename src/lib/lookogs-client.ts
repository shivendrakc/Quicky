
// lookogs-client.ts — for browser/React apps (no backend server needed).
//
// Usage in your app's entry point (e.g. main.tsx):
//   import { initLookogs } from './lib/lookogs-client'
//   initLookogs({ apiKey: 'your-source-key', serviceName: 'quickship-frontend' })
//
// Then anywhere in your app:
//   import { log } from './lib/lookogs-client'
//   log('Stock audit submitted', 'INFO', { auditId, itemCount })

interface LookogsConfig {
  apiKey: string
  baseUrl?: string
  serviceName?: string
}

let config: LookogsConfig | null = null

type Severity = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export function initLookogs(cfg: LookogsConfig) {
  config = {
    baseUrl: 'http://localhost:3000/api/v1/ingest',
    ...cfg,
  }

  // Auto-capture uncaught errors and unhandled promise rejections —
  // you get error logs "for free" without manually wrapping every try/catch.
  window.addEventListener('error', (event) => {
    log(event.message, 'ERROR', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    log('Unhandled promise rejection', 'ERROR', {
      reason: String(event.reason),
    })
  })
}

export async function log(
  message: string,
  severity: Severity = 'INFO',
  attributes: Record<string, unknown> = {}
) {
  if (!config) {
    console.warn('Lookogs client not initialized — call initLookogs() first')
    return
  }

  try {
    await fetch(config.baseUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
      body: JSON.stringify({
        logs: [
          {
            message,
            severity,
            eventTime: new Date().toISOString(),
            service: config.serviceName,
            attributes,
          },
        ],
      }),
    })
  } catch (err) {
    console.error('Failed to send log to Lookogs:', err)
  }
}