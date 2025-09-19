// Dashboard types for 3 different dashboard modes

export type DashboardMode = 'static' | 'statistics' | 'instance';

// Static Flow Dashboard - for configuring flows
export interface StaticFlowConfig {
  diagramId: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface FlowNode {
  id: string;
  nodeId: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  label?: string;
}

export interface FlowConnection {
  id: string;
  edgeId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  edgeType?: string;
  animated?: boolean;
  data?: Record<string, any>;
  style?: Record<string, any>;
  label?: string;
}

// Flow Statistics Dashboard - for monitoring all instances
export interface FlowStatistics {
  diagramId: string;
  diagramName: string;
  totalInstances: number;
  activeInstances: number;
  completedInstances: number;
  waitingInstances: number;
  errorInstances: number;
  nodeStatistics: NodeStatistics[];
  edges: EdgeStatistics[];
  recentActivity: ActivitySummary[];
  throughputMetrics: ThroughputMetrics;
}

export interface NodeStatistics {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  nodeData?: Record<string, any>;
  currentActiveCount: number;
  totalProcessedCount: number;
  averageProcessingTime: number; // in milliseconds
  errorCount: number;
  pendingCount: number;
  waitingCount: number;
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

export interface EdgeStatistics {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  edgeType?: string;
  animated?: boolean;
  data?: Record<string, any>;
  style?: Record<string, any>;
}

export interface ActivitySummary {
  timestamp: string;
  instanceId: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'waiting';
  processingTime?: number;
  userId?: number;
  userName?: string;
  startMappingId?: string;
  startObjectId?: string;
}

export interface ThroughputMetrics {
  instancesPerHour: number;
  instancesPerDay: number;
  averageCompletionTime: number; // in milliseconds
  bottleneckNodes: string[]; // node IDs that cause delays
}

// Instance Tracking Dashboard - for tracking specific instances
export interface InstanceTracking {
  instanceId: string;
  diagramId: string;
  diagramName: string;
  startMappingId: string;
  startObjectId: string;
  status: 'active' | 'completed' | 'error';
  startedBy: number;
  startedByName?: string;
  startedAt: string;
  completedAt?: string;
  context: Record<string, any>;
  journey: InstanceJourneyStep[];
  currentNodes: string[]; // current active node IDs
  dataFlow: DataFlowStep[];
}

export interface InstanceJourneyStep {
  nodeStateId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'waiting';
  startedAt: string;
  completedAt?: string;
  processingTime?: number;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  userId?: number;
  userName?: string;
  position: { x: number; y: number };
}

export interface DataFlowStep {
  fromNodeId: string;
  toNodeId: string;
  data: Record<string, any>;
  timestamp: string;
  connectionId: string;
}

// Search and filter interfaces
export interface InstanceSearchParams {
  diagramId?: string;
  startMappingId?: string;
  startObjectId?: string;
  status?: string;
  startedBy?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface FlowSearchParams {
  name?: string;
  createdBy?: number;
  dateFrom?: string;
  dateTo?: string;
  hasActiveInstances?: boolean;
}

// Dashboard state management
export interface DashboardState {
  mode: DashboardMode;
  selectedDiagramId?: string;
  selectedInstanceId?: string;
  searchParams: InstanceSearchParams | FlowSearchParams;
  refreshInterval: number; // in seconds
  autoRefresh: boolean;
}

// API response types
export interface FlowStatisticsResponse {
  success: boolean;
  data: FlowStatistics;
  error?: string;
}

export interface InstanceTrackingResponse {
  success: boolean;
  data: InstanceTracking;
  error?: string;
}

export interface StaticFlowResponse {
  success: boolean;
  data: StaticFlowConfig;
  error?: string;
}

export interface InstanceListResponse {
  success: boolean;
  data: {
    instances: InstanceTracking[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

export interface FlowListResponse {
  success: boolean;
  data: {
    flows: StaticFlowConfig[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

// Real-time update types
export interface RealTimeUpdate {
  type: 'instance_started' | 'instance_completed' | 'node_processed' | 'instance_error';
  instanceId: string;
  diagramId: string;
  nodeId?: string;
  timestamp: string;
  data?: Record<string, any>;
}

// Dashboard configuration
export interface DashboardConfig {
  refreshIntervals: number[]; // available refresh intervals in seconds
  defaultRefreshInterval: number;
  maxInstancesPerPage: number;
  maxFlowsPerPage: number;
  enableRealTimeUpdates: boolean;
  enableAutoRefresh: boolean;
}