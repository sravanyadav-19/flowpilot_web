import axios, { AxiosRequestConfig } from 'axios';
import {
  AppConfig,
  ExtractionResponse,
  Task,
} from '../types/task';

// Keep the API boundary in one module so web, Capacitor, and extension clients
// can share the same request shapes without duplicating authentication logic.
const API_BASE = process.env.REACT_APP_API_URL || 'https://flowpilot-app.onrender.com';

const requestConfig = (accessToken?: string): AxiosRequestConfig => {
  if (!accessToken) return {};
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
};

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

export interface CreateTaskInput {
  title: string;
  original_text?: string;
  due_date?: string | null;
  assignee?: string | null;
  priority?: Task['priority'];
  category?: Task['category'];
  recurrence?: Task['recurrence'];
  is_clarified?: boolean;
  is_sarcastic?: boolean;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  is_completed?: boolean;
  streak?: number;
};

export async function fetchConfig(): Promise<AppConfig> {
  const response = await axios.get<AppConfig>(`${API_BASE}/api/config`);
  return response.data;
}

export async function authenticateWithGoogle(
  idToken: string,
): Promise<GoogleAuthResponse> {
  const response = await axios.post<GoogleAuthResponse>(
    `${API_BASE}/api/auth/google`,
    { id_token: idToken },
  );
  return response.data;
}

export async function processTasks(
  text: string,
  accessToken?: string,
): Promise<ExtractionResponse> {
  const body = new FormData();
  body.append('text', text);
  const response = await axios.post<ExtractionResponse>(
    `${API_BASE}/api/process`,
    body,
    { ...requestConfig(accessToken), timeout: 30000 },
  );
  return response.data;
}

export async function listTasks(accessToken: string): Promise<Task[]> {
  const response = await axios.get<Task[]>(
    `${API_BASE}/api/tasks`,
    requestConfig(accessToken),
  );
  return response.data;
}

export async function createTask(
  accessToken: string,
  task: CreateTaskInput,
): Promise<Task> {
  const response = await axios.post<Task>(
    `${API_BASE}/api/tasks`,
    task,
    requestConfig(accessToken),
  );
  return response.data;
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  changes: UpdateTaskInput,
): Promise<Task> {
  const response = await axios.patch<Task>(
    `${API_BASE}/api/tasks/${encodeURIComponent(taskId)}`,
    changes,
    requestConfig(accessToken),
  );
  return response.data;
}

export async function deleteTask(
  accessToken: string,
  taskId: string,
): Promise<void> {
  await axios.delete(
    `${API_BASE}/api/tasks/${encodeURIComponent(taskId)}`,
    requestConfig(accessToken),
  );
}
