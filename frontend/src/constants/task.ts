import { RecurrenceType } from '../types/task';

export const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Work', label: '💼 Work' },
  { value: 'Personal', label: '🏠 Personal' },
  { value: 'Meeting', label: '📞 Meeting' },
] as const;

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
