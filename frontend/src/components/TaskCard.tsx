// ============================================================================
// FILE: frontend/src/components/TaskCard.tsx
// Day 8: Enhanced with complete button, recurrence badge, and recurrence selector
// ============================================================================

import React, { memo, useState, DragEvent } from 'react';
import { Task, PRIORITY_COLORS, CATEGORY_STYLES, RecurrenceType } from '../types/task';
import { DatePicker } from './DatePicker';
import { RecurrenceBadge } from './RecurrenceBadge';
import { RecurrenceSelector } from './RecurrenceSelector';

interface TaskCardProps {
  task: Task;
  onDelete?: (id: string) => void;
  onMove?: (id: string) => void;
  onEditTitle?: (id: string, newTitle: string) => void;
  onChangePriority?: (id: string, newPriority: 'high' | 'medium' | 'low') => void;
  onChangeDate?: (id: string, newDate: string | null) => void;
  onChangeRecurrence?: (id: string, recurrence: RecurrenceType) => void;
  onComplete?: (id: string) => void;
  moveLabel?: string;
  isDark?: boolean;
  // Drag handlers
  onDragStart?: (e: DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'No Date — Click to add';
  try {
    if (dateStr.includes('T')) {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return 'Invalid Date';
      return dt.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    } else {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (isNaN(dt.getTime())) return 'Invalid Date';
      return dt.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }) + ' (All Day)';
    }
  } catch {
    return 'Invalid Date';
  }
}

