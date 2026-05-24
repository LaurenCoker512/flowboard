'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from '@/components/FilterBar';
import { TaskModal } from '@/components/TaskModal';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icon';
import { RecurringTag } from '@/components/ui/RecurringTag';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusChip } from '@/components/ui/StatusChip';
import { PRIORITY_COLORS } from '@/lib/design';
import {
  groupTasks,
  applyAllTasksFilters,
  formatTaskDate,
  type AllTask,
  type TaskGroup,
  type GroupBy,
} from '@/lib/all-tasks-utils';
import { parseFilters, serializeFilters, hasActiveFilters } from '@/lib/board-utils';
import type { BoardFilters } from '@/lib/board-utils';
import { getFrequencyLabel } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';

const STORAGE_KEY = 'flowboard:allTasksFilters';
const EMPTY_FILTERS: BoardFilters = { priorities: [], projectIds: [], recurringOnly: false };

const GROUP_OPTIONS = [
  { value: 'project', label: 'By project' },
  { value: 'status', label: 'By status' },
  { value: 'date', label: 'By date' },
];

type ModalState =
  | { type: 'closed' }
  | { type: 'edit'; task: AllTask }
  | { type: 'new'; date?: string };

type Props = {
  initialTasks: AllTask[];
  projects: Array<{ id: string; name: string; color: string }>;
};

export function AllTasksClient({ initialTasks, projects }: Props) {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<GroupBy>('project');
  const [filters, setFilters] = useState<BoardFilters>(() => {
    if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
    return parseFilters(localStorage.getItem(STORAGE_KEY));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  const filteredTasks = useMemo(
    () => applyAllTasksFilters(initialTasks, filters, searchQuery, showArchived),
    [initialTasks, filters, searchQuery, showArchived],
  );
  const groups = useMemo(() => groupTasks(filteredTasks, groupBy), [filteredTasks, groupBy]);

  function handleFiltersChange(nextFilters: BoardFilters) {
    setFilters(nextFilters);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serializeFilters(nextFilters));
    }
  }

  function handleFiltersClear() {
    setFilters({ ...EMPTY_FILTERS });
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serializeFilters(EMPTY_FILTERS));
    }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleModalClose() {
    setModal({ type: 'closed' });
    router.refresh();
  }

  const hasAnyFilter = hasActiveFilters(filters) || searchQuery.trim().length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-base)',
        }}
      >
        <Segmented
          options={GROUP_OPTIONS}
          value={groupBy}
          onChange={(val) => setGroupBy(val as GroupBy)}
        />
        <div style={{ flex: 1 }} />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Show archived
          </span>
          <Toggle
            on={showArchived}
            onToggle={() => setShowArchived((prev) => !prev)}
            label="Show archived tasks"
          />
        </label>
      </div>

      {/* Filter bar with search */}
      <FilterBar
        filters={filters}
        projects={projects}
        onChange={handleFiltersChange}
        onClear={handleFiltersClear}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 40px' }}>
        {groups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 72,
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            {hasAnyFilter ? 'No tasks match these filters.' : 'No tasks yet.'}
          </div>
        ) : (
          groups.map((group) => (
            <TaskGroupSection
              key={group.key}
              group={group}
              isCollapsed={collapsedGroups.has(group.key)}
              onToggleCollapse={() => toggleGroup(group.key)}
              onTaskClick={(task) => setModal({ type: 'edit', task })}
            />
          ))
        )}
      </div>

      {/* TaskModal */}
      {modal.type === 'edit' && (
        <TaskModal
          mode="edit"
          task={{
            id: modal.task.id,
            title: modal.task.title,
            projectId: modal.task.projectId,
            priority: modal.task.priority,
            status: modal.task.status,
            date: modal.task.date,
            startAt: modal.task.startAt,
            endAt: modal.task.endAt,
            description: null,
            isRecurring: modal.task.isRecurring,
            recurrenceRule: modal.task.recurrenceRule as RecurrenceRule | null,
          }}
          projects={projects}
          onClose={handleModalClose}
          onSaved={handleModalClose}
        />
      )}
      {modal.type === 'new' && (
        <TaskModal
          mode="new"
          projects={projects}
          defaultDate={modal.date}
          onClose={handleModalClose}
          onSaved={handleModalClose}
        />
      )}
    </div>
  );
}

type TaskGroupSectionProps = {
  group: TaskGroup;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: AllTask) => void;
};

function TaskGroupSection({
  group,
  isCollapsed,
  onToggleCollapse,
  onTaskClick,
}: TaskGroupSectionProps) {
  return (
    <div style={{ padding: '0 22px' }}>
      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '12px 0 6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-tertiary)',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <Icon name="chevronRight" size={14} stroke={1.8} />
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {group.label}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          {group.tasks.length}
        </span>
      </button>

      {!isCollapsed && (
        <div style={{ paddingBottom: 8 }}>
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      )}
    </div>
  );
}

type TaskRowProps = {
  task: AllTask;
  onClick: () => void;
};

function TaskRow({ task, onClick }: TaskRowProps) {
  const priorityColor = PRIORITY_COLORS[task.priority].color;
  const isDone = task.status === 'done';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '5px 8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 6,
        textAlign: 'left',
        opacity: task.isArchived ? 0.55 : 1,
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none';
      }}
    >
      <div
        style={{
          width: 3,
          height: 24,
          borderRadius: 2,
          background: priorityColor,
          flexShrink: 0,
        }}
      />

      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 450,
          color: isDone ? 'var(--text-tertiary)' : 'var(--text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {task.title}
      </span>

      {task.isRecurring && (
        <RecurringTag
          label={
            task.recurrenceRule !== null && task.recurrenceRule !== undefined
              ? formatRecurrenceLabel(task.recurrenceRule)
              : 'Recurring'
          }
        />
      )}

      {task.isArchived && (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Archived
        </span>
      )}

      {task.date !== null && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatTaskDate(task.date)}
        </span>
      )}

      <PriorityBadge priority={task.priority} size="sm" />

      {!task.isArchived && <StatusChip status={task.status} />}
    </button>
  );
}

function formatRecurrenceLabel(rule: unknown): string {
  if (
    typeof rule !== 'object' ||
    rule === null ||
    !('frequency' in rule) ||
    typeof (rule as Record<string, unknown>).frequency !== 'string'
  ) {
    return 'Recurring';
  }
  return getFrequencyLabel(rule as RecurrenceRule);
}
