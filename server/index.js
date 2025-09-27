import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pkg from 'pg'
import fetch from 'node-fetch'
import nodemailer from 'nodemailer'

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
  // Create schema section0 if not exists
  await db.query('CREATE SCHEMA IF NOT EXISTS section0;')
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr07Ausers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr07Bdiagrams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      data JSONB, -- Keep for backward compatibility
      owner_id TEXT
    );
  `)
  
  // New tables for objects and connections
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr07Cdiagram_objects (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      position_x NUMERIC NOT NULL,
      position_y NUMERIC NOT NULL,
      width NUMERIC,
      height NUMERIC,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (diagram_id) REFERENCES section0.cr07Bdiagrams(id) ON DELETE CASCADE
    );
  `)
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr07Ddiagram_connections (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      edge_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      source_handle TEXT,
      target_handle TEXT,
      edge_type TEXT DEFAULT 'dir',
      animated BOOLEAN DEFAULT true,
      data JSONB DEFAULT '{}',
      style JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (diagram_id) REFERENCES section0.cr07Bdiagrams(id) ON DELETE CASCADE
    );
  `)
  
    // Không cần tạo bảng mới vì chúng ta sẽ sử dụng bảng hiện có
  
  // Create indexes
  await db.query('CREATE INDEX IF NOT EXISTS cr07Cdiagram_objects_diagram_id_idx ON section0.cr07Cdiagram_objects(diagram_id)')
  await db.query('CREATE INDEX IF NOT EXISTS cr07Cdiagram_objects_node_id_idx ON section0.cr07Cdiagram_objects(node_id)')
  await db.query('CREATE INDEX IF NOT EXISTS cr07Ddiagram_connections_diagram_id_idx ON section0.cr07Ddiagram_connections(diagram_id)')
  await db.query('CREATE INDEX IF NOT EXISTS cr07Ddiagram_connections_edge_id_idx ON section0.cr07Ddiagram_connections(edge_id)')
  await db.query('CREATE INDEX IF NOT EXISTS cr07Ddiagram_connections_source_target_idx ON section0.cr07Ddiagram_connections(source_node_id, target_node_id)')
  
  // Unique constraints
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS cr07Cdiagram_objects_unique_node_per_diagram ON section0.cr07Cdiagram_objects(diagram_id, node_id)')
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS cr07Ddiagram_connections_unique_edge_per_diagram ON section0.cr07Ddiagram_connections(diagram_id, edge_id)')
  
  // In case the table existed before owner_id field was introduced
  await db.query('ALTER TABLE section0.cr07Bdiagrams ADD COLUMN IF NOT EXISTS owner_id TEXT')
  await db.query('CREATE INDEX IF NOT EXISTS cr07Bdiagrams_owner_id_idx ON section0.cr07Bdiagrams(owner_id)')
  
  // Create notification table for in-app notifications
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr01notification (
      id SERIAL PRIMARY KEY,
      isread BOOLEAN DEFAULT FALSE,
      sender TEXT,
      receiver TEXT,
      isaction BOOLEAN DEFAULT FALSE,
      relatedid TEXT,
      datatable TEXT,
      active INTEGER DEFAULT 1,
      createdate TIMESTAMPTZ DEFAULT now(),
      writedate TIMESTAMPTZ DEFAULT now(),
      createuid INTEGER DEFAULT 0,
      writeuid INTEGER DEFAULT 0,
      document TEXT,
      title TEXT,
      details TEXT
    );
  `)
  
  // Create indexes for notifications
  await db.query('CREATE INDEX IF NOT EXISTS cr01notification_receiver_idx ON section0.cr01notification(receiver)')
  await db.query('CREATE INDEX IF NOT EXISTS cr01notification_sender_idx ON section0.cr01notification(sender)')
  await db.query('CREATE INDEX IF NOT EXISTS cr01notification_isread_idx ON section0.cr01notification(isread)')
  
  // Create tables for stateful workflow execution
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr08workflow_instances (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      context JSONB DEFAULT '{}',
      started_by INTEGER,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ,
      error TEXT,
      FOREIGN KEY (diagram_id) REFERENCES section0.cr07Bdiagrams(id) ON DELETE CASCADE
    );
  `)
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr08anode_states (
      id TEXT PRIMARY KEY,
      workflow_instance_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      inputs_required INTEGER DEFAULT 0,
      inputs_received INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (workflow_instance_id) REFERENCES section0.cr08workflow_instances(id) ON DELETE CASCADE,
      CONSTRAINT node_instance_unique UNIQUE (workflow_instance_id, node_id)
    );
  `)
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr08bnode_inputs (
      id TEXT PRIMARY KEY,
      node_state_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      input_data JSONB DEFAULT '{}',
      evaluation_result BOOLEAN,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (node_state_id) REFERENCES section0.cr08anode_states(id) ON DELETE CASCADE
    );
  `)
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS section0.cr08cnode_approvals (
      id TEXT PRIMARY KEY,
      node_state_id TEXT NOT NULL,
      user_id INT4 NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (node_state_id) REFERENCES section0.cr08anode_states(id) ON DELETE CASCADE,
      CONSTRAINT user_approval_unique UNIQUE (node_state_id, user_id)
    );
  `)
  
  // Create indexes for workflow tables
  await db.query('CREATE INDEX IF NOT EXISTS workflow_instances_diagram_id_idx ON section0.cr08workflow_instances(diagram_id)')
  await db.query('CREATE INDEX IF NOT EXISTS workflow_instances_status_idx ON section0.cr08workflow_instances(status)')
  await db.query('CREATE INDEX IF NOT EXISTS node_states_workflow_instance_id_idx ON section0.cr08anode_states(workflow_instance_id)')
  await db.query('CREATE INDEX IF NOT EXISTS node_states_status_idx ON section0.cr08anode_states(status)')
  await db.query('CREATE INDEX IF NOT EXISTS node_inputs_node_state_id_idx ON section0.cr08bnode_inputs(node_state_id)')
  await db.query('CREATE INDEX IF NOT EXISTS node_approvals_node_state_id_idx ON section0.cr08cnode_approvals(node_state_id)')
  await db.query('CREATE INDEX IF NOT EXISTS node_approvals_user_id_idx ON section0.cr08cnode_approvals(user_id)')
  
  // Auto-migrate existing data from JSON format to separate tables
  await migrateLegacyData()
}

