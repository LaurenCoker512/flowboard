'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { RecurringTag } from '@/components/ui/RecurringTag';
import { TaskModal } from '@/components/TaskModal';
import { formatTime } from '@/lib/week-utils';
import { getTaskForHistory } from '@/lib/history-actions';
import type { CompletionRecord, HistoryTask } from '@/lib/history-actions';
import type { RecurrenceRule } from '@/lib/recurrence';

type ModalState =
  | { type: 'closed' }
  | { type: 'loading' }
  | { type: 'edit'; task: HistoryTask }
  | { type: 'readonly'; completion: CompletionRecord };

type Props = {
  initialCompletions: CompletionRecord[];
  projects: Array<{ id: string; name: string; color: string }>;
};

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const itemDay = new Date(year, month - 1, day);
  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function completedAtToDateStr(completedAt: Date): string {
  const d = new Date(completedAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeRange(startAt: Date | null, endAt: Date | null): string | null {
  if (startAt === null) return null;
  const start = formatTime(new Date(startAt));
  if (endAt === null) return start;
  return `${start} – ${formatTime(new Date(endAt))}`;
}

export function HistoryClient({ initialCompletions, projects }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) return initialCompletions;
    return initialCompletions.filter((c) => c.title.toLowerCase().includes(query));
  }, [initialCompletions, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, CompletionRecord[]>();
    for (const completion of filtered) {
      const key = completedAtToDateStr(completion.completedAt);
      const existing = map.get(key) ?? [];
      existing.push(completion);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([date, completions]) => ({ date, completions }));
  }, [filtered]);

  function handleModalClose() {
    setModal({ type: 'closed' });
    router.refresh();
  }

  function handleRowClick(completion: CompletionRecord) {
    if (completion.taskId === null) {
      setModal({ type: 'readonly', completion });
      return;
    }
    setModal({ type: 'loading' });
    startTransition(async () => {
      const task = await getTaskForHistory(completion.taskId!);
      if (task === null) {
        setModal({ type: 'readonly', completion });
      } else {
        setModal({ type: 'edit', task });
      }
    });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-base)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          History
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              position: 'absolute',
              left: 8,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Icon name="search" size={12} stroke={1.7} color="var(--text-tertiary)" />
          </span>
          <input
            type="text"
            placeholder="Search history…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 28,
              paddingRight: searchQuery.length > 0 ? 28 : 8,
              paddingTop: 5,
              paddingBottom: 5,
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              width: 200,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
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
      </div>

      {/* Completion list */}
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
            {searchQuery.trim().length > 0
              ? `No results for "${searchQuery.trim()}"`
              : 'No completed tasks yet.'}
          </div>
        ) : (
          groups.map(({ date, completions }) => (
            <div key={date} style={{ padding: '0 22px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  padding: '12px 0 6px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 4,
                }}
              >
                {formatDateHeader(date)}
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-tertiary)',
                    fontWeight: 500,
                    marginLeft: 8,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {completions.length}
                </span>
              </div>
              {completions.map((completion) => (
                <CompletionRow
                  key={completion.id}
                  completion={completion}
                  onClick={() => handleRowClick(completion)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Loading overlay */}
      {modal.type === 'loading' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Loading task"
        />
      )}

      {/* Edit modal */}
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
            description: modal.task.description,
            isRecurring: modal.task.isRecurring,
            recurrenceRule: modal.task.recurrenceRule as RecurrenceRule | null,
            recurringMasterId: modal.task.recurringMasterId,
            showSubtasksInline: modal.task.showSubtasksInline,
          }}
          projects={projects}
          onClose={handleModalClose}
          onSaved={handleModalClose}
        />
      )}

      {/* Readonly modal for deleted tasks */}
      {modal.type === 'readonly' && (
        <ReadonlyCompletionModal
          completion={modal.completion}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
    </div>
  );
}

type CompletionRowProps = {
  completion: CompletionRecord;
  onClick: () => void;
};

function CompletionRow({ completion, onClick }: CompletionRowProps) {
  const timeRange = formatTimeRange(completion.startAt, completion.endAt);

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
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none';
      }}
    >
      <ProjectDot color={completion.projectColor} size={8} />

      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 450,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {completion.title}
      </span>

      {completion.isRecurring && <RecurringTag label="Recurring" />}

      {timeRange !== null && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {timeRange}
        </span>
      )}
    </button>
  );
}

type ReadonlyCompletionModalProps = {
  completion: CompletionRecord;
  onClose: () => void;
};

function ReadonlyCompletionModal({ completion, onClose }: ReadonlyCompletionModalProps) {
  const timeRange = formatTimeRange(completion.startAt, completion.endAt);
  const completedDate = new Date(completion.completedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={completion.title}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px 28px',
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProjectDot color={completion.projectColor} size={9} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {completion.projectName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icon name="x" size={16} stroke={1.8} />
          </button>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 550,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.4,
          }}
        >
          {completion.title}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Completed {completedDate}
          </span>
          {timeRange !== null && (
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{timeRange}</span>
          )}
          {completion.isRecurring && <RecurringTag label="Recurring task" />}
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
          }}
        >
          This task has been deleted and can only be viewed here.
        </p>
      </div>
    </>
  );
}
