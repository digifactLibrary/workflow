/**
 * Workflow Engine for stateful workflow execution
 */

const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')

class WorkflowEngine {
  constructor(db) {
    this.db = db
  }

  /**
   * Start a new workflow instance
   * @param {string} diagramId - The ID of the workflow diagram
   * @param {string} triggerEvent - Event that triggered the workflow
   * @param {object} triggerData - Data associated with the trigger
   * @param {string} userId - User who initiated the workflow
   * @returns {Promise<string>} - The ID of the new workflow instance
   */
  async startWorkflow(diagramId, triggerEvent, triggerData, userId) {
    // Start transaction
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')

      // Create a new workflow instance
      const workflowInstanceId = `wf_${uuidv4()}`
      await client.query(
        `INSERT INTO section0.cr08workflow_instances
        (id, diagram_id, status, context, started_by)
        VALUES ($1, $2, 'active', $3, $4)`,
        [workflowInstanceId, diagramId, JSON.stringify({ triggerEvent, ...triggerData }), userId]
      )

      // Find trigger nodes that match this event
      const triggerNodesResult = await client.query(
        `SELECT o.id, o.node_id, o.data
         FROM section0.cr07Cdiagram_objects o
         WHERE o.diagram_id = $1 AND o.node_type = 'trigger' AND 
         EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(o.data->'triggerEvents') event
           WHERE event = $2
         )`,
        [diagramId, triggerEvent]
      )

      // Process each matching trigger node
      for (const triggerNode of triggerNodesResult.rows) {
        // // Check permissions via connected human nodes
        // const hasPermission = await this.checkHumanPermissions(client, diagramId, triggerNode.node_id, userId)
        // if (!hasPermission) continue

        // Initialize the trigger node state
        const nodeStateId = `ns_${uuidv4()}`
        await client.query(
          `INSERT INTO section0.cr08anode_states
          (id, workflow_instance_id, node_id, status)
          VALUES ($1, $2, $3, 'completed')`,
          [nodeStateId, workflowInstanceId, triggerNode.node_id]
        )

        // Process outgoing connections from this trigger node
        await this.processOutgoingConnections(client, workflowInstanceId, triggerNode.node_id, triggerData)
      }

      // Process pending nodes to continue the workflow
      await this.processPendingNodes(client, workflowInstanceId)

      await client.query('COMMIT')
      return workflowInstanceId
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error starting workflow:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Check if user has permission to trigger the workflow
   * @param {object} client - Database client
   * @param {string} diagramId - Diagram ID
   * @param {string} triggerNodeId - ID of the trigger node
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} - Whether user has permission
   */
  async checkHumanPermissions(client, diagramId, triggerNodeId, userId) {
    // Find connected human nodes
    const humanNodesResult = await client.query(
      `SELECT o.id, o.node_id, o.data
       FROM section0.cr07Cdiagram_objects o
       JOIN section0.cr07Ddiagram_connections c ON o.node_id = c.source_node_id
       WHERE o.diagram_id = $1 AND o.node_type = 'human' AND c.target_node_id = $2`,
      [diagramId, triggerNodeId]
    )

    // If no human nodes are connected, anyone can trigger
    if (humanNodesResult.rows.length === 0) return true

    // Check if user is in any of the connected human nodes
    for (const humanNode of humanNodesResult.rows) {
      const data = humanNode.data

      // Check personal users
      const personalUsers = data.humanIds || []
      if (personalUsers.includes(userId)) return true

      // Check role-based users
      if (data.humanRoleIds && data.humanRoleIds.length > 0) {
        // We'd need to check if the user has any of these roles
        // This depends on your role management system
        const userRoles = await this.getUserRoles(client, userId)
        if (data.humanRoleIds.some(roleId => userRoles.includes(roleId))) {
          return true
        }
      }

      // Check department-based users
      if (data.humanDepartmentIds && data.humanDepartmentIds.length > 0) {
        // We'd need to check if the user is in any of these departments
        // This depends on your department management system
        const userDepartments = await this.getUserDepartments(client, userId)
        if (data.humanDepartmentIds.some(deptId => userDepartments.includes(deptId))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Process outgoing connections from a node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeId - Source node ID
   * @param {object} nodeData - Data from the source node
   * @returns {Promise<void>}
   */
  async processOutgoingConnections(client, workflowInstanceId, nodeId, nodeData) {
    // Find all connections from this node
    const connectionsResult = await client.query(
      `SELECT c.id, c.target_node_id, c.data
       FROM section0.cr07Ddiagram_connections c
       WHERE c.source_node_id = $1`,
      [nodeId]
    )

    // Get target node information for all connections
    for (const connection of connectionsResult.rows) {
      const targetNodeId = connection.target_node_id
      
      // Get target node details
      const targetNodeResult = await client.query(
        `SELECT o.node_type, o.data
         FROM section0.cr07Cdiagram_objects o
         WHERE o.node_id = $1`,
        [targetNodeId]
      )
      
      if (targetNodeResult.rows.length === 0) continue
      
      const targetNode = targetNodeResult.rows[0]
      
      // Create node state based on node type
      const nodeStateId = `ns_${uuidv4()}`
      let status = 'pending'
      let inputsRequired = 0
      
      // Set specific behavior based on node type
      switch (targetNode.node_type) {
        case 'and':
          // Count the number of incoming connections for AND node
          const andInputsResult = await client.query(
            `SELECT COUNT(*) as count
             FROM section0.cr07Ddiagram_connections c
             WHERE c.target_node_id = $1`,
            [targetNodeId]
          )
          inputsRequired = parseInt(andInputsResult.rows[0].count)
          break
          
        case 'or':
          // For OR nodes, we'll set required inputs to 1
          inputsRequired = 1
          break
          
        case 'human':
          // Human nodes are waiting for user interaction
          status = 'waiting'
          
          // Check if we need approvals from all users or just one
          const approvalMode = targetNode.data.approvalMode || 'any' // Default to any
          
          // If all approvals required, count how many
          if (approvalMode === 'all') {
            if (targetNode.data.humanType === 'personal') {
              inputsRequired = (targetNode.data.humanIds || []).length
            } else if (targetNode.data.humanType === 'role') {
              // For role-based, we'd need to count actual users in these roles
              // This is simplified here
              inputsRequired = 1 // Placeholder
            }
          } else {
            // Any approval is enough
            inputsRequired = 1
          }
          break
          
        case 'decision':
          // Decision nodes execute immediately
          status = 'active'
          break
          
        case 'send':
          // Send nodes execute immediately
          status = 'active'
          break
          
        default:
          // Other node types are pending by default
          status = 'pending'
      }
      
      // Create the node state
      await client.query(
        `INSERT INTO section0.cr09node_states
        (id, workflow_instance_id, node_id, status, inputs_required, data)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [nodeStateId, workflowInstanceId, targetNodeId, status, inputsRequired, JSON.stringify(nodeData)]
      )
      
      // For human nodes, create approval records for each required user
      if (targetNode.node_type === 'human') {
        await this.createHumanApprovals(client, nodeStateId, targetNode.data)
      }
      
      // For nodes that should execute immediately, queue them
      if (status === 'active') {
        // This would trigger immediate execution for nodes like 'send'
        await this.executeNode(client, workflowInstanceId, nodeStateId, targetNodeId, targetNode.node_type, nodeData)
      }
    }
  }

  /**
   * Create approval records for human nodes
   * @param {object} client - Database client
   * @param {string} nodeStateId - Node state ID
   * @param {object} nodeData - Human node data
   * @returns {Promise<void>}
   */
  async createHumanApprovals(client, nodeStateId, nodeData) {
    const userIds = []
    
    if (nodeData.humanType === 'personal') {
      // Personal selection - directly use humanIds
      userIds.push(...(nodeData.humanIds || []))
    } else if (nodeData.humanType === 'role') {
      // Role-based selection - need to find users with these roles
      // This would depend on your user-role relationship structure
      // Simplified example:
      for (const roleId of (nodeData.humanRoleIds || [])) {
        const usersResult = await client.query(
          `SELECT user_id FROM section0.user_roles WHERE role_id = $1`,
          [roleId]
        )
        usersResult.rows.forEach(row => userIds.push(row.user_id))
      }
    }
    
    // Create approval records for each user
    for (const userId of userIds) {
      await client.query(
        `INSERT INTO section0.cr11node_approvals
        (id, node_state_id, user_id, status)
        VALUES ($1, $2, $3, 'pending')`,
        [`na_${uuidv4()}`, nodeStateId, userId]
      )
    }
  }

  /**
   * Process pending nodes in a workflow
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @returns {Promise<void>}
   */
  async processPendingNodes(client, workflowInstanceId) {
    // Get all active nodes that should be processed
    const activeNodesResult = await client.query(
      `SELECT ns.id as state_id, ns.node_id, o.node_type, ns.data
       FROM section0.cr09node_states ns
       JOIN section0.cr07Cdiagram_objects o ON ns.node_id = o.node_id
       WHERE ns.workflow_instance_id = $1 AND ns.status = 'active'`,
      [workflowInstanceId]
    )
    
    if (activeNodesResult.rows.length === 0) {
      // Check if workflow is complete or still has waiting nodes
      return await this.checkWorkflowCompletion(client, workflowInstanceId)
    }
    
    // Process each active node
    let moreNodesToProcess = false
    for (const node of activeNodesResult.rows) {
      const result = await this.executeNode(
        client, 
        workflowInstanceId,
        node.state_id,
        node.node_id, 
        node.node_type, 
        node.data
      )
      
      if (result && result.continue) {
        moreNodesToProcess = true
      }
    }
    
    // If new nodes were activated, process them recursively
    if (moreNodesToProcess) {
      await this.processPendingNodes(client, workflowInstanceId)
    } else {
      // Check if workflow is complete
      await this.checkWorkflowCompletion(client, workflowInstanceId)
    }
  }

  /**
   * Execute a specific node's logic
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {string} nodeType - Node type
   * @param {object} nodeData - Input data for the node
   * @returns {Promise<object>} - Result of the node execution
   */
  async executeNode(client, workflowInstanceId, nodeStateId, nodeId, nodeType, nodeData) {
    // Execute node-specific logic based on type
    switch (nodeType) {
      case 'decision':
        return await this.executeDecisionNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData)
      case 'and':
        return await this.executeAndNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData)
      case 'or':
        return await this.executeOrNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData)
      case 'send':
        return await this.executeSendNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData)
      case 'end':
        // Mark the node as completed
        await client.query(
          `UPDATE section0.cr09node_states SET status = 'completed' WHERE id = $1`,
          [nodeStateId]
        )
        // End node doesn't have outgoing connections
        return { continue: false }
      default:
        console.warn(`Unsupported node type for execution: ${nodeType}`)
        return { continue: false }
    }
  }

  /**
   * Execute a decision node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data to evaluate
   * @returns {Promise<object>} - Result of the execution
   */
  async executeDecisionNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Get the node details to access the condition
    const nodeResult = await client.query(
      `SELECT o.data FROM section0.cr07Cdiagram_objects o WHERE o.node_id = $1`,
      [nodeId]
    )
    
    if (nodeResult.rows.length === 0) return { continue: false }
    
    const nodeData = nodeResult.rows[0].data
    // The decision logic would be based on comparing values in the node data
    // This is a simplified example - adjust based on your actual condition structure
    const conditionValue = nodeData.conditionValue || ''
    const inputValue = inputData.value || ''
    
    const conditionMet = inputValue === conditionValue
    
    // Update the node state with the result
    await client.query(
      `UPDATE section0.cr09node_states 
       SET status = 'completed', data = jsonb_set(data, '{conditionResult}', $1)
       WHERE id = $2`,
      [JSON.stringify(conditionMet), nodeStateId]
    )
    
    // Find outgoing connections based on the condition result (true/false path)
    const connectionsResult = await client.query(
      `SELECT c.id, c.target_node_id, c.data
       FROM section0.cr07Ddiagram_connections c
       WHERE c.source_node_id = $1 AND c.data->>'condition' = $2`,
      [nodeId, conditionMet ? 'true' : 'false']
    )
    
    // Process outgoing connections
    let moreNodesToProcess = false
    for (const conn of connectionsResult.rows) {
      await this.processOutgoingConnections(client, workflowInstanceId, nodeId, { 
        ...inputData, 
        conditionResult: conditionMet 
      })
      moreNodesToProcess = true
    }
    
    return { continue: moreNodesToProcess }
  }

  /**
   * Execute an AND node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data from the source node
   * @returns {Promise<object>} - Result of the execution
   */
  async executeAndNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Get current node state
    const nodeStateResult = await client.query(
      `SELECT inputs_required, inputs_received, inputs_passed
       FROM section0.cr09node_states
       WHERE id = $1`,
      [nodeStateId]
    )
    
    if (nodeStateResult.rows.length === 0) return { continue: false }
    
    const nodeState = nodeStateResult.rows[0]
    
    // Store this input with the source node information
    const inputId = `ni_${uuidv4()}`
    await client.query(
      `INSERT INTO section0.cr10node_inputs
       (id, node_state_id, source_node_id, input_data, evaluation_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [inputId, nodeStateId, inputData.sourceNodeId || 'unknown', JSON.stringify(inputData), true]
    )
    
    // Update received inputs count
    await client.query(
      `UPDATE section0.cr09node_states
       SET inputs_received = inputs_received + 1,
           inputs_passed = inputs_passed + 1
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // Re-fetch the updated state
    const updatedStateResult = await client.query(
      `SELECT inputs_required, inputs_received, inputs_passed
       FROM section0.cr09node_states
       WHERE id = $1`,
      [nodeStateId]
    )
    
    const updatedState = updatedStateResult.rows[0]
    
    // Check if we've received all required inputs
    if (updatedState.inputs_passed >= updatedState.inputs_required) {
      // All inputs received and passed, complete the node
      await client.query(
        `UPDATE section0.cr09node_states
         SET status = 'completed', data = jsonb_set(data, '{result}', 'true')
         WHERE id = $1`,
        [nodeStateId]
      )
      
      // Process outgoing connections
      await this.processOutgoingConnections(client, workflowInstanceId, nodeId, {
        ...inputData,
        result: true
      })
      
      return { continue: true }
    }
    
    return { continue: false }
  }

  /**
   * Execute an OR node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data from the source node
   * @returns {Promise<object>} - Result of the execution
   */
  async executeOrNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Similar to AND node but with OR logic
    // Store this input with the source node information
    const inputId = `ni_${uuidv4()}`
    await client.query(
      `INSERT INTO section0.cr10node_inputs
       (id, node_state_id, source_node_id, input_data, evaluation_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [inputId, nodeStateId, inputData.sourceNodeId || 'unknown', JSON.stringify(inputData), true]
    )
    
    // Update received inputs count
    await client.query(
      `UPDATE section0.cr09node_states
       SET inputs_received = inputs_received + 1,
           inputs_passed = inputs_passed + 1
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // For OR node, any passed input is sufficient
    // Complete the node and continue
    await client.query(
      `UPDATE section0.cr09node_states
       SET status = 'completed', data = jsonb_set(data, '{result}', 'true')
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // Process outgoing connections
    await this.processOutgoingConnections(client, workflowInstanceId, nodeId, {
      ...inputData,
      result: true
    })
    
    return { continue: true }
  }

  /**
   * Execute a send node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data for the notification
   * @returns {Promise<object>} - Result of the execution
   */
  async executeSendNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Get the node details for send configuration
    const nodeResult = await client.query(
      `SELECT o.data FROM section0.cr07Cdiagram_objects o WHERE o.node_id = $1`,
      [nodeId]
    )
    
    if (nodeResult.rows.length === 0) return { continue: false }
    
    const nodeData = nodeResult.rows[0].data
    const sendKinds = nodeData.sendKinds || []
    
    // Find connected human nodes to determine recipients
    const humanNodesResult = await client.query(
      `SELECT o.id, o.node_id, o.data
       FROM section0.cr07Cdiagram_objects o
       JOIN section0.cr07Ddiagram_connections c ON o.node_id = c.source_node_id
       WHERE o.diagram_id = (
         SELECT diagram_id FROM section0.cr08workflow_instances WHERE id = $1
       ) AND o.node_type = 'human' AND c.target_node_id = $2`,
      [workflowInstanceId, nodeId]
    )
    
    // Prepare recipients based on human nodes
    const recipients = []
    for (const humanNode of humanNodesResult.rows) {
      const data = humanNode.data
      
      // Add personal users
      if (data.humanIds) {
        recipients.push(...data.humanIds)
      }
      
      // Add users from roles (this would need to query your role system)
      if (data.humanRoleIds) {
        // Simplified - in real implementation, query users with these roles
        for (const roleId of data.humanRoleIds) {
          const usersResult = await client.query(
            `SELECT user_id FROM section0.user_roles WHERE role_id = $1`,
            [roleId]
          )
          usersResult.rows.forEach(row => recipients.push(row.user_id))
        }
      }
    }
    
    // Send notifications based on sendKinds
    // This would integrate with your actual notification system
    for (const sendKind of sendKinds) {
      switch (sendKind) {
        case 'inapp':
          await this.sendInAppNotifications(client, recipients, nodeData.label || 'Notification', inputData)
          break
        case 'email':
          await this.sendEmailNotifications(client, recipients, nodeData.label || 'Notification', inputData)
          break
        // Add other notification methods as needed
      }
    }
    
    // Mark the node as completed
    await client.query(
      `UPDATE section0.cr09node_states SET status = 'completed' WHERE id = $1`,
      [nodeStateId]
    )
    
    // Process outgoing connections
    await this.processOutgoingConnections(client, workflowInstanceId, nodeId, inputData)
    
    return { continue: true }
  }

  /**
   * Check if a workflow instance is complete
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @returns {Promise<boolean>} - Whether the workflow is complete
   */
  async checkWorkflowCompletion(client, workflowInstanceId) {
    // Check if there are any non-completed node states
    const pendingNodesResult = await client.query(
      `SELECT COUNT(*) as count
       FROM section0.cr09node_states
       WHERE workflow_instance_id = $1
       AND status NOT IN ('completed', 'error')`,
      [workflowInstanceId]
    )
    
    const pendingCount = parseInt(pendingNodesResult.rows[0].count)
    
    if (pendingCount === 0) {
      // All nodes are completed or in error, mark workflow as complete
      await client.query(
        `UPDATE section0.cr08workflow_instances
         SET status = 'completed', completed_at = now()
         WHERE id = $1`,
        [workflowInstanceId]
      )
      return true
    }
    
    // Check if there are any active nodes (excluding waiting nodes)
    const activeNodesResult = await client.query(
      `SELECT COUNT(*) as count
       FROM section0.cr09node_states
       WHERE workflow_instance_id = $1 AND status = 'active'`,
      [workflowInstanceId]
    )
    
    const activeCount = parseInt(activeNodesResult.rows[0].count)
    
    if (activeCount === 0 && pendingCount > 0) {
      // Only waiting nodes remain, workflow is paused
      await client.query(
        `UPDATE section0.cr08workflow_instances
         SET status = 'waiting'
         WHERE id = $1 AND status = 'active'`,
        [workflowInstanceId]
      )
    }
    
    return false
  }

  // Helper methods for sending notifications
  
  async sendInAppNotifications(client, recipients, title, data) {
    // Implementation would insert records into your notification table
    for (const userId of recipients) {
      await client.query(
        `INSERT INTO section0.cr01notification
         (sender, receiver, title, details, document, isaction)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['system', userId, title, JSON.stringify(data), data.documentId || null, true]
      )
    }
  }
  
  async sendEmailNotifications(client, recipients, subject, data) {
    // Implementation would call your email sending function
    // This is a placeholder - integrate with your actual email system
    console.log(`Would send email to ${recipients.join(', ')} with subject "${subject}"`)
  }
  
  // Methods for user role/department management - these would integrate with your system
  
  async getUserRoles(client, userId) {
    // This would query your user-role relationship table
    // Simplified example:
    const result = await client.query(
      `SELECT role_id FROM section0.user_roles WHERE user_id = $1`,
      [userId]
    )
    return result.rows.map(row => row.role_id)
  }
  
  async getUserDepartments(client, userId) {
    // This would query your user-department relationship table
    // Simplified example:
    const result = await client.query(
      `SELECT department_id FROM section0.user_departments WHERE user_id = $1`,
      [userId]
    )
    return result.rows.map(row => row.department_id)
  }

  /**
   * Process a human approval
   * @param {string} nodeStateId - Node state ID
   * @param {string} userId - User ID performing the approval
   * @param {boolean} approved - Whether approved or rejected
   * @param {string} comment - Optional comment
   * @returns {Promise<boolean>} - Success status
   */
  async processHumanApproval(nodeStateId, userId, approved, comment) {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      // Update the approval record
      const updateResult = await client.query(
        `UPDATE section0.cr11node_approvals
         SET status = $1, comment = $2, updated_at = now()
         WHERE node_state_id = $3 AND user_id = $4
         RETURNING id`,
        [approved ? 'approved' : 'rejected', comment || null, nodeStateId, userId]
      )
      
      if (updateResult.rows.length === 0) {
        throw new Error('Approval record not found')
      }
      
      // Get the node state to check approval mode
      const nodeStateResult = await client.query(
        `SELECT ns.id, ns.workflow_instance_id, ns.node_id, ns.inputs_required
         FROM section0.cr09node_states ns
         WHERE ns.id = $1`,
        [nodeStateId]
      )
      
      if (nodeStateResult.rows.length === 0) {
        throw new Error('Node state not found')
      }
      
      const nodeState = nodeStateResult.rows[0]
      
      // Get the node details to check approval mode
      const nodeResult = await client.query(
        `SELECT o.data
         FROM section0.cr07Cdiagram_objects o
         WHERE o.node_id = $1`,
        [nodeState.node_id]
      )
      
      const nodeData = nodeResult.rows[0].data
      const approvalMode = nodeData.approvalMode || 'any' // Default to any
      
      // Check current approval status
      const approvalsResult = await client.query(
        `SELECT status FROM section0.cr11node_approvals
         WHERE node_state_id = $1`,
        [nodeStateId]
      )
      
      const approvals = approvalsResult.rows
      const approvedCount = approvals.filter(a => a.status === 'approved').length
      const rejectedCount = approvals.filter(a => a.status === 'rejected').length
      const totalCount = approvals.length
      
      let nodeCompleted = false
      let approvalResult = null
      
      // Determine if the node is complete based on approval mode
      if (approvalMode === 'all') {
        // All approvals required
        if (rejectedCount > 0) {
          // Any rejection means the node fails
          nodeCompleted = true
          approvalResult = false
        } else if (approvedCount === totalCount) {
          // All approved
          nodeCompleted = true
          approvalResult = true
        }
      } else {
        // Any approval is sufficient
        if (approvedCount > 0) {
          // Any approval means the node passes
          nodeCompleted = true
          approvalResult = true
        } else if (rejectedCount === totalCount) {
          // All rejected
          nodeCompleted = true
          approvalResult = false
        }
      }
      
      if (nodeCompleted) {
        // Update node state
        await client.query(
          `UPDATE section0.cr09node_states
           SET status = 'completed', data = jsonb_set(data, '{approvalResult}', $1)
           WHERE id = $2`,
          [JSON.stringify(approvalResult), nodeStateId]
        )
        
        // Process outgoing connections
        const workflowInstanceId = nodeState.workflow_instance_id
        await this.processOutgoingConnections(
          client, 
          workflowInstanceId, 
          nodeState.node_id, 
          { approvalResult }
        )
        
        // Process any pending nodes that might now be ready
        await this.processPendingNodes(client, workflowInstanceId)
      }
      
      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error processing approval:', error)
      throw error
    } finally {
      client.release()
    }
  }
}

module.exports = WorkflowEngine