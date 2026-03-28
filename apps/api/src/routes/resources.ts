import { Hono } from 'hono'
import { db } from '../db/index.js'
import { templates, themes } from '../db/schema.js'

const resourcesRouter = new Hono()

// GET /api/templates — list all templates
resourcesRouter.get('/templates', async (c) => {
  const allTemplates = await db.select().from(templates)
  return c.json({ templates: allTemplates })
})

// GET /api/themes — list all themes
resourcesRouter.get('/themes', async (c) => {
  const allThemes = await db.select().from(themes)
  return c.json({ themes: allThemes })
})

export default resourcesRouter