export const TaskCard = memo<TaskCardProps>(({
  task, onDelete, onMove, onEditTitle, onChangePriority, onChangeDate,
  onChangeRecurrence, onComplete, moveLabel, isDark = false,
  onDragStart, onDragEnd, isDragging,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurrenceSelector, setShowRecurrenceSelector] = useState(false);
  const [completing, setCompleting] = useState(false);

  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const categoryClass = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.Work;

  const handleSaveTitle = () => {
    if (editValue.trim() && editValue !== task.title) {
      onEditTitle?.(task.id, editValue.trim());
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (showConfirm) {
      onDelete?.(task.id);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const handleComplete = () => {
    setCompleting(true);
    setTimeout(() => {
      onComplete?.(task.id);
    }, 400);
  };

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={e => onDragStart?.(e, task.id)}
      onDragEnd={onDragEnd}
      className={`group task-card-hover p-4 rounded-xl mb-3 shadow-sm border transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        completing ? 'animate-complete scale-95 opacity-50' : ''
      } ${
        isDark
          ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      } ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: priorityStyle.border }}
    >
      {/* Drag Handle + Tags Row */}
      <div className="flex items-start gap-2 mb-2">
        {/* Drag Handle */}
        {onDragStart && (
          <div className={`mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <i className="fa-solid fa-grip-vertical text-xs"></i>
          </div>
        )}

        {/* Tags */}
        <div className="flex gap-2 flex-wrap flex-1">
          <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase ${categoryClass}`}>
            {task.category}
          </span>
          {task.assignee && (
            <span className="text-xs px-2.5 py-0.5 rounded font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 flex items-center gap-1">
              <i className="fa-solid fa-user text-[0.6rem]"></i> {task.assignee}
            </span>
          )}

          {/* Recurrence Badge - Clickable */}
          {task.recurrence !== 'none' ? (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowRecurrenceSelector(!showRecurrenceSelector); }}
                className="cursor-pointer hover:opacity-80"
              >
                <RecurrenceBadge recurrence={task.recurrence} streak={task.streak} />
              </button>
              {showRecurrenceSelector && onChangeRecurrence && (
                <RecurrenceSelector
                  currentRecurrence={task.recurrence}
                  onRecurrenceChange={(r) => onChangeRecurrence(task.id, r)}
                  onClose={() => setShowRecurrenceSelector(false)}
                  isDark={isDark}
                />
              )}
            </div>
          ) : onChangeRecurrence && (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowRecurrenceSelector(!showRecurrenceSelector); }}
                className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <i className="fa-solid fa-rotate mr-1"></i>Repeat
              </button>
              {showRecurrenceSelector && (
                <RecurrenceSelector
                  currentRecurrence={task.recurrence}
                  onRecurrenceChange={(r) => onChangeRecurrence(task.id, r)}
                  onClose={() => setShowRecurrenceSelector(false)}
                  isDark={isDark}
                />
              )}
            </div>
          )}

          {/* Priority Badge - Clickable */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowPriorityMenu(!showPriorityMenu); }}
              className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase cursor-pointer hover:opacity-80 ${
                isDark ? priorityStyle.darkBg + ' ' + priorityStyle.darkText : priorityStyle.bg + ' ' + priorityStyle.text
              }`}
              title="Click to change priority"
            >
              {task.priority}
            </button>

            {showPriorityMenu && (
              <div className={`absolute top-6 left-0 shadow-lg rounded-lg border z-20 py-1 min-w-[100px] ${
                isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
              }`}>
                {(['high', 'medium', 'low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={e => {
                      e.stopPropagation();
                      onChangePriority?.(task.id, p);
                      setShowPriorityMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                    } ${p === task.priority ? (isDark ? 'bg-slate-700' : 'bg-gray-50') : ''}`}
                    style={{ color: PRIORITY_COLORS[p].border }}
                  >
                    {p === task.priority ? `✓ ${p}` : p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Complete Button */}
        {onComplete && (
          <button
            onClick={handleComplete}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
              isDark
                ? 'border-slate-500 hover:border-emerald-400 hover:bg-emerald-900/30'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
            }`}
            title="Mark complete"
          >
            <i className={`fa-solid fa-check text-[0.5rem] opacity-0 group-hover:opacity-100 transition-opacity ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}></i>
          </button>
        )}
      </div>

      {/* Title - Click to Edit */}
      {editing ? (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={handleSaveTitle}
            autoFocus
            className={`flex-1 px-2 py-1 border-2 rounded-lg text-sm font-bold focus:outline-none ${
              isDark
                ? 'bg-slate-700 border-indigo-400 text-white'
                : 'bg-white border-indigo-400 text-slate-900'
            }`}
          />
          <button onClick={handleSaveTitle}
            className="px-2 py-1 bg-indigo-500 text-white rounded-lg text-xs font-bold">✓</button>
        </div>
      ) : (
        <h4
          onClick={() => { setEditValue(task.title); setEditing(true); }}
          className={`font-bold text-sm leading-snug mb-1.5 cursor-pointer transition-colors ${
            isDark ? 'text-slate-100 hover:text-indigo-300' : 'text-gray-900 hover:text-indigo-700'
          }`}
          title="Click to edit title"
        >
          {task.title}
        </h4>
      )}

      {/* Original Text */}
      <p className={`text-xs italic mb-3 leading-relaxed break-words ${
        isDark ? 'text-slate-400' : 'text-gray-500'
      }`}>
        "{task.original_text}"
      </p>

      {/* Footer - Date with Picker */}
      <div className="relative">
        <div className={`flex justify-between items-center text-xs font-medium ${
          isDark ? 'text-slate-500' : 'text-gray-400'
        }`}>
          <button
            onClick={e => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
            className={`flex items-center gap-1 hover:text-indigo-500 transition-colors ${
              !task.due_date ? 'text-amber-500' : ''
            }`}
            title="Click to change date"
          >
            <i className="fa-regular fa-calendar"></i>
            {formatDate(task.due_date)}
            <i className="fa-solid fa-pen text-[0.5rem] ml-1 opacity-0 group-hover:opacity-100"></i>
          </button>
        </div>

        {/* Date Picker */}
        {showDatePicker && onChangeDate && (
          <DatePicker
            currentDate={task.due_date}
            onDateChange={(newDate) => onChangeDate(task.id, newDate)}
            onClose={() => setShowDatePicker(false)}
            isDark={isDark}
          />
        )}
      </div>

      {/* Action Buttons - Show on Hover */}
      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMove && (
          <button onClick={() => onMove(task.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
              isDark
                ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}>
            <i className="fa-solid fa-arrow-right-arrow-left text-[0.6rem]"></i>
            {moveLabel || 'Move'}
          </button>
        )}
        {onDelete && (
          <button onClick={handleDelete}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              showConfirm
                ? 'bg-red-500 text-white'
                : isDark
                  ? 'bg-red-900/30 text-red-400 hover:bg-red-800'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}>
            <i className="fa-solid fa-trash text-[0.6rem]"></i>
            {showConfirm ? 'Confirm?' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
});