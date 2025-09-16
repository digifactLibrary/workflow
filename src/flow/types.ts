import type { Node, Edge } from '@xyflow/react'
import { Position, MarkerType } from '@xyflow/react'

export type AlgoNodeType =
  | 'start'
  | 'end'
  | 'decision'      // constrained: max 2 outputs with Yes/No
  | 'condition'     // free condition, unlimited outputs
  | 'trigger'
  | 'send'
  | 'human'
  | 'get'
  | 'set'
  | 'and'
  | 'or'
  | 'comment'

// Node state within a workflow execution
export type NodeStatus = 
  | 'pending'    // Not yet started
  | 'active'     // Currently executing
  | 'waiting'    // Waiting for input (e.g., human approval)
  | 'completed'  // Finished execution
  | 'error'      // Failed execution
  | 'cancelled'  // Execution cancelled

// Workflow instance state
export type WorkflowStatus =
  | 'active'     // Currently executing
  | 'completed'  // Successfully completed
  | 'error'      // Failed with error
  | 'cancelled'  // Cancelled by user

export type AlgoNodeData = {
  label: string
  color?: string
  // Trigger-specific optional fields
  triggerEvents?: string[]
  triggerModules?: string[]
  mappingIds?: string[]
  api?: string
  webhook?: string
  // Send-specific optional fields
  sendKinds?: string[]
  // Human-specific optional fields
  humanType?: 'personal' | 'role'
  // Effective union of selected people from both blocks
  humanPersons?: string[]
  // Separate selections per block
  humanPersonsPersonal?: string[]
  humanPersonsByRole?: string[]
  humanRoles?: string[]
  humanRoleIds?: string[]
  humanIds?: string[]  // New field for human IDs
  humanDepartments?: string[]
  humanDepartmentIds?: string[]
  // Flags to indicate if options have been initialized
  humanPersonalPeopleInitialized?: boolean
  humanRolePeopleInitialized?: boolean
  // New fields for stateful nodes
  requiredInputs?: number  // Number of inputs required for AND/OR nodes
  approvalMode?: 'any' | 'all'  // For human nodes: any = any user can approve, all = all users must approve
}

export type AlgoNode = Node<AlgoNodeData, AlgoNodeType>
export type AlgoEdge = Edge

// New types for database entities
export type DiagramObject = {
  id: string
  diagramId: string
  nodeId: string // React Flow node ID
  nodeType: AlgoNodeType
  positionX: number
  positionY: number
  width?: number
  height?: number
  data: AlgoNodeData
  createdAt: string
  updatedAt: string
}

export type DiagramConnection = {
  id: string
  diagramId: string
  edgeId: string // React Flow edge ID  
  sourceNodeId: string
  targetNodeId: string
  sourceHandle?: string
  targetHandle?: string
  edgeType: string
  animated: boolean
  data: Record<string, unknown>
  style: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Helper types for API responses
export type DiagramWithRelations = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  ownerId: string
  objects: DiagramObject[]
  connections: DiagramConnection[]
}

// Types for stateful workflow instances
export type WorkflowInstance = {
  id: string
  diagramId: string
  status: WorkflowStatus
  context: Record<string, unknown>
  startedBy: string
  startedAt: string
  completedAt?: string
  error?: string
}

export type NodeState = {
  id: string
  workflowInstanceId: string
  nodeId: string
  status: NodeStatus
  data: Record<string, unknown>
  inputsRequired: number
  inputsReceived: number
  inputsPassed: number
  createdAt: string
  updatedAt: string
}

export type NodeInput = {
  id: string
  nodeStateId: string
  sourceNodeId: string
  inputData: Record<string, unknown>
  evaluationResult?: boolean
  receivedAt: string
}

export type NodeApproval = {
  id: string
  nodeStateId: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  createdAt: string
  updatedAt: string
}

export function autoPositions(a: { x: number; y: number; width?: number; height?: number }, b: { x: number; y: number; width?: number; height?: number }) {
  const ax = a.x + (a.width ?? 0) / 2
  const ay = a.y + (a.height ?? 0) / 2
  const bx = b.x + (b.width ?? 0) / 2
  const by = b.y + (b.height ?? 0) / 2
  const dx = bx - ax
  const dy = by - ay
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      sourcePosition: dx >= 0 ? Position.Right : Position.Left,
      targetPosition: dx >= 0 ? Position.Left : Position.Right,
    }
  }
  return {
    sourcePosition: dy >= 0 ? Position.Bottom : Position.Top,
    targetPosition: dy >= 0 ? Position.Top : Position.Bottom,
  }
}

// Utility functions to convert between database entities and React Flow objects
export function diagramObjectToAlgoNode(obj: DiagramObject): AlgoNode {
  return {
    id: obj.nodeId,
    type: obj.nodeType,
    position: { x: obj.positionX, y: obj.positionY },
    data: obj.data,
    width: obj.width,
    height: obj.height,
  }
}

export function algoNodeToDiagramObject(node: AlgoNode, diagramId: string): Omit<DiagramObject, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    diagramId,
    nodeId: node.id,
    nodeType: node.type as AlgoNodeType,
    positionX: node.position.x,
    positionY: node.position.y,
    width: node.width,
    height: node.height,
    data: node.data,
  }
}

export function diagramConnectionToAlgoEdge(conn: DiagramConnection): AlgoEdge {
  return {
    id: conn.edgeId,
    source: conn.sourceNodeId,
    target: conn.targetNodeId,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    type: conn.edgeType || 'dir',
    animated: conn.animated ?? true,
    data: conn.data,
    style: conn.style,
    markerEnd: { type: MarkerType.ArrowClosed },
  }
}

export function algoEdgeToDiagramConnection(edge: AlgoEdge, diagramId: string): Omit<DiagramConnection, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    diagramId,
    edgeId: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    edgeType: edge.type || 'dir',
    animated: edge.animated ?? true,
    data: edge.data || {},
    style: (edge.style || {}) as Record<string, unknown>,
  }
}