// Helper function to migrate existing data from diagrams.data to separate tables
async function migrateLegacyData() {
  try {
    console.log('🔄 Checking for legacy data migration...')
    
    // Check if there are diagrams with data but no corresponding objects/connections
    const legacyDiagrams = await db.query(`
      SELECT d.id, d.data 
      FROM section0.cr07Bdiagrams d 
      WHERE d.data IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM section0.cr07Cdiagram_objects WHERE diagram_id = d.id)
    `)
    
    if (legacyDiagrams.rowCount === 0) {
      console.log('✅ No legacy data to migrate')
      return
    }
    
    console.log(`📦 Found ${legacyDiagrams.rowCount} diagrams to migrate`)
    
    for (const diagram of legacyDiagrams.rows) {
      await migrateSingleDiagram(diagram.id, diagram.data)
    }
    
    console.log('✅ Legacy data migration completed')
  } catch (error) {
    console.error('❌ Error during legacy data migration:', error)
    // Don't throw - let the app continue to work
  }
}

// Migrate a single diagram's data to separate tables
async function migrateSingleDiagram(diagramId, data) {
  if (!data || typeof data !== 'object') return
  
  // Clear any existing records (in case of re-migration)
  await db.query('DELETE FROM section0.cr07Cdiagram_objects WHERE diagram_id = $1', [diagramId])
  await db.query('DELETE FROM section0.cr07Ddiagram_connections WHERE diagram_id = $1', [diagramId])
  
  // Migrate nodes to diagram_objects
  if (data.nodes && Array.isArray(data.nodes)) {
    for (const node of data.nodes) {
      const objId = genId('obj')
      await db.query(`
        INSERT INTO section0.cr07Cdiagram_objects (
          id, diagram_id, node_id, node_type, 
          position_x, position_y, width, height, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        objId,
        diagramId,
        node.id,
        node.type,
        node.position?.x || 0,
        node.position?.y || 0,
        node.width || null,
        node.height || null,
        JSON.stringify(node.data || {})
      ])
    }
  }
  
  // Migrate edges to diagram_connections
  if (data.edges && Array.isArray(data.edges)) {
    for (const edge of data.edges) {
      const connId = genId('conn')
      await db.query(`
        INSERT INTO section0.cr07Ddiagram_connections (
          id, diagram_id, edge_id, source_node_id, target_node_id,
          source_handle, target_handle, edge_type, animated, data, style
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        connId,
        diagramId,
        edge.id,
        edge.source,
        edge.target,
        edge.sourceHandle || null,
        edge.targetHandle || null,
        edge.type || 'dir',
        edge.animated !== false,
        JSON.stringify(edge.data || {}),
        JSON.stringify(edge.style || {})
      ])
    }
  }
  
  console.log(`📝 Migrated diagram ${diagramId}`)
}

// Helper function to save diagram data to both formats (for compatibility)
async function saveDiagramData(diagramId, data, ownerId) {
  // Verify ownership
  const diagramCheck = await db.query('SELECT id FROM section0.cr07Bdiagrams WHERE id = $1 AND owner_id = $2', [diagramId, ownerId])
  if (diagramCheck.rowCount === 0) {
    throw new Error('Diagram not found or access denied')
  }
  
  // Clear existing objects and connections
  await db.query('DELETE FROM section0.cr07Cdiagram_objects WHERE diagram_id = $1', [diagramId])
  await db.query('DELETE FROM section0.cr07Ddiagram_connections WHERE diagram_id = $1', [diagramId])
  
  // Save to separate tables
  await migrateSingleDiagram(diagramId, data)
  
  // Update the data field for backward compatibility
  await db.query('UPDATE section0.cr07Bdiagrams SET data = $1, updated_at = now() WHERE id = $2', [JSON.stringify(data), diagramId])
}

