'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { RecurringTag } from '@/components/ui/RecurringTag';
import { TodayChip } from '@/components/ui/TodayChip';
import { PRIORITY_COLORS } from '@/lib/design';
import { getFrequencyLabel } from '@/lib/recurrence';
import type { BoardTask } from '@/lib/board-utils';
import type { RecurrenceRule } from '@/lib/recurrence';
import type { SubtaskData } from '@/types';

type TaskCardProps = {
  task: BoardTask;
  isDragging?: boolean;
  muted?: boolean;
  showTodayChip?: boolean;
  onClick?: () => void;
  onSubtaskToggle?: (subtaskId: string, isCompleted: boolean) => void;
  onClear?: () => void;
};

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${displayHour}${displayMinutes}${period}`;
}

export function TaskCard({
  task,
  isDragging = false,
  muted = false,
  showTodayChip = false,
  onClick,
  onSubtaskToggle,
  onClear,
}: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority].color;
  const isAppointment = task.startAt !== null;

  const subtasks = task.subtasks ?? [];
  const subtaskCount = subtasks.length;
  const completedCount = subtasks.filter((st) => st.isCompleted).length;
  const allComplete = subtaskCount > 0 && completedCount === subtaskCount;
  const showInlineList = task.showSubtasksInline && subtaskCount > 0 && !allComplete;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        paddingLeft: 'calc(var(--card-pad-x) + 3px)',
        paddingRight: 'var(--card-pad-x)',
        paddingTop: 'var(--card-pad-y)',
        paddingBottom: 'var(--card-pad-y)',
        cursor: onClick !== undefined ? 'pointer' : 'default',
        overflow: 'hidden',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(-1.5deg)' : 'none',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: priorityColor,
        }}
      />

      {isAppointment && task.startAt !== null && (
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 4,
            letterSpacing: '-0.005em',
          }}
        >
          {formatTime(task.startAt)}
        </div>
      )}

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.4,
          fontWeight: 450,
          color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
          textDecoration: muted ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-tertiary)',
          textDecorationThickness: '1px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.title}
      </div>

      {showInlineList && (
        <div
          style={{ marginTop: 8 }}
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="Subtasks"
        >
          {subtasks.map((subtask: SubtaskData) => (
            <label
              key={subtask.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 0',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={subtask.isCompleted}
                onChange={(e) => {
                  e.stopPropagation();
                  onSubtaskToggle?.(subtask.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 14, height: 14, flexShrink: 0 }}
                aria-label={subtask.title}
              />
              <span
                style={{
                  fontSize: 13,
                  color: subtask.isCompleted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  textDecoration: subtask.isCompleted ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtask.title}
              </span>
            </label>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 7,
          fontSize: 11.5,
          color: 'var(--text-secondary)',
        }}
      >
        {(showTodayChip || task.promoted === true) && <TodayChip />}
        {!isAppointment && <PriorityBadge priority={task.priority} />}
        <Link
          href={`/projects/${task.projectId}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <ProjectDot color={task.projectColor} />
          <span>{task.projectName}</span>
        </Link>
        {task.date !== null && !isAppointment && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="calendar" size={11} stroke={1.7} />
            {task.date}
          </span>
        )}
        {task.isRecurring && (
          <RecurringTag
            label={
              task.recurrenceRule !== null && task.recurrenceRule !== undefined
                ? getFrequencyLabel(task.recurrenceRule as RecurrenceRule)
                : 'Recurring'
            }
          />
        )}
        {subtaskCount > 0 && (
          <span
            style={{
              fontSize: 11,
              color: allComplete ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              marginLeft: 'auto',
            }}
            aria-label={`${completedCount} of ${subtaskCount} subtasks complete`}
          >
            {completedCount} / {subtaskCount}
          </span>
        )}
      </div>

      {onClear !== undefined && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="Clear task"
          title="Clear task"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            opacity: 0,
            transition: 'opacity 0.1s ease, background 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'var(--bg-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
            e.currentTarget.style.background = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onBlur={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        >
          <Icon name="x" size={11} stroke={1.8} />
        </button>
      )}
    </div>
  );
}
