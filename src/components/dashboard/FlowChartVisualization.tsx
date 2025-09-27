import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Handle, Position, MarkerType } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '../ui/badge';
import type { NodeStatistics, EdgeStatistics } from '../../types/dashboard';

interface FlowChartVisualizationProps {
  nodeStatistics: NodeStatistics[];
  edges?: EdgeStatistics[];
}

const nodeTypes = [
  { type: 'start', label: 'Start', color: '#10b981', icon: '▶' },
  { type: 'trigger', label: 'Trigger', color: '#3b82f6', icon: '⚡' },
  { type: 'send', label: 'Send Message', color: '#8b5cf6', icon: '📤' },
  { type: 'get', label: 'Get Value', color: '#10b981', icon: '📥' },
  { type: 'set', label: 'Set Value', color: '#d946ef', icon: '📤' },
  { type: 'human', label: 'Human', color: '#0ea5e9', icon: '👤' },
  { type: 'decision', label: 'Decision (Yes/No)', color: '#f59e0b', icon: '◆' },
  { type: 'condition', label: 'Condition', color: '#14b8a6', icon: '◇' },
  { type: 'and', label: 'AND', color: '#10b981', icon: '&' },
  { type: 'or', label: 'OR', color: '#f97316', icon: '|' },
  { type: 'comment', label: 'Comment', color: '#eab308', icon: '💬' },
  { type: 'end', label: 'End', color: '#f43f5e', icon: '⏹' }
];

