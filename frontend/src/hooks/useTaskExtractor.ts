import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import {
  fetchConfig,
  listTasks,
  processTasks,
} from '../api/client';
import { Task, Clarification, AppConfig } from '../types/task';

export const useTaskExtractor = (accessToken?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<AppConfig>({
    google_client_id: '',
    llm_available: false,
    debug: false,
  });

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchConfig();
      setConfig(data);
      console.log('[Config]', data);
    } catch (e) {
      console.warn('[Config] Failed to load:', e);
    }
  }, []);

  const loadRemoteTasks = useCallback(async () => {
    if (!accessToken) return;
    try {
      const remoteTasks = await listTasks(accessToken);
      setTasks(remoteTasks);
    } catch (err) {
      // Keep localStorage available when the server is offline or the token
      // has expired; the user can continue working and retry synchronization.
      console.warn('[Tasks] Remote load failed; keeping local cache:', err);
    }
  }, [accessToken]);

  const extractTasks = useCallback(async (text: string, isRerun = false): Promise<boolean> => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return false;
    }

    setLoading(true);
    setError('');

    try {
      const data = await processTasks(text, accessToken);

      if (isRerun) {
        const clarifiedIds = new Set(clarifications.map(c => c.id));
        setTasks(prev => {
          const remaining = prev.filter(t => !clarifiedIds.has(t.id));
          return [...remaining, ...data.tasks];
        });
      } else {
        setTasks(data.tasks);
      }

      setClarifications(data.clarifications || []);
      return true;
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      let msg = 'Failed to extract tasks. Please try again.';

      if (axiosErr.code === 'ECONNABORTED') {
        msg = '⏱️ Timeout. Server may be waking up (free tier). Try again in 30s.';
      } else if (axiosErr.response?.status === 413) {
        msg = '📏 Text too long. Maximum 10,000 characters.';
      } else if (axiosErr.response?.status === 400) {
        msg = axiosErr.response.data?.detail || 'Invalid input.';
      } else if (axiosErr.message?.includes('Network Error')) {
        msg = '🌐 Network error. Check connection or try again.';
      }

      setError(msg);
      console.error('Extraction error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [accessToken, clarifications]);

  useEffect(() => {
    loadRemoteTasks();
  }, [loadRemoteTasks]);

  const clearAll = useCallback(() => {
    setTasks([]);
    setClarifications([]);
    setError('');
  }, []);

  const removeSyncedTasks = useCallback(() => {
    setTasks(prev => prev.filter(t => !t.is_clarified));
  }, []);

  return {
    tasks,
    clarifications,
    loading,
    error,
    config,
    loadConfig,
    extractTasks,
    clearAll,
    removeSyncedTasks,
    loadRemoteTasks,
  };
};