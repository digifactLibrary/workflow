import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import type { NodeStatistics, EdgeStatistics } from '../../types/dashboard';
import FlowChartVisualization from './FlowChartVisualization';

interface FlowVisualizationProps {
  nodeStatistics: NodeStatistics[];
  edges?: EdgeStatistics[];
}

type ViewMode = 'cards' | 'flowchart';

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

const FlowVisualization: React.FC<FlowVisualizationProps> = ({ nodeStatistics, edges = [] }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('flowchart');
  
  const getNodeTypeInfo = (nodeType: string) => {
    const nodeTypeInfo = nodeTypes.find(type => type.type === nodeType);
    return nodeTypeInfo || { label: nodeType, color: '#6b7280', icon: '□' };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const getActivityLevel = (nodeStats: NodeStatistics) => {
    const totalActive = nodeStats.currentActiveCount + nodeStats.pendingCount + nodeStats.waitingCount;
    if (totalActive > 10) return 'high';
    if (totalActive > 3) return 'medium';
    if (totalActive > 0) return 'low';
    return 'idle';
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-red-400 bg-red-50';
      case 'medium': return 'border-yellow-400 bg-yellow-50';
      case 'low': return 'border-blue-400 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getActivityIndicator = (level: string) => {
    switch (level) {
      case 'high': return '🔥';
      case 'medium': return '⚠️';
      case 'low': return '🟡';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">View Mode:</span>
          <div className="flex rounded-lg border border-gray-300">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              📊 Cards View
            </Button>
            <Button
              variant={viewMode === 'flowchart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('flowchart')}
              className="rounded-l-none"
            >
              🔄 Flow Chart
            </Button>
          </div>
        </div>
        
        {/* Statistics Summary */}
        <div className="text-sm text-gray-600">
          {nodeStatistics.filter(n => !['start', 'end', 'human'].includes(n.nodeType)).length} active nodes • {nodeStatistics.reduce((sum, node) => sum + node.currentActiveCount + node.pendingCount + node.waitingCount, 0)} active instances
        </div>
      </div>

      {/* Render based on view mode */}
      {viewMode === 'cards' ? (
        <>
          {/* Card View - Original Implementation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nodeStatistics
              .filter((nodeStats) => {
                // Only show nodes that are NOT start, end, or human in card view
                return !['start', 'end', 'human'].includes(nodeStats.nodeType);
              })
              .sort((a, b) => {
                const totalA = a.currentActiveCount + a.pendingCount + a.waitingCount;
                const totalB = b.currentActiveCount + b.pendingCount + b.waitingCount;
                return totalB - totalA; // Sort by activity level
              })
              .map((nodeStats) => {
                const nodeTypeInfo = getNodeTypeInfo(nodeStats.nodeType);
                const totalActive = nodeStats.currentActiveCount + nodeStats.pendingCount + nodeStats.waitingCount;
                const activityLevel = getActivityLevel(nodeStats);
                
                return (
                  <Card 
                    key={nodeStats.nodeId} 
                    className={`border-2 transition-all duration-200 hover:shadow-md ${getActivityColor(activityLevel)}`}
                  >
                    <CardContent className="p-4">
                      {/* Node Header */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0"
                            style={{ backgroundColor: nodeTypeInfo.color }}
                          >
                            {nodeTypeInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm leading-tight break-words">
                              {nodeStats.nodeLabel || nodeStats.nodeType}
                            </div>
                            <div className="text-xs text-gray-500">
                              {nodeTypeInfo.label}
                            </div>
                          </div>
                        </div>
                        <div className="text-xl shrink-0">
                          {getActivityIndicator(activityLevel)}
                        </div>
                      </div>

                      {/* Current Activity */}
                      {totalActive > 0 && (
                        <div className="mb-3 p-2 bg-white rounded border">
                          <div className="text-xs font-medium text-gray-700 mb-1">Current Activity</div>
                          <div className="space-y-1">
                            {nodeStats.currentActiveCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center text-xs">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                  Active
                                </span>
                                <Badge variant="default" className="text-xs h-5">
                                  {nodeStats.currentActiveCount}
                                </Badge>
                              </div>
                            )}
                            
                            {nodeStats.pendingCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center text-xs">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                  Pending
                                </span>
                                <Badge variant="secondary" className="text-xs h-5">
                                  {nodeStats.pendingCount}
                                </Badge>
                              </div>
                            )}
                            
                            {nodeStats.waitingCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center text-xs">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                  Waiting
                                </span>
                                <Badge variant="outline" className="text-xs h-5">
                                  {nodeStats.waitingCount}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Performance Metrics */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Processed:</span>
                          <span className="text-sm font-medium">{nodeStats.totalProcessedCount}</span>
                        </div>
                        
                        {nodeStats.averageProcessingTime > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Avg Time:</span>
                            <span className="text-sm font-medium">
                              {formatDuration(nodeStats.averageProcessingTime)}
                            </span>
                          </div>
                        )}
                        
                        {nodeStats.errorCount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-red-600">Errors:</span>
                            <span className="text-sm font-medium text-red-600">{nodeStats.errorCount}</span>
                          </div>
                        )}

                        {/* Success Rate */}
                        {nodeStats.totalProcessedCount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Success Rate:</span>
                            <span className="text-sm font-medium text-green-600">
                              {((nodeStats.totalProcessedCount - nodeStats.errorCount) / nodeStats.totalProcessedCount * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar for Activity */}
                      {totalActive > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Activity Level</span>
                            <span>{totalActive} instances</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                activityLevel === 'high' ? 'bg-red-400' :
                                activityLevel === 'medium' ? 'bg-yellow-400' :
                                activityLevel === 'low' ? 'bg-blue-400' : 'bg-gray-400'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (totalActive / Math.max(1, Math.max(...nodeStatistics.map(n => n.currentActiveCount + n.pendingCount + n.waitingCount)))) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Summary Stats for Cards View */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {nodeStatistics.reduce((sum, node) => sum + node.currentActiveCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Active</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {nodeStatistics.reduce((sum, node) => sum + node.waitingCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Waiting</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {nodeStatistics.reduce((sum, node) => sum + node.totalProcessedCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {nodeStatistics.reduce((sum, node) => sum + node.errorCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Errors</div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Flow Chart View */
        <div className="border rounded-lg bg-white">
          <FlowChartVisualization nodeStatistics={nodeStatistics} edges={edges} />
        </div>
      )}
    </div>
  );
};

export default FlowVisualization;