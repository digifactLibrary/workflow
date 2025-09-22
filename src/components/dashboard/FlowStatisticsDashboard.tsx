import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { FlowStatistics } from '../../types/dashboard';
import FlowVisualization from './FlowVisualization';

// Node type definitions for statistics display
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

interface FlowStatisticsDashboardProps {
  diagramId?: string;
  onDiagramSelect?: (diagramId: string) => void;
  refreshInterval?: number;
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

const FlowStatisticsDashboard: React.FC<FlowStatisticsDashboardProps> = ({
  diagramId,
  onDiagramSelect,
  refreshInterval = 30
}) => {
  const [statistics, setStatistics] = useState<FlowStatistics | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(diagramId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load diagrams list (only those with instances)
  const loadDiagrams = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/flows?' + new URLSearchParams({
        hasActiveInstances: 'true',
        limit: '50'
      }));
      
      if (!response.ok) {
        throw new Error('Failed to load diagrams');
      }
      
      const result = await response.json();
      if (result.success) {
        setDiagrams(result.data.flows.filter((f: DiagramSummary) => f.totalInstances > 0));
      } else {
        throw new Error(result.error || 'Failed to load diagrams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // Load flow statistics
  const loadStatistics = useCallback(async (id: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/flow/statistics/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load flow statistics');
      }
      
      const result = await response.json();
      if (result.success) {
        setStatistics(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Failed to load flow statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !selectedDiagramId) return;

    const interval = setInterval(() => {
      loadStatistics(selectedDiagramId);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDiagramId, refreshInterval, loadStatistics]);

  // Initial load
  useEffect(() => {
    loadDiagrams();
  }, [loadDiagrams]);

  useEffect(() => {
    if (selectedDiagramId) {
      loadStatistics(selectedDiagramId);
    }
  }, [selectedDiagramId, loadStatistics]);

  // Event handlers
  const handleDiagramSelect = (id: string) => {
    setSelectedDiagramId(id);
    onDiagramSelect?.(id);
  };

  const handleRefresh = () => {
    if (selectedDiagramId) {
      loadStatistics(selectedDiagramId);
    }
    loadDiagrams();
  };

  const getNodeTypeInfo = (nodeType: string) => {
    const nodeTypeInfo = nodeTypes.find(type => type.type === nodeType);
    return nodeTypeInfo || { label: nodeType, color: '#gray', icon: '□' };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'waiting': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Flow Statistics & Monitoring</h2>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Auto-refresh</span>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Diagram Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Diagram to Monitor</CardTitle>
          <CardDescription>Choose a workflow diagram with active instances</CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Badge variant="secondary">{diagram.totalInstances} total</Badge>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      {statistics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Instances</p>
                    <p className="text-3xl font-bold">{statistics.totalInstances}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📊</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Active Instances</p>
                    <p className="text-3xl font-bold text-blue-600">{statistics.activeInstances}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">⚡</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Waiting</p>
                    <p className="text-3xl font-bold text-purple-600">{statistics.waitingInstances || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-xl">⏳</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{statistics.completedInstances}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xl">✅</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Errors</p>
                    <p className="text-3xl font-bold text-red-600">{statistics.errorInstances}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xl">❌</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Throughput Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Throughput Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.throughputMetrics.instancesPerHour}
                  </p>
                  <p className="text-sm text-gray-600">Instances per Hour</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.throughputMetrics.instancesPerDay}
                  </p>
                  <p className="text-sm text-gray-600">Instances per Day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(statistics.throughputMetrics.averageCompletionTime)}
                  </p>
                  <p className="text-sm text-gray-600">Average Completion Time</p>
                </div>
              </div>
              
              {statistics.throughputMetrics.bottleneckNodes.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-2">Bottleneck Nodes:</p>
                  <div className="flex flex-wrap gap-2">
                    {statistics.throughputMetrics.bottleneckNodes.map(nodeId => {
                      const nodeStats = statistics.nodeStatistics.find(n => n.nodeId === nodeId);
                      const nodeInfo = nodeStats ? getNodeTypeInfo(nodeStats.nodeType) : null;
                      
                      return (
                        <Badge key={nodeId} variant="outline" className="bg-yellow-100">
                          {nodeInfo?.icon} {nodeStats?.nodeLabel || nodeId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Node Statistics - Enhanced Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Flow Activity Monitoring</CardTitle>
              <CardDescription>Real-time node activity and performance metrics</CardDescription>
              {/* Debug info */}
              <div className="text-xs text-gray-500">
                Debug: Nodes: {statistics.nodeStatistics?.length || 0} | Edges: {statistics.edges?.length || 0}
                {statistics.edges?.length > 0 && ` | Sample: ${statistics.edges[0].sourceNodeId}→${statistics.edges[0].targetNodeId}`}
              </div>
            </CardHeader>
            <CardContent>
              <FlowVisualization nodeStatistics={statistics.nodeStatistics} edges={statistics.edges} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest node processing events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                {statistics.recentActivity.slice(0, 20).map((activity, index) => {
                  const nodeStats = statistics.nodeStatistics.find(n => n.nodeId === activity.nodeId);
                  const nodeTypeInfo = nodeStats ? getNodeTypeInfo(nodeStats.nodeType) : getNodeTypeInfo(activity.nodeType);
                  
                  return (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: nodeTypeInfo.color }}
                      >
                        {nodeTypeInfo.icon}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">
                            {nodeStats?.nodeLabel || activity.nodeType}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`}></div>
                          <Badge variant="outline" className="text-xs">
                            {activity.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Instance: {activity.instanceId.slice(-8)}
                          {activity.startMappingId && ` • Mapping: ${activity.startMappingId}`}
                          {activity.processingTime && ` • ${formatDuration(activity.processingTime)}`}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FlowStatisticsDashboard;