// Helper function to load diagram with objects and connections
async function loadDiagramWithRelations(diagramId, ownerId) {
  // Get diagram metadata
  const diagramResult = await db.query(
    'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt", data FROM section0.cr07Bdiagrams WHERE id = $1 AND owner_id = $2',
    [diagramId, ownerId]
  )
  
  if (diagramResult.rowCount === 0) {
    return null
  }
  
  const diagram = diagramResult.rows[0]
  
  // Get objects
  const objectsResult = await db.query(`
    SELECT id, node_id, node_type, position_x, position_y, width, height, data, created_at, updated_at 
    FROM section0.cr07Cdiagram_objects WHERE diagram_id = $1 ORDER BY created_at
  `, [diagramId])
  
  // Get connections
  const connectionsResult = await db.query(`
    SELECT id, edge_id, source_node_id, target_node_id, source_handle, target_handle, 
           edge_type, animated, data, style, created_at, updated_at
    FROM section0.cr07Ddiagram_connections WHERE diagram_id = $1 ORDER BY created_at
  `, [diagramId])
  
  // Format objects
  const objects = objectsResult.rows.map(row => ({
    id: row.id,
    diagramId,
    nodeId: row.node_id,
    nodeType: row.node_type,
    positionX: parseFloat(row.position_x),
    positionY: parseFloat(row.position_y),
    width: row.width ? parseFloat(row.width) : undefined,
    height: row.height ? parseFloat(row.height) : undefined,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
  
  // Format connections
  const connections = connectionsResult.rows.map(row => ({
    id: row.id,
    diagramId,
    edgeId: row.edge_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    sourceHandle: row.source_handle,
    targetHandle: row.target_handle,
    edgeType: row.edge_type,
    animated: row.animated,
    data: row.data,
    style: row.style,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
  
  // Convert to React Flow format for backward compatibility
  const nodes = objects.map(obj => ({
    id: obj.nodeId,
    type: obj.nodeType,
    position: { x: obj.positionX, y: obj.positionY },
    data: obj.data,
    width: obj.width,
    height: obj.height
  }))
  
  const edges = connections.map(conn => ({
    id: conn.edgeId,
    source: conn.sourceNodeId,
    target: conn.targetNodeId,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    type: conn.edgeType,
    animated: conn.animated,
    data: conn.data,
    style: conn.style
  }))
  
  return {
    ...diagram,
    objects,
    connections,
    data: { nodes, edges } // For backward compatibility
  }
}

const genId = (p = 'd') => `${p}_${Date.now()}_${Math.round(Math.random() * 1e6)}`

// Helper function for sending email via SMTP
async function sendEmailSmtp(to, subject, body) {
  try {
    // Check if SMTP configuration exists
    const smtpHost = process.env.SMTPHOST;
    const smtpPort = process.env.SMTPPORT;
    const smtpUser = process.env.SMTPUSER;
    const smtpPassword = process.env.SMTPPASSWORD;
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error('SMTP configuration missing');
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"Workflow Notification" <${smtpUser}>`,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    
    console.log('Email sent via SMTP:', { messageId: info.messageId, recipient: to });
    return true;
  } catch (error) {
    console.error('SMTP Email error:', error);
    return false;
  }
}

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
    const r = await db.query('SELECT id, email, name, password_hash FROM section0.cr07Ausers WHERE email=$1', [normEmail])
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
    const r = await db.query('SELECT id, email, name FROM section0.cr07Ausers WHERE id=$1', [uid])
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
      'SELECT id, name, created_at as "createdAt", updated_at as "updatedAt" FROM section0.cr07Bdiagrams WHERE owner_id=$1 ORDER BY updated_at DESC',
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
    const diagramWithRelations = await loadDiagramWithRelations(id, req.userId)
    
    if (!diagramWithRelations) {
      return res.status(404).json({ error: 'Not found' })
    }
    
    res.json(diagramWithRelations)
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
    
    // Create main diagram record
    const r = await db.query(
      'INSERT INTO section0.cr07Bdiagrams (id, name, data, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
      [id, name, data, req.userId]
    )
    
    // Save to new format tables as well
    await saveDiagramData(id, data, req.userId)
    
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
        'UPDATE section0.cr07Bdiagrams SET name=$2, data=$3, updated_at=now() WHERE id=$1 AND owner_id=$4 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name), data, req.userId]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      
      // Update the objects and connections tables
      await saveDiagramData(id, data, req.userId)
      
      return res.json(r.rows[0])
    }
    if (name !== undefined) {
      const r = await db.query(
        'UPDATE section0.cr07Bdiagrams SET name=$2, updated_at=now() WHERE id=$1 AND owner_id=$3 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, String(name), req.userId]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (data !== undefined) {
      const r = await db.query(
        'UPDATE section0.cr07Bdiagrams SET data=$2, updated_at=now() WHERE id=$1 AND owner_id=$3 RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt"',
        [id, data, req.userId]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
      
      // Update the objects and connections tables
      await saveDiagramData(id, data, req.userId)
      
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
    const r = await db.query('DELETE FROM section0.cr07Bdiagrams WHERE id=$1 AND owner_id=$2', [id, req.userId])
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    // Objects and connections will be deleted automatically via CASCADE
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete diagram' })
  }
})

// New API endpoints for managing objects and connections separately

// Get objects for a diagram
app.get('/api/diagrams/:id/objects', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    
    // Verify diagram ownership
    const diagramCheck = await db.query('SELECT id FROM section0.cr07Bdiagrams WHERE id=$1 AND owner_id=$2', [id, req.userId])
    if (diagramCheck.rowCount === 0) return res.status(404).json({ error: 'Diagram not found' })
    
    const r = await db.query(
      'SELECT id, node_id, node_type, position_x, position_y, width, height, data, created_at, updated_at FROM section0.cr07Cdiagram_objects WHERE diagram_id=$1 ORDER BY created_at',
      [id]
    )
    
    const objects = r.rows.map(row => ({
      id: row.id,
      diagramId: id,
      nodeId: row.node_id,
      nodeType: row.node_type,
      positionX: parseFloat(row.position_x),
      positionY: parseFloat(row.position_y),
      width: row.width ? parseFloat(row.width) : undefined,
      height: row.height ? parseFloat(row.height) : undefined,
      data: row.data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    
    res.json(objects)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to get objects' })
  }
})

// Get connections for a diagram
app.get('/api/diagrams/:id/connections', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    
    // Verify diagram ownership
    const diagramCheck = await db.query('SELECT id FROM section0.cr07Bdiagrams WHERE id=$1 AND owner_id=$2', [id, req.userId])
    if (diagramCheck.rowCount === 0) return res.status(404).json({ error: 'Diagram not found' })
    
    const r = await db.query(
      'SELECT id, edge_id, source_node_id, target_node_id, source_handle, target_handle, edge_type, animated, data, style, created_at, updated_at FROM section0.cr07Ddiagram_connections WHERE diagram_id=$1 ORDER BY created_at',
      [id]
    )
    
    const connections = r.rows.map(row => ({
      id: row.id,
      diagramId: id,
      edgeId: row.edge_id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      sourceHandle: row.source_handle,
      targetHandle: row.target_handle,
      edgeType: row.edge_type,
      animated: row.animated,
      data: row.data,
      style: row.style,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    
    res.json(connections)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to get connections' })
  }
})

// Create a new object
app.post('/api/diagrams/:id/objects', authRequired, async (req, res) => {
  try {
    const { id: diagramId } = req.params
    const { nodeId, nodeType, positionX, positionY, width, height, data } = req.body
    
    // Verify diagram ownership
    const diagramCheck = await db.query('SELECT id FROM section0.cr07Bdiagrams WHERE id=$1 AND owner_id=$2', [diagramId, req.userId])
    if (diagramCheck.rowCount === 0) return res.status(404).json({ error: 'Diagram not found' })
    
    const objId = genId('obj')
    const r = await db.query(`
      INSERT INTO section0.cr07Cdiagram_objects (id, diagram_id, node_id, node_type, position_x, position_y, width, height, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, node_id, node_type, position_x, position_y, width, height, data, created_at, updated_at
    `, [objId, diagramId, nodeId, nodeType, positionX, positionY, width || null, height || null, JSON.stringify(data || {})])
    
    const obj = r.rows[0]
    res.status(201).json({
      id: obj.id,
      diagramId,
      nodeId: obj.node_id,
      nodeType: obj.node_type,
      positionX: parseFloat(obj.position_x),
      positionY: parseFloat(obj.position_y),
      width: obj.width ? parseFloat(obj.width) : undefined,
      height: obj.height ? parseFloat(obj.height) : undefined,
      data: obj.data,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create object' })
  }
})

// Create a new connection
app.post('/api/diagrams/:id/connections', authRequired, async (req, res) => {
  try {
    const { id: diagramId } = req.params
    const { edgeId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, edgeType, animated, data, style } = req.body
    
    // Verify diagram ownership
    const diagramCheck = await db.query('SELECT id FROM section0.cr07Bdiagrams WHERE id=$1 AND owner_id=$2', [diagramId, req.userId])
    if (diagramCheck.rowCount === 0) return res.status(404).json({ error: 'Diagram not found' })
    
    const connId = genId('conn')
    const r = await db.query(`
      INSERT INTO section0.cr07Ddiagram_connections (id, diagram_id, edge_id, source_node_id, target_node_id, source_handle, target_handle, edge_type, animated, data, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, edge_id, source_node_id, target_node_id, source_handle, target_handle, edge_type, animated, data, style, created_at, updated_at
    `, [connId, diagramId, edgeId, sourceNodeId, targetNodeId, sourceHandle || null, targetHandle || null, edgeType || 'dir', animated !== false, JSON.stringify(data || {}), JSON.stringify(style || {})])
    
    const conn = r.rows[0]
    res.status(201).json({
      id: conn.id,
      diagramId,
      edgeId: conn.edge_id,
      sourceNodeId: conn.source_node_id,
      targetNodeId: conn.target_node_id,
      sourceHandle: conn.source_handle,
      targetHandle: conn.target_handle,
      edgeType: conn.edge_type,
      animated: conn.animated,
      data: conn.data,
      style: conn.style,
      createdAt: conn.created_at,
      updatedAt: conn.updated_at
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create connection' })
  }
})

// API endpoint for workflow trigger processing
app.post('/api/trigger', async (req, res) => {
  try {
    const { eventName, mappingId, userId, data = {} } = req.body || {};
    
    if (!eventName || !mappingId) {
      return res.status(400).json({ error: 'Missing required parameters: eventName and mappingId are required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required to check human node permissions' });
    }

    console.log('Processing trigger with:', { eventName, mappingId, userId });
    
    // Chuyển đổi mappingId thành số nếu là chuỗi số
    const mappingIdValue = !isNaN(mappingId) ? Number(mappingId) : mappingId;
    
    // Find trigger nodes that match the event and mappingId - limit 1
    const triggerNodesResult = await db.query(`
      SELECT 
        node_id,
        data
      FROM section0.cr07Cdiagram_objects 
      WHERE node_type = 'trigger' AND 
        data->'triggerEvents' @> $1::jsonb AND
        data->'mappingIds' @> $2::jsonb
      LIMIT 1
    `, [JSON.stringify([eventName]), JSON.stringify([mappingIdValue])]);
    
    console.log('Found trigger nodes:', triggerNodesResult.rows.length);
    
    if (triggerNodesResult.rowCount === 0) {
      return res.json({ 
        message: 'No matching trigger nodes found', 
        humanNodes: [],
        nextNodes: [],
        searchParams: { eventName, mappingId: mappingIdValue }
      });
    }
    
    // Get the trigger node ID (limit 1)
    const triggerNodeId = triggerNodesResult.rows[0].node_id;
    const triggerNodeData = triggerNodesResult.rows[0].data;
    
    // Lấy tất cả các connections từ trigger node (chỉ lấy connections mà source là trigger node)
    const connectionsResult = await db.query(`
      SELECT
        c.id,
        c.edge_id as "edgeId",
        c.source_node_id as "sourceNodeId",
        c.target_node_id as "targetNodeId",
        c.source_handle as "sourceHandle",
        c.target_handle as "targetHandle",
        c.edge_type as "edgeType",
        c.animated,
        c.data as "connectionData",
        c.style,
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        d.id as "diagramId",
        d.name as "diagramName"
      FROM section0.cr07Ddiagram_connections c
      JOIN section0.cr07Bdiagrams d ON c.diagram_id = d.id
      WHERE c.source_node_id = $1
    `, [triggerNodeId]);
    
    const connections = connectionsResult.rows;

    // Lấy các node mà trigger node là target của chúng (source nodes)
    const incomingConnectionsResult = await db.query(`
      SELECT
        c.id,
        c.edge_id as "edgeId",
        c.source_node_id as "sourceNodeId", 
        c.target_node_id as "targetNodeId"
      FROM section0.cr07Ddiagram_connections c
      WHERE c.target_node_id = $1
    `, [triggerNodeId]);
    
    const sourceNodeIds = new Set();
    incomingConnectionsResult.rows.forEach(conn => {
      sourceNodeIds.add(conn.sourceNodeId);
    });

    // Lấy thông tin chi tiết về source nodes (nodes gửi đến trigger)
    const sourceNodeIdsArray = Array.from(sourceNodeIds);
    const sourceNodesResult = await db.query(`
      SELECT
        id,
        node_id as "nodeId",
        node_type as "nodeType",
        position_x as "positionX",
        position_y as "positionY",
        width,
        height,
        data,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM section0.cr07Cdiagram_objects
      WHERE node_id = ANY($1)
    `, [sourceNodeIdsArray]);
    
    // Lấy các human nodes từ source nodes (các node human là source của trigger node)
    const humanNodes = sourceNodesResult.rows
      .filter(node => node.nodeType === 'human')
      .map(node => ({
        ...node,
        positionX: parseFloat(node.positionX),
        positionY: parseFloat(node.positionY),
        width: node.width ? parseFloat(node.width) : undefined,
        height: node.height ? parseFloat(node.height) : undefined
      }));
    
    // Nếu có human nodes, kiểm tra quyền truy cập dựa trên thông tin người dùng
    let userName = "Người dùng hệ thống";
    if (humanNodes.length > 0 && userId != 0) {
      // Lấy thông tin người dùng từ database
      const userResult = await db.query(`
        SELECT 
          manhanvien, 
          recordidchucdanh,
          hoten
        FROM section9nhansu.ns01taikhoannguoidung
        WHERE id = $1
      `, [userId]).catch(() => ({ rows: [] }));

      if (userResult.rowCount === 0) {
        return res.status(403).json({ 
          error: 'User information not found',
          humanNodes
        });
      }

      const userInfo = userResult.rows[0];
      const manhanvien = userInfo.manhanvien;
      const recordidchucdanh = userInfo.recordidchucdanh;
      
      console.log('User info:', { manhanvien, recordidchucdanh });

      // Kiểm tra xem người dùng có quyền với bất kỳ human node nào không
      const hasPermission = humanNodes.some(node => {
        // Kiểm tra quyền dựa trên ID nhân viên (humanIds) - ưu tiên sử dụng nếu có
        if (node.data && Array.isArray(node.data.humanIds)) {
          if (node.data.humanIds.includes(userId)) {
            return true;
          }
        }
        
        // Fallback: Kiểm tra quyền dựa trên mã nhân viên (humanPersonsPersonal)
        if (node.data && Array.isArray(node.data.humanPersonsPersonal)) {
          if (node.data.humanPersonsPersonal.includes(manhanvien)) {
            return true;
          }
        }
        
        // Kiểm tra quyền dựa trên vai trò (humanRoleIds)
        if (node.data && Array.isArray(node.data.humanRoleIds) && recordidchucdanh) {
          if (node.data.humanRoleIds.includes(recordidchucdanh) || 
              node.data.humanRoleIds.includes(Number(recordidchucdanh))) {
            return true;
          }
        }
        
        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Unauthorized: User does not have permission for any human node',
          userInfo: { manhanvien, recordidchucdanh },
          humanNodes
        });
      }
      
      // Lấy tên người dùng từ thông tin
      userName = userInfo.hoten || userName;
    }
    
    // Lấy thông tin sự kiện từ bảng cr07etriggerevent
    const eventInfoResult = await db.query(`
      SELECT name 
      FROM section0.cr07etriggerevent 
      WHERE code = $1
    `, [eventName]).catch(() => ({ rows: [] }));
    
    const eventDisplayName = eventInfoResult.rowCount > 0 ? eventInfoResult.rows[0].name : eventName;
    
    // Thiết lập needAction dựa vào eventName
    const needAction = eventName === 'sendapprove';
    
    // Lấy thông tin module từ bảng cr04viewmodelmapping
    const moduleInfoResult = await db.query(`
      SELECT displayname, modelname
      FROM section0.cr04viewmodelmapping 
      WHERE id = $1
    `, [mappingId]).catch(() => ({ rows: [] }));
    
    const modelName = moduleInfoResult.rowCount > 0 ? moduleInfoResult.rows[0].displayname : '';
    const rawModelName = moduleInfoResult.rowCount > 0 ? moduleInfoResult.rows[0].modelname : '';

    const tableName = rawModelName
      ? rawModelName.split('.').pop().toLowerCase()
      : '';
    // Xác định objectDisplayName từ dữ liệu
    let objectDisplayName = '';
    if (data) {
      if (data.Code && data.Name) {
        objectDisplayName = `[${data.Code}] ${data.Name}`;
      } else if (data.Name) {
        objectDisplayName = data.Name;
      } else if (data.Code) {
        objectDisplayName = data.Code;
      } else if (data.Id) {
        objectDisplayName = data.Id;
      }
    }
    
    // Chuẩn bị dữ liệu cho message
    const enrichedData = {
      ...data,
      eventName: eventDisplayName,
      modelName,
      objectDisplayName,
      datatable: tableName,
    };
    
    // Người dùng có quyền hoặc không có human nodes, tiếp tục lấy next nodes
    const nextNodeIds = new Set();
    connections.forEach(conn => {
      nextNodeIds.add(conn.targetNodeId);
    });
    
    // Lấy thông tin chi tiết về next nodes (nodes nhận từ trigger)
    const nextNodeIdsArray = [...nextNodeIds];
    const nextNodesResult = await db.query(`
      SELECT
        id,
        node_id as "nodeId",
        node_type as "nodeType",
        position_x as "positionX",
        position_y as "positionY",
        width,
        height,
        data,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM section0.cr07Cdiagram_objects
      WHERE node_id = ANY($1)
    `, [nextNodeIdsArray]);

    // Format next nodes
    const nextNodes = nextNodesResult.rows.map(node => ({
      ...node,
      positionX: parseFloat(node.positionX),
      positionY: parseFloat(node.positionY),
      width: node.width ? parseFloat(node.width) : undefined,
      height: node.height ? parseFloat(node.height) : undefined
    }));
    
    // Format humanNodes theo yêu cầu
    const formattedHumanNodes = humanNodes.map(node => {
      return {
        id: node.nodeId,
        label: node.data?.label || 'Human',
        empIds: node.data?.humanPersonsPersonal || [],
        roleIds: node.data?.humanRoleIds || []
      };
    });
    
    // Tìm các node Send từ nextNodes
    const sendNodes = nextNodes.filter(node => node.nodeType === 'send');
    console.log(`Found ${sendNodes.length} send nodes to process`);
    
    // Chuẩn bị kết quả response ngay để trả về cho client
    const responseData = {
      triggered: {
        eventName,
        mappingId: mappingIdValue,
        userId,
        timestamp: new Date().toISOString(),
        data: enrichedData
      },
      triggerNode: {
        nodeId: triggerNodeId,
        data: triggerNodeData
      },
      connections: connections,
      humanNodes: formattedHumanNodes,
      nextNodes: nextNodes,
      messages: {
        status: 'processing',
        sendNodesCount: sendNodes.length
      }
    };

    // Trả kết quả ngay cho client
    res.json(responseData);
    console.log("Trigger processed successfully, messages being sent asynchronously");
    
    // Xử lý gửi message trong background sau khi đã trả response
    // Tách thành một Promise riêng để không chặn main thread
    (async () => {
      try {
        // Gọi API message cho từng node send
        const messagePromises = sendNodes.map(sendNode => {
          const messageBody = {
            senderId: userId,
            senderName: userName,
            sendId: sendNode.id,
            needAction,
            data: enrichedData
          };
          
          // Thực hiện HTTP POST request đến API message endpoint
          return fetch(`${req.protocol}://${req.get('host')}/api/message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody)
          }).then(response => response.json())
            .catch(err => {
              console.error(`Error calling message API for send node ${sendNode.id}:`, err);
              return { error: err.message, sendNodeId: sendNode.id };
            });
        });
        
        // Xử lý các API calls trong background
        const messageResults = await Promise.all(messagePromises);
        console.log("Background message API call results:", messageResults);
      } catch (error) {
        console.error("Error in background message processing:", error);
      }
    })();
    
    // Function đã trả về response rồi, phần code phía sau sẽ chạy bất đồng bộ
  } catch (e) {
    console.error('Error processing trigger:', e);
    res.status(500).json({ error: 'Failed to process trigger', details: e.message });
  }
});

