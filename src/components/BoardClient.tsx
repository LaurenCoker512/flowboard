'use client';

import React, { useState, useEffect, useTransition, useCallback, useOptimistic } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from '@/components/TaskCard';
import { FilterBar } from '@/components/FilterBar';
import { TodayBanner } from '@/components/TodayBanner';
import { TaskModal } from '@/components/TaskModal';
import { BacklogPanel } from '@/components/BacklogPanel';
import { EmptyIllustration } from '@/components/ui/EmptyIllustration';
import {
  buildBoardColumns,
  applyFilters,
  parseFilters,
  serializeFilters,
  getTodayString,
  DONE_CAP,
} from '@/lib/board-utils';
import { updateTaskStatus, clearDone } from '@/lib/board-actions';
import { advanceNewDayTasks } from '@/lib/recurrence-actions';
import { parseBacklogOpen } from '@/lib/backlog-utils';
import { Toast } from '@/components/ui/Toast';
import type { BoardTask, BoardFilters, Status } from '@/lib/board-utils';
import type { BoardTaskRow } from '@/lib/board-actions';
import type { BacklogTaskRow } from '@/lib/backlog-actions';
import type { RecurrenceRule } from '@/lib/recurrence';

const FILTERS_STORAGE_KEY = 'flowboard:filters';
const BACKLOG_OPEN_KEY = 'flowboard:backlogOpen';

type Project = { id: string; name: string; color: string };

type BoardClientProps = {
  initialTasks: BoardTaskRow[];
  initialBacklogTasks: BacklogTaskRow[];
  projects: Project[];
  backlogCount: number;
};

function rowToTask(row: BoardTaskRow): BoardTask {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    projectName: row.projectName,
    projectColor: row.projectColor,
    priority: row.priority,
    status: row.status,
    isArchived: row.isArchived,
    date: row.date,
    startAt: row.startAt,
    endAt: row.endAt,
    isRecurring: row.isRecurring,
    completedAt: row.completedAt,
    recurrenceRule: row.recurrenceRule,
  };
}

type SortableCardProps = {
  task: BoardTask;
  muted?: boolean;
  showTodayChip?: boolean;
  onCardClick: (task: BoardTask) => void;
};

function SortableCard({ task, muted, showTodayChip, onCardClick }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        muted={muted}
        showTodayChip={showTodayChip}
        onClick={() => onCardClick(task)}
      />
    </div>
  );
}

type ColumnProps = {
  title: string;
  count: number;
  accentColor: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
};

function BoardColumn({
  title,
  count,
  accentColor,
  action,
  children,
  isEmpty,
  emptyMessage,
}: ColumnProps) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 4px 12px 4px',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </h3>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            padding: '1px 7px',
            borderRadius: 999,
            background: 'var(--bg-sunken)',
            fontWeight: 500,
          }}
        >
          {count}
        </span>
        <div style={{ flex: 1 }} />
        {action !== undefined && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--card-gap)',
          overflowY: 'auto',
        }}
      >
        {isEmpty ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              textAlign: 'center',
              gap: 8,
            }}
          >
            <EmptyIllustration size={60} />
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {emptyMessage}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

const DRAGGABLE_STATUSES: Status[] = ['up_next', 'in_progress', 'done'];

function getColumnStatus(columnId: string): Status | null {
  if (columnId === 'up_next' || columnId === 'in_progress' || columnId === 'done') {
    return columnId;
  }
  return null;
}

const LAST_OPENED_KEY = 'flowboard:lastOpenedDate';

