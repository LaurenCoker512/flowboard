'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { RecurringTag } from '@/components/ui/RecurringTag';
import { TodayChip } from '@/components/ui/TodayChip';
import { PRIORITY_COLORS } from '@/lib/design';
import type { BoardTask } from '@/lib/board-utils';

type TaskCardProps = {
  task: BoardTask;
  isDragging?: boolean;
  muted?: boolean;
  showTodayChip?: boolean;
  onClick?: () => void;
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
}: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority].color;
  const isAppointment = task.startAt !== null;

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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ProjectDot color={task.projectColor} />
          <span>{task.projectName}</span>
        </span>
        {task.date !== null && !isAppointment && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="calendar" size={11} stroke={1.7} />
            {task.date}
          </span>
        )}
        {task.isRecurring && <RecurringTag label="Recurring" />}
      </div>
    </div>
  );
}
