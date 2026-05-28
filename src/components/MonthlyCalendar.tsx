'use client';

import React, { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import Link from 'next/link';
import { TaskModal } from '@/components/TaskModal';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { PRIORITY_COLORS } from '@/lib/design';
import { formatTime } from '@/lib/week-utils';
import { getFrequencyLabel } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';
import {
  getMonthGrid,
  getMonthRange,
  formatMonthHeader,
  getMonthDayLabels,
  formatDayPopoverHeader,
  type MonthCell,
  type MonthTask,
} from '@/lib/month-utils';
import { getMonthTasks } from '@/lib/month-actions';
import type { TaskFormValues } from '@/lib/task-defaults';

type Project = { id: string; name: string; color: string };

type MonthlyCalendarProps = {
  initialTasks: MonthTask[];
  initialYear: number;
  initialMonth: number;
  weekStartDay: 'sunday' | 'monday';
  today: string;
  projects: Project[];
};

const MAX_VISIBLE_CHIPS = 3;

function buildTasksByDate(tasks: MonthTask[]): Map<string, MonthTask[]> {
  const map = new Map<string, MonthTask[]>();
  for (const task of tasks) {
    if (task.date === null) continue;
    const existing = map.get(task.date);
    if (existing !== undefined) {
      existing.push(task);
    } else {
      map.set(task.date, [task]);
    }
  }
  return map;
}

function sortDayTasks(tasks: MonthTask[]): MonthTask[] {
  return [...tasks].sort((a, b) => {
    // Timed tasks first, sorted by startAt
    const aIsTimedNum = a.startAt !== null ? 0 : 1;
    const bIsTimedNum = b.startAt !== null ? 0 : 1;
    if (aIsTimedNum !== bIsTimedNum) return aIsTimedNum - bIsTimedNum;
    if (a.startAt !== null && b.startAt !== null) {
      return a.startAt.getTime() - b.startAt.getTime();
    }
    return 0;
  });
}

// ─── Task Chip (month grid cell) ────────────────────────────────────────────

function MonthTaskChip({
  task,
  onClick,
}: {
  task: MonthTask;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { color, tint } = PRIORITY_COLORS[task.priority];
  return (
    <button
      onClick={onClick}
      title={task.isProjected === true ? 'Projected occurrence — click to schedule' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        background: task.isProjected === true ? 'transparent' : tint,
        border: 'none',
        borderLeft: task.isProjected === true ? `2px dashed ${color}` : `2.5px solid ${color}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderRadius: 4,
        padding: '2px 5px',
        fontSize: 10.5,
        lineHeight: 1.25,
        color: task.isProjected === true ? 'var(--text-secondary)' : 'var(--text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        minWidth: 0,
        opacity: task.isProjected === true ? 0.7 : 1,
      }}
    >
      <ProjectDot color={task.projectColor} size={5} />
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: task.status === 'done' ? 'line-through' : undefined,
        }}
      >
        {task.startAt !== null ? `${formatTime(task.startAt)} ` : ''}
        {task.title}
      </span>
      {task.isProjected === true && <Icon name="repeat" size={8} color="var(--text-tertiary)" />}
    </button>
  );
}

// ─── Day Detail Popover ──────────────────────────────────────────────────────

function DayDetailPopover({
  dateStr,
  tasks,
  onClose,
  onOpenTask,
  onNewTask,
  anchorRect,
}: {
  dateStr: string;
  tasks: MonthTask[];
  onClose: () => void;
  onOpenTask: (task: MonthTask) => void;
  onNewTask: (date: string) => void;
  anchorRect: DOMRect | null;
}) {
  const POPOVER_WIDTH = 280;
  const POPOVER_OFFSET = 6;

  let left = 0;
  let top = 0;

  if (anchorRect !== null) {
    left = anchorRect.right + POPOVER_OFFSET;
    top = anchorRect.top;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) {
      left = anchorRect.left - POPOVER_WIDTH - POPOVER_OFFSET;
    }
    if (left < 8) left = 8;
    if (top + 320 > window.innerHeight - 8) {
      top = window.innerHeight - 328;
    }
    if (top < 8) top = 8;
  }

  const sorted = sortDayTasks(tasks);
  const header = formatDayPopoverHeader(dateStr);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          left,
          top,
          width: POPOVER_WIDTH,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(40, 30, 20, 0.14)',
          overflow: 'hidden',
          zIndex: 151,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontWeight: 500,
              flex: 1,
            }}
          >
            {header}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
          <button
            className="fb-btn fb-btn--ghost"
            style={{ padding: 4 }}
            onClick={() => onNewTask(dateStr)}
            aria-label="Add task"
            title="Add task"
          >
            <Icon name="plus" size={13} />
          </button>
        </div>

        <div style={{ padding: 8, maxHeight: 320, overflowY: 'auto' }}>
          {sorted.map((task) => {
            const { color } = PRIORITY_COLORS[task.priority];
            const recurringLabel =
              task.isRecurring && task.recurrenceRule !== null
                ? getFrequencyLabel(task.recurrenceRule as RecurrenceRule)
                : null;
            return (
              <button
                key={task.id}
                onClick={() => onOpenTask(task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  marginBottom: 4,
                  borderRadius: 6,
                  borderLeft: `3px solid ${color}`,
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  background: 'var(--bg-base)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ProjectDot color={task.projectColor} size={7} />
                <span
                  style={{
                    fontSize: 12.5,
                    flex: 1,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: task.status === 'done' ? 'line-through' : undefined,
                  }}
                >
                  {task.title}
                </span>
                {task.startAt !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {formatTime(task.startAt)}
                  </span>
                )}
                {task.isProjected === true && (
                  <span style={{ fontSize: 10, color: 'var(--accent-ink)', background: 'var(--accent-tint)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                    projected
                  </span>
                )}
                {recurringLabel !== null && (
                  <Icon name="repeat" size={11} color="var(--text-tertiary)" />
                )}
              </button>
            );
          })}
          {tasks.length === 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', padding: '4px 10px', margin: 0 }}>
              No tasks for this day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Agenda List ──────────────────────────────────────────────────────

function MobileAgendaList({
  weeks,
  tasksByDate,
  selectedDate: selectedDateStr,
  today,
  onOpenTask,
  onNewTask,
}: {
  weeks: MonthCell[][];
  tasksByDate: Map<string, MonthTask[]>;
  selectedDate: string | null;
  today: string;
  onOpenTask: (task: MonthTask) => void;
  onNewTask: (date: string) => void;
}) {
  const allDays = weeks.flat().filter((c) => c.isCurrentMonth);

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {allDays.map((cell) => {
        const dayTasks = sortDayTasks(tasksByDate.get(cell.dateStr) ?? []);
        const isSelected = cell.dateStr === selectedDateStr;
        const isToday = cell.dateStr === today;
        return (
          <div
            key={cell.dateStr}
            id={`agenda-${cell.dateStr}`}
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px 8px',
                background: isSelected ? 'var(--accent-tint)' : 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: isToday ? 'var(--font-serif)' : undefined,
                  fontSize: 13,
                  fontWeight: isToday ? 600 : 500,
                  color: isToday ? '#FFF8F4' : 'var(--text-primary)',
                  flexShrink: 0,
                }}
              >
                {cell.dayNum}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                {formatDayPopoverHeader(cell.dateStr).split(',')[0]}
              </span>
              <button
                className="fb-btn fb-btn--ghost"
                style={{ padding: 4 }}
                onClick={() => onNewTask(cell.dateStr)}
                aria-label={`Add task for ${cell.dateStr}`}
              >
                <Icon name="plus" size={13} />
              </button>
            </div>
            {dayTasks.length > 0 && (
              <div style={{ padding: '0 12px 8px' }}>
                {dayTasks.map((task) => {
                  const { color } = PRIORITY_COLORS[task.priority];
                  return (
                    <button
                      key={task.isProjected === true ? `proj-${task.id}-${task.date}` : task.id}
                      onClick={() => onOpenTask(task)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '6px 10px',
                        marginBottom: 3,
                        borderRadius: 6,
                        borderLeft: task.isProjected === true ? `2px dashed ${color}` : `3px solid ${color}`,
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        background: 'var(--bg-base)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        opacity: task.isProjected === true ? 0.7 : 1,
                      }}
                    >
                      <ProjectDot color={task.projectColor} size={6} />
                      <span
                        style={{
                          fontSize: 12.5,
                          flex: 1,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.title}
                      </span>
                      {task.startAt !== null && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {formatTime(task.startAt)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MonthlyCalendar({
  initialTasks,
  initialYear,
  initialMonth,
  weekStartDay,
  today,
  projects,
}: MonthlyCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [tasks, setTasks] = useState<MonthTask[]>(initialTasks);
  const [editTask, setEditTask] = useState<MonthTask | null>(null);
  const [exceptionTask, setExceptionTask] = useState<MonthTask | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [popoverDate, setPopoverDate] = useState<string | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);
  const [mobileSelectedDate, setMobileSelectedDate] = useState<string | null>(today);
  const [, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  const dayLabels = getMonthDayLabels(weekStartDay);
  const weeks = getMonthGrid(year, month, weekStartDay, today);
  const tasksByDate = buildTasksByDate(tasks);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { startDate, endDate } = getMonthRange(year, month);
    startTransition(async () => {
      const rows = await getMonthTasks(startDate, endDate);
      setTasks(rows);
    });
  }, [year, month]);

  const navigateMonth = useCallback((delta: number) => {
    setPopoverDate(null);
    setYear((y) => {
      const newMonth = ((month + delta) % 12 + 12) % 12;
      const yearDelta = Math.floor((month + delta) / 12);
      setMonth(newMonth);
      return y + yearDelta;
    });
  }, [month]);

  const goToToday = useCallback(() => {
    const [yearStr, monthStr] = today.split('-');
    setYear(Number(yearStr));
    setMonth(Number(monthStr) - 1);
    setPopoverDate(null);
    setMobileSelectedDate(today);
  }, [today]);

  const handleCellClick = useCallback((cell: MonthCell, e: React.MouseEvent) => {
    if (!cell.isCurrentMonth) return;
    setPopoverDate(cell.dateStr);
    setPopoverRect((e.currentTarget as HTMLElement).getBoundingClientRect());
  }, []);

  const handleNewTask = useCallback((date: string) => {
    setPopoverDate(null);
    setNewTaskDate(date);
  }, []);

  const handleOpenTask = useCallback((task: MonthTask) => {
    setPopoverDate(null);
    if (task.isProjected === true) {
      setExceptionTask(task);
    } else {
      setEditTask(task);
    }
  }, []);

  const handleModalClose = useCallback(async () => {
    setEditTask(null);
    setExceptionTask(null);
    setNewTaskDate(null);
    const { startDate, endDate } = getMonthRange(year, month);
    const rows = await getMonthTasks(startDate, endDate);
    setTasks(rows);
  }, [year, month]);

  const handleMobileDayTap = useCallback((cell: MonthCell) => {
    if (!cell.isCurrentMonth) return;
    setMobileSelectedDate(cell.dateStr);
    const el = document.getElementById(`agenda-${cell.dateStr}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const monthLabel = formatMonthHeader(year, month);

  // For the "is today in current month" check
  const [todayYear, todayMonthStr] = today.split('-');
  const isCurrentMonthView = year === Number(todayYear) && month === Number(todayMonthStr) - 1;

  return (
    <>
      <style>{`
        .month-desktop-grid { display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .month-mobile-view { display: none; flex-direction: column; flex: 1; min-height: 0; }
        @media (max-width: 640px) {
          .month-desktop-grid { display: none; }
          .month-mobile-view { display: flex; }
        }
      `}</style>

      {/* ── Header ── */}
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
          onClick={() => navigateMonth(-1)}
          aria-label="Previous month"
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
            minWidth: 160,
          }}
        >
          {monthLabel}
        </div>

        <button
          className="fb-btn fb-btn--ghost"
          style={{ padding: 6 }}
          onClick={() => navigateMonth(1)}
          aria-label="Next month"
        >
          <Icon name="chevronRight" size={16} />
        </button>

        {!isCurrentMonthView && (
          <button className="fb-btn" style={{ marginLeft: 8 }} onClick={goToToday}>
            Today
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* View switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {([
            { label: 'Board', href: '/board' },
            { label: 'Week', href: '/week' },
            { label: 'Month', href: '/month' },
          ] as const).map(({ label, href }) => {
            const isActive = href === '/month';
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 450,
                  color: isActive ? 'var(--accent-ink)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-surface)' : 'transparent',
                  textDecoration: 'none',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Desktop grid ── */}
      <div className="month-desktop-grid" style={{ padding: '14px 22px 18px' }}>
        {/* Day column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {dayLabels.map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            gap: 0,
          }}
        >
          {weeks.flat().map((cell) => {
            const dayTasks = sortDayTasks(tasksByDate.get(cell.dateStr) ?? []);
            const visible = dayTasks.slice(0, MAX_VISIBLE_CHIPS);
            const overflow = dayTasks.length - visible.length;

            return (
              <div
                key={cell.dateStr}
                onClick={(e) => handleCellClick(cell, e)}
                style={{
                  background: cell.isToday
                    ? 'var(--accent-tint)'
                    : cell.isCurrentMonth
                    ? 'var(--bg-surface)'
                    : 'var(--bg-base)',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  minWidth: 0,
                  overflow: 'hidden',
                  cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Date number */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'flex-start',
                    width: cell.isToday ? 22 : 'auto',
                    height: cell.isToday ? 22 : 'auto',
                    borderRadius: cell.isToday ? '50%' : 0,
                    background: cell.isToday ? 'var(--accent)' : 'transparent',
                    padding: cell.isToday ? 0 : '0 2px',
                    fontSize: cell.isToday ? 13 : 12,
                    fontWeight: cell.isToday ? 600 : 500,
                    fontFamily: cell.isToday ? 'var(--font-serif)' : 'var(--font-sans)',
                    color: cell.isToday
                      ? '#FFF8F4'
                      : cell.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-disabled)',
                    marginBottom: 2,
                  }}
                >
                  {cell.dayNum}
                </div>

                {/* Task chips */}
                {cell.isCurrentMonth &&
                  visible.map((task) => (
                    <MonthTaskChip
                      key={task.id}
                      task={task}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTask(task);
                      }}
                    />
                  ))}

                {/* Overflow */}
                {cell.isCurrentMonth && overflow > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(cell, e);
                    }}
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '0 4px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                    }}
                  >
                    + {overflow} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile dot-indicator + agenda ── */}
      <div className="month-mobile-view">
        {/* Mobile day column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}
        >
          {dayLabels.map((label) => (
            <div
              key={label}
              style={{
                padding: '6px 4px',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Mobile dot grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {weeks.flat().map((cell) => {
            const dayTasks = tasksByDate.get(cell.dateStr) ?? [];
            const dots = dayTasks.slice(0, 3);
            const isSelected = cell.dateStr === mobileSelectedDate;

            return (
              <button
                key={cell.dateStr}
                onClick={() => handleMobileDayTap(cell)}
                disabled={!cell.isCurrentMonth}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 2px',
                  background: isSelected && cell.isCurrentMonth ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                  borderRadius: 6,
                  margin: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: cell.isToday ? 600 : 400,
                    color: cell.isToday && !isSelected
                      ? 'var(--accent)'
                      : isSelected && cell.isCurrentMonth
                      ? '#FFF8F4'
                      : cell.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-disabled)',
                  }}
                >
                  {cell.dayNum}
                </span>
                {dots.length > 0 && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {dots.map((task, i) => (
                      <div
                        key={i}
                        style={{
                          width: 3.5,
                          height: 3.5,
                          borderRadius: '50%',
                          background: isSelected && cell.isCurrentMonth
                            ? '#FFF8F4'
                            : PRIORITY_COLORS[task.priority].color,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile agenda list */}
        <MobileAgendaList
          weeks={weeks}
          tasksByDate={tasksByDate}
          selectedDate={mobileSelectedDate}
          today={today}
          onOpenTask={handleOpenTask}
          onNewTask={handleNewTask}
        />
      </div>

      {/* ── Day Detail Popover ── */}
      {popoverDate !== null && (
        <DayDetailPopover
          dateStr={popoverDate}
          tasks={sortDayTasks(tasksByDate.get(popoverDate) ?? [])}
          onClose={() => setPopoverDate(null)}
          onOpenTask={handleOpenTask}
          onNewTask={handleNewTask}
          anchorRect={popoverRect}
        />
      )}

      {/* ── Task Modal (edit) ── */}
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
            isRecurring: editTask.isRecurring,
            recurrenceRule: editTask.recurrenceRule as import('@/lib/recurrence').RecurrenceRule | null,
            recurringMasterId: editTask.recurringMasterId,
            description: editTask.description,
          }}
          projects={projects}
          onClose={handleModalClose}
        />
      )}

      {/* ── Task Modal (exception — projected occurrence) ── */}
      {exceptionTask !== null && (
        <TaskModal
          mode="exception"
          exceptionMasterId={exceptionTask.id}
          exceptionOccurrenceDate={exceptionTask.date!}
          task={{
            id: exceptionTask.id,
            title: exceptionTask.title,
            projectId: exceptionTask.projectId,
            priority: exceptionTask.priority,
            status: 'backlog',
            date: exceptionTask.date,
            startAt: exceptionTask.startAt,
            endAt: exceptionTask.endAt,
            isRecurring: false,
            recurrenceRule: null,
            recurringMasterId: null,
            description: exceptionTask.description,
          }}
          projects={projects}
          onClose={handleModalClose}
          onSaved={handleModalClose}
        />
      )}

      {/* ── Task Modal (new) ── */}
      {newTaskDate !== null && (
        <TaskModal
          mode="new"
          projects={projects}
          defaultDate={newTaskDate}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
