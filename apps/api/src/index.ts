import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.js'

const app = new Hono()

app.use('/*', cors({
  origin: env.publicUrl,
  credentials: true,
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

serve({
  fetch: app.fetch,
  port: env.port,
}, () => {
  console.log(`API server running on http://localhost:${env.port}`)
})

export default app
