'use client';

import React, { useState, useEffect, useTransition, useCallback, useOptimistic } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
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
import { updateTaskStatus, clearDone, clearSingleDoneTask } from '@/lib/board-actions';
import { updateSubtask } from '@/lib/subtask-actions';
import { advanceNewDayTasks } from '@/lib/recurrence-actions';
import { parseBacklogOpen } from '@/lib/backlog-utils';
import { Toast } from '@/components/ui/Toast';
import { useIsMobile } from '@/hooks/useIsMobile';
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
    recurringMasterId: row.recurringMasterId,
    showSubtasksInline: row.showSubtasksInline,
    subtasks: row.subtasks,
  };
}

type SortableCardProps = {
  task: BoardTask;
  muted?: boolean;
  showTodayChip?: boolean;
  onCardClick: (task: BoardTask) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string, isCompleted: boolean) => void;
  onClear?: (taskId: string) => void;
};

function SortableCard({ task, muted, showTodayChip, onCardClick, onSubtaskToggle, onClear }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        muted={muted}
        showTodayChip={showTodayChip}
        onClick={() => onCardClick(task)}
        onSubtaskToggle={(subtaskId, isCompleted) => onSubtaskToggle(task.id, subtaskId, isCompleted)}
        onClear={onClear !== undefined ? () => onClear(task.id) : undefined}
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
  droppableRef?: React.RefCallback<HTMLDivElement>;
};

function BoardColumn({
  title,
  count,
  accentColor,
  action,
  children,
  isEmpty,
  emptyMessage,
  droppableRef,
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
        ref={droppableRef}
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
  const base = columnId.endsWith('_mobile') ? columnId.slice(0, -7) : columnId;
  if (base === 'up_next' || base === 'in_progress' || base === 'done') {
    return base as Status;
  }
  return null;
}

type DroppableSortableColumnProps = Omit<ColumnProps, 'droppableRef'> & {
  status: Status;
  items: string[];
  droppableId?: string;
};

function DroppableSortableColumn({ status, items, droppableId, ...columnProps }: DroppableSortableColumnProps) {
  const id = droppableId ?? status;
  const { setNodeRef } = useDroppable({ id });
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy} id={id}>
      <BoardColumn droppableRef={setNodeRef} {...columnProps} />
    </SortableContext>
  );
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
  const [mobileColumn, setMobileColumn] = useState<'appointments' | 'up_next' | 'in_progress' | 'done'>('up_next');
  const isMobile = useIsMobile();

  type OptimisticUpdate =
    | { type: 'status'; id: string; newStatus: Status }
    | { type: 'subtask'; taskId: string; subtaskId: string; isCompleted: boolean }
    | { type: 'remove'; id: string };

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks.map(rowToTask),
    (current: BoardTask[], update: OptimisticUpdate) => {
      if (update.type === 'status') {
        return current.map((task) => {
          if (task.id !== update.id) return task;
          return {
            ...task,
            status: update.newStatus,
            completedAt: update.newStatus === 'done' ? new Date() : null,
          };
        });
      }
      if (update.type === 'remove') {
        return current.filter((task) => task.id !== update.id);
      }
      return current.map((task) => {
        if (task.id !== update.taskId) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((st) =>
            st.id === update.subtaskId ? { ...st, isCompleted: update.isCompleted } : st,
          ),
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
    // Handle ?new=1 from mobile FAB
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('new') === '1') {
      setNewTaskDefaults({ status: 'backlog' });
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
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
      updateOptimisticTasks({ type: 'status', id: draggedId, newStatus: targetStatus });
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

  function handleClearSingleTask(taskId: string) {
    startTransition(async () => {
      updateOptimisticTasks({ type: 'remove', id: taskId });
      await clearSingleDoneTask(taskId);
    });
  }

  function handleSubtaskToggle(taskId: string, subtaskId: string, isCompleted: boolean) {
    startTransition(async () => {
      updateOptimisticTasks({ type: 'subtask', taskId, subtaskId, isCompleted });
      await updateSubtask({ id: subtaskId, isCompleted });
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

      {/* Mobile column picker */}
      {isMobile && (
        <div
          className="fb-mobile-only"
          style={{
            display: 'flex',
            gap: 2,
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: 'appointments', label: 'Appt', count: columns.appointments.length },
              { id: 'up_next', label: 'Next', count: columns.upNext.length },
              { id: 'in_progress', label: 'Doing', count: columns.inProgress.length },
              { id: 'done', label: 'Done', count: columns.done.length },
            ] as const
          ).map((col) => {
            const isActive = mobileColumn === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setMobileColumn(col.id)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 450,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-tint)' : 'transparent',
                  color: isActive ? 'var(--accent-ink)' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
                aria-pressed={isActive}
              >
                <span>{col.label}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{col.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <DndContext id="board" sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            <div className="fb-board-columns" style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
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

              <DroppableSortableColumn
                status="up_next"
                items={upNextIds}
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
                    onSubtaskToggle={handleSubtaskToggle}
                  />
                ))}
              </DroppableSortableColumn>

              <DroppableSortableColumn
                status="in_progress"
                items={inProgressIds}
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
                    onSubtaskToggle={handleSubtaskToggle}
                  />
                ))}
              </DroppableSortableColumn>

              <DroppableSortableColumn
                status="done"
                items={doneIds}
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
                    onSubtaskToggle={handleSubtaskToggle}
                    onClear={handleClearSingleTask}
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
              </DroppableSortableColumn>
            </div>

            {/* Mobile single-column view */}
            <div
              className="fb-board-column-mobile"
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {mobileColumn === 'appointments' && (
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
              )}
              {mobileColumn === 'up_next' && (
                <BoardColumn
                  title="What's next"
                  count={columns.upNext.length}
                  accentColor="var(--accent)"
                  isEmpty={columns.upNext.length === 0}
                  emptyMessage="Nothing up next. Enjoy the calm."
                >
                  {columns.upNext.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showTodayChip={task.promoted === true}
                      onClick={() => handleCardClick(task)}
                      onSubtaskToggle={(subtaskId, isCompleted) => handleSubtaskToggle(task.id, subtaskId, isCompleted)}
                    />
                  ))}
                </BoardColumn>
              )}
              {mobileColumn === 'in_progress' && (
                <BoardColumn
                  title="In progress"
                  count={columns.inProgress.length}
                  accentColor="var(--p-fun)"
                  isEmpty={columns.inProgress.length === 0}
                  emptyMessage="Nothing in progress yet."
                >
                  {columns.inProgress.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => handleCardClick(task)}
                      onSubtaskToggle={(subtaskId, isCompleted) => handleSubtaskToggle(task.id, subtaskId, isCompleted)}
                    />
                  ))}
                </BoardColumn>
              )}
              {mobileColumn === 'done' && (
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      muted
                      onClick={() => handleCardClick(task)}
                      onSubtaskToggle={(subtaskId, isCompleted) => handleSubtaskToggle(task.id, subtaskId, isCompleted)}
                      onClear={() => handleClearSingleTask(task.id)}
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
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask !== null && (
              <TaskCard task={activeTask} />
            )}
          </DragOverlay>
        </DndContext>
        <BacklogPanel
          initialTasks={initialBacklogTasks}
          projects={projects}
          onAddTask={handleAddBacklogTask}
          isOpen={backlogOpen}
          isOverlay={isMobile}
          onClose={isMobile ? handleToggleBacklog : undefined}
        />
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
            recurringMasterId: modalTask.recurringMasterId,
            showSubtasksInline: modalTask.showSubtasksInline,
            subtasks: modalTask.subtasks,
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