// Helper function to process messages by type
async function processMessageByType(sendType, senderId, senderName, needAction, data, receiversIds, receiversData) {
  let messages = [];
  
  // Process in-app notifications
  if (sendType === 'inapp') {
    for (const receiverId of receiversIds) {
      if (!receiverId) continue;
      
      // Prepare notification details
      const title = data.eventName ? `Thông báo ${data.eventName}` : 'Thông báo mới';
      const details = `Người gửi: ${senderName}\n${data.eventName || ''} ${data.modelName || ''}: ${data.objectDisplayName || ''}`;
      
      const message = `${title}\n${details}`;
      messages.push(message);
      
      // Insert notification into database
      await db.query(`
        INSERT INTO section0.cr01notification (
          isread, sender, receiver, isaction, relatedid, datatable,
          active, createdate, writedate, createuid, writeuid, document, title, details
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, now(), now(), $8, $9, $10, $11, $12
        )
      `, [
        false, // isread
        senderId, // sender
        receiverId, // receiver
        needAction === true, // isaction
        data.Id || null, // relatedid
        data.datatable || null, // datatable
        1, // active
        0, // createuid
        0, // writeuid
        data.document || null, // document
        title, // title
        details // details
      ]);
      
      console.log('In-app notification created:', { receiver: receiverId, title });
    }
  } 
  // Process email notifications (non-blocking, best effort)
  else if (sendType === 'email') {
    // Get email configuration from environment variables
    const mailApiUrl = process.env.MAILURL;
    const mailApiKey = process.env.MAILAPIKEY;
    
    if (!mailApiUrl || !mailApiKey) {
      console.error('Email configuration missing: MAILURL or MAILAPIKEY not defined in environment');
      const message = 'Email notification failed: configuration missing';
      messages.push(message);
      return messages;
    }
    
    // Prepare email content
    const subject = data.eventName ? `Thông báo ${data.eventName}` : 'Thông báo mới';
    const body = `Người gửi: ${senderName}\n${data.eventName || ''} ${data.modelName || ''}: ${data.objectDisplayName || ''}`;
    
    // Track how many email sending tasks we've started
    let emailTasksStarted = 0;
    
    // Process each receiver that has an email address (best effort, non-blocking)
    for (const receiver of receiversData) {
      if (!receiver || !receiver.email) continue;
      
      // Prepare payload for email API
      const payload = {
        to: receiver.email,
        subject: subject,
        body: body,
        html_body: body.replace(/\n/g, '<br>') // Convert line breaks to HTML
      };
      
      // Configure request options
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': mailApiKey
        },
        body: JSON.stringify(payload)
      };
      
      console.log('Email API request scheduled:', {
        url: mailApiUrl,
        recipient: receiver.email,
        subject: subject
      });
      
      // Increment the counter for scheduled email tasks
      emailTasksStarted++;
      
      // Send email via API with SMTP fallback (non-blocking, best effort)
      fetch(mailApiUrl, options)
        .then(response => {
          return response.text().then(text => ({ status: response.status, text }));
        })
        .then(({ status, text }) => {
          console.log('Email API response:', { recipient: receiver.email, status, text });
          if (status !== 200 && status !== 201) {
            console.error(`Email API error for ${receiver.email}: ${status} - ${text}`);
            // API failed, attempt SMTP fallback
            console.log(`Attempting SMTP fallback for ${receiver.email}`);
            return sendEmailSmtp(receiver.email, subject, body);
          }
          return true;
        })
        .catch(error => {
          console.error(`Failed to send email to ${receiver.email} via API:`, error);
          // API request failed, attempt SMTP fallback
          console.log(`Attempting SMTP fallback for ${receiver.email} after API failure`);
          return sendEmailSmtp(receiver.email, subject, body);
        })
        .catch(error => {
          // Both API and SMTP failed
          console.error(`All email sending methods failed for ${receiver.email}:`, error);
        });
    }
    
    // Add a summary message about the emails being sent in the background
    const message = `Sending ${emailTasksStarted} emails in the background`;
    messages.push(message);
  } 
  // Other types (placeholder)
  else {
    const message = `Message type ${sendType} not implemented yet`;
    messages.push(message);
    console.log(`Message type ${sendType} not implemented`);
  }
  
  return messages;
}