export function BoardClient({ initialTasks, initialBacklogTasks, projects, backlogCount }: BoardClientProps) {
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<BoardFilters>({
    priorities: [],
    projectIds: [],
    recurringOnly: false,
  });
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [modalTask, setModalTask] = useState<BoardTask | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'info' } | null>(null);
  const [newTaskDefaults, setNewTaskDefaults] = useState<{
    status?: 'backlog' | 'up_next' | 'in_progress' | 'done';
    projectId?: string;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [backlogOpen, setBacklogOpen] = useState(true);

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks.map(rowToTask),
    (current: BoardTask[], update: { id: string; newStatus: Status }) => {
      return current.map((task) => {
        if (task.id !== update.id) return task;
        return {
          ...task,
          status: update.newStatus,
          completedAt: update.newStatus === 'done' ? new Date() : null,
        };
      });
    },
  );

  useEffect(() => {
    try {
      const rawFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      setFilters(parseFilters(rawFilters));
    } catch {
      setFilters(parseFilters(null));
    }
    try {
      const rawOpen = localStorage.getItem(BACKLOG_OPEN_KEY);
      setBacklogOpen(parseBacklogOpen(rawOpen));
    } catch {
      setBacklogOpen(true);
    }
    try {
      const lastOpened = localStorage.getItem(LAST_OPENED_KEY);
      const todayStr = getTodayString();
      if (lastOpened !== todayStr) {
        localStorage.setItem(LAST_OPENED_KEY, todayStr);
        if (lastOpened !== null) {
          startTransition(async () => {
            await advanceNewDayTasks();
          });
        }
      }
    } catch {
      // localStorage unavailable
    }
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleFiltersChange = useCallback((newFilters: BoardFilters) => {
    setFilters(newFilters);
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, serializeFilters(newFilters));
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const handleToggleBacklog = useCallback(() => {
    setBacklogOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BACKLOG_OPEN_KEY, String(next));
      } catch {
        // localStorage may be unavailable
      }
      return next;
    });
  }, []);

  const handleAddBacklogTask = useCallback((projectId?: string) => {
    setNewTaskDefaults({ status: 'backlog', projectId });
  }, []);

  const handleClearFilters = useCallback(() => {
    const cleared: BoardFilters = { priorities: [], projectIds: [], recurringOnly: false };
    setFilters(cleared);
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, serializeFilters(cleared));
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const today = getTodayString();
  const filtered = filtersLoaded ? applyFilters(optimisticTasks, filters) : optimisticTasks;
  const columns = buildBoardColumns(filtered, today);

  const activeTask = activeId !== null
    ? optimisticTasks.find((task) => task.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (over === null) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    const targetStatus = getColumnStatus(overId) ?? getColumnStatus(
      optimisticTasks.find((task) => task.id === overId)?.status ?? '',
    );

    if (targetStatus === null) return;
    if (!DRAGGABLE_STATUSES.includes(targetStatus)) return;

    const draggedTask = optimisticTasks.find((task) => task.id === draggedId);
    if (draggedTask === undefined) return;
    if (draggedTask.status === targetStatus) return;

    startTransition(async () => {
      updateOptimisticTasks({ id: draggedId, newStatus: targetStatus });
      const result = await updateTaskStatus(draggedId, targetStatus as 'up_next' | 'in_progress' | 'done');
      if (targetStatus === 'done' && result.recurringNextDate !== null) {
        setToast({ message: `Completed — next due ${result.recurringNextDate}`, kind: 'info' });
      }
    });
  }

  function handleClearDone() {
    startTransition(async () => {
      await clearDone();
    });
  }

  function handleCardClick(task: BoardTask) {
    setModalTask(task);
  }

  function handleModalClose() {
    setModalTask(null);
    setNewTaskDefaults(null);
  }

  const upNextIds = columns.upNext.map((task) => task.id);
  const inProgressIds = columns.inProgress.map((task) => task.id);
  const doneIds = columns.done.map((task) => task.id);

  return (
    <>
      <FilterBar
        filters={filters}
        projects={projects}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
        onToggleSidebar={handleToggleBacklog}
        sidebarOpen={backlogOpen}
      />
      <TodayBanner
        appointmentCount={columns.appointments.length}
        upNextCount={columns.upNext.length}
        backlogCount={backlogCount}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              padding: '14px 18px 18px 22px',
              gap: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
              <BoardColumn
                title="Appointments"
                count={columns.appointments.length}
                accentColor="var(--p-must)"
                isEmpty={columns.appointments.length === 0}
                emptyMessage="No appointments today."
              >
                {columns.appointments.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleCardClick(task)}
                  />
                ))}
              </BoardColumn>

              <SortableContext items={upNextIds} strategy={verticalListSortingStrategy} id="up_next">
                <BoardColumn
                  title="What's next"
                  count={columns.upNext.length}
                  accentColor="var(--accent)"
                  isEmpty={columns.upNext.length === 0}
                  emptyMessage="Nothing up next. Enjoy the calm."
                >
                  {columns.upNext.map((task) => (
                    <SortableCard
                      key={task.id}
                      task={task}
                      showTodayChip={task.promoted === true}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </BoardColumn>
              </SortableContext>

              <SortableContext items={inProgressIds} strategy={verticalListSortingStrategy} id="in_progress">
                <BoardColumn
                  title="In progress"
                  count={columns.inProgress.length}
                  accentColor="var(--p-fun)"
                  isEmpty={columns.inProgress.length === 0}
                  emptyMessage="Nothing in progress yet."
                >
                  {columns.inProgress.map((task) => (
                    <SortableCard
                      key={task.id}
                      task={task}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </BoardColumn>
              </SortableContext>

              <SortableContext items={doneIds} strategy={verticalListSortingStrategy} id="done">
                <BoardColumn
                  title="Done"
                  count={columns.done.length}
                  accentColor="var(--text-tertiary)"
                  action={
                    columns.done.length > 0
                      ? { label: 'Clear done', onClick: handleClearDone }
                      : undefined
                  }
                  isEmpty={columns.done.length === 0}
                  emptyMessage="Nothing done yet today."
                >
                  {columns.done.map((task) => (
                    <SortableCard
                      key={task.id}
                      task={task}
                      muted
                      onCardClick={handleCardClick}
                    />
                  ))}
                  {columns.doneTotal > DONE_CAP && (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--text-tertiary)',
                        padding: '6px 0',
                      }}
                    >
                      +{columns.doneTotal - DONE_CAP} more
                    </div>
                  )}
                </BoardColumn>
              </SortableContext>
            </div>
          </div>

          <DragOverlay>
            {activeTask !== null && (
              <TaskCard task={activeTask} isDragging />
            )}
          </DragOverlay>
        </DndContext>
        {backlogOpen && (
          <BacklogPanel
            initialTasks={initialBacklogTasks}
            projects={projects}
            onAddTask={handleAddBacklogTask}
          />
        )}
      </div>

      {newTaskDefaults !== null && (
        <TaskModal
          mode="new"
          projects={projects}
          defaultStatus={newTaskDefaults.status}
          defaultProjectId={newTaskDefaults.projectId}
          onClose={handleModalClose}
        />
      )}

      {modalTask !== null && (
        <TaskModal
          mode="edit"
          task={{
            id: modalTask.id,
            title: modalTask.title,
            projectId: modalTask.projectId,
            priority: modalTask.priority,
            status: modalTask.status,
            date: modalTask.date,
            startAt: modalTask.startAt,
            endAt: modalTask.endAt,
            description: null,
            isRecurring: modalTask.isRecurring,
            recurrenceRule: modalTask.recurrenceRule as RecurrenceRule | null,
            recurringMasterId: null,
          }}
          projects={projects}
          onClose={handleModalClose}
        />
      )}

      {toast !== null && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
          }}
        >
          <Toast kind={toast.kind}>{toast.message}</Toast>
        </div>
      )}
    </>
  );
}
