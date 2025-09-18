const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')
const fetch = require('node-fetch').default  // For making HTTP requests to email API

class WorkflowEngine {
  constructor(db) {
    this.db = db
  }

  /**
   * Execute a trigger node based on an event and mapping ID
   * @param {string} eventName - The event that triggered the workflow (e.g., 'create', 'update', 'approve')
   * @param {object} triggerData - Data associated with the trigger (e.g., record details)
   * @param {string} userId - User who initiated the trigger
   * @param {number} mappingId - The mapping ID to find the module
   * @return {Promise<void>}
   */
  async executeTriggerNode(eventName, triggerData, userId, mappingId) {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')

      // Find the trigger node by objectId
      const triggerNodeResult = await client.query(
        `SELECT o.id, o.node_id, o.data, o.diagram_id
         FROM section0.cr07Cdiagram_objects o
         WHERE node_type = 'trigger' AND 
          data->'triggerEvents' @> $1::jsonb AND
          data->'mappingIds' @> $2::jsonb
         LIMIT 1`,
        [JSON.stringify([eventName]), parseInt(mappingId, 10)]
      )
      const triggerNode = triggerNodeResult.rows[0]
      if (!triggerNode) {
        throw new Error(`Trigger node not found for event ${eventName} and mapping ${mappingId}`)
      }

      const startNodeResult = await client.query(
        `SELECT COUNT(*) as count
        FROM section0.cr07Cdiagram_objects o
        JOIN section0.cr07Ddiagram_connections c ON o.node_id = c.source_node_id
        WHERE o.diagram_id = $1 AND o.node_type = 'start' AND c.target_node_id = $2`,
        [triggerNode.diagram_id, triggerNode.node_id]
      )

      if (parseInt(startNodeResult.rows[0].count, 10) > 0) {
        await this.startWorkflow(eventName, triggerNode, triggerData, userId, mappingId)
        await client.query('COMMIT')
        return
      }

      // Execute the trigger node with the provided data
      // await this.executeNode(triggerNode, triggerData, userId)

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error executing trigger node:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Start a new workflow instance
   * @param {string} eventName - The ID of the workflow diagram (optional if mappingId provided)
   * @param {string} triggerNodeId - The ID of the trigger node
   * @param {object} triggerData - Data associated with the trigger
   * @param {string} userId - User who initiated the workflow
   * @param {number|null} mappingId - The mapping ID to find relevant trigger nodes
   * @returns {Promise<string>} - The ID of the new workflow instance
   */
  async startWorkflow(eventName, triggerNode, triggerData, userId, mappingId = null) {
    // Start transaction
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')

      // If no matching trigger nodes, return early
      if (!triggerNode) {
        await client.query('ROLLBACK');
        return null;
      }
      
      // Use provided diagramId from triggerNode
      const effectiveDiagramId = triggerNode.diagram_id;
      const objectId = triggerData.Id ? triggerData.Id : 0;
      // Check if another workflow instance is already active for this mappingId
      const activeInstanceResult = await client.query(
        `SELECT id FROM section0.cr08workflow_instances
         WHERE diagram_id = $1 AND 
         context->>'startMappingId' = $2 AND
         context->>'startObjectId' = $3 AND
         status = 'active' AND
         started_by = $4
         `,
        [effectiveDiagramId, mappingId, objectId, userId]
      );

      if (activeInstanceResult.rows.length > 0) {
        console.warn(`Another workflow instance is already active for mappingId ${mappingId} with objectId ${objectId}`);
        await client.query('ROLLBACK');
        return null;
      }

      // Create a new workflow instance
      const workflowInstanceId = `wf_${uuidv4()}`
      const enrichedContext = { 
        startMappingId: mappingId,
        startObjectId: objectId
      };
      await client.query(
        `INSERT INTO section0.cr08workflow_instances
        (id, diagram_id, status, context, started_by)
        VALUES ($1, $2, 'active', $3, $4)`,
        [workflowInstanceId, effectiveDiagramId, JSON.stringify(enrichedContext), parseInt(userId, 10)]
      )

      // Create initial node state for the trigger node
      const nodeStateId = `ns_${uuidv4()}`
      await client.query(
        `INSERT INTO section0.cr08anode_states
        (id, workflow_instance_id, node_id, status)
        VALUES ($1, $2, $3, 'completed')`,
        [nodeStateId, workflowInstanceId, triggerNode.node_id]
      )

      const enrichedTriggerData = {
        eventName,
        mappingId,
        ...triggerData
      };
      // Enrich context with additional data
      await this.updateWorkflowContext(client, workflowInstanceId, nodeStateId, enrichedTriggerData)

      // Process outgoing connections from this trigger node
      await this.processOutgoingConnections(client, workflowInstanceId, triggerNode.node_id, nodeStateId)

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
   * Process outgoing connections from a node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeId - Source node ID
   * @returns {Promise<void>}
   */
  async processOutgoingConnections(client, workflowInstanceId, nodeId, preNodeStateId) {
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
          // Set AND nodes to active so they execute immediately
          status = 'active'
          break
          
        case 'or':
          // For OR nodes, we'll set required inputs to 1
          inputsRequired = 1
          // Set OR nodes to active so they execute immediately
          status = 'active'
          break
          
        case 'trigger':
          // Trigger nodes are waiting for user interaction
          status = 'waiting'
          
          if (targetNode.data.triggerEvents.includes('approve')) {
            // Check if we need approvals from all users or just one
            const approvalMode = targetNode.data.approvalMode || 'any' // Default to any
            
            // If all approvals required, count how many
            if (approvalMode === 'all') {
              if (targetNode.data.humanType === 'personal') {
                inputsRequired = (targetNode.data.humanIds || []).length
              } else if (targetNode.data.humanType === 'role') {
                inputsRequired = await this.getNumberOfUsersInRoles(client, targetNode.data.humanRoleIds || [])
              }
            } else {
              // Any approval is enough
              inputsRequired = 1
            }
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
      
      // Create the node state (không còn lưu data tại node_state)
      await client.query(
        `INSERT INTO section0.cr08anode_states
        (id, workflow_instance_id, node_id, status, inputs_required)
        VALUES ($1, $2, $3, $4, $5)`,
        [nodeStateId, workflowInstanceId, targetNodeId, status, inputsRequired]
      )
      
      // For trigger nodes with approve event, create approval records for connected human nodes
      if (targetNode.node_type === 'trigger' && targetNode.data.triggerEvents.includes('approve')) {
        await this.createHumanApprovals(client, nodeStateId, targetNode.data)
      }
      
      // For nodes that should execute immediately, queue them
      if (status === 'active') {
        // This would trigger immediate execution for nodes like 'send'
        await this.executeNode(client, workflowInstanceId, preNodeStateId, nodeStateId, targetNodeId, targetNode.node_type)
      }
    }
    await this.checkWorkflowCompletion(client, workflowInstanceId)
  }

  /**
   * Execute a specific node's logic
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} preNodeStateId - Previous node state ID that triggered this execution
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {string} nodeType - Node type
   * @returns {Promise<object>} - Result of the node execution
   */
  async executeNode(client, workflowInstanceId, preNodeStateId, nodeStateId, nodeId, nodeType) {
    const inputData = await this.getWorkflowContext(client, workflowInstanceId, preNodeStateId)
    // Execute node-specific logic based on type
    switch (nodeType) {
      case 'decision':
        return await this.executeDecisionNode(client, workflowInstanceId, nodeStateId, nodeId, inputData)
      case 'and':
        return await this.executeAndNode(client, workflowInstanceId, nodeStateId, nodeId, inputData)
      case 'or':
        return await this.executeOrNode(client, workflowInstanceId, nodeStateId, nodeId, inputData)
      case 'send':
        return await this.executeSendNode(client, workflowInstanceId, preNodeStateId, nodeStateId, nodeId, inputData)
      // case 'trigger':
      //   return await this.executeInternalTriggerNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData)
      case 'end':
        // Mark the node as completed
        await client.query(
          `UPDATE section0.cr08anode_states SET status = 'completed' WHERE id = $1`,
          [nodeStateId]
        )
        
        // Mark the workflow as completed
        await client.query(
          `UPDATE section0.cr08workflow_instances SET status = 'completed', completed_at = now() WHERE id = $1`,
          [workflowInstanceId]
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
   * @param {object} inputData - Input data from previous node
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
    // Evaluate the condition
    let conditionValue = nodeData.conditionValue || '';

    const inputValue = inputData.result !== undefined ? inputData.result : (inputData.value || '') 
    const conditionMet = inputValue == conditionValue; // Simple equality check, can be extended
    
    // Check if we should process this input based on AND/OR logic from previous nodes
    let shouldProcess = true;
    
    if (inputData.checkType) {
      if (conditionMet) {
        // For true condition:
        // - If from an AND node, only process if it's the last input (all inputs satisfied)
        // - If from an OR node, always process (any input satisfies)
        if (inputData.checkType === 'and' && !inputData.lastInput) {
          shouldProcess = false;
        }
      } else {
        // For false condition:
        // - If from an OR node, only process if it's the last input (all inputs failed)
        // - If from an AND node, always process (any input failing means condition fails)
        if (inputData.checkType === 'or' && !inputData.lastInput) {
          shouldProcess = false;
        }
      }
    }
    
    // If we should not process yet, just save the state and return
    if (!shouldProcess) {
      return { continue: false }
    }

    // Find all active source nodes that connect to this decision node and mark them as completed
    // This ensures we don't re-process inputs once a decision has been made
    const sourceNodesResult = await client.query(
      `SELECT ns.id
       FROM section0.cr08anode_states ns
       JOIN section0.cr07Ddiagram_connections c ON ns.node_id = c.source_node_id
       WHERE c.target_node_id = $1
       AND ns.workflow_instance_id = $2
       AND ns.status = 'active'`,
      [nodeId, workflowInstanceId]
    );
    
    // Mark all active source nodes as completed
    for (const sourceNode of sourceNodesResult.rows) {
      await client.query(
        `UPDATE section0.cr08anode_states SET status = 'completed' WHERE id = $1`,
        [sourceNode.id]
      );
    }

    // Update the node state (chỉ cập nhật status)
    await client.query(
      `UPDATE section0.cr08anode_states 
       SET status = 'completed'
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // Create decision metadata to pass along with the result
    const decisionMetadata = {
      conditionValue,
      result: conditionMet,
      conditionType: nodeData.conditionType || 'equals',
      processedAt: new Date().toISOString(),
    };
    
    // Cập nhật context của workflow instance với kết quả đầy đủ của decision node
    await this.updateWorkflowContext(client, workflowInstanceId, nodeStateId, decisionMetadata)
    
    // Find outgoing connections based on the condition result (true/false path)
    const connectionsResult = await client.query(
      `SELECT c.id, c.target_node_id, c.data
       FROM section0.cr07Ddiagram_connections c
       WHERE c.source_node_id = $1 AND c.data->>'kind' = $2`,
      [nodeId, conditionMet ? 'true' : 'false']
    )
    
    // Process outgoing connections
    let moreNodesToProcess = false;
    
    for (const conn of connectionsResult.rows) {
      // Pass complete decision result to downstream nodes
      await this.processOutgoingConnections(client, workflowInstanceId, nodeId, nodeStateId)
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
   * @param {object} inputData - Input data from previous node
   * @returns {Promise<object>} - Result of the execution
   */
  async executeAndNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Update received inputs count
    await client.query(
      `UPDATE section0.cr08anode_states
       SET inputs_received = inputs_received + 1
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // Re-fetch the updated state
    const updatedStateResult = await client.query(
      `SELECT inputs_required, inputs_received
       FROM section0.cr08anode_states
       WHERE id = $1`,
      [nodeStateId]
    )
    
    const updatedState = updatedStateResult.rows[0]
    
    // Check if this is the last input
    const isLastInput = updatedState.inputs_received >= updatedState.inputs_required
    
    // Prepare the enriched input data with AND node metadata
    const nodeStateData = {
      checkType: 'and',
      lastInput: isLastInput,
      inputReceived: updatedState.inputs_received,
    };
    
    // Cập nhật context với input data mới nhận, bao gồm checkType và lastInput
    await this.updateWorkflowContext(client, workflowInstanceId, nodeStateId, nodeStateData)
    
    // Always forward the input to the next nodes
    // Process outgoing connections
    await this.processOutgoingConnections(client, workflowInstanceId, nodeId, nodeStateId)

    // If this was the last input, mark the node as completed
    if (isLastInput) {
      await client.query(
        `UPDATE section0.cr08anode_states
         SET status = 'completed'
         WHERE id = $1`,
        [nodeStateId]
      )
    }
    
    return { continue: true }
  }

  /**
   * Execute an OR node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data from previous node
   * @returns {Promise<object>} - Result of the execution
   */
  async executeOrNode(client, workflowInstanceId, nodeStateId, nodeId, inputData) {
    // Update received inputs count
    await client.query(
      `UPDATE section0.cr08anode_states
       SET inputs_received = inputs_received + 1
       WHERE id = $1`,
      [nodeStateId]
    )
    
    // Re-fetch the updated state
    const updatedStateResult = await client.query(
      `SELECT inputs_required, inputs_received
       FROM section0.cr08anode_states
       WHERE id = $1`,
      [nodeStateId]
    )
    
    const updatedState = updatedStateResult.rows[0]
    
    // For OR node, check if it's the last possible input
    const isLastInput = updatedState.inputs_received >= updatedState.inputs_required
    
    // Prepare the enriched input data with OR node metadata
    const nodeStateData = {
      checkType: 'or',
      lastInput: isLastInput,
      inputReceived: updatedState.inputs_received,
    };
    
    // Cập nhật context với input data mới nhận, bao gồm checkType và lastInput
    await this.updateWorkflowContext(client, workflowInstanceId, nodeStateId, nodeStateData)
    
    // Always forward the input to the next nodes
    // Process outgoing connections
    await this.processOutgoingConnections(client, workflowInstanceId, nodeId, nodeStateId)

    // If this was the last possible input, mark the node as completed
    if (isLastInput) {
      await client.query(
        `UPDATE section0.cr08anode_states
         SET status = 'completed'
         WHERE id = $1`,
        [nodeStateId]
      )
    }
    
    return { continue: true }
  }

  /**
   * Execute a send node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} preNodeStateId - Previous node state ID that triggered this execution
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} inputData - Input data from previous node
   * @returns {Promise<object>} - Result of the execution
   */
  async executeSendNode(client, workflowInstanceId, preNodeStateId, nodeStateId, nodeId, inputData) {
    // Get the node details for send configuration
    const nodeResult = await client.query(
      `SELECT o.data FROM section0.cr07Cdiagram_objects o WHERE o.node_id = $1`,
      [nodeId]
    )
    
    if (nodeResult.rows.length === 0) return { continue: false }
    
    const nodeData = nodeResult.rows[0].data
    const sendKinds = nodeData.sendKinds || []

    const workflowResult = await client.query(
      `SELECT wi.started_by, o.diagram_id
       FROM section0.cr08workflow_instances wi
       JOIN section0.cr07Cdiagram_objects o ON o.node_id = $1
       WHERE wi.id = $2 AND wi.diagram_id = o.diagram_id`,
      [nodeId, workflowInstanceId]
    )

    if (workflowResult.rows.length === 0) return { continue: false }
    const senderId = workflowResult.rows[0].started_by
    
    // Get sender name from user table
    let senderName = 'System'
    try {
      const senderResult = await client.query(
        `SELECT hoten FROM section9nhansu.ns01taikhoannguoidung WHERE id = $1`,
        [senderId]
      )
      if (senderResult.rows.length > 0) {
        senderName = senderResult.rows[0].hoten
      }
    } catch (error) {
      console.warn('Could not fetch sender name:', error)
    }
    
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
    const humanRoleIds = new Set()
    const humanIds = new Set()
    
    for (const humanNode of humanNodesResult.rows) {
      const humanData = humanNode.data || {}
      
      // Check if the human node specifies roles
      if (humanData.humanType === 'role' && Array.isArray(humanData.humanRoleIds)) {
        humanData.humanRoleIds.forEach(roleId => humanRoleIds.add(roleId))
      } 
      // Check for direct user IDs
      if (Array.isArray(humanData.humanIds)) {
        humanData.humanIds.forEach(userId => humanIds.add(userId))
      }
    }
    
    // Get users by role
    const wfUsersByRole = []
    if (humanRoleIds.size > 0) {
      const roleIdsArray = Array.from(humanRoleIds)
      const usersByRoleResult = await client.query(
        `SELECT id, email 
         FROM section9nhansu.ns01taikhoannguoidung 
         WHERE recordidchucdanh = ANY($1) AND trangthai = 'Đang làm việc'`,
        [roleIdsArray]
      ).catch(() => ({ rows: [] }))
      
      if (usersByRoleResult.rows) {
        wfUsersByRole.push(...usersByRoleResult.rows)
      }
    }
    
    // Get users by direct ID
    const wfUsersByDirectId = []
    if (humanIds.size > 0) {
      const humanIdsArray = Array.from(humanIds)
      const usersByDirectIdResult = await client.query(
        `SELECT id, email 
         FROM section9nhansu.ns01taikhoannguoidung 
         WHERE id = ANY($1) AND trangthai = 'Đang làm việc'`,
        [humanIdsArray]
      ).catch(() => ({ rows: [] }))
      
      if (usersByDirectIdResult.rows) {
        wfUsersByDirectId.push(...usersByDirectIdResult.rows)
      }
    }
    
    // Combine users (ensuring unique IDs and including email addresses)
    const uniqueReceivers = new Map()
    
    // Combine both arrays
    const allUsers = [].concat(wfUsersByRole, wfUsersByDirectId)
    allUsers.forEach(user => {
      if (user && user.id && !uniqueReceivers.has(user.id)) {
        uniqueReceivers.set(user.id, user)
      }
    })
    
    // Create two arrays: one for IDs and one for full user objects (with emails)
    const receiversIds = Array.from(uniqueReceivers.keys())
    const receiversData = Array.from(uniqueReceivers.values())

    // Check if previous node state is trigger node to get input data
    const preNodeType = await client.query(
      `SELECT o.node_type
       FROM section0.cr07Cdiagram_objects o
       JOIN section0.cr08anode_states ns ON o.node_id = ns.node_id
       WHERE ns.id = $1`,
      [preNodeStateId]
    )

    let needAction = false
    let enrichedData = {}

    if (preNodeType.rows.length > 0 && preNodeType.rows[0].node_type === 'trigger') {
      needAction = inputData.eventName === 'sendapprove'
      // Lấy thông tin sự kiện từ bảng cr07etriggerevent
      const eventInfoResult = await client.query(`
        SELECT name 
        FROM section0.cr07etriggerevent 
        WHERE code = $1
      `, [inputData.eventName]).catch(() => ({ rows: [] }));
      const eventDisplayName = eventInfoResult.rowCount > 0 ? eventInfoResult.rows[0].name : inputData.eventName;
      // Lấy thông tin module từ bảng cr04viewmodelmapping
      const moduleInfoResult = await client.query(`
        SELECT displayname, modelname
        FROM section0.cr04viewmodelmapping 
        WHERE id = $1
      `, [inputData.mappingId]).catch(() => ({ rows: [] }));
      
      const modelName = moduleInfoResult.rowCount > 0 ? moduleInfoResult.rows[0].displayname : '';
      const rawModelName = moduleInfoResult.rowCount > 0 ? moduleInfoResult.rows[0].modelname : '';

      const tableName = rawModelName
        ? rawModelName.split('.').pop().toLowerCase()
        : '';
      // Xác định objectDisplayName từ dữ liệu
      let objectDisplayName = '';
      if (inputData.Code && inputData.Name) {
        objectDisplayName = `[${inputData.Code}] ${inputData.Name}`;
      } else if (inputData.Name) {
        objectDisplayName = inputData.Name;
      } else if (inputData.Code) {
        objectDisplayName = inputData.Code;
      } else if (inputData.Id) {
        objectDisplayName = inputData.Id;
      }

      const title = eventDisplayName ? `Thông báo ${eventDisplayName}` : 'Thông báo mới';
      const details = `Người gửi: ${senderName}\n${eventDisplayName || ''} ${modelName || ''}: ${objectDisplayName || ''}`;

      enrichedData = {
        ...inputData,
        tableName: tableName || '',
        title,
        details,
      }
    } else {
      enrichedData = { ...inputData }
    }
    
    // Send notifications based on sendKinds
    for (const sendKind of sendKinds) {
      await this.sendNotificationByType(client, sendKind, senderId, senderName, needAction, enrichedData, receiversIds, receiversData)
    }
    
    // Mark the node as completed
    await client.query(
      `UPDATE section0.cr08anode_states SET status = 'completed' WHERE id = $1`,
      [nodeStateId]
    )
    
    // Process outgoing connections
    await this.processOutgoingConnections(client, workflowInstanceId, nodeId, inputData)
    
    return { continue: true }
  }

  // Unified notification method following processMessageByType pattern
  async sendNotificationByType(client, sendType, senderId, senderName, needAction, data, receiversIds, receiversData) {
    // Process based on notification type
    if (sendType === 'inapp') {
      // Process in-app notifications
      for (const receiverId of receiversIds) {
        if (!receiverId) continue;
        
        // Prepare notification details
        const title = data.title || "Thông báo mới";
        const details = data.details || "Người gửi: " + senderName;

        // Insert notification into database
        await client.query(
          `INSERT INTO section0.cr01notification (
            isread, sender, receiver, isaction, relatedid, datatable,
            active, createdate, writedate, createuid, writeuid, document, title, details
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, now(), now(), $8, $9, $10, $11, $12
          )`,
          [
            false, // isread
            parseInt(senderId.toString(), 10), // sender
            parseInt(receiverId.toString(), 10), // receiver
            needAction === true, // isaction
            data.Id || null, // relatedid
            data.tableName || null, // datatable
            1, // active
            0, // createuid
            0, // writeuid
            data.document || null, // document
            title, // title
            details // details
          ]
        );
        
        console.log('Workflow in-app notification created:', { receiver: receiverId, title });
      }
    } else if (sendType === 'email') {
      // Process email notifications (non-blocking, best effort)
      
      // Get email configuration from environment variables
      const mailApiUrl = process.env.MAILURL;
      const mailApiKey = process.env.MAILAPIKEY;
      
      if (!mailApiUrl || !mailApiKey) {
        console.error('Email configuration missing: MAILURL or MAILAPIKEY not defined in environment');
        return;
      }
      
      // Prepare email content
      const subject = data.title || "Thông báo mới";
      const body = data.details || `Người gửi: ${senderName}`;

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
        
        console.log('Workflow Email API request scheduled:', {
          url: mailApiUrl,
          recipient: receiver.email,
          subject: subject
        });
        
        // Increment the counter for scheduled email tasks
        emailTasksStarted++;
        
        // Send email via API with SMTP fallback (non-blocking, best effort)
        try {
          fetch(mailApiUrl, options)
            .then(response => {
              return response.text().then(text => ({ status: response.status, text }));
            })
            .then(({ status, text }) => {
              console.log('Workflow Email API response:', { recipient: receiver.email, status, text });
              if (status !== 200 && status !== 201) {
                console.error(`Workflow Email API error for ${receiver.email}: ${status} - ${text}`);
                // API failed, attempt SMTP fallback
                console.log(`Attempting SMTP fallback for ${receiver.email}`);
                return this.sendEmailSmtp(receiver.email, subject, body);
              }
              return true;
            })
            .catch(error => {
              console.error(`Failed to send email to ${receiver.email} via API:`, error);
              // API request failed, attempt SMTP fallback
              console.log(`Attempting SMTP fallback for ${receiver.email} after API failure`);
              return this.sendEmailSmtp(receiver.email, subject, body);
            })
            .catch(error => {
              // Both API and SMTP failed
              console.error(`All email sending methods failed for ${receiver.email}:`, error);
            });
        } catch (error) {
          console.error(`Error initiating email send for ${receiver.email}:`, error);
        }
      }
      
      console.log(`Workflow sending ${emailTasksStarted} emails in the background`);
    } else {
      console.log(`Notification type ${sendType} not implemented in workflow engine`);
    }
  }
  
  // Email sending helper with actual SMTP implementation
  async sendEmailSmtp(to, subject, body) {
    try {
      // Check if SMTP configuration exists
      const smtpHost = process.env.SMTPHOST;
      const smtpPort = process.env.SMTPPORT;
      const smtpUser = process.env.SMTPUSER;
      const smtpPassword = process.env.SMTPPASSWORD;
      
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.error('SMTP configuration missing');
        return false;
      }
      
      // Need to dynamically import nodemailer since it might not be available in all contexts
      const nodemailer = require('nodemailer');
      
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
      
      console.log('Workflow email sent via SMTP:', { messageId: info.messageId, recipient: to });
      return true;
    } catch (error) {
      console.error('Workflow SMTP Email error:', error);
      return false;
    }
  }

  /**
   * Get context for a workflow instance or a specific node
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string|null} nodeStateId - Optional node state ID to get specific node context
   * @returns {Promise<object>} - The context data
   */
  async getWorkflowContext(client, workflowInstanceId, nodeStateId = null) {
    console.log(`==== DEBUG getWorkflowContext ====`);
    console.log(`workflowInstanceId: ${workflowInstanceId}, nodeStateId: ${nodeStateId}`);
    
    const result = await client.query(
      `SELECT context FROM section0.cr08workflow_instances WHERE id = $1`,
      [workflowInstanceId]
    )
    
    if (result.rows.length === 0) {
      console.error(`Workflow instance not found: ${workflowInstanceId}`);
      throw new Error(`Workflow instance not found: ${workflowInstanceId}`);
    }
    
    const context = result.rows[0].context || {};
    console.log(`Full context:`, JSON.stringify(context, null, 2));
    
    if (nodeStateId) {
      const nodeContext = (context.nodes || {})[nodeStateId] || {};
      console.log(`Node context for ${nodeStateId}:`, JSON.stringify(nodeContext, null, 2));
      return nodeContext;
    }
    
    console.log(`Returning full context`);
    console.log(`==== END DEBUG getWorkflowContext ====`);
    return context;
  }
  
  /**
   * Update context for a workflow instance
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string|null} nodeStateId - Optional node state ID if updating node-specific context
   * @param {object} data - Data to merge with the existing context
   * @returns {Promise<void>}
   */
  async updateWorkflowContext(client, workflowInstanceId, nodeStateId = null, data = {}) {
    if (nodeStateId) {
      // Tạo JSON path dưới dạng chuỗi
      const jsonPath = ['nodes', nodeStateId];
      
      // Update node-specific context
      await client.query(
        `UPDATE section0.cr08workflow_instances
         SET context = jsonb_set(
           jsonb_set(context, '{nodes}', COALESCE(context->'nodes', '{}'::jsonb), true),
           $1, 
           coalesce(context#>$1, '{}'::jsonb) || $2::jsonb,
           true
         )
         WHERE id = $3`,
        [jsonPath, JSON.stringify(data), workflowInstanceId]
      )
    } else {
      // Update root context
      await client.query(
        `UPDATE section0.cr08workflow_instances
         SET context = context || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(data), workflowInstanceId]
      )
    }
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
       FROM section0.cr08anode_states
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
       FROM section0.cr08anode_states
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
  
  // Methods for user role/department management - these would integrate with your system
  
  async getUserRoles(client, userId) {
    const result = await client.query(
      `SELECT recordidchucdanh FROM section9nhansu.ns01taikhoannguoidung WHERE id = $1`,
      [parseInt(userId, 10)]
    )
    return result.rows.map(row => row.recordidchucdanh)
  }
  
  async getUserDepartments(client, userId) {
    const result = await client.query(
      `SELECT recordidphongban FROM section9nhansu.ns01taikhoannguoidung WHERE id = $1`,
      [parseInt(userId, 10)]
    )
    return result.rows.map(row => row.recordidphongban)
  }

  async getNumberOfUsersInRoles(client, roleIds) {
    if (!roleIds || roleIds.length === 0) return 0
    const result = await client.query(
      `SELECT COUNT(DISTINCT id, manhanvien) as count
        FROM section9nhansu.ns01taikhoannguoidung
        WHERE recordidchucdanh = ANY($1)`,
      [roleIds]
    )
    return result.rows.length > 0 ? parseInt(result.rows[0].count, 10) : 0
  }

  /**
   * Create approval records for human nodes
   * @param {object} client - Database client
   * @param {string} nodeStateId - Node state ID
   * @param {object} triggerNodeData - Trigger node data
   * @returns {Promise<void>}
   */
  async createHumanApprovals(client, nodeStateId, triggerNodeData) {
    // First, get the trigger node's ID to find connected human nodes
    const nodeStateResult = await client.query(
      `SELECT ns.node_id, wi.diagram_id 
       FROM section0.cr08anode_states ns
       JOIN section0.cr08workflow_instances wi ON ns.workflow_instance_id = wi.id
       WHERE ns.id = $1`,
      [nodeStateId]
    )
    
    if (nodeStateResult.rows.length === 0) return
    
    const triggerNodeId = nodeStateResult.rows[0].node_id
    const diagramId = nodeStateResult.rows[0].diagram_id
    
    // Find connected human nodes that are source nodes to this trigger node
    const humanNodesResult = await client.query(
      `SELECT o.node_id, o.data
       FROM section0.cr07Cdiagram_objects o
       JOIN section0.cr07Ddiagram_connections c ON o.node_id = c.source_node_id
       WHERE o.diagram_id = $1 AND o.node_type = 'human' AND c.target_node_id = $2`,
      [diagramId, triggerNodeId]
    )
    
    // Process each human node and collect user IDs
    const allUserIds = []
    
    for (const humanNode of humanNodesResult.rows) {
      const nodeData = humanNode.data
      
      if (nodeData.humanType === 'personal') {
        // Personal selection - directly use humanIds
        allUserIds.push(...(nodeData.humanIds || []))
      } else if (nodeData.humanType === 'role') {
        for (const roleId of (nodeData.humanRoleIds || [])) {
          const usersResult = await client.query(
            `SELECT id FROM section9nhansu.ns01taikhoannguoidung WHERE recordidchucdanh = $1`,
            [roleId]
          )
          usersResult.rows.forEach(row => allUserIds.push(row.id))
        }
      }
    }
    
    // If no users found from connected human nodes, check if the trigger node itself has human data
    if (allUserIds.length === 0 && triggerNodeData.humanType) {
      if (triggerNodeData.humanType === 'personal') {
        allUserIds.push(...(triggerNodeData.humanIds || []))
      } else if (triggerNodeData.humanType === 'role') {
        for (const roleId of (triggerNodeData.humanRoleIds || [])) {
          const usersResult = await client.query(
            `SELECT id FROM section9nhansu.ns01taikhoannguoidung WHERE recordidchucdanh = $1`,
            [roleId]
          )
          usersResult.rows.forEach(row => allUserIds.push(row.id))
        }
      }
    }
    
    // Create approval records for each unique user
    const uniqueUserIds = [...new Set(allUserIds)]
    for (const userId of uniqueUserIds) {
      await client.query(
        `INSERT INTO section0.cr08cnode_approvals
        (id, node_state_id, user_id, status)
        VALUES ($1, $2, $3, 'pending')`,
        [`na_${uuidv4()}`, nodeStateId, parseInt(userId, 10)]
      )
    }
  }

  /**
   * Process a human approval
   * @param {string} nodeStateId - Node state ID
   * @param {string} userId - User ID performing the approval
   * @param {boolean} approved - Whether approved or rejected
   * @param {string} comment - Optional comment
   * @returns {Promise<boolean>} - Success status
   */
  async processHumanApproval(mappingId, objectId, requesterId, userId, approved, comment) {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      // Update the approval record
      const updateResult = await client.query(
        `UPDATE section0.cr08cnode_approvals
         SET status = $1, comment = $2, updated_at = now()
         WHERE node_state_id = $3 AND user_id = $4
         RETURNING id`,
        [approved ? 'approved' : 'rejected', comment || null, nodeStateId, parseInt(userId, 10)]
      )
      
      if (updateResult.rows.length === 0) {
        throw new Error('Approval record not found')
      }
      
      // Get the node state to check approval mode
      const nodeStateResult = await client.query(
        `SELECT ns.id, ns.workflow_instance_id, ns.node_id, ns.inputs_required
         FROM section0.cr08anode_states ns
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
        `SELECT status FROM section0.cr08cnode_approvals
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
        // Update node state (chỉ cập nhật status)
        await client.query(
          `UPDATE section0.cr08anode_states
           SET status = 'completed'
           WHERE id = $1`,
          [nodeStateId]
        )
        
        // Cập nhật context của workflow instance với kết quả phê duyệt đầy đủ
        const workflowInstanceId = nodeState.workflow_instance_id
        
        // Tạo approval metadata đầy đủ
        const approvalMetadata = {
          approvalResult,
          approvedCount,
          rejectedCount,
          totalCount,
          approvalMode,
          processedAt: new Date().toISOString(),
          comment: comment || null,
          userId: parseInt(userId, 10)
        };
        
        await client.query(
          `UPDATE section0.cr08workflow_instances
           SET context = jsonb_set(
             context, 
             '{nodes, $1}', 
             coalesce(context->'nodes'->'$1', '{}'::jsonb) || $2::jsonb,
             true
           )
           WHERE id = $3`,
          [nodeStateId, JSON.stringify(approvalMetadata), workflowInstanceId]
        )
        
        // Forward the enriched approval data to downstream nodes
        await this.processOutgoingConnections(
          client, 
          workflowInstanceId, 
          nodeState.node_id, 
          { 
            result: approvalResult,
            approvalResult,
            approvalMetadata,
            value: approvalResult ? "true" : "false"
          }
        )
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

  /**
   * Execute a trigger node encountered during workflow execution
   * @param {object} client - Database client
   * @param {string} workflowInstanceId - Workflow instance ID
   * @param {string} nodeStateId - Node state ID
   * @param {string} nodeId - Node ID
   * @param {object} nodeData - Node data from workflow context
   * @returns {Promise<object>} - Result of the execution
   */
  async executeInternalTriggerNode(client, workflowInstanceId, nodeStateId, nodeId, nodeData) {
    // Get the trigger node data
    const triggerNodeResult = await client.query(
      `SELECT o.data
        FROM section0.cr07Cdiagram_objects o
        WHERE o.node_id = $1`,
      [nodeId]
    );

    if (triggerNodeResult.rows.length === 0) {
      console.warn(`Trigger node ${nodeId} not found in diagram objects`);
      return { continue: false };
    }

    const triggerNodeData = triggerNodeResult.rows[0].data;
    
    // Check if this is an internal trigger (node in the middle of a workflow)
    // or an external trigger (node that should only be activated via API)
    const isInternalTrigger = await this.isInternalTriggerNode(client, nodeId);
    
    if (isInternalTrigger) {
      // If this is an internal trigger with an 'approve' event, create approval records
      if (triggerNodeData.triggerEvents && triggerNodeData.triggerEvents.includes('approve')) {
        await this.createHumanApprovals(client, nodeStateId, triggerNodeData);
      }
      
      // Mark the node as waiting - it will be activated later via the API
      await client.query(
        `UPDATE section0.cr08anode_states SET status = 'waiting' WHERE id = $1`,
        [nodeStateId]
      );
      
      // The workflow will pause here until the trigger node is activated
      return { continue: false };
    } else {
      // For external triggers that shouldn't be in the middle of a workflow,
      // log a warning and mark as completed to allow workflow to continue
      console.warn(`External trigger node ${nodeId} encountered during workflow execution. This might indicate a workflow design issue.`);
      
      await client.query(
        `UPDATE section0.cr08anode_states SET status = 'completed' WHERE id = $1`,
        [nodeStateId]
      );
      
      // Process outgoing connections to continue the workflow
      await this.processOutgoingConnections(client, workflowInstanceId, nodeId, nodeData);
      
      return { continue: true };
    }
  }

  /**
   * Determines if a trigger node is an internal node (in the middle of a workflow)
   * or an external node (should be activated via API only)
   * 
   * @param {object} client - Database client
   * @param {string} nodeId - Node ID to check
   * @returns {Promise<boolean>} - True if it's an internal trigger node
   */
  async isInternalTriggerNode(client, nodeId) {
    // Check if this node has any incoming connections (excluding self-connections)
    // If it has incoming connections, it's an internal trigger node
    const incomingConnectionsResult = await client.query(
      `SELECT COUNT(*) as count
       FROM section0.cr07Ddiagram_connections c
       WHERE c.target_node_id = $1 AND c.source_node_id != $1`,
      [nodeId]
    );
    
    const incomingCount = parseInt(incomingConnectionsResult.rows[0].count, 10);
    
    // If it has incoming connections, it's an internal trigger node
    if (incomingCount > 0) {
      return true;
    }
    
    // Check if this is connected to a start node (special case)
    // A trigger connected directly to a start node should still be treated as external
    const startNodeConnectionResult = await client.query(
      `SELECT COUNT(*) as count
       FROM section0.cr07Ddiagram_connections c
       JOIN section0.cr07Cdiagram_objects o ON c.source_node_id = o.node_id
       WHERE c.target_node_id = $1 AND o.node_type = 'start'`,
      [nodeId]
    );
    
    const startNodeConnections = parseInt(startNodeConnectionResult.rows[0].count, 10);
    
    // If connected to start node, it's NOT an internal trigger (it's external)
    return startNodeConnections === 0 && incomingCount > 0;
  }
}

module.exports = WorkflowEngine
