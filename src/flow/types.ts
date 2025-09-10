import type { Node, Edge } from '@xyflow/react'
import { Position } from '@xyflow/react'

export type AlgoNodeType =
  | 'start'
  | 'end'
  | 'decision'      // constrained: max 2 outputs with Yes/No
  | 'condition'     // free condition, unlimited outputs
  | 'trigger'
  | 'send'
  | 'human'
  | 'and'
  | 'or'
  | 'comment'

export type AlgoNodeData = {
  label: string
  color?: string
  // Trigger-specific optional fields
  triggerEvents?: string[]
  triggerModules?: string[]
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
  humanDepartments?: string[]
  humanRolePeopleInitialized?: boolean
}

export type AlgoNode = Node<AlgoNodeData, AlgoNodeType>
export type AlgoEdge = Edge

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
