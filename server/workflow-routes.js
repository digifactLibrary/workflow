/**
 * API routes for workflow execution
 */

const WorkflowEngine = require('./workflow-engine')
const jwt = require('jsonwebtoken')

module.exports = function(app, db) {
  const workflowEngine = new WorkflowEngine(db)
  
  // Auth helper - copy from index.js
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
  
  function getUserIdFromReq(req) {
    const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/, '')
    if (!token) return null
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      return decoded?.uid
    } catch {
      return null
    }
  }

  function authRequired(req, res, next) {
    const userId = getUserIdFromReq(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    req.userId = userId
    next()
  }
  
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
      
      if (!objectId || !mappingId) {
        return res.status(400).json({ error: 'Object and mapping are required' })
      }
      
      if (!userId || !requesterId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Process the approval
      await workflowEngine.processHumanApproval(
        mappingId,
        objectId,
        requesterId,
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

  // ===== DASHBOARD API ENDPOINTS =====

  /**
   * Debug endpoint to test authentication
   */
  app.get('/api/dashboard/auth-test', authRequired, async (req, res) => {
    try {
      console.log('Auth test - User ID:', req.userId);
      res.json({ 
        success: true, 
        userId: req.userId,
        message: 'Authentication working correctly' 
      });
    } catch (error) {
      console.error('Auth test error:', error);
      res.status(500).json({ error: error.message });
    }
  })

  /**
   * Get static flow configuration for dashboard
   */
  app.get('/api/dashboard/flow/static/:diagramId', authRequired, async (req, res) => {
    try {
      const { diagramId } = req.params
      const userId = req.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Get diagram with access check - include data field for fallback
      const diagramResult = await db.query(`
        SELECT d.id, d.name, d.created_at, d.updated_at, d.owner_id, d.data
        FROM section0.cr07Bdiagrams d
        WHERE d.id = $1 AND d.owner_id = $2
      `, [diagramId, userId]) // Keep userId as string

      if (diagramResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const diagram = diagramResult.rows[0]

      // Get nodes from separate table
      const nodesResult = await db.query(`
        SELECT o.id, o.node_id, o.node_type, o.position_x, o.position_y, o.width, o.height, o.data
        FROM section0.cr07Cdiagram_objects o
        WHERE o.diagram_id = $1
        ORDER BY o.created_at
      `, [diagramId])

      // Get connections from separate table
      const connectionsResult = await db.query(`
        SELECT c.id, c.edge_id, c.source_node_id, c.target_node_id, c.source_handle, c.target_handle, 
               c.edge_type, c.animated, c.data, c.style
        FROM section0.cr07Ddiagram_connections c
        WHERE c.diagram_id = $1
        ORDER BY c.created_at
      `, [diagramId])

      let nodes = []
      let connections = []

      // If no data in separate tables, fallback to legacy JSONB data
      if (nodesResult.rows.length === 0 && connectionsResult.rows.length === 0 && diagram.data) {
        console.log(`📦 Using legacy JSONB data for diagram ${diagramId}`)
        const legacyData = diagram.data
        
        if (legacyData.nodes && Array.isArray(legacyData.nodes)) {
          nodes = legacyData.nodes.map((node, index) => ({
            id: `legacy_${index}`,
            nodeId: node.id,
            type: node.type,
            position: { x: node.position?.x || 0, y: node.position?.y || 0 },
            data: node.data || {},
            label: node.data?.label || node.type
          }))
        }
        
        if (legacyData.edges && Array.isArray(legacyData.edges)) {
          connections = legacyData.edges.map((edge, index) => ({
            id: `legacy_edge_${index}`,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            edgeType: edge.type || 'dir',
            animated: edge.animated !== false,
            data: edge.data || {},
            style: edge.style || {},
            label: edge.data?.label || ''
          }))
        }
      } else {
        // Use data from separate tables
        nodes = nodesResult.rows.map(node => ({
          id: node.id,
          nodeId: node.node_id,
          type: node.node_type,
          position: { 
            x: node.position_x ? parseFloat(node.position_x) : 0, 
            y: node.position_y ? parseFloat(node.position_y) : 0 
          },
          data: node.data || {},
          label: node.data?.label || node.node_type,
          width: node.width ? parseFloat(node.width) : undefined,
          height: node.height ? parseFloat(node.height) : undefined
        }))
        
        connections = connectionsResult.rows.map(conn => ({
          id: conn.id,
          edgeId: conn.edge_id,
          sourceNodeId: conn.source_node_id,
          targetNodeId: conn.target_node_id,
          sourceHandle: conn.source_handle,
          targetHandle: conn.target_handle,
          edgeType: conn.edge_type || 'dir',
          animated: conn.animated !== false,
          data: conn.data || {},
          style: conn.style || {},
          label: conn.data?.label || ''
        }))
      }

      const flowConfig = {
        diagramId: diagram.id,
        name: diagram.name,
        nodes: nodes,
        connections: connections,
        createdAt: diagram.created_at,
        updatedAt: diagram.updated_at,
        createdBy: diagram.owner_id
      }

      res.json({ success: true, data: flowConfig })
    } catch (error) {
      console.error('Error fetching static flow config:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })

  /**
   * Get flow statistics for dashboard
   */
  app.get('/api/dashboard/flow/statistics/:diagramId', authRequired, async (req, res) => {
    try {
      const { diagramId } = req.params
      const userId = req.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Check access
      const diagramCheck = await db.query(
        'SELECT id, name FROM section0.cr07Bdiagrams WHERE id = $1 AND owner_id = $2',
        [diagramId, userId] // Keep userId as string
      )

      if (diagramCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const diagramName = diagramCheck.rows[0].name

      // Get overall statistics
      const overallStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_instances,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_instances,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_instances,
          SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_instances,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_instances,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::bigint as avg_completion_time
        FROM section0.cr08workflow_instances
        WHERE diagram_id = $1
      `, [diagramId])

      // Get all nodes in diagram with their statistics (including nodes without activity)
      const allNodesResult = await db.query(`
        SELECT 
          o.node_id,
          o.node_type,
          o.data->>'label' as node_label,
          o.data,
          o.position_x as x, 
          o.position_y as y,
          o.width,
          o.height
        FROM section0.cr07Cdiagram_objects o
        WHERE o.diagram_id = $1
        ORDER BY o.position_y, o.position_x
      `, [diagramId])

      // Get node statistics for nodes that have activity
      const nodeStatsResult = await db.query(`
        SELECT 
          ns.node_id,
          COUNT(*) as total_processed,
          SUM(CASE WHEN ns.status = 'active' THEN 1 ELSE 0 END) as current_active,
          SUM(CASE WHEN ns.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN ns.status = 'waiting' THEN 1 ELSE 0 END) as waiting_count,
          SUM(CASE WHEN ns.status = 'error' THEN 1 ELSE 0 END) as error_count,
          AVG(CASE 
            WHEN ns.updated_at IS NOT NULL AND ns.created_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ns.updated_at - ns.created_at)) * 1000 
            ELSE NULL 
          END)::bigint as avg_processing_time
        FROM section0.cr08anode_states ns
        JOIN section0.cr08workflow_instances wi ON ns.workflow_instance_id = wi.id
        WHERE wi.diagram_id = $1
        GROUP BY ns.node_id
      `, [diagramId])

      // Get recent activity
      const recentActivityResult = await db.query(`
        SELECT 
          ns.id as node_state_id,
          ns.node_id,
          ns.status,
          ns.updated_at as timestamp,
          ns.workflow_instance_id,
          o.node_type,
          o.data->>'label' as node_label,
          wi.started_by as user_id,
          wi.context->>'startMappingId' as start_mapping_id,
          wi.context->>'startObjectId' as start_object_id,
          EXTRACT(EPOCH FROM (ns.updated_at - ns.created_at)) * 1000 as processing_time
        FROM section0.cr08anode_states ns
        JOIN section0.cr08workflow_instances wi ON ns.workflow_instance_id = wi.id
        JOIN section0.cr07Cdiagram_objects o ON ns.node_id = o.node_id
        WHERE wi.diagram_id = $1
        ORDER BY ns.updated_at DESC
        LIMIT 50
      `, [diagramId])

      // Calculate throughput metrics
      const throughputResult = await db.query(`
        SELECT 
          COUNT(CASE WHEN started_at > NOW() - INTERVAL '1 hour' THEN 1 END) as instances_per_hour,
          COUNT(CASE WHEN started_at > NOW() - INTERVAL '1 day' THEN 1 END) as instances_per_day
        FROM section0.cr08workflow_instances
        WHERE diagram_id = $1
      `, [diagramId])

      // Get edge/connection data for flow visualization - include all connection details
      const edgeResult = await db.query(`
        SELECT 
          c.edge_id,
          c.source_node_id,
          c.target_node_id,
          c.source_handle,
          c.target_handle,
          c.edge_type,
          c.animated,
          c.data,
          c.style
        FROM section0.cr07Ddiagram_connections c
        WHERE c.diagram_id = $1
        ORDER BY c.edge_id
      `, [diagramId])

      const overallStats = overallStatsResult.rows[0]
      const throughputStats = throughputResult.rows[0]

      const statistics = {
        diagramId,
        diagramName,
        totalInstances: parseInt(overallStats.total_instances) || 0,
        activeInstances: parseInt(overallStats.active_instances) || 0,
        completedInstances: parseInt(overallStats.completed_instances) || 0,
        waitingInstances: parseInt(overallStats.waiting_instances) || 0,
        errorInstances: parseInt(overallStats.error_instances) || 0,
        nodeStatistics: allNodesResult.rows.map(node => {
          // Find statistics for this node
          const stats = nodeStatsResult.rows.find(s => s.node_id === node.node_id);
          
          return {
            nodeId: node.node_id,
            nodeType: node.node_type,
            nodeLabel: node.node_label || node.node_type,
            nodeData: node.data || {},
            currentActiveCount: stats ? parseInt(stats.current_active) || 0 : 0,
            totalProcessedCount: stats ? parseInt(stats.total_processed) || 0 : 0,
            averageProcessingTime: stats ? parseInt(stats.avg_processing_time) || 0 : 0,
            errorCount: stats ? parseInt(stats.error_count) || 0 : 0,
            pendingCount: stats ? parseInt(stats.pending_count) || 0 : 0,
            waitingCount: stats ? parseInt(stats.waiting_count) || 0 : 0,
            position: { x: node.x || 0, y: node.y || 0 },
            width: node.width || 200,
            height: node.height || 120
          };
        }),
        edges: edgeResult.rows.map(edge => ({
          edgeId: edge.edge_id,
          sourceNodeId: edge.source_node_id,
          targetNodeId: edge.target_node_id,
          sourceHandle: edge.source_handle,
          targetHandle: edge.target_handle,
          edgeType: edge.edge_type,
          animated: edge.animated || false,
          data: edge.data || {},
          style: edge.style || {}
        })),
        recentActivity: recentActivityResult.rows.map(activity => ({
          timestamp: activity.timestamp,
          instanceId: activity.workflow_instance_id,
          nodeId: activity.node_id,
          nodeType: activity.node_type,
          status: activity.status,
          processingTime: parseInt(activity.processing_time) || undefined,
          userId: activity.user_id,
          startMappingId: activity.start_mapping_id,
          startObjectId: activity.start_object_id
        })),
        throughputMetrics: {
          instancesPerHour: parseInt(throughputStats.instances_per_hour) || 0,
          instancesPerDay: parseInt(throughputStats.instances_per_day) || 0,
          averageCompletionTime: parseInt(overallStats.avg_completion_time) || 0,
          bottleneckNodes: nodeStatsResult.rows
            .filter(node => parseInt(node.current_active) > 0)
            .sort((a, b) => parseInt(b.current_active) - parseInt(a.current_active))
            .slice(0, 3)
            .map(node => node.node_id)
        }
      }

      res.json({ success: true, data: statistics })
    } catch (error) {
      console.error('Error fetching flow statistics:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })

  /**
   * Get instance tracking data
   */
  app.get('/api/dashboard/instance/:instanceId', authRequired, async (req, res) => {
    try {
      const { instanceId } = req.params
      const userId = req.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Get instance with access check
      const instanceResult = await db.query(`
        SELECT wi.*, d.name as diagram_name
        FROM section0.cr08workflow_instances wi
        JOIN section0.cr07Bdiagrams d ON wi.diagram_id = d.id
        WHERE wi.id = $1 AND d.owner_id = $2
      `, [instanceId, userId]) // Keep userId as string

      if (instanceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Instance not found' })
      }

      const instance = instanceResult.rows[0]

      // Get journey steps with node details
      const journeyResult = await db.query(`
        SELECT 
          ns.id as node_state_id,
          ns.node_id,
          ns.status,
          ns.created_at as started_at,
          ns.updated_at as completed_at,
          ns.data as input_data,
          o.node_type,
          o.data->>'label' as node_label,
          o.x, o.y,
          na.user_id,
          EXTRACT(EPOCH FROM (ns.updated_at - ns.created_at)) * 1000 as processing_time
        FROM section0.cr08anode_states ns
        JOIN section0.cr07Cdiagram_objects o ON ns.node_id = o.node_id
        LEFT JOIN section0.cr08cnode_approvals na ON ns.id = na.node_state_id
        WHERE ns.workflow_instance_id = $1
        ORDER BY ns.created_at
      `, [instanceId])

      // Get data flow (connections between processed nodes)
      const dataFlowResult = await db.query(`
        SELECT DISTINCT
          c.id as connection_id,
          c.source_node_id as from_node_id,
          c.target_node_id as to_node_id,
          ns_target.created_at as timestamp,
          ns_source.data as flow_data
        FROM section0.cr07Ddiagram_connections c
        JOIN section0.cr08anode_states ns_source ON c.source_node_id = ns_source.node_id
        JOIN section0.cr08anode_states ns_target ON c.target_node_id = ns_target.node_id
        WHERE ns_source.workflow_instance_id = $1 
          AND ns_target.workflow_instance_id = $1
          AND ns_source.status = 'completed'
        ORDER BY ns_target.created_at
      `, [instanceId])

      const tracking = {
        instanceId: instance.id,
        diagramId: instance.diagram_id,
        diagramName: instance.diagram_name,
        startMappingId: instance.context?.startMappingId || '',
        startObjectId: instance.context?.startObjectId || '',
        status: instance.status,
        startedBy: instance.started_by,
        startedAt: instance.started_at,
        completedAt: instance.completed_at,
        context: instance.context || {},
        journey: journeyResult.rows.map(step => ({
          nodeStateId: step.node_state_id,
          nodeId: step.node_id,
          nodeType: step.node_type,
          nodeLabel: step.node_label || step.node_type,
          status: step.status,
          startedAt: step.started_at,
          completedAt: step.completed_at,
          processingTime: parseInt(step.processing_time) || undefined,
          inputData: step.input_data,
          userId: step.user_id,
          position: { x: step.x || 0, y: step.y || 0 }
        })),
        currentNodes: journeyResult.rows
          .filter(step => step.status === 'active' || step.status === 'pending')
          .map(step => step.node_id),
        dataFlow: dataFlowResult.rows.map(flow => ({
          fromNodeId: flow.from_node_id,
          toNodeId: flow.to_node_id,
          data: flow.flow_data || {},
          timestamp: flow.timestamp,
          connectionId: flow.connection_id
        }))
      }

      res.json({ success: true, data: tracking })
    } catch (error) {
      console.error('Error fetching instance tracking:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })

  /**
   * Search instances by mapping and object ID
   */
  app.get('/api/dashboard/instances/search', authRequired, async (req, res) => {
    try {
      const { 
        diagramId, 
        startMappingId, 
        startObjectId, 
        status, 
        startedBy,
        dateFrom,
        dateTo,
        limit = 20, 
        offset = 0 
      } = req.query
      
      const userId = req.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      let query = `
        SELECT 
          wi.id as instance_id,
          wi.diagram_id,
          wi.status,
          wi.started_by,
          wi.started_at,
          wi.completed_at,
          wi.context,
          d.name as diagram_name,
          COUNT(ns.id) as total_nodes,
          COUNT(CASE WHEN ns.status = 'completed' THEN 1 END) as completed_nodes,
          COUNT(CASE WHEN ns.status = 'active' THEN 1 END) as active_nodes
        FROM section0.cr08workflow_instances wi
        JOIN section0.cr07Bdiagrams d ON wi.diagram_id = d.id
        LEFT JOIN section0.cr08anode_states ns ON wi.id = ns.workflow_instance_id
        WHERE d.owner_id = $1
      `
      
      const params = [userId] // Keep userId as string
      let paramIndex = 2

      if (diagramId) {
        query += ` AND wi.diagram_id = $${paramIndex}`
        params.push(diagramId)
        paramIndex++
      }

      if (startMappingId) {
        query += ` AND wi.context->>'startMappingId' = $${paramIndex}`
        params.push(startMappingId)
        paramIndex++
      }

      if (startObjectId) {
        query += ` AND wi.context->>'startObjectId' = $${paramIndex}`
        params.push(startObjectId)
        paramIndex++
      }

      if (status) {
        query += ` AND wi.status = $${paramIndex}`
        params.push(status)
        paramIndex++
      }

      if (startedBy) {
        query += ` AND wi.started_by = $${paramIndex}`
        params.push(parseInt(startedBy, 10))
        paramIndex++
      }

      if (dateFrom) {
        query += ` AND wi.started_at >= $${paramIndex}`
        params.push(dateFrom)
        paramIndex++
      }

      if (dateTo) {
        query += ` AND wi.started_at <= $${paramIndex}`
        params.push(dateTo)
        paramIndex++
      }

      query += `
        GROUP BY wi.id, wi.diagram_id, wi.status, wi.started_by, wi.started_at, wi.completed_at, wi.context, d.name
        ORDER BY wi.started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      
      params.push(parseInt(limit, 10), parseInt(offset, 10))

      const result = await db.query(query, params)

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT wi.id) as total
        FROM section0.cr08workflow_instances wi
        JOIN section0.cr07Bdiagrams d ON wi.diagram_id = d.id
        WHERE d.owner_id = $1
      `
      
      const countParams = [userId] // Keep userId as string
      let countParamIndex = 2

      if (diagramId) {
        countQuery += ` AND wi.diagram_id = $${countParamIndex}`
        countParams.push(diagramId)
        countParamIndex++
      }

      if (startMappingId) {
        countQuery += ` AND wi.context->>'startMappingId' = $${countParamIndex}`
        countParams.push(startMappingId)
        countParamIndex++
      }

      if (startObjectId) {
        countQuery += ` AND wi.context->>'startObjectId' = $${countParamIndex}`
        countParams.push(startObjectId)
        countParamIndex++
      }

      if (status) {
        countQuery += ` AND wi.status = $${countParamIndex}`
        countParams.push(status)
        countParamIndex++
      }

      if (startedBy) {
        countQuery += ` AND wi.started_by = $${countParamIndex}`
        countParams.push(parseInt(startedBy, 10))
        countParamIndex++
      }

      if (dateFrom) {
        countQuery += ` AND wi.started_at >= $${countParamIndex}`
        countParams.push(dateFrom)
        countParamIndex++
      }

      if (dateTo) {
        countQuery += ` AND wi.started_at <= $${countParamIndex}`
        countParams.push(dateTo)
        countParamIndex++
      }

      const countResult = await db.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      const instances = result.rows.map(row => ({
        instanceId: row.instance_id,
        diagramId: row.diagram_id,
        diagramName: row.diagram_name,
        startMappingId: row.context?.startMappingId || '',
        startObjectId: row.context?.startObjectId || '',
        status: row.status,
        startedBy: row.started_by,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        context: row.context || {},
        progress: {
          totalNodes: parseInt(row.total_nodes) || 0,
          completedNodes: parseInt(row.completed_nodes) || 0,
          activeNodes: parseInt(row.active_nodes) || 0
        }
      }))

      res.json({ 
        success: true, 
        data: {
          instances,
          total,
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Error searching instances:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })

  /**
   * Get list of diagrams for dashboard
   */
  app.get('/api/dashboard/flows', authRequired, async (req, res) => {
    try {
      const userId = req.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      console.log('Dashboard flows requested by user:', userId);

      const { name, hasActiveInstances, limit = 50, offset = 0 } = req.query

      let query = `
        SELECT 
          d.id,
          d.name,
          d.created_at,
          d.updated_at,
          d.owner_id,
          COUNT(DISTINCT wi.id) as total_instances,
          COUNT(DISTINCT CASE WHEN wi.status = 'active' THEN wi.id END) as active_instances
        FROM section0.cr07Bdiagrams d
        LEFT JOIN section0.cr08workflow_instances wi ON d.id = wi.diagram_id
        WHERE d.owner_id = $1
      `
      
      const params = [userId] // Keep userId as string, don't convert to int
      let paramIndex = 2

      if (name) {
        query += ` AND d.name ILIKE $${paramIndex}`
        params.push(`%${name}%`)
        paramIndex++
      }

      query += ' GROUP BY d.id, d.name, d.created_at, d.updated_at, d.owner_id'

      if (hasActiveInstances === 'true') {
        query += ' HAVING COUNT(DISTINCT CASE WHEN wi.status = \'active\' THEN wi.id END) > 0'
      }

      query += ` ORDER BY d.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(parseInt(limit, 10), parseInt(offset, 10))

      console.log('Executing query:', query);
      console.log('With params:', params);

      const result = await db.query(query, params)

      console.log('Query result:', result.rows);

      const flows = result.rows.map(row => ({
        diagramId: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.owner_id,
        totalInstances: parseInt(row.total_instances) || 0,
        activeInstances: parseInt(row.active_instances) || 0
      }))

      console.log('Formatted flows:', flows);

      res.json({ success: true, data: { flows } })
    } catch (error) {
      console.error('Error fetching flows:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })
}
