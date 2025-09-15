/**
 * API Service for backend communication
 */

// Base API URL - adjust if needed
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed: ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Types for option data
 */
export interface OptionItem {
  id: string;       // ID từ database để định danh
  value: string;    // Giá trị lưu trữ
  label: string;    // Nhãn hiển thị
  icon?: string;    // Icon (tùy chọn)
}

export interface NodeOptions {
  triggerEventOptions: OptionItem[];
  triggerModuleOptions: OptionItem[];
  sendKindOptions: OptionItem[];
  humanPersonTypeOptions: OptionItem[];
  humanPeopleOptions: OptionItem[];
  humanRoleOptions: OptionItem[];
  humanDepartmentOptions: OptionItem[];
}

/**
 * Fetch all options for DetailBar
 */
export async function fetchNodeOptions(): Promise<NodeOptions> {
  return fetchAPI<NodeOptions>('/options');
}

/**
 * Authentication-related API calls
 */
export interface User {
  id: string;
  email: string;
  name?: string;
}

export async function login(email: string, password: string): Promise<User> {
  return fetchAPI<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return fetchAPI('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<User> {
  return fetchAPI<User>('/auth/me');
}

/**
 * Diagram-related API calls
 */
export interface Diagram {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data?: {
    nodes: any[];
    edges: any[];
  };
  objects?: any[];
  connections?: any[];
}

export async function getDiagrams(): Promise<Diagram[]> {
  return fetchAPI<Diagram[]>('/diagrams');
}

export async function getDiagram(id: string): Promise<Diagram> {
  return fetchAPI<Diagram>(`/diagrams/${id}`);
}

export async function createDiagram(name: string, data?: any): Promise<Diagram> {
  return fetchAPI<Diagram>('/diagrams', {
    method: 'POST',
    body: JSON.stringify({ name, data }),
  });
}

export async function updateDiagram(id: string, updates: { name?: string; data?: any }): Promise<Diagram> {
  return fetchAPI<Diagram>(`/diagrams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteDiagram(id: string): Promise<{ ok: boolean }> {
  return fetchAPI<{ ok: boolean }>(`/diagrams/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Trigger workflow interface and API function
 */
export interface TriggerPayload {
  event: string;
  mappingId: string;
  userId?: string;
  data?: any;
}

export interface TriggerResult {
  triggered: {
    event: string;
    mappingId: string;
    userId?: string;
    timestamp: string;
    data?: any;
  };
  nodes: any[];
  connections: any[];
}

export async function triggerWorkflow(payload: TriggerPayload): Promise<TriggerResult> {
  return fetchAPI<TriggerResult>('/trigger', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}