import React, { useMemo } from 'react';
import type { NodeStatistics, EdgeStatistics, ActivitySummary } from '../../types/dashboard';
import FlowChartVisualization from './FlowChartVisualization';

interface FlowVisualizationProps {
  nodeStatistics: NodeStatistics[];
  edges?: EdgeStatistics[];
  recentActivity?: ActivitySummary[];
}

const FlowVisualization: React.FC<FlowVisualizationProps> = ({
  nodeStatistics,
  edges = [],
  recentActivity = [],
}) => {
  const { trackedNodeCount, totalActiveInstances, totalProcessed, totalErrors } = useMemo(() => {
    const trackedNodes = nodeStatistics.filter((node) => !['start', 'end'].includes(node.nodeType));
    const activeInstances = nodeStatistics.reduce(
      (sum, node) => sum + node.currentActiveCount + node.pendingCount + node.waitingCount,
      0,
    );
    const processed = nodeStatistics.reduce((sum, node) => sum + node.totalProcessedCount, 0);
    const errors = nodeStatistics.reduce((sum, node) => sum + node.errorCount, 0);

    return {
      trackedNodeCount: trackedNodes.length,
      totalActiveInstances: activeInstances,
      totalProcessed: processed,
      totalErrors: errors,
    };
  }, [nodeStatistics]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
        <span>
          Flow Chart đang hiển thị {trackedNodeCount} nút hoạt động với {totalActiveInstances} instance hiện thời.
        </span>
        <span className="hidden sm:inline">Đã xử lý tổng cộng {totalProcessed} lượt, lỗi {totalErrors}.</span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <FlowChartVisualization
          nodeStatistics={nodeStatistics}
          edges={edges}
          activities={recentActivity}
        />
      </div>
    </div>
  );
};

export default FlowVisualization;
