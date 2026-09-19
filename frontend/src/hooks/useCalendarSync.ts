import { useCallback, useState } from 'react';
import { Task } from '../types/task';

interface CalendarSyncResult {
  synced: number;
  sessionExpired: boolean;
}

export function useCalendarSync(
  accessToken: string | null,
  tasks: Task[],
): { syncing: boolean; syncTasks: () => Promise<CalendarSyncResult> } {
  const [syncing, setSyncing] = useState(false);

  const syncTasks = useCallback(async (): Promise<CalendarSyncResult> => {
    if (!accessToken) return { synced: 0, sessionExpired: false };
    const toSync = tasks.filter(task => task.is_clarified && task.due_date);
    if (!toSync.length) return { synced: 0, sessionExpired: false };

    setSyncing(true);
    let synced = 0;
    let sessionExpired = false;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      for (const task of toSync) {
        const event: Record<string, unknown> = {
          summary: task.title,
          description: `Original: "${task.original_text}"\nPriority: ${task.priority.toUpperCase()}${task.recurrence !== 'none' ? `\nRecurrence: ${task.recurrence}` : ''}\n\nCreated by FlowPilot AI`,
        };

        if (task.due_date!.includes('T')) {
          const start = new Date(task.due_date!);
          const end = new Date(start.getTime() + 3600000);
          const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
          event.start = { dateTime: format(start), timeZone };
          event.end = { dateTime: format(end), timeZone };
        } else {
          const [year, month, day] = task.due_date!.split('-').map(Number);
          const next = new Date(year, month - 1, day);
          next.setDate(next.getDate() + 1);
          event.start = { date: task.due_date };
          event.end = { date: next.toISOString().split('T')[0] };
        }

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          },
        );
        if (response.status === 401) {
          sessionExpired = true;
          break;
        }
        if (response.ok) synced++;
      }
    } finally {
      setSyncing(false);
    }

    return { synced, sessionExpired };
  }, [accessToken, tasks]);

  return { syncing, syncTasks };
}
