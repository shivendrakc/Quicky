import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMigrations } from './db/migrate.js'
import { runSeed } from './db/seed.js'
import { categoriesRouter } from './routes/categories.js'
import { ordersRouter } from './routes/orders.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { statusFlagsRouter } from './routes/statusFlags.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

runMigrations()
runSeed()

const app = express()
app.use(express.json())

app.use('/api/categories', categoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/status-flags', statusFlagsRouter)

const clientDist = join(__dirname, '../../client/dist')
const clientIndex = join(clientDist, 'index.html')
app.use(express.static(clientDist))
app.get('/{*splat}', (_req, res) => {
  if (existsSync(clientIndex)) {
    res.sendFile(clientIndex)
  } else {
    res
      .status(200)
      .send('Sales Order Logger API is running. Client is not built yet (dev mode uses the Vite dev server).')
  }
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(PORT, () => {
  console.log(`Sales Order Logger running at http://localhost:${PORT}`)
})
