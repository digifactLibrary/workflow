import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pkg from 'pg'

const { Pool } = pkg

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

const db = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST ?? 'localhost',
        port: Number(process.env.PGPORT ?? 5432),
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD, // no hardcoded default
        database: process.env.PGDATABASE ?? 'postgres',
      }
)

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      data JSONB NOT NULL
    );
  `)
}

const genId = () => `d_${Date.now()}_${Math.round(Math.random() * 1e6)}`

// List diagrams (no data)
app.get('/api/diagrams', async (_req, res) => {
  try {
    const r = await db.query(
      'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt" FROM diagrams ORDER BY updated_at DESC'
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list diagrams' })
  }
})

// Get single diagram
app.get('/api/diagrams/:id', async (req, res) => {
  try {
    const { id } = req.params
    const r = await db.query(
      'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt", data FROM diagrams WHERE id=$1',
      [id]
    )
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to get diagram' })
  }
})

// Create diagram
app.post('/api/diagrams', async (req, res) => {
  try {
    const id = genId()
    const name = (req.body?.name || 'Sơ đồ mới').toString()
    const data = req.body?.data ?? { nodes: [], edges: [] }
    const r = await db.query(
      'INSERT INTO diagrams (id, name, data) VALUES ($1, $2, $3) RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [id, name, data]
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create diagram' })
  }
})

// Update diagram name and/or data
app.put('/api/diagrams/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, data } = req.body || {}
    if (name === undefined && data === undefined) {
      return res.status(400).json({ error: 'Nothing to update' })
    }
    if (name !== undefined && data !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET name=$2, data=$3, updated_at=now() WHERE id=$1 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name), data]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (name !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET name=$2, updated_at=now() WHERE id=$1 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name)]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (data !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET data=$2, updated_at=now() WHERE id=$1 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, data]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update diagram' })
  }
})

// Delete diagram
app.delete('/api/diagrams/:id', async (req, res) => {
  try {
    const { id } = req.params
    const r = await db.query('DELETE FROM diagrams WHERE id=$1', [id])
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete diagram' })
  }
})

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
  })
  .catch((e) => {
    console.error('Failed to init schema', e)
    process.exit(1)
  })
