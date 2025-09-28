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
    color: 'bg-blue-500',
  },
  {
    mode: 'statistics' as DashboardMode,
    title: 'Flow Statistics',
    description: 'Monitor instances and performance metrics',
    icon: '📊',
    color: 'bg-green-500',
  },
  {
    mode: 'instance' as DashboardMode,
    title: 'Instance Tracking',
    description: 'Track individual workflow instances',
    icon: '🔍',
    color: 'bg-purple-500',
  },
];

const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  initialMode = 'static',
  initialDiagramId,
  initialInstanceId,
  initialMappingId,
  initialObjectId,
}) => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    mode: initialMode,
    selectedDiagramId: initialDiagramId,
    selectedInstanceId: initialInstanceId,
    searchParams: {
      startMappingId: initialMappingId,
      startObjectId: initialObjectId,
    },
    refreshInterval: 30,
    autoRefresh: true,
  });

  const [breadcrumbs, setBreadcrumbs] = useState<Array<{
    label: string;
    mode: DashboardMode;
    data?: any;
  }>>([]);

  const handleModeChange = useCallback((newMode: DashboardMode) => {
    setDashboardState((prev) => ({
      ...prev,
      mode: newMode,
      ...(newMode !== 'instance' && { selectedInstanceId: undefined }),
      ...(newMode === 'instance' && { selectedDiagramId: undefined }),
    }));
  }, []);

  const handleDiagramSelect = useCallback((diagramId: string) => {
    setDashboardState((prev) => ({
      ...prev,
      selectedDiagramId: diagramId,
    }));
  }, []);

  const handleInstanceSelect = useCallback((instanceId: string) => {
    setDashboardState((prev) => ({
      ...prev,
      selectedInstanceId: instanceId,
      mode: 'instance',
    }));
  }, []);

  const navigateToStatistics = useCallback((diagramId: string) => {
    setDashboardState((prev) => ({
      ...prev,
      mode: 'statistics',
      selectedDiagramId: diagramId,
    }));

    setBreadcrumbs((prev) => [
      ...prev,
      {
        label: `Statistics for Diagram ${diagramId}`,
        mode: 'statistics',
        data: { diagramId },
      },
    ]);
  }, []);

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const breadcrumb = breadcrumbs[index];
      if (breadcrumb) {
        setDashboardState((prev) => ({
          ...prev,
          mode: breadcrumb.mode,
          ...(breadcrumb.data?.diagramId && { selectedDiagramId: breadcrumb.data.diagramId }),
          ...(breadcrumb.data?.instanceId && { selectedInstanceId: breadcrumb.data.instanceId }),
        }));
        setBreadcrumbs((prev) => prev.slice(0, index + 1));
      }
    },
    [breadcrumbs],
  );

  const getCurrentModeInfo = () => dashboardModes.find((m) => m.mode === dashboardState.mode);

  const renderModeSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Mode</CardTitle>
        <CardDescription>Choose the type of dashboard to view</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${mode.color}`}>
                  <span className="text-2xl">{mode.icon}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{mode.title}</h3>
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
      <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setBreadcrumbs([]);
            setDashboardState((prev) => ({
              ...prev,
              selectedDiagramId: undefined,
              selectedInstanceId: undefined,
            }));
          }}
        >
          🏠 Home
        </Button>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
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
    switch (dashboardState.mode) {
      case 'static':
        return (
          <StaticFlowDashboard
            diagramId={dashboardState.selectedDiagramId}
            onDiagramSelect={handleDiagramSelect}
            editable
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
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${currentMode?.color}`}>
              {currentMode?.icon}
            </span>
            <span>{currentMode?.title}</span>
          </CardTitle>
          <CardDescription>{currentMode?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
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

            {dashboardState.mode === 'statistics' && (
              <div className="ml-auto flex items-center space-x-2">
                <span className="text-sm">Auto-refresh:</span>
                <select
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={dashboardState.refreshInterval}
                  onChange={(e) =>
                    setDashboardState((prev) => ({
                      ...prev,
                      refreshInterval: parseInt(e.target.value, 10),
                    }))
                  }
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

  const showModeSelector =
    dashboardState.mode !== 'instance' &&
    !dashboardState.selectedDiagramId &&
    !dashboardState.selectedInstanceId;

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage workflows, monitor performance, and track instances</p>
        </div>
        <div className="text-right">
          {dashboardState.selectedDiagramId && (
            <Badge variant="outline" className="mb-1">
              Diagram: {dashboardState.selectedDiagramId}
            </Badge>
          )}
          {dashboardState.selectedInstanceId && (
            <Badge variant="outline" className="ml-2 mb-1">
              Instance: {dashboardState.selectedInstanceId.slice(-8)}
            </Badge>
          )}
        </div>
      </div>

      {renderBreadcrumbs()}

      {showModeSelector && renderModeSelector()}

      {(dashboardState.selectedDiagramId || dashboardState.selectedInstanceId) && renderQuickActions()}

      <div className="flex-1">{renderCurrentDashboard()}</div>
    </div>
  );
};

export default DashboardSelector;
