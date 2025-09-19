import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import StaticFlowDashboard from './StaticFlowDashboard';
import FlowStatisticsDashboard from './FlowStatisticsDashboard';
import InstanceTrackingDashboard from './InstanceTrackingDashboard';
import type { DashboardMode, DashboardState } from '../../types/dashboard';

interface DashboardSelectorProps {
  initialMode?: DashboardMode;
  initialDiagramId?: string;
  initialInstanceId?: string;
  initialMappingId?: string;
  initialObjectId?: string;
}

const dashboardModes = [
  {
    mode: 'static' as DashboardMode,
    title: 'Static Flow Config',
    description: 'Design and configure workflow diagrams',
    icon: '⚙️',
    color: 'bg-blue-500'
  },
  {
    mode: 'statistics' as DashboardMode,
    title: 'Flow Statistics',
    description: 'Monitor instances and performance metrics',
    icon: '📊',
    color: 'bg-green-500'
  },
  {
    mode: 'instance' as DashboardMode,
    title: 'Instance Tracking',
    description: 'Track individual workflow instances',
    icon: '🔍',
    color: 'bg-purple-500'
  }
];

const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  initialMode = 'static',
  initialDiagramId,
  initialInstanceId,
  initialMappingId,
  initialObjectId
}) => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    mode: initialMode,
    selectedDiagramId: initialDiagramId,
    selectedInstanceId: initialInstanceId,
    searchParams: {
      startMappingId: initialMappingId,
      startObjectId: initialObjectId
    },
    refreshInterval: 30,
    autoRefresh: true
  });

  const [breadcrumbs, setBreadcrumbs] = useState<Array<{
    label: string;
    mode: DashboardMode;
    data?: any;
  }>>([]);

  // Mode switching
  const handleModeChange = useCallback((newMode: DashboardMode) => {
    setDashboardState(prev => ({
      ...prev,
      mode: newMode,
      // Reset specific selections when changing modes
      ...(newMode !== 'instance' && { selectedInstanceId: undefined }),
      ...(newMode === 'instance' && { selectedDiagramId: undefined })
    }));
  }, []);

  // Diagram selection from static or statistics dashboard
  const handleDiagramSelect = useCallback((diagramId: string) => {
    setDashboardState(prev => ({
      ...prev,
      selectedDiagramId: diagramId
    }));
  }, []);

  // Instance selection from search or statistics
  const handleInstanceSelect = useCallback((instanceId: string) => {
    setDashboardState(prev => ({
      ...prev,
      selectedInstanceId: instanceId,
      mode: 'instance' // Auto-switch to instance tracking mode
    }));
  }, []);

  // Navigation helpers
  const navigateToStatistics = useCallback((diagramId: string) => {
    setDashboardState(prev => ({
      ...prev,
      mode: 'statistics',
      selectedDiagramId: diagramId
    }));
    
    setBreadcrumbs(prev => [
      ...prev,
      {
        label: `Statistics for Diagram ${diagramId}`,
        mode: 'statistics',
        data: { diagramId }
      }
    ]);
  }, []);

  const navigateToInstanceTracking = useCallback((instanceId: string, context?: any) => {
    setDashboardState(prev => ({
      ...prev,
      mode: 'instance',
      selectedInstanceId: instanceId
    }));
    
    setBreadcrumbs(prev => [
      ...prev,
      {
        label: `Instance ${instanceId.slice(-8)}`,
        mode: 'instance',
        data: { instanceId, ...context }
      }
    ]);
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    const breadcrumb = breadcrumbs[index];
    if (breadcrumb) {
      setDashboardState(prev => ({
        ...prev,
        mode: breadcrumb.mode,
        ...(breadcrumb.data?.diagramId && { selectedDiagramId: breadcrumb.data.diagramId }),
        ...(breadcrumb.data?.instanceId && { selectedInstanceId: breadcrumb.data.instanceId })
      }));
      
      // Trim breadcrumbs to clicked level
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  const getCurrentModeInfo = () => {
    return dashboardModes.find(m => m.mode === dashboardState.mode);
  };

  const renderModeSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Mode</CardTitle>
        <CardDescription>Choose the type of dashboard to view</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardModes.map((mode) => (
            <Card
              key={mode.mode}
              className={`cursor-pointer transition-all ${
                dashboardState.mode === mode.mode
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'hover:bg-gray-50 hover:shadow-sm'
              }`}
              onClick={() => handleModeChange(mode.mode)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 ${mode.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl">{mode.icon}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{mode.title}</h3>
                <p className="text-sm text-gray-600">{mode.description}</p>
                {dashboardState.mode === mode.mode && (
                  <Badge variant="default" className="mt-3">
                    Active
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderBreadcrumbs = () => {
    if (breadcrumbs.length === 0) return null;

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setBreadcrumbs([]);
            setDashboardState(prev => ({
              ...prev,
              selectedDiagramId: undefined,
              selectedInstanceId: undefined
            }));
          }}
        >
          🏠 Home
        </Button>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <span className="text-gray-400">›</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBreadcrumbClick(index)}
              className={index === breadcrumbs.length - 1 ? 'font-semibold' : ''}
            >
              {crumb.label}
            </Button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderCurrentDashboard = () => {
    const mode = dashboardState.mode;
    
    switch (mode) {
      case 'static':
        return (
          <StaticFlowDashboard
            diagramId={dashboardState.selectedDiagramId}
            onDiagramSelect={handleDiagramSelect}
            editable={true}
          />
        );
      
      case 'statistics':
        return (
          <FlowStatisticsDashboard
            diagramId={dashboardState.selectedDiagramId}
            onDiagramSelect={handleDiagramSelect}
            refreshInterval={dashboardState.refreshInterval}
          />
        );
      
      case 'instance':
        return (
          <InstanceTrackingDashboard
            instanceId={dashboardState.selectedInstanceId}
            startMappingId={dashboardState.searchParams.startMappingId}
            startObjectId={dashboardState.searchParams.startObjectId}
            onInstanceSelect={handleInstanceSelect}
          />
        );
      
      default:
        return <div>Invalid dashboard mode</div>;
    }
  };

  const renderQuickActions = () => {
    const currentMode = getCurrentModeInfo();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <span className={`w-8 h-8 ${currentMode?.color} rounded-full flex items-center justify-center`}>
              {currentMode?.icon}
            </span>
            <span>{currentMode?.title}</span>
          </CardTitle>
          <CardDescription>{currentMode?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dashboardState.mode !== 'static' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeChange('static')}
              >
                ⚙️ Configure Flow
              </Button>
            )}
            
            {dashboardState.mode !== 'statistics' && dashboardState.selectedDiagramId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToStatistics(dashboardState.selectedDiagramId!)}
              >
                📊 View Statistics
              </Button>
            )}
            
            {dashboardState.mode !== 'instance' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeChange('instance')}
              >
                🔍 Track Instance
              </Button>
            )}
            
            {/* Refresh interval control for statistics */}
            {dashboardState.mode === 'statistics' && (
              <div className="flex items-center space-x-2 ml-auto">
                <span className="text-sm">Auto-refresh:</span>
                <select
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  value={dashboardState.refreshInterval}
                  onChange={(e) => setDashboardState(prev => ({
                    ...prev,
                    refreshInterval: parseInt(e.target.value)
                  }))}
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                  <option value={0}>Off</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage workflows, monitor performance, and track instances
          </p>
        </div>
        
        {/* Current Status */}
        <div className="text-right">
          {dashboardState.selectedDiagramId && (
            <Badge variant="outline" className="mb-1">
              Diagram: {dashboardState.selectedDiagramId}
            </Badge>
          )}
          {dashboardState.selectedInstanceId && (
            <Badge variant="outline" className="mb-1 ml-2">
              Instance: {dashboardState.selectedInstanceId.slice(-8)}
            </Badge>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Mode Selector - only show when no specific selection */}
      {!dashboardState.selectedDiagramId && !dashboardState.selectedInstanceId && (
        renderModeSelector()
      )}

      {/* Quick Actions */}
      {(dashboardState.selectedDiagramId || dashboardState.selectedInstanceId) && (
        renderQuickActions()
      )}

      {/* Current Dashboard */}
      <div className="flex-1">
        {renderCurrentDashboard()}
      </div>
    </div>
  );
};

export default DashboardSelector;