// API endpoint for sending messages
app.post('/api/message', async (req, res) => {
  try {
    const { senderId, senderName, sendId, needAction, data } = req.body;
    
    if (!senderId || !senderName || !sendId) {
      return res.status(400).json({ error: 'Missing required fields: senderId, senderName, and sendId are required' });
    }
    
    // Get send node information (to find send types)
    const sendNodeResult = await db.query(`
      SELECT node_id, data 
      FROM section0.cr07Cdiagram_objects 
      WHERE id = $1
    `, [sendId]);
    
    if (sendNodeResult.rowCount === 0) {
      return res.status(404).json({ error: 'Send node not found' });
    }
    
    const sendNode = sendNodeResult.rows[0];
    const sendNodeId = sendNode.node_id;
    const sendKinds = sendNode.data?.sendKinds || [];
    
    if (!sendKinds.length) {
      return res.status(400).json({ error: 'No send types specified in the send node' });
    }
    
    console.log('Send node found:', { nodeId: sendNodeId, sendKinds });
    
    // Find connections where sendNode is the target (incoming connections)
    const incomingConnectionsResult = await db.query(`
      SELECT source_node_id 
      FROM section0.cr07Ddiagram_connections 
      WHERE target_node_id = $1
    `, [sendNodeId]);
    
    const sourceNodeIds = incomingConnectionsResult.rows.map(row => row.source_node_id);
    
    // Find human nodes among source nodes
    const humanNodesResult = await db.query(`
      SELECT id, node_id, data 
      FROM section0.cr07Cdiagram_objects 
      WHERE node_id = ANY($1) AND node_type = 'human'
    `, [sourceNodeIds]);
    
    // Process human nodes to find receivers
    const humanRoleIds = new Set();
    const humanIds = new Set();
    
    for (const humanNode of humanNodesResult.rows) {
      const humanData = humanNode.data || {};
      
      // Check if the human node specifies roles
      if (humanData.humanType === 'role' && Array.isArray(humanData.humanRoleIds)) {
        humanData.humanRoleIds.forEach(roleId => humanRoleIds.add(roleId));
      } 
      // Otherwise, check for direct user IDs
      else if (Array.isArray(humanData.humanIds)) {
        humanData.humanIds.forEach(userId => humanIds.add(userId));
      }
    }
    
    // Get users by role
    let usersByRole = [];
    if (humanRoleIds.size > 0) {
      const roleIdsArray = Array.from(humanRoleIds);
      const usersByRoleResult = await db.query(`
        SELECT id, email 
        FROM section9nhansu.ns01taikhoannguoidung 
        WHERE recordidchucdanh = ANY($1) AND status = 'Đang làm việc'
      `, [roleIdsArray]).catch(() => ({ rows: [] }));
      
      usersByRole = usersByRoleResult.rows;
    }
    
    // Get users by direct ID
    let usersByDirectId = [];
    if (humanIds.size > 0) {
      const humanIdsArray = Array.from(humanIds);
      const usersByDirectIdResult = await db.query(`
        SELECT id, email 
        FROM section9nhansu.ns01taikhoannguoidung 
        WHERE id = ANY($1) AND status = 'Đang làm việc'
      `, [humanIdsArray]).catch(() => ({ rows: [] }));
      
      usersByDirectId = usersByDirectIdResult.rows;
    }
    
    // Combine users (ensuring unique IDs and including email addresses)
    const uniqueReceivers = new Map();
    
    [...usersByRole, ...usersByDirectId].forEach(user => {
      if (!uniqueReceivers.has(user.id)) {
        uniqueReceivers.set(user.id, user);
      }
    });
    
    // Create two arrays: one for IDs and one for full user objects (with emails)
    const receiversIds = Array.from(uniqueReceivers.keys());
    const receiversData = Array.from(uniqueReceivers.values());
    
    // Process each send type
    const allMessages = [];
    for (const sendType of sendKinds) {
      const messages = await processMessageByType(sendType, senderId, senderName, needAction, data, receiversIds, receiversData);
      allMessages.push(...messages);
    }
    
    res.json({ 
      status: 'success', 
      messages: allMessages,
      receivers: receiversIds.length
    });
    
  } catch (e) {
    console.error('Failed to process message:', e);
    res.status(500).json({ error: 'Failed to process message', details: e.message });
  }
});

// API endpoint to fetch options for DetailBar from existing database tables
app.get('/api/options', async (req, res) => {
  try {
    // PHẦN 1: LẤY DỮ LIỆU CÁC SỰ KIỆN TRIGGER
    const triggerEventOptionsResult = await db.query(`
      SELECT 
        id, 
        code as value,
        name as label,
        icon as icon
      FROM section0.cr07etriggerevent
      ORDER BY name
    `).catch(() => ({ rows: [] }));
    
    // PHẦN 2: LẤY DỮ LIỆU MODULE
    const moduleOptionsResult = await db.query(`
      SELECT 
        id,
        modelname as value,
        displayname as label
      FROM section0.cr04viewmodelmapping 
      ORDER BY displayname
    `).catch(() => ({ rows: [] }));
    
    // PHẦN 3: LẤY LOẠI GỬI TIN NHẮN
    const sendKindOptionsResult = await db.query(`
      SELECT 
        id,
        code as value,
        name as label,
        icon as icon
      FROM section0.cr07fsendtype
      ORDER BY name
    `).catch(() => ({ rows: [] }));
    
    // PHẦN 4: LẤY DANH SÁCH VAI TRÒ
    const humanRolesResult = await db.query(`
      SELECT 
        id,
        ten as value,
        ten as label
      FROM section9nhansu.ns02bchucdanh
      ORDER BY ten
    `).catch(() => ({ rows: [] }));
    
    // PHẦN 5: LẤY DANH SÁCH NGƯỜI DÙNG
    const humanPeopleResult = await db.query(`
      SELECT 
        id,
        manhanvien as value,
        hoten as label
      FROM section9nhansu.ns01taikhoannguoidung
      WHERE status = 'Đang làm việc'
      ORDER BY hoten
    `).catch(() => ({ rows: [] }));
    
    // PHẦN 6: LẤY DANH SÁCH PHÒNG BAN
    const departmentsResult = await db.query(`
      SELECT 
        id,
        ten as value,
        ten as label
      FROM section9nhansu.ns02aphongban
      ORDER BY ten
    `).catch(() => ({ rows: [] }));

    // Các tùy chọn mặc định nếu dữ liệu từ DB trống
    const options = {
      triggerEventOptions: triggerEventOptionsResult.rows.length > 0 
        ? triggerEventOptionsResult.rows 
        : [
            { id: 'default_1', value: 'tạo mới', label: 'Tạo mới', icon: 'PlusCircle' },
            { id: 'default_2', value: 'chỉnh sửa', label: 'Chỉnh sửa', icon: 'Pencil' },
            { id: 'default_3', value: 'xóa', label: 'Xóa', icon: 'Trash2' },
            { id: 'default_4', value: 'lưu trữ', label: 'Lưu trữ', icon: 'Archive' },
            { id: 'default_5', value: 'hủy lưu trữ', label: 'Hủy lưu trữ', icon: 'ArchiveRestore' },
            { id: 'default_6', value: 'phê duyệt', label: 'Phê duyệt', icon: 'CheckCircle2' },
            { id: 'default_7', value: 'từ chối phê duyệt', label: 'Từ chối phê duyệt', icon: 'XCircle' },
          ],
      
      triggerModuleOptions: moduleOptionsResult.rows.length > 0 
        ? moduleOptionsResult.rows.map(row => ({ id: row.id, value: row.value, label: row.label }))
        : [
            { id: 'default_1', value: 'order_mgmt', label: 'Quản lý đơn hàng' },
            { id: 'default_2', value: 'quote_new', label: 'Lên báo giá mới' },
            { id: 'default_3', value: 'quote_list', label: 'Danh sách báo giá' },
            { id: 'default_4', value: 'customer_list', label: 'Danh sách khách hàng' },
            { id: 'default_5', value: 'order_list', label: 'Danh sách đơn hàng' },
          ],
      
      sendKindOptions: sendKindOptionsResult.rows.length > 0 
        ? sendKindOptionsResult.rows 
        : [
            { id: 'default_1', value: 'Email', label: 'Email', icon: 'Mail' },
            { id: 'default_2', value: 'Notification', label: 'Notification in app', icon: 'Bell' },
            { id: 'default_3', value: 'ChatApp', label: 'ChatApp', icon: 'MessageSquareText' },
          ],
      
      humanPersonTypeOptions: [
        { id: 'type_1', value: 'personal', label: 'Cá nhân' },
        { id: 'type_2', value: 'role', label: 'Chức danh' },
      ],
      
      humanPeopleOptions: humanPeopleResult.rows.length > 0 
        ? humanPeopleResult.rows.map(row => ({ id: row.id, value: row.value, label: row.label }))
        : [
            { id: 'default_1', value: 'user1', label: 'Nguyễn Minh Khoa' },
            { id: 'default_2', value: 'user2', label: 'Trần Thị Thu Hà' },
            { id: 'default_3', value: 'user3', label: 'Lê Anh Tuấn' },
          ],
      
      humanRoleOptions: humanRolesResult.rows.length > 0 
        ? humanRolesResult.rows.map(row => ({ id: row.id, value: row.value, label: row.label }))
        : [
            { id: 'default_1', value: 'lead', label: 'Lead' },
            { id: 'default_2', value: 'president', label: 'President' },
            { id: 'default_3', value: 'engineer', label: 'Software Engineer' },
            { id: 'default_4', value: 'pm', label: 'Product Manager' },
          ],
      
      humanDepartmentOptions: departmentsResult.rows.length > 0 
        ? departmentsResult.rows.map(row => ({ id: row.id, value: row.value, label: row.label }))
        : [
            { id: 'default_1', value: 'eng', label: 'Kỹ thuật (Engineering)' },
            { id: 'default_2', value: 'product', label: 'Quản lý Sản phẩm (Product Management)' },
          ],
    };
    
    res.json(options);
  } catch (e) {
    console.error('Failed to fetch options:', e);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});


// Check SMTP configuration at startup
function checkSmtpConfig() {
  const smtpHost = process.env.SMTPHOST;
  const smtpPort = process.env.SMTPPORT;
  const smtpUser = process.env.SMTPUSER;
  const smtpPassword = process.env.SMTPPASSWORD;
  
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    console.warn('⚠️ SMTP configuration is incomplete. Email fallback will not be available.');
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    
    console.log('✅ SMTP configuration validated. Email fallback is available.');
    return true;
  } catch (error) {
    console.error('❌ SMTP configuration error:', error);
    return false;
  }
}

ensureSchema()
  .then(() => {
    // Check SMTP config (but don't block startup if it fails)
    checkSmtpConfig();
    import('./workflow-routes.js').then(module => {
      const setupWorkflowRoutes = module.default || module;
      setupWorkflowRoutes(app, db);
      
      app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
    }).catch(err => {
      console.error('Không thể import workflow-routes:', err);
      app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
    });
  })
  .catch((e) => {
    console.error('Failed to init schema', e);
    process.exit(1);
  })
