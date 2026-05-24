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
};

const PRIORITY_CHIPS: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'must_do', label: 'Must do', color: 'var(--p-must)' },
  { value: 'can_wait', label: 'Can wait', color: 'var(--p-wait)' },
  { value: 'fun', label: 'Fun', color: 'var(--p-fun)' },
];

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((existing) => existing !== item) : [...arr, item];
}

export function FilterBar({ filters, projects, onChange, onClear }: FilterBarProps) {
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

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          style={{
            marginLeft: 'auto',
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
    </div>
  );
}
