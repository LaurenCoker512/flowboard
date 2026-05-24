'use client';

import { Icon } from '@/components/ui/Icon';
import { FilterChip } from '@/components/ui/FilterChip';
import { hasActiveFilters } from '@/lib/board-utils';
import type { BoardFilters, Priority } from '@/lib/board-utils';

type FilterBarProps = {
  filters: BoardFilters;
  projects: Array<{ id: string; name: string; color: string }>;
  onChange: (filters: BoardFilters) => void;
  onClear: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
};

const PRIORITY_CHIPS: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'must_do', label: 'Must do', color: 'var(--p-must)' },
  { value: 'can_wait', label: 'Can wait', color: 'var(--p-wait)' },
  { value: 'fun', label: 'Fun', color: 'var(--p-fun)' },
];

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((existing) => existing !== item) : [...arr, item];
}

export function FilterBar({
  filters,
  projects,
  onChange,
  onClear,
  onToggleSidebar,
  sidebarOpen,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const isRecurringActive = filters.recurringOnly;

  function handlePriorityToggle(priority: Priority) {
    onChange({ ...filters, priorities: toggleArrayItem(filters.priorities, priority) });
  }

  function handleProjectToggle(projectId: string) {
    onChange({ ...filters, projectIds: toggleArrayItem(filters.projectIds, projectId) });
  }

  function handleRecurringToggle() {
    onChange({ ...filters, recurringOnly: !filters.recurringOnly });
  }

  return (
    <div
      style={{
        padding: '10px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-tertiary)',
        }}
      >
        <Icon name="filter" size={13} stroke={1.6} />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Show
        </span>
      </div>

      {onSearchChange !== undefined && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Icon
            name="search"
            size={12}
            stroke={1.7}
            color="var(--text-tertiary)"
          />
          <input
            type="text"
            placeholder="Search tasks…"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: 20,
              paddingRight: searchQuery && searchQuery.length > 0 ? 22 : 8,
              paddingTop: 5,
              paddingBottom: 5,
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              width: 160,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              marginLeft: 4,
            }}
          />
          {searchQuery !== undefined && searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: 6,
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: 0,
              }}
            >
              <Icon name="x" size={11} stroke={1.8} />
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        {PRIORITY_CHIPS.map((chip) => (
          <FilterChip
            key={chip.value}
            active={filters.priorities.includes(chip.value)}
            color={chip.color}
            dot={chip.color}
            onClick={() => handlePriorityToggle(chip.value)}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>

      <div
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {projects.map((project) => (
          <FilterChip
            key={project.id}
            active={filters.projectIds.includes(project.id)}
            color={project.color}
            dot={project.color}
            onClick={() => handleProjectToggle(project.id)}
          >
            {project.name}
          </FilterChip>
        ))}
      </div>

      <div
        aria-hidden="true"
        style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }}
      />

      <button
        type="button"
        onClick={handleRecurringToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 9px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          background: isRecurringActive ? 'var(--text-primary)' : 'transparent',
          border: isRecurringActive ? 'none' : '1px solid var(--border)',
          color: isRecurringActive ? '#FFF8F4' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <Icon name="repeat" size={11} stroke={1.7} />
        Recurring only
      </button>

      <div style={{ flex: 1 }} />
      {(hasActiveFilters(filters) || (searchQuery !== undefined && searchQuery.trim().length > 0)) && (
        <button
          type="button"
          onClick={onClear}
          style={{
            fontSize: 12,
            color: 'var(--accent)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Clear filters
        </button>
      )}
      {onToggleSidebar !== undefined && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen === true ? 'Hide backlog panel' : 'Show backlog panel'}
          title={sidebarOpen === true ? 'Hide Later panel' : 'Show Later panel'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 7px',
            borderRadius: 6,
            background: sidebarOpen === true ? 'var(--bg-sunken)' : 'transparent',
            border: '1px solid var(--border)',
            color: sidebarOpen === true ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="sidebar" size={14} />
        </button>
      )}
    </div>
  );
}
