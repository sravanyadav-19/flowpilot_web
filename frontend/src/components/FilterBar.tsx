import React, { useEffect, useState } from 'react';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../constants/task';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
  isDark: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery, onSearchChange,
  priorityFilter, onPriorityChange,
  categoryFilter, onCategoryChange,
  onClearFilters, totalCount, filteredCount, isDark,
}) => {
  // Keep typing responsive: the parent only filters after the user pauses.
  const [draftSearch, setDraftSearch] = useState(searchQuery);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftSearch !== searchQuery) onSearchChange(draftSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draftSearch, searchQuery, onSearchChange]);

  const priorities = PRIORITY_OPTIONS;
  const categories = CATEGORY_OPTIONS;

  const hasFilters = searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className={`rounded-2xl p-5 mb-6 shadow-md border transition-colors ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'
    }`}>
      {/* Search */}
      <div className="relative mb-4">
        <i className={`fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
          isDark ? 'text-slate-400' : 'text-slate-400'
        }`}></i>
        <input
          type="text"
          value={draftSearch}
          onChange={e => setDraftSearch(e.target.value)}
          placeholder="Search tasks by title..."
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
            isDark
              ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
          } border-2`}
        />
        {draftSearch && (
          <button
            onClick={() => {
              setDraftSearch('');
              onSearchChange('');
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:bg-slate-600' : 'text-slate-400 hover:bg-slate-200'
            }`}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Priority Filters */}
        <div className="flex-1 min-w-[200px]">
          <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Priority
          </p>
          <div className="flex gap-2 flex-wrap">
            {priorities.map(p => (
              <button
                key={p.value}
                onClick={() => onPriorityChange(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  priorityFilter === p.value
                    ? `${p.color} ring-2 ring-indigo-500 shadow-sm`
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex-1 min-w-[200px]">
          <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Category
          </p>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => onCategoryChange(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === c.value
                    ? isDark
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Status */}
      {hasFilters && (
        <div className={`flex justify-between items-center mt-4 pt-3 border-t ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing {filteredCount} of {totalCount} tasks
          </span>
          <button
            onClick={onClearFilters}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
          >
            <i className="fa-solid fa-xmark"></i> Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};