import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { InstanceTracking, InstanceJourneyStep, DataFlowStep } from '../../types/dashboard';

// Node type definitions
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

interface InstanceTrackingDashboardProps {
  instanceId?: string;
  startMappingId?: string;
  startObjectId?: string;
  onInstanceSelect?: (instanceId: string) => void;
}

interface InstanceSummary {
  instanceId: string;
  diagramId: string;
  diagramName: string;
  startMappingId: string;
  startObjectId: string;
  status: string;
  startedBy: number;
  startedAt: string;
  completedAt?: string;
  progress: {
    totalNodes: number;
    completedNodes: number;
    activeNodes: number;
  };
}

const InstanceTrackingDashboard: React.FC<InstanceTrackingDashboardProps> = ({
  instanceId,
  startMappingId,
  startObjectId,
  onInstanceSelect
}) => {
  const [tracking, setTracking] = useState<InstanceTracking | null>(null);
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(instanceId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    mappingId: startMappingId || '',
    objectId: startObjectId || '',
    status: '',
    diagramId: ''
  });
  const [showJourneyDetails, setShowJourneyDetails] = useState(false);

  // Search instances
  const searchInstances = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchParams.mappingId) params.append('startMappingId', searchParams.mappingId);
      if (searchParams.objectId) params.append('startObjectId', searchParams.objectId);
      if (searchParams.status) params.append('status', searchParams.status);
      if (searchParams.diagramId) params.append('diagramId', searchParams.diagramId);
      params.append('limit', '50');
      
      const response = await fetch('/api/dashboard/instances/search?' + params.toString());
      
      if (!response.ok) {
        throw new Error('Failed to search instances');
      }
      
      const result = await response.json();
      if (result.success) {
        setInstances(result.data.instances);
      } else {
        throw new Error(result.error || 'Failed to search instances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Load instance tracking details
  const loadInstanceTracking = useCallback(async (id: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/instance/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load instance tracking');
      }
      
      const result = await response.json();
      if (result.success) {
        setTracking(result.data);
      } else {
        throw new Error(result.error || 'Failed to load instance tracking');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    if (searchParams.mappingId || searchParams.objectId || searchParams.status || searchParams.diagramId) {
      searchInstances();
    }
  }, [searchInstances]);

  useEffect(() => {
    if (selectedInstanceId) {
      loadInstanceTracking(selectedInstanceId);
    }
  }, [selectedInstanceId, loadInstanceTracking]);

  // Event handlers
  const handleInstanceSelect = (id: string) => {
    setSelectedInstanceId(id);
    onInstanceSelect?.(id);
  };

  const handleSearch = () => {
    searchInstances();
  };

  const getNodeTypeInfo = (nodeType: string) => {
    const nodeTypeInfo = nodeTypes.find(type => type.type === nodeType);
    return nodeTypeInfo || { label: nodeType, color: '#gray', icon: '□' };
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
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

  const getProgressPercentage = (instance: InstanceSummary) => {
    if (instance.progress.totalNodes === 0) return 0;
    return Math.round((instance.progress.completedNodes / instance.progress.totalNodes) * 100);
  };

  if (loading && !tracking && instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
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
        <h2 className="text-2xl font-bold">Instance Tracking</h2>
        <Button onClick={() => setShowJourneyDetails(!showJourneyDetails)}>
          {showJourneyDetails ? 'Hide' : 'Show'} Journey Details
        </Button>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Instances</CardTitle>
          <CardDescription>Search for workflow instances by mapping ID, object ID, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Mapping ID"
              value={searchParams.mappingId}
              onChange={(e) => setSearchParams(prev => ({ ...prev, mappingId: e.target.value }))}
            />
            <Input
              placeholder="Object ID"
              value={searchParams.objectId}
              onChange={(e) => setSearchParams(prev => ({ ...prev, objectId: e.target.value }))}
            />
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.status}
              onChange={(e) => setSearchParams(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="error">Error</option>
            </select>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {instances.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-auto">
              {instances.map((instance) => (
                <Card
                  key={instance.instanceId}
                  className={`cursor-pointer transition-colors ${
                    selectedInstanceId === instance.instanceId
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleInstanceSelect(instance.instanceId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{instance.diagramName}</h3>
                          <Badge variant={getStatusBadgeVariant(instance.status)}>
                            {instance.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Instance: {instance.instanceId.slice(-8)}</span>
                          {instance.startMappingId && (
                            <span> • Mapping: {instance.startMappingId}</span>
                          )}
                          {instance.startObjectId && (
                            <span> • Object: {instance.startObjectId}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Started: {formatTimestamp(instance.startedAt)}
                          {instance.completedAt && ` • Completed: ${formatTimestamp(instance.completedAt)}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {getProgressPercentage(instance)}% Complete
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${getProgressPercentage(instance)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {instance.progress.completedNodes}/{instance.progress.totalNodes} nodes
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instance Details */}
      {tracking && (
        <>
          {/* Instance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{tracking.diagramName}</span>
                <Badge variant={getStatusBadgeVariant(tracking.status)} className="text-lg px-3 py-1">
                  {tracking.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Instance: {tracking.instanceId} • 
                Started: {formatTimestamp(tracking.startedAt)}
                {tracking.completedAt && ` • Completed: ${formatTimestamp(tracking.completedAt)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mapping ID</p>
                  <p className="text-lg font-semibold">{tracking.startMappingId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Object ID</p>
                  <p className="text-lg font-semibold">{tracking.startObjectId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Started By</p>
                  <p className="text-lg font-semibold">User {tracking.startedBy}</p>
                </div>
              </div>

              {tracking.currentNodes.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800 mb-2">Currently Active Nodes:</p>
                  <div className="flex flex-wrap gap-2">
                    {tracking.currentNodes.map(nodeId => {
                      const step = tracking.journey.find(s => s.nodeId === nodeId);
                      const nodeInfo = step ? getNodeTypeInfo(step.nodeType) : null;
                      
                      return (
                        <Badge key={nodeId} variant="default" className="bg-blue-100 text-blue-800">
                          {nodeInfo?.icon} {step?.nodeLabel || nodeId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Instance Journey</CardTitle>
              <CardDescription>Visual timeline of the instance flow through nodes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-96 bg-gray-50 border border-gray-200 rounded-lg overflow-auto">
                {/* Journey Path */}
                {tracking.journey.map((step, index) => {
                  const nodeTypeInfo = getNodeTypeInfo(step.nodeType);
                  const isActive = tracking.currentNodes.includes(step.nodeId);
                  const nextStep = tracking.journey[index + 1];
                  
                  return (
                    <div key={step.nodeStateId}>
                      {/* Node */}
                      <div
                        className={`absolute border-2 rounded-lg p-3 shadow-sm transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-100 shadow-lg'
                            : step.status === 'completed'
                            ? 'border-green-500 bg-green-50'
                            : step.status === 'error'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        }`}
                        style={{
                          left: step.position.x,
                          top: step.position.y,
                          width: '200px',
                          minHeight: '100px'
                        }}
                      >
                        {/* Node Header */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: nodeTypeInfo.color }}
                          >
                            {nodeTypeInfo.icon}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm truncate">
                              {step.nodeLabel || step.nodeType}
                            </div>
                            <div className="text-xs text-gray-500">
                              {nodeTypeInfo.label}
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(step.status)}`}></div>
                        </div>

                        {/* Status and Timing */}
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <Badge variant="outline" className="text-xs">
                              {step.status}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Started:</span>
                            <span>{new Date(step.startedAt).toLocaleTimeString()}</span>
                          </div>
                          
                          {step.completedAt && (
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span>{new Date(step.completedAt).toLocaleTimeString()}</span>
                            </div>
                          )}
                          
                          {step.processingTime && (
                            <div className="flex justify-between">
                              <span>Duration:</span>
                              <span className="font-medium">
                                {formatDuration(step.processingTime)}
                              </span>
                            </div>
                          )}

                          {step.userId && (
                            <div className="flex justify-between">
                              <span>User:</span>
                              <span>{step.userId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connection Line to Next Node */}
                      {nextStep && (
                        <svg
                          className="absolute pointer-events-none"
                          style={{
                            left: step.position.x + 100,
                            top: step.position.y + 50,
                            width: Math.abs(nextStep.position.x - step.position.x),
                            height: Math.abs(nextStep.position.y - step.position.y) + 100,
                            zIndex: 1
                          }}
                        >
                          <path
                            d={`M 0 0 L ${nextStep.position.x - step.position.x - 100} ${nextStep.position.y - step.position.y}`}
                            stroke="#6b7280"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                          />
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="7"
                              refX="9"
                              refY="3.5"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                            </marker>
                          </defs>
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Journey Details */}
          {showJourneyDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Journey Log</CardTitle>
                <CardDescription>Step-by-step execution details with data flow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.journey.map((step, index) => {
                    const nodeTypeInfo = getNodeTypeInfo(step.nodeType);
                    
                    return (
                      <div key={step.nodeStateId} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: nodeTypeInfo.color }}
                          >
                            {nodeTypeInfo.icon}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {step.nodeLabel || step.nodeType}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {nodeTypeInfo.label} • {step.nodeId}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(step.status)}>
                            {step.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Timing:</p>
                            <p>Started: {formatTimestamp(step.startedAt)}</p>
                            {step.completedAt && (
                              <p>Completed: {formatTimestamp(step.completedAt)}</p>
                            )}
                            {step.processingTime && (
                              <p>Duration: {formatDuration(step.processingTime)}</p>
                            )}
                          </div>
                          
                          {step.userId && (
                            <div>
                              <p className="font-medium">User:</p>
                              <p>ID: {step.userId}</p>
                            </div>
                          )}
                        </div>

                        {step.inputData && Object.keys(step.inputData).length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-sm mb-1">Input Data:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(step.inputData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {step.outputData && Object.keys(step.outputData).length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-sm mb-1">Output Data:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(step.outputData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {step.errorMessage && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="font-medium text-sm text-red-800 mb-1">Error:</p>
                            <p className="text-sm text-red-600">{step.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Flow */}
          {tracking.dataFlow.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Flow</CardTitle>
                <CardDescription>Data passed between nodes during execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tracking.dataFlow.map((flow, index) => {
                    const fromStep = tracking.journey.find(s => s.nodeId === flow.fromNodeId);
                    const toStep = tracking.journey.find(s => s.nodeId === flow.toNodeId);
                    
                    return (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {fromStep?.nodeLabel || flow.fromNodeId}
                          </Badge>
                          <span className="text-gray-400">→</span>
                          <Badge variant="outline" className="text-xs">
                            {toStep?.nodeLabel || flow.toNodeId}
                          </Badge>
                        </div>
                        
                        <div className="flex-1">
                          <div className="text-sm text-gray-600">
                            {formatTimestamp(flow.timestamp)}
                          </div>
                          {Object.keys(flow.data).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-blue-600 cursor-pointer">
                                View Data ({Object.keys(flow.data).length} fields)
                              </summary>
                              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-20">
                                {JSON.stringify(flow.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Context Data */}
          {tracking.context && Object.keys(tracking.context).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Instance Context</CardTitle>
                <CardDescription>Global context data for this workflow instance</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(tracking.context, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default InstanceTrackingDashboard;