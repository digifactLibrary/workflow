import React, { useState, useEffect, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { StaticFlowConfig } from '../../types/dashboard';
import { useWorkspaceStore } from '../../state/workspaceStore';

// Import node components from classic editor
import StartNode from '../../flow/nodes/StartNode';
import EndNode from '../../flow/nodes/EndNode';
import DecisionNode from '../../flow/nodes/DecisionNode';
import ConditionNode from '../../flow/nodes/ConditionNode';
import TriggerNode from '../../flow/nodes/TriggerNode';
import SendMessageNode from '../../flow/nodes/SendMessageNode';
import GetValueNode from '../../flow/nodes/GetValueNode';
import SetValueNode from '../../flow/nodes/SetValueNode';
import HumanNode from '../../flow/nodes/HumanNode';
import AndNode from '../../flow/nodes/AndNode';
import OrNode from '../../flow/nodes/OrNode';
import CommentNode from '../../flow/nodes/CommentNode';
import DirectionEdge from '../../flow/edges/DirectionEdge';

// Node types configuration - same as classic editor
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
  condition: ConditionNode,
  trigger: TriggerNode,
  send: SendMessageNode,
  human: HumanNode,
  get: GetValueNode,
  set: SetValueNode,
  and: AndNode,
  or: OrNode,
  comment: CommentNode,
};

const edgeTypes: EdgeTypes = {
  dir: DirectionEdge,
};

interface StaticFlowDashboardProps {
  diagramId?: string;
  onDiagramSelect?: (diagramId: string) => void;
  editable?: boolean;
}

interface DiagramSummary {
  diagramId: string;
  name: string;
  description?: string;
  totalInstances: number;
  activeInstances: number;
  createdAt: string;
  updatedAt: string;
}

