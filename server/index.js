import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pkg from 'pg'

const { Pool } = pkg

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      data JSONB NOT NULL,
      owner_id TEXT
    );
  `)
  // In case the table existed before owner_id field was introduced
  await db.query('ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS owner_id TEXT')
  await db.query('CREATE INDEX IF NOT EXISTS diagrams_owner_id_idx ON diagrams(owner_id)')
}

const genId = (p = 'd') => `${p}_${Date.now()}_${Math.round(Math.random() * 1e6)}`

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' })
}

function getUserIdFromReq(req) {
  const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/, '')
  if (!token) return undefined
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded?.uid
  } catch {
    return undefined
  }
}

function authRequired(req, res, next) {
  const uid = getUserIdFromReq(req)
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })
  req.userId = uid
  next()
}

// Auth routes
// Registration disabled by configuration
app.post('/api/auth/register', (_req, res) => {
  return res.status(403).json({ error: 'Registration disabled' })
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const normEmail = String(email).trim().toLowerCase()
    const r = await db.query('SELECT id, email, name, password_hash FROM users WHERE email=$1', [normEmail])
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' })
    const u = r.rows[0]
    const ok = await bcrypt.compare(String(password), u.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = signToken(u.id)
    res.cookie('token', token, cookieOpts)
    res.json({ id: u.id, email: u.email, name: u.name })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to login' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  try {
    res.clearCookie('token', { ...cookieOpts, maxAge: undefined })
  } catch {}
  res.json({ ok: true })
})

app.get('/api/auth/me', async (req, res) => {
  try {
    const uid = getUserIdFromReq(req)
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const r = await db.query('SELECT id, email, name FROM users WHERE id=$1', [uid])
    if (r.rowCount === 0) return res.status(401).json({ error: 'Unauthorized' })
    const u = r.rows[0]
    res.json({ id: u.id, email: u.email, name: u.name })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// List diagrams (no data)
app.get('/api/diagrams', authRequired, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt" FROM diagrams WHERE owner_id=$1 ORDER BY updated_at DESC',
      [req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list diagrams' })
  }
})

// Get single diagram
app.get('/api/diagrams/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const r = await db.query(
      'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt", data FROM diagrams WHERE id=$1 AND owner_id=$2',
      [id, req.userId]
    )
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to get diagram' })
  }
})

// Create diagram
app.post('/api/diagrams', authRequired, async (req, res) => {
  try {
    const id = genId()
    const name = (req.body?.name || 'Sơ đồ mới').toString()
    const data = req.body?.data ?? { nodes: [], edges: [] }
    const r = await db.query(
      'INSERT INTO diagrams (id, name, data, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [id, name, data, req.userId]
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create diagram' })
  }
})

// Update diagram name and/or data
app.put('/api/diagrams/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const { name, data } = req.body || {}
    if (name === undefined && data === undefined) {
      return res.status(400).json({ error: 'Nothing to update' })
    }
    if (name !== undefined && data !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET name=$2, data=$3, updated_at=now() WHERE id=$1 AND owner_id=$4 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name), data, req.userId]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (name !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET name=$2, updated_at=now() WHERE id=$1 AND owner_id=$3 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name), req.userId]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (data !== undefined) {
      const r = await db.query(
        'UPDATE diagrams SET data=$2, updated_at=now() WHERE id=$1 AND owner_id=$3 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, data, req.userId]
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
app.delete('/api/diagrams/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const r = await db.query('DELETE FROM diagrams WHERE id=$1 AND owner_id=$2', [id, req.userId])
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
