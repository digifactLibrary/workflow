-- New tables for stateful workflow execution

-- Track each running instance of a workflow
CREATE TABLE IF NOT EXISTS section0.cr08workflow_instances (
  id TEXT PRIMARY KEY,
  diagram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active, completed, error, cancelled
  context JSONB DEFAULT '{}',  -- Store global workflow context/variables
  started_by TEXT,  -- User who initiated the workflow
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,  -- Store error message if status = 'error'
  FOREIGN KEY (diagram_id) REFERENCES section0.cr07Bdiagrams(id) ON DELETE CASCADE
);

-- Track state for each node in a workflow instance
CREATE TABLE IF NOT EXISTS section0.cr09node_states (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL,
  node_id TEXT NOT NULL,  -- Node ID in the diagram
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, completed, waiting, error
  data JSONB DEFAULT '{}',  -- State data specific to this node execution
  inputs_required INTEGER DEFAULT 0,  -- For AND/OR nodes, how many inputs are required
  inputs_received INTEGER DEFAULT 0,  -- For AND/OR nodes, how many inputs received so far
  inputs_passed INTEGER DEFAULT 0,    -- For AND/OR nodes, how many inputs passed condition
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workflow_instance_id) REFERENCES section0.cr08workflow_instances(id) ON DELETE CASCADE,
  CONSTRAINT node_instance_unique UNIQUE (workflow_instance_id, node_id)
);

-- Track input records for nodes that need to track multiple inputs (AND, OR)
CREATE TABLE IF NOT EXISTS section0.cr10node_inputs (
  id TEXT PRIMARY KEY,
  node_state_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,  -- Which node sent this input
  input_data JSONB DEFAULT '{}',  -- The actual input data
  evaluation_result BOOLEAN,  -- true if input passed condition, false if failed
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (node_state_id) REFERENCES section0.cr09node_states(id) ON DELETE CASCADE
);

-- Track user approvals for human nodes
CREATE TABLE IF NOT EXISTS section0.cr11node_approvals (
  id TEXT PRIMARY KEY,
  node_state_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (node_state_id) REFERENCES section0.cr09node_states(id) ON DELETE CASCADE,
  CONSTRAINT user_approval_unique UNIQUE (node_state_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS workflow_instances_diagram_id_idx ON section0.cr08workflow_instances(diagram_id);
CREATE INDEX IF NOT EXISTS workflow_instances_status_idx ON section0.cr08workflow_instances(status);
CREATE INDEX IF NOT EXISTS node_states_workflow_instance_id_idx ON section0.cr09node_states(workflow_instance_id);
CREATE INDEX IF NOT EXISTS node_states_status_idx ON section0.cr09node_states(status);
CREATE INDEX IF NOT EXISTS node_inputs_node_state_id_idx ON section0.cr10node_inputs(node_state_id);
CREATE INDEX IF NOT EXISTS node_approvals_node_state_id_idx ON section0.cr11node_approvals(node_state_id);
CREATE INDEX IF NOT EXISTS node_approvals_user_id_idx ON section0.cr11node_approvals(user_id);