const StaticFlowDashboard: React.FC<StaticFlowDashboardProps> = ({
  diagramId,
  onDiagramSelect,
  editable = false // Default to false for read-only
}) => {
  const [flowConfig, setFlowConfig] = useState<StaticFlowConfig | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(diagramId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  
  // React Flow state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Get open function from workspaceStore
  const openDiagram = useWorkspaceStore((s) => s.open);

  // Convert StaticFlowConfig to React Flow format
  const convertToReactFlowFormat = useCallback((config: StaticFlowConfig) => {
    // Convert nodes
    const reactFlowNodes: Node[] = config.nodes.map(node => ({
      id: node.nodeId,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.label || node.data.label || node.type,
        isReadOnly: true, // Add read-only flag for nodes
      },
      draggable: false, // Make nodes non-draggable
      connectable: false, // Make nodes non-connectable
      deletable: false, // Make nodes non-deletable
      selectable: false, // Make nodes non-selectable to prevent editing
    }));

    // Convert connections to edges with proper React Flow format
    const reactFlowEdges: Edge[] = config.connections.map(connection => {
      // Keep handle IDs as-is from database (s-top, s-right, t-top, t-right, etc.)
      // These match the handle IDs defined in BaseNode component
      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;

      // Create base edge
      const edge: Edge = {
        id: connection.edgeId || connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: connection.edgeType || 'dir',
        animated: connection.animated !== false,
        data: connection.data || {},
        style: connection.style || {},
        deletable: false,
        selectable: false, // Make edges non-selectable
      };

      // Apply same logic as flowStore for styling
      const sourceNode = config.nodes.find(n => n.nodeId === connection.sourceNodeId);
      const targetNode = config.nodes.find(n => n.nodeId === connection.targetNodeId);
      const isHumanAssignment = edge.data?.kind === 'human-assignment' || 
                                (sourceNode?.type === 'human' && 
                                (targetNode?.type === 'trigger' || targetNode?.type === 'send'));

      // Handle markerEnd and styling
      if (!isHumanAssignment) {
        // Normal edges get arrow marker
        (edge as any).markerEnd = { type: MarkerType.ArrowClosed };
        // Default styling for regular edges
        if (!edge.style || Object.keys(edge.style).length === 0) {
          edge.style = { stroke: '#374151', strokeWidth: 2 };
        }
      } else {
        // Human assignment edges - dashed line, no arrow
        edge.data = edge.data || {};
        edge.data.kind = 'human-assignment';
        edge.data.label = edge.data.label || 'Assigned to';
        edge.animated = false;
        edge.style = {
          stroke: '#6366f1', // Indigo color
          strokeWidth: 1.5,
          strokeDasharray: '5 5' // Dashed line
        };
        // No markerEnd for human assignments
      }

      return edge;
    });

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, []);

  // Load diagrams list
  const loadDiagrams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      params.append('limit', '50');
      
      const response = await fetch('/api/dashboard/flows?' + params.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to access diagrams');
        }
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to load diagrams: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDiagrams(result.data.flows);
      } else {
        throw new Error(result.error || 'Failed to load diagrams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading diagrams:', err);
    } finally {
      setLoading(false);
    }
  }, [searchName]);

  // Load flow configuration
  const loadFlowConfig = useCallback(async (id: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/dashboard/flow/static/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to access flow configuration');
        }
        if (response.status === 403) {
          throw new Error('Access denied to this flow');
        }
        throw new Error(`Failed to load flow configuration: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setFlowConfig(result.data);
        convertToReactFlowFormat(result.data);
      } else {
        throw new Error(result.error || 'Failed to load flow configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading flow config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadDiagrams();
  }, [loadDiagrams]);

  useEffect(() => {
    if (selectedDiagramId) {
      loadFlowConfig(selectedDiagramId);
    }
  }, [selectedDiagramId, loadFlowConfig]);

  // Event handlers
  const handleDiagramSelect = (id: string) => {
    setSelectedDiagramId(id);
    onDiagramSelect?.(id);
  };

  if (loading && diagrams.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading diagrams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center">
          <div className="text-lg font-semibold">Error loading diagrams</div>
          <div className="text-sm">{error}</div>
        </div>
        <Button onClick={loadDiagrams} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Static Flow Configuration</h2>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search diagrams..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-64"
          />
          <Button onClick={loadDiagrams} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Diagram Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Diagram</CardTitle>
          <CardDescription>Choose a workflow diagram to configure</CardDescription>
        </CardHeader>
        <CardContent>
          {diagrams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <div className="text-lg">No workflow diagrams found</div>
                <div className="text-sm">Create a new diagram from the main dashboard to get started.</div>
              </div>
              <Button onClick={loadDiagrams} variant="outline">
                Refresh
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {diagrams.map((diagram) => (
                <Card
                  key={diagram.diagramId}
                  className={`cursor-pointer transition-colors ${
                    selectedDiagramId === diagram.diagramId
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleDiagramSelect(diagram.diagramId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold truncate">{diagram.name}</h3>
                      <div className="flex space-x-1">
                        <Badge variant="secondary">{diagram.totalInstances}</Badge>
                        {diagram.activeInstances > 0 && (
                          <Badge variant="default">{diagram.activeInstances} active</Badge>
                        )}
                      </div>
                    </div>
                    {diagram.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {diagram.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500">
                      Updated: {new Date(diagram.updatedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow Canvas */}
      {selectedDiagramId ? (
        loading && !flowConfig ? (
          <Card className="flex-1">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-lg">Loading flow configuration...</div>
            </CardContent>
          </Card>
        ) : flowConfig ? (
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{flowConfig.name}</span>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={async () => {
                      // Use workspaceStore's open function like dashboard classic
                      await openDiagram(selectedDiagramId);
                    }}
                    variant="default"
                    size="sm"
                  >
                    Edit in Workspace
                  </Button>
                  <Badge variant="outline">
                    {nodes.length} nodes
                  </Badge>
                  <Badge variant="outline">
                    {edges.length} connections
                  </Badge>
                  <Badge variant="secondary">
                    Read-only
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Flow visualization - Interactive view (same as classic editor, but read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 h-full">
              <div style={{ width: '100%', height: '600px' }} className="relative">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  nodesFocusable={false}
                  edgesFocusable={false}
                  elementsSelectable={false}
                  selectNodesOnDrag={false}
                  panOnDrag={[1, 2]}
                  zoomOnScroll={true}
                  zoomOnPinch={true}
                  zoomOnDoubleClick={false}
                  preventScrolling={false}
                  minZoom={0.1}
                  maxZoom={4}
                  connectionRadius={28}
                  onNodeClick={undefined}
                  onEdgeClick={undefined}
                  onNodeDoubleClick={undefined}
                  onEdgeDoubleClick={undefined}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#e2e8f0" gap={24} />
                  <Controls />
                  <MiniMap
                    zoomable
                    pannable
                    className="!bg-white/70"
                    nodeStrokeColor="#374151"
                    nodeColor="#f3f4f6"
                    nodeBorderRadius={2}
                  />
                </ReactFlow>
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <Card className="flex-1">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">Select a diagram to view</div>
              <div className="text-sm">Choose a workflow from the list above</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaticFlowDashboard;