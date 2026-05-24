'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { TaskModal } from '@/components/TaskModal';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { PRIORITY_COLORS } from '@/lib/design';
import { getFrequencyLabel } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';
import {
  getWeekDays,
  getWeekStart,
  formatWeekHeader,
  nearestThirtyMin,
  shiftDatePreservingTime,
  computeOverlapGroups,
  formatTime,
  dateToTimeInput,
  type WeekTask,
  type WeekDay,
} from '@/lib/week-utils';
import { getWeekTasks, moveTaskToDate, type WeekTaskRow } from '@/lib/week-actions';
import {
  createExceptionRecord,
  updateAllFutureOccurrences,
} from '@/lib/task-actions';
import type { RecurrenceRule as RR } from '@/lib/recurrence';

type Project = { id: string; name: string; color: string };

type WeeklyCalendarProps = {
  initialTasks: WeekTaskRow[];
  initialWeekStart: string;
  weekStartDay: 'sunday' | 'monday';
  today: string;
  projects: Project[];
};

function rowToWeekTask(row: WeekTaskRow): WeekTask {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    projectName: row.projectName,
    projectColor: row.projectColor,
    priority: row.priority,
    status: row.status,
    date: row.date,
    startAt: row.startAt,
    endAt: row.endAt,
    isRecurring: row.isRecurring,
    recurrenceRule: row.recurrenceRule,
    recurringMasterId: row.recurringMasterId,
    description: row.description,
  };
}

// ─── Droppable Day Column ───────────────────────────────────────────────────

function DroppableDayColumn({
  dateStr,
  children,
  style,
  onClick,
}: {
  dateStr: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day-' + dateStr });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        ...style,
        outline: isOver ? '2px solid var(--accent)' : undefined,
        outlineOffset: isOver ? '-2px' : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ─── Draggable Task Chip ────────────────────────────────────────────────────

type TaskChipProps = {
  task: WeekTask;
  isTimed: boolean;
  isDragging?: boolean;
  onClick: (e: React.MouseEvent) => void;
};

function TaskChip({ task, isTimed, isDragging = false, onClick }: TaskChipProps) {
  const priorityColor = PRIORITY_COLORS[task.priority].color;
  const priorityTint = PRIORITY_COLORS[task.priority].tint;

  const recurringLabel =
    task.isRecurring && task.recurrenceRule !== null && task.recurrenceRule !== undefined
      ? getFrequencyLabel(task.recurrenceRule as RecurrenceRule)
      : null;

  if (isTimed) {
    return (
      <div
        onClick={onClick}
        style={{
          background: priorityTint,
          borderLeft: `3px solid ${priorityColor}`,
          borderRadius: 6,
          padding: '4px 6px',
          fontSize: 11,
          lineHeight: 1.3,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          opacity: isDragging ? 0.5 : 1,
          minWidth: 0,
        }}
      >
        {task.startAt !== null && (
          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {formatTime(task.startAt)}
          </div>
        )}
        <div
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {task.title}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${priorityColor}`,
        borderRadius: 6,
        padding: '4px 6px 4px 7px',
        fontSize: 11.5,
        lineHeight: 1.3,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
        cursor: 'pointer',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <ProjectDot color={task.projectColor} size={6} />
      <span
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {task.title}
      </span>
      {task.isRecurring && (
        <Icon name="repeat" size={9} color="var(--text-tertiary)" />
      )}
    </div>
  );
}

function DraggableTaskChip({
  task,
  isTimed,
  onEdit,
}: {
  task: WeekTask;
  isTimed: boolean;
  onEdit: (task: WeekTask) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'task-' + task.id,
    data: { task },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TaskChip
        task={task}
        isTimed={isTimed}
        isDragging={isDragging}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(task);
        }}
      />
    </div>
  );
}

// ─── Recurring Move Prompt ──────────────────────────────────────────────────

type PendingMove = {
  task: WeekTask;
  newDate: string;
  newStartAt: Date | null;
  newEndAt: Date | null;
};

function RecurringMovePrompt({
  onThisOnly,
  onAllFuture,
  onCancel,
  isPending,
}: {
  onThisOnly: () => void;
  onAllFuture: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          maxWidth: 340,
          width: '90%',
          boxShadow: '0 12px 32px rgba(40,30,20,0.14)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          Move recurring task
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          Do you want to move just this occurrence, or all future occurrences?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="fb-btn fb-btn--primary"
            onClick={onThisOnly}
            disabled={isPending}
          >
            This occurrence only
          </button>
          <button className="fb-btn" onClick={onAllFuture} disabled={isPending}>
            All future occurrences
          </button>
          <button
            className="fb-btn fb-btn--ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WeeklyCalendar({
  initialTasks,
  initialWeekStart,
  weekStartDay,
  today,
  projects,
}: WeeklyCalendarProps) {
  const [anchorDate, setAnchorDate] = useState(() => new Date(initialWeekStart + 'T12:00:00'));
  const [tasks, setTasks] = useState<WeekTask[]>(() => initialTasks.map(rowToWeekTask));
  const [editTask, setEditTask] = useState<WeekTask | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [newTaskStartTime, setNewTaskStartTime] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [activeTask, setActiveTask] = useState<WeekTask | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const weekDays = getWeekDays(anchorDate, weekStartDay, today);
  const weekStart = weekDays[0]!.dateStr;
  const weekEnd = weekDays[6]!.dateStr;

  const refreshTasks = useCallback(
    (start: string, end: string) => {
      startTransition(async () => {
        const rows = await getWeekTasks(start, end);
        setTasks(rows.map(rowToWeekTask));
      });
    },
    [],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    refreshTasks(weekStart, weekEnd);
  }, [weekStart, weekEnd, refreshTasks]);

  function navigateWeek(delta: number) {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  }

  function goToToday() {
    setAnchorDate(new Date());
  }

  function handleDragStart(event: DragStartEvent) {
    const task = (event.active.data.current as { task: WeekTask }).task;
    setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (over === null) return;

    const droppedDayStr = (over.id as string).replace('day-', '');
    const task = (active.data.current as { task: WeekTask }).task;

    if (task.date === droppedDayStr) return;

    let newStartAt: Date | null = null;
    let newEndAt: Date | null = null;
    if (task.startAt !== null) {
      const shifted = shiftDatePreservingTime(task.startAt, task.endAt, droppedDayStr);
      newStartAt = shifted.startAt;
      newEndAt = shifted.endAt;
    }

    if (task.isRecurring && task.recurringMasterId === null) {
      // Show prompt for recurring master tasks
      setPendingMove({ task, newDate: droppedDayStr, newStartAt, newEndAt });
    } else {
      // Optimistically update + commit for non-recurring or exception records
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, date: droppedDayStr, startAt: newStartAt, endAt: newEndAt }
            : t,
        ),
      );
      startTransition(async () => {
        await moveTaskToDate(task.id, droppedDayStr, newStartAt, newEndAt);
        refreshTasks(weekStart, weekEnd);
      });
    }
  }

  function commitMove(scope: 'this_occurrence' | 'all_future') {
    if (pendingMove === null) return;
    const { task, newDate, newStartAt, newEndAt } = pendingMove;
    setPendingMove(null);

    if (scope === 'this_occurrence') {
      startTransition(async () => {
        await createExceptionRecord({
          masterId: task.id,
          occurrenceDate: task.date!,
          title: task.title,
          projectId: task.projectId,
          priority: task.priority,
          status: task.status,
          date: newDate,
          startAt: newStartAt,
          endAt: newEndAt,
          description: task.description,
        });
        refreshTasks(weekStart, weekEnd);
      });
    } else {
      startTransition(async () => {
        await updateAllFutureOccurrences({
          masterId: task.id,
          occurrenceDate: task.date!,
          title: task.title,
          projectId: task.projectId,
          priority: task.priority,
          status: task.status,
          date: newDate,
          startAt: newStartAt,
          endAt: newEndAt,
          description: task.description,
          isRecurring: task.isRecurring,
          recurrenceRule: task.recurrenceRule as RR,
        });
        refreshTasks(weekStart, weekEnd);
      });
    }
  }

  function cancelMove() {
    setPendingMove(null);
  }

  function handleSaved() {
    setEditTask(null);
    setNewTaskDate(null);
    setNewTaskStartTime(null);
    refreshTasks(weekStart, weekEnd);
  }

  function handleAllDaySlotClick(dateStr: string) {
    setNewTaskDate(dateStr);
    setNewTaskStartTime(null);
  }

  function handleTimedSlotClick(dateStr: string) {
    const now = new Date();
    const rounded = nearestThirtyMin(now);
    setNewTaskDate(dateStr);
    setNewTaskStartTime(dateToTimeInput(rounded));
  }

  // Partition tasks by day
  const tasksByDay = new Map<string, { timed: WeekTask[]; allDay: WeekTask[] }>();
  for (const day of weekDays) {
    tasksByDay.set(day.dateStr, { timed: [], allDay: [] });
  }
  for (const task of tasks) {
    if (task.date === null) continue;
    const bucket = tasksByDay.get(task.date);
    if (bucket === undefined) continue;
    if (task.startAt !== null) {
      bucket.timed.push(task);
    } else {
      bucket.allDay.push(task);
    }
  }

  // Sort timed by startAt, all-day by priority
  const PRIORITY_ORDER: Record<string, number> = { must_do: 0, can_wait: 1, fun: 2 };
  for (const [, bucket] of tasksByDay) {
    bucket.timed.sort((a, b) => (a.startAt?.getTime() ?? 0) - (b.startAt?.getTime() ?? 0));
    bucket.allDay.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
  }

  const headerTitle = formatWeekHeader(weekDays);

  const showModal = editTask !== null || newTaskDate !== null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Navigation header */}
          <div
            style={{
              padding: '14px 22px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexShrink: 0,
            }}
          >
            <button
              className="fb-btn fb-btn--ghost"
              style={{ padding: 6 }}
              onClick={() => navigateWeek(-1)}
              aria-label="Previous week"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              {headerTitle}
            </div>
            <button
              className="fb-btn fb-btn--ghost"
              style={{ padding: 6 }}
              onClick={() => navigateWeek(1)}
              aria-label="Next week"
            >
              <Icon name="chevronRight" size={16} />
            </button>
            <button
              className="fb-btn"
              style={{ marginLeft: 8 }}
              onClick={goToToday}
            >
              Today
            </button>
            <div style={{ flex: 1 }} />
            <nav
              style={{ display: 'flex', gap: 2 }}
              aria-label="Calendar view"
            >
              {([
                { href: '/board', label: 'Board' },
                { href: '/week', label: 'Week' },
                { href: '/month', label: 'Month' },
              ] as const).map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: href === '/week' ? 600 : 450,
                    color: href === '/week' ? 'var(--accent-ink)' : 'var(--text-secondary)',
                    background: href === '/week' ? 'var(--accent-tint)' : 'transparent',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  aria-current={href === '/week' ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Calendar grid */}
          <div
            style={{
              flex: 1,
              padding: '14px 22px 18px 22px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'auto',
            }}
          >
            {/* Day header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  style={{
                    background: day.isToday ? 'var(--accent-tint)' : 'var(--bg-surface)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {day.dayName}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 19,
                      fontWeight: 500,
                      color: day.isToday ? 'var(--accent-ink)' : 'var(--text-primary)',
                    }}
                  >
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* Timed events section */}
            <div
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                background: 'var(--border)',
                borderLeft: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                height: 200,
                flexShrink: 0,
              }}
            >
              {/* Hour gridlines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(to bottom, transparent 0, transparent 24px, var(--bg-subtle) 24px, var(--bg-subtle) 25px)',
                  opacity: 0.5,
                  pointerEvents: 'none',
                }}
              />
              {weekDays.map((day) => {
                const { timed } = tasksByDay.get(day.dateStr) ?? { timed: [] };
                const overlapGroups = computeOverlapGroups(timed);
                return (
                  <DroppableDayColumn
                    key={day.dateStr}
                    dateStr={day.dateStr}
                    style={{
                      position: 'relative',
                      background: day.isToday
                        ? 'rgba(184, 106, 110, 0.04)'
                        : 'var(--bg-surface)',
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleTimedSlotClick(day.dateStr)}
                  >
                    {overlapGroups.map((group, groupIdx) => (
                      <div
                        key={groupIdx}
                        style={{ display: 'flex', gap: 2 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.events.map((task) => (
                          <div
                            key={task.id}
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            <DraggableTaskChip
                              task={task}
                              isTimed={true}
                              onEdit={setEditTask}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </DroppableDayColumn>
                );
              })}
            </div>

            {/* All-day divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0 6px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-base)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginLeft: 2,
                }}
              >
                All day
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* All-day section */}
            <div
              style={{
                flex: 1,
                minHeight: 80,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                background: 'var(--border)',
                border: '1px solid var(--border)',
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
                overflow: 'hidden',
              }}
            >
              {weekDays.map((day) => {
                const { allDay } = tasksByDay.get(day.dateStr) ?? { allDay: [] };
                return (
                  <DroppableDayColumn
                    key={day.dateStr}
                    dateStr={day.dateStr}
                    style={{
                      background: day.isToday
                        ? 'rgba(184, 106, 110, 0.04)'
                        : 'var(--bg-surface)',
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleAllDaySlotClick(day.dateStr)}
                  >
                    {allDay.map((task) => (
                      <div key={task.id} onClick={(e) => e.stopPropagation()}>
                        <DraggableTaskChip
                          task={task}
                          isTimed={false}
                          onEdit={setEditTask}
                        />
                      </div>
                    ))}
                  </DroppableDayColumn>
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask !== null && (
            <TaskChip
              task={activeTask}
              isTimed={activeTask.startAt !== null}
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Task modal — edit existing task */}
      {editTask !== null && (
        <TaskModal
          mode="edit"
          task={{
            id: editTask.id,
            title: editTask.title,
            projectId: editTask.projectId,
            priority: editTask.priority,
            status: editTask.status,
            date: editTask.date,
            startAt: editTask.startAt,
            endAt: editTask.endAt,
            description: editTask.description,
            isRecurring: editTask.isRecurring,
            recurrenceRule: editTask.recurrenceRule as RecurrenceRule | null,
            recurringMasterId: editTask.recurringMasterId,
          }}
          projects={projects}
          onClose={() => setEditTask(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Task modal — new task */}
      {newTaskDate !== null && editTask === null && (
        <TaskModal
          mode="new"
          projects={projects}
          defaultDate={newTaskDate}
          defaultStartTime={newTaskStartTime ?? undefined}
          onClose={() => {
            setNewTaskDate(null);
            setNewTaskStartTime(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Recurring move prompt */}
      {pendingMove !== null && (
        <RecurringMovePrompt
          onThisOnly={() => commitMove('this_occurrence')}
          onAllFuture={() => commitMove('all_future')}
          onCancel={cancelMove}
          isPending={isPending}
        />
      )}
    </>
  );
}