// Custom Node Component for Statistics
const StatisticsNode = ({ data }: { data: any }) => {
  const {
    nodeType,
    nodeLabel,
    nodeData,
    currentActiveCount,
    pendingCount,
    waitingCount,
    totalProcessedCount,
    errorCount,
    averageProcessingTime,
    nodeTypeInfo,
    width,
    height
  } = data;

  const totalActive = currentActiveCount + pendingCount + waitingCount;
  
  // Check if this is a simple node type (start, end, human)
  const isSimpleNode = ['start', 'end', 'human'].includes(nodeType);
  
  // Get human type display for human nodes
  const getHumanTypeDisplay = () => {
    if (nodeType !== 'human' || !nodeData) return null;
    const humanType = nodeData.humanType;
    if (humanType === 'personal') return 'Chỉ định';
    if (humanType === 'role') return 'Chức danh';
    return null;
  };
  
  const getActivityLevel = () => {
    if (totalActive > 10) return 'high';
    if (totalActive > 3) return 'medium';
    if (totalActive > 0) return 'low';
    return 'idle';
  };

  const activityLevel = getActivityLevel();
  
  const getBorderColor = () => {
    if (isSimpleNode) return nodeTypeInfo.color; // Use node type color for simple nodes
    switch (activityLevel) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#d1d5db';
    }
  };

  const getBackgroundColor = () => {
    if (isSimpleNode) return '#ffffff'; // White background for simple nodes
    switch (activityLevel) {
      case 'high': return '#fef2f2';
      case 'medium': return '#fffbeb';
      case 'low': return '#eff6ff';
      default: return '#ffffff';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  // Simple node layout for start, end, human
  if (isSimpleNode) {
    const humanTypeDisplay = getHumanTypeDisplay();
    
    return (
      <div 
        className="px-3 py-3 shadow-lg rounded-lg border-2 bg-white relative"
        style={{
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
          width: Math.max(width || 140, 140), // Wider for human type display
          height: Math.max(height || 100, humanTypeDisplay ? 110 : 100),  // Taller for human type
          minWidth: 140,
          minHeight: humanTypeDisplay ? 110 : 100
        }}
      >
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        {/* Use BaseNode-compatible handles */}
        {/* Top handles */}
        <Handle
          type="source"
          position={Position.Top}
          id="s-top"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="t-top"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        
        {/* Right handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="s-right"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="t-right"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        
        {/* Bottom handles */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="s-bottom"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="t-bottom"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        
        {/* Left handles */}
        <Handle
          type="source"
          position={Position.Left}
          id="s-left"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="t-left"
          style={{ background: nodeTypeInfo.color, width: 8, height: 8, border: '2px solid white' }}
        />

        {/* Simple Content - Just Icon and Label */}
        <div className="flex flex-col items-center justify-center h-full">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm mb-2"
            style={{ backgroundColor: nodeTypeInfo.color }}
          >
            {nodeTypeInfo.icon}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm truncate">
              {nodeLabel || nodeType}
            </div>
            <div className="text-xs text-gray-500">
              {nodeTypeInfo.label}
            </div>
            {humanTypeDisplay && (
              <div className="text-xs text-blue-600 font-medium mt-1">
                {humanTypeDisplay}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full detailed layout for other nodes
  return (
    <div 
      className="px-3 py-2 shadow-lg rounded-lg border-2 bg-white relative"
      style={{
        borderColor: getBorderColor(),
        backgroundColor: getBackgroundColor(),
        width: width || 200,
        height: height || 120,
        minWidth: 180,
        minHeight: 100
      }}
    >
      {/* Connection Handles - BaseNode compatible */}
      {/* Top handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="s-top"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      
      {/* Right handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="t-right"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      
      {/* Bottom handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="t-bottom"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      
      {/* Left handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="s-left"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }}
      />

      {/* Node Header */}
      <div className="flex items-center space-x-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: nodeTypeInfo.color }}
        >
          {nodeTypeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs truncate">
            {nodeLabel || nodeType}
          </div>
          <div className="text-xs text-gray-500">
            {nodeTypeInfo.label}
          </div>
        </div>
        {totalActive > 0 ? (
          <div className="text-sm">
            {activityLevel === 'high' ? '🔥' : 
             activityLevel === 'medium' ? '⚠️' : 
             activityLevel === 'low' ? '🟡' : '⚪'}
          </div>
        ) : (
          <div className="text-xs text-gray-400">
            {totalProcessedCount > 0 ? '✓' : '○'}
          </div>
        )}
      </div>

      {/* Current Activity */}
      {totalActive > 0 && (
        <div className="mb-2 p-1 bg-white rounded border text-xs">
          <div className="font-medium text-gray-700 mb-1 text-xs">Live Activity</div>
          <div className="space-y-1">
            {currentActiveCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center text-xs">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                  Active
                </span>
                <Badge variant="default" className="text-xs h-4 px-1">
                  {currentActiveCount}
                </Badge>
              </div>
            )}
            
            {pendingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center text-xs">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1"></div>
                  Pending
                </span>
                <Badge variant="secondary" className="text-xs h-4 px-1">
                  {pendingCount}
                </Badge>
              </div>
            )}
            
            {waitingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center text-xs">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></div>
                  Waiting
                </span>
                <Badge variant="outline" className="text-xs h-4 px-1">
                  {waitingCount}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics - Show for all nodes */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Processed:</span>
          <span className="font-medium">{totalProcessedCount}</span>
        </div>
        {totalProcessedCount === 0 && (
          <div className="text-xs text-gray-400 text-center py-1">
            {nodeType === 'start' ? 'Entry Point' : 'Not yet executed'}
          </div>
        )}
        {averageProcessingTime > 0 && (
          <div className="flex justify-between">
            <span>Avg Time:</span>
            <span className="font-medium">
              {formatDuration(averageProcessingTime)}
            </span>
          </div>
        )}
        {errorCount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Errors:</span>
            <span className="font-medium">{errorCount}</span>
          </div>
        )}
        {totalProcessedCount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Success:</span>
            <span className="font-medium">
              {((totalProcessedCount - errorCount) / totalProcessedCount * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Activity Progress Bar */}
      {totalActive > 0 && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activityLevel === 'high' ? 'bg-red-400' :
                activityLevel === 'medium' ? 'bg-yellow-400' :
                activityLevel === 'low' ? 'bg-blue-400' : 'bg-gray-400'
              }`}
              style={{ 
                width: `${Math.min(100, (totalActive / 15) * 100)}%` // Scale relative to max expected
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {totalActive} active instances
          </div>
        </div>
      )}
    </div>
  );
};

const nodeTypesMap: NodeTypes = {
  statisticsNode: StatisticsNode,
};

const FlowChartVisualization: React.FC<FlowChartVisualizationProps> = ({ nodeStatistics, edges: edgeStatistics = [] }) => {
  const getNodeTypeInfo = (nodeType: string) => {
    const nodeTypeInfo = nodeTypes.find(type => type.type === nodeType);
    return nodeTypeInfo || { label: nodeType, color: '#6b7280', icon: '□' };
  };

  // Generate cache key based on diagram (use first nodeId as identifier)
  const cacheKey = `flow-positions-${nodeStatistics[0]?.nodeId.split('-')[0] || 'default'}`;

  // Load cached positions from localStorage
  const loadCachedPositions = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load cached positions:', error);
    }
    return {};
  }, [cacheKey]);

  // Save positions to localStorage
  const saveCachedPositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(positions));
    } catch (error) {
      console.warn('Failed to save positions to cache:', error);
    }
  }, [cacheKey]);

  const initialNodes = useMemo(() => {
    const cachedPositions = loadCachedPositions();
    
    return nodeStatistics.map((nodeStats) => {
      const nodeTypeInfo = getNodeTypeInfo(nodeStats.nodeType);
      
      // Use cached position if available, otherwise use original position
      const cachedPos = cachedPositions[nodeStats.nodeId];
      const position = cachedPos || { 
        x: nodeStats.position.x || 0, 
        y: nodeStats.position.y || 0 
      };
      
      return {
        id: nodeStats.nodeId,
        type: 'statisticsNode',
        position,
        data: {
          ...nodeStats,
          nodeTypeInfo,
          width: nodeStats.width || 200,
          height: nodeStats.height || 120
        },
        style: {
          width: nodeStats.width || 200,
          height: nodeStats.height || 120
        }
      };
    });
  }, [nodeStatistics, loadCachedPositions]);

  const initialEdges = useMemo(() => {
    if (edgeStatistics.length === 0) {
      return [];
    }
    
    return edgeStatistics.map((edgeStats) => {
      
      const sourceNode = nodeStatistics.find(n => n.nodeId === edgeStats.sourceNodeId);
      
      // Calculate activity level based on source node activity
      const sourceActivity = sourceNode ? 
        sourceNode.currentActiveCount + sourceNode.pendingCount + sourceNode.waitingCount : 0;
      
      // Merge database style with activity-based styling
      const baseStyle = edgeStats.style || {};
      const activityStyle = {
        stroke: sourceActivity > 0 ? '#3b82f6' : '#9ca3af',
        strokeWidth: sourceActivity > 0 ? Math.min(4, 2 + sourceActivity) : 2,
      };
      
      // Handle sourceHandle and targetHandle - use null if empty/undefined to let React Flow auto-connect
      const sourceHandle = edgeStats.sourceHandle && edgeStats.sourceHandle.trim() !== '' ? edgeStats.sourceHandle : null;
      const targetHandle = edgeStats.targetHandle && edgeStats.targetHandle.trim() !== '' ? edgeStats.targetHandle : null;
      
      return {
        id: edgeStats.edgeId,
        source: edgeStats.sourceNodeId,
        target: edgeStats.targetNodeId,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: edgeStats.edgeType === 'straight' ? 'straight' : 'smoothstep',
        animated: edgeStats.animated || sourceActivity > 0,
        style: { ...baseStyle, ...activityStyle },
        label: sourceActivity > 0 ? `${sourceActivity} pending` : undefined,
        labelStyle: { 
          fontSize: 10, 
          fill: '#3b82f6',
          fontWeight: 'bold'
        },
        data: edgeStats.data || {},
        markerEnd: { type: MarkerType.ArrowClosed, color: activityStyle.stroke }
      };
    });
  }, [nodeStatistics, edgeStatistics]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom onNodesChange that saves positions to localStorage
  const onNodesChange = useCallback((changes: any) => {
    onNodesChangeBase(changes);
    
    // Check if there are position changes where dragging has ended
    const hasPositionChanges = changes.some((change: any) => 
      change.type === 'position' && change.dragging === false
    );
    
    if (hasPositionChanges) {
      // Save positions with a small delay to ensure state is updated
      setTimeout(() => {
        const positionsToCache = nodes.reduce((acc, node) => {
          if (node.position) {
            acc[node.id] = node.position;
          }
          return acc;
        }, {} as Record<string, { x: number; y: number }>);
        
        saveCachedPositions(positionsToCache);
      }, 100);
    }
  }, [onNodesChangeBase, nodes, saveCachedPositions]);

  // Update nodes when nodeStatistics changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when edgeStatistics changes
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const defaultViewport = { x: 0, y: 0, zoom: 0.8 };

  return (
    <div>
      {/* Instruction Banner */}
      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700">
            💡 <strong>Interactive Flow Chart:</strong> Drag nodes to reposition • All workflow nodes displayed
          </span>
          <span className="text-blue-600 text-xs">
            {nodeStatistics.length} total nodes • {edgeStatistics.length} connections
          </span>
        </div>
      </div>
      
      <div style={{ width: '100%', height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypesMap}
          defaultViewport={defaultViewport}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          connectOnClick={false}
          deleteKeyCode={null}
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const nodeStats = nodeStatistics.find(n => n.nodeId === node.id);
              if (!nodeStats) return '#d1d5db';
              
              const totalActive = nodeStats.currentActiveCount + nodeStats.pendingCount + nodeStats.waitingCount;
              if (totalActive > 10) return '#ef4444';
              if (totalActive > 3) return '#f59e0b';
              if (totalActive > 0) return '#3b82f6';
              return '#d1d5db';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowChartVisualization;