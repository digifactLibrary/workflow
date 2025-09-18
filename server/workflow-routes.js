/**
 * API routes for workflow execution
 */

const WorkflowEngine = require('./workflow-engine')

module.exports = function(app, db) {
  const workflowEngine = new WorkflowEngine(db)
  
  /**
   * Trigger a workflow
   * Replaces/enhances the existing /api/trigger endpoint
   */
  app.post('/api/workflow/trigger', async (req, res) => {
    try {
      const { triggerEvent, userId, mappingId, data = {} } = req.body
      
      if (!triggerEvent) {
        return res.status(400).json({ error: 'triggerEvent is required' })
      }
      
      if (!mappingId) {
        return res.status(400).json({ error: 'mappingId is required' })
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Start workflow execution
      const workflowInstanceId = await workflowEngine.executeTriggerNode(
        triggerEvent,
        data,
        userId,
        mappingId
      )
      
      res.json({
        success: true,
        workflowInstanceId
      })
    } catch (error) {
      console.error('Error triggering workflow:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
  
  /**
   * Submit a human approval/rejection
   */
  app.post('/api/workflow/approval', async (req, res) => {
    try {
      const { mappingId, objectId, requesterId, userId, approved, comment } = req.body
      
      if (!objectId) {
        return res.status(400).json({ error: 'objectId is required' })
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Process the approval
      await workflowEngine.processHumanApproval(
        nodeStateId, 
        userId, 
        !!approved, 
        comment
      )
      
      res.json({ success: true })
    } catch (error) {
      console.error('Error processing approval:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
  
  /**
   * Get workflow instances for a diagram
   */
  app.get('/api/workflow/instances/:diagramId', async (req, res) => {
    try {
      const { diagramId } = req.params
      const { status } = req.query
      
      // Get user ID from auth middleware
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Check if user has access to this diagram
      const diagramCheck = await db.query(
        'SELECT id FROM section0.cr07Bdiagrams WHERE id = $1 AND owner_id = $2',
        [diagramId, parseInt(userId, 10)]
      )
      
      if (diagramCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      // Build query for workflow instances
      let query = `
        SELECT id, status, started_by, started_at, completed_at
        FROM section0.cr08workflow_instances
        WHERE diagram_id = $1
      `
      const params = [diagramId]
      
      if (status) {
        query += ' AND status = $2'
        params.push(status)
      }
      
      query += ' ORDER BY started_at DESC'
      
      const result = await db.query(query, params)
      
      res.json(result.rows)
    } catch (error) {
      console.error('Error fetching workflow instances:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
  
  /**
   * Get details of a workflow instance including node states
   */
  app.get('/api/workflow/instance/:instanceId', async (req, res) => {
    try {
      const { instanceId } = req.params
      
      // Get user ID from auth middleware
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Get workflow instance with access check
      const instanceResult = await db.query(`
        SELECT wi.* 
        FROM section0.cr08workflow_instances wi
        JOIN section0.cr07Bdiagrams d ON wi.diagram_id = d.id
        WHERE wi.id = $1 AND d.owner_id = $2
      `, [instanceId, parseInt(userId, 10)])
      
      if (instanceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow instance not found' })
      }
      
      const instance = instanceResult.rows[0]
      
      // Get node states
      const nodeStatesResult = await db.query(`
        SELECT ns.id, ns.node_id, ns.status, ns.inputs_required, 
               ns.inputs_received, ns.inputs_passed, ns.data,
               ns.created_at, ns.updated_at
        FROM section0.cr08anode_states ns
        WHERE ns.workflow_instance_id = $1
        ORDER BY ns.created_at
      `, [instanceId])
      
      // Get approval states if user is involved
      const approvalsResult = await db.query(`
        SELECT na.id, na.node_state_id, na.status, na.comment,
               na.created_at, na.updated_at
        FROM section0.cr08cnode_approvals na
        JOIN section0.cr08anode_states ns ON na.node_state_id = ns.id
        WHERE ns.workflow_instance_id = $1 AND na.user_id = $2
      `, [instanceId, parseInt(userId, 10)])
      
      res.json({
        ...instance,
        nodeStates: nodeStatesResult.rows,
        userApprovals: approvalsResult.rows
      })
    } catch (error) {
      console.error('Error fetching workflow instance:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
  
  /**
   * Get pending approvals for the current user
   */
  app.get('/api/workflow/approvals/pending', async (req, res) => {
    try {
      // Get user ID from auth middleware
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Get pending approvals
      const approvalsResult = await db.query(`
        SELECT na.id, na.node_state_id, na.created_at,
               ns.workflow_instance_id,
               wi.diagram_id,
               d.name as diagram_name,
               o.data->>'label' as node_label
        FROM section0.cr08cnode_approvals na
        JOIN section0.cr08anode_states ns ON na.node_state_id = ns.id
        JOIN section0.cr08workflow_instances wi ON ns.workflow_instance_id = wi.id
        JOIN section0.cr07Bdiagrams d ON wi.diagram_id = d.id
        JOIN section0.cr07Cdiagram_objects o ON ns.node_id = o.node_id
        WHERE na.user_id = $1 AND na.status = 'pending'
        ORDER BY na.created_at DESC
      `, [userId])
      
      res.json(approvalsResult.rows)
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
  
  /**
   * Get workflow statistics
   */
  app.get('/api/workflow/stats/:diagramId', async (req, res) => {
    try {
      const { diagramId } = req.params
      
      // Get user ID from auth middleware
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Check if user has access to this diagram
      const diagramCheck = await db.query(
        'SELECT id FROM section0.cr07Bdiagrams WHERE id = $1 AND owner_id = $2',
        [diagramId, parseInt(userId, 10)]
      )
      
      if (diagramCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      // Get overall workflow stats
      const workflowStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_instances,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_instances,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_instances,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_instances
        FROM section0.cr08workflow_instances
        WHERE diagram_id = $1
      `, [diagramId])
      
      // Get stats per node
      const nodeStatsResult = await db.query(`
        SELECT 
          ns.node_id,
          o.data->>'label' as node_label,
          o.node_type,
          COUNT(*) as total,
          SUM(CASE WHEN ns.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ns.status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN ns.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
          SUM(CASE WHEN ns.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ns.status = 'error' THEN 1 ELSE 0 END) as error
        FROM section0.cr08anode_states ns
        JOIN section0.cr08workflow_instances wi ON ns.workflow_instance_id = wi.id
        JOIN section0.cr07Cdiagram_objects o ON ns.node_id = o.node_id
        WHERE wi.diagram_id = $1
        GROUP BY ns.node_id, o.data->>'label', o.node_type
      `, [diagramId])
      
      res.json({
        workflowStats: workflowStatsResult.rows[0] || {},
        nodeStats: nodeStatsResult.rows
      })
    } catch (error) {
      console.error('Error fetching workflow stats:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
}
