'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { Icon } from './ui/Icon';
import { Segmented } from './ui/Segmented';
import { PRIORITY_COLORS } from '@/lib/design';
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  createExceptionRecord,
  updateAllFutureOccurrences,
} from '@/lib/task-actions';
import { getFrequencyLabel } from '@/lib/recurrence';
import { resolveDefaultProject, isTaskDirty, type TaskFormValues } from '@/lib/task-defaults';
import type { RecurrenceRule, DayOfWeek } from '@/lib/recurrence';

const LOCAL_STORAGE_KEY = 'flowboard:lastProject';

const STATUS_OPTIONS: Array<{
  value: 'backlog' | 'up_next' | 'in_progress' | 'done';
  label: string;
}> = [
  { value: 'backlog', label: 'Later' },
  { value: 'up_next', label: "What's next" },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  {
    value: 'must_do' as const,
    label: PRIORITY_COLORS.must_do.label,
    dot: PRIORITY_COLORS.must_do.color,
    activeBg: PRIORITY_COLORS.must_do.tint,
    activeColor: PRIORITY_COLORS.must_do.color,
  },
  {
    value: 'can_wait' as const,
    label: PRIORITY_COLORS.can_wait.label,
    dot: PRIORITY_COLORS.can_wait.color,
    activeBg: PRIORITY_COLORS.can_wait.tint,
    activeColor: PRIORITY_COLORS.can_wait.color,
  },
  {
    value: 'fun' as const,
    label: PRIORITY_COLORS.fun.label,
    dot: PRIORITY_COLORS.fun.color,
    activeBg: PRIORITY_COLORS.fun.tint,
    activeColor: PRIORITY_COLORS.fun.color,
  },
];

const ALL_DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

function extractTime(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const combined = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(combined.getTime()) ? null : combined;
}

function parseRecurrenceFrequency(
  rule?: RecurrenceRule | null,
): 'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' {
  if (rule === null || rule === undefined) return 'one_time';
  return rule.frequency;
}

function parseEndsType(ends?: RecurrenceRule['ends']): 'never' | 'on_date' | 'after_occurrences' {
  if (ends === null || ends === undefined) return 'never';
  if ('on_date' in ends) return 'on_date';
  if ('after_occurrences' in ends) return 'after_occurrences';
  return 'never';
}

function parseEndsDate(ends?: RecurrenceRule['ends']): string {
  if (ends !== null && ends !== undefined && 'on_date' in ends) return ends.on_date;
  return '';
}

function parseEndsAfter(ends?: RecurrenceRule['ends']): number {
  if (ends !== null && ends !== undefined && 'after_occurrences' in ends)
    return ends.after_occurrences;
  return 5;
}

function buildRecurrenceRule(
  frequency: string,
  interval: number,
  daysOfWeek: DayOfWeek[],
  dayOfMonth: number | null,
  weekOfMonth: number | null,
  endsType: string,
  endsDate: string,
  endsAfter: number,
): RecurrenceRule | null {
  if (frequency === 'one_time') return null;

  let ends: RecurrenceRule['ends'] = null;
  if (endsType === 'on_date' && endsDate) {
    ends = { on_date: endsDate };
  } else if (endsType === 'after_occurrences' && endsAfter > 0) {
    ends = { after_occurrences: endsAfter };
  }

  const rule: RecurrenceRule = {
    frequency: frequency as RecurrenceRule['frequency'],
    interval: Math.max(1, interval),
    ends,
  };

  if (daysOfWeek.length > 0 && (frequency === 'weekly' || frequency === 'custom')) {
    rule.days_of_week = daysOfWeek;
  }
  if (dayOfMonth !== null && (frequency === 'monthly' || frequency === 'custom')) {
    rule.day_of_month = dayOfMonth;
  }
  if (weekOfMonth !== null && (frequency === 'monthly' || frequency === 'custom')) {
    rule.week_of_month = weekOfMonth;
  }

  return rule;
}

type CustomRuleBuilderProps = {
  interval: number;
  daysOfWeek: DayOfWeek[];
  endsType: 'never' | 'on_date' | 'after_occurrences';
  endsDate: string;
  endsAfter: number;
  onIntervalChange: (val: number) => void;
  onDaysOfWeekChange: (val: DayOfWeek[]) => void;
  onEndsTypeChange: (val: 'never' | 'on_date' | 'after_occurrences') => void;
  onEndsDateChange: (val: string) => void;
  onEndsAfterChange: (val: number) => void;
  isPending: boolean;
};

function CustomRuleBuilder({
  interval,
  daysOfWeek,
  endsType,
  endsDate,
  endsAfter,
  onIntervalChange,
  onDaysOfWeekChange,
  onEndsTypeChange,
  onEndsDateChange,
  onEndsAfterChange,
  isPending,
}: CustomRuleBuilderProps) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Every N interval */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={interval}
          onChange={(e) =>
            onIntervalChange(Math.max(1, parseInt(e.target.value, 10) || 1))
          }
          disabled={isPending}
          className="fb-input"
          style={{ width: 52, textAlign: 'center', padding: '4px 6px', fontSize: 12 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {interval === 1 ? 'day/week' : 'days/weeks'}
        </span>
      </div>

      {/* Days of week picker */}
      <div>
        <div className="fb-label" style={{ marginBottom: 5 }}>
          On these days
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {ALL_DAYS.map(({ key, label }) => {
            const isOn = daysOfWeek.includes(key);
            return (
              <button
                key={key}
                type="button"
                disabled={isPending}
                onClick={() => {
                  onDaysOfWeekChange(
                    isOn ? daysOfWeek.filter((d) => d !== key) : [...daysOfWeek, key],
                  );
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  border: `1px solid ${isOn ? 'transparent' : 'var(--border)'}`,
                  background: isOn ? 'var(--accent)' : 'var(--bg-surface)',
                  color: isOn ? '#FFF8F4' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ends */}
      <div>
        <div className="fb-label" style={{ marginBottom: 5 }}>
          Ends
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(['never', 'on_date', 'after_occurrences'] as const).map((type) => {
            const selected = endsType === type;
            const labelText =
              type === 'never' ? 'Never' : type === 'on_date' ? 'On date' : 'After N times';
            return (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                      }}
                    />
                  )}
                </span>
                <input
                  type="radio"
                  value={type}
                  checked={selected}
                  onChange={() => onEndsTypeChange(type)}
                  style={{ display: 'none' }}
                />
                <span style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {labelText}
                </span>
                {type === 'on_date' && selected && (
                  <input
                    type="date"
                    value={endsDate}
                    onChange={(e) => onEndsDateChange(e.target.value)}
                    className="fb-input"
                    disabled={isPending}
                    style={{ marginLeft: 4, padding: '2px 6px', fontSize: 11, width: 120 }}
                  />
                )}
                {type === 'after_occurrences' && selected && (
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={endsAfter}
                    onChange={(e) =>
                      onEndsAfterChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="fb-input"
                    disabled={isPending}
                    style={{ marginLeft: 4, padding: '2px 6px', fontSize: 11, width: 56 }}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TaskModalProps {
  mode: 'new' | 'edit';
  task?: {
    id: string;
    title: string;
    projectId: string;
    priority: 'must_do' | 'can_wait' | 'fun';
    status: 'backlog' | 'up_next' | 'in_progress' | 'done';
    date: string | null;
    startAt: Date | string | null;
    endAt: Date | string | null;
    description: string | null;
    isRecurring?: boolean;
    recurrenceRule?: RecurrenceRule | null;
    recurringMasterId?: string | null;
  };
  projects: Array<{ id: string; name: string; color: string }>;
  defaultProjectId?: string;
  defaultStatus?: 'backlog' | 'up_next' | 'in_progress' | 'done';
  defaultDate?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function TaskModal({
  mode,
  task,
  projects,
  defaultProjectId,
  defaultStatus = 'backlog',
  defaultDate,
  onClose,
  onSaved,
}: TaskModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDescription, setShowDescription] = useState(
    mode === 'edit' && Boolean(task?.description),
  );

  const [resolvedProjectId, setResolvedProjectId] = useState<string>(
    mode === 'edit'
      ? (task?.projectId ?? '')
      : resolveDefaultProject(null, projects, defaultProjectId ?? null),
  );

  // Recurrence state
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  >(parseRecurrenceFrequency(task?.recurrenceRule));
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    task?.recurrenceRule?.interval ?? 1,
  );
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<DayOfWeek[]>(
    task?.recurrenceRule?.days_of_week ?? [],
  );
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | null>(
    task?.recurrenceRule?.day_of_month ?? null,
  );
  const [recurrenceWeekOfMonth, setRecurrenceWeekOfMonth] = useState<number | null>(
    task?.recurrenceRule?.week_of_month ?? null,
  );
  const [recurrenceEndsType, setRecurrenceEndsType] = useState<
    'never' | 'on_date' | 'after_occurrences'
  >(parseEndsType(task?.recurrenceRule?.ends));
  const [recurrenceEndsDate, setRecurrenceEndsDate] = useState(
    parseEndsDate(task?.recurrenceRule?.ends),
  );
  const [recurrenceEndsAfter, setRecurrenceEndsAfter] = useState(
    parseEndsAfter(task?.recurrenceRule?.ends),
  );

  // For recurring edit scope prompt
  const [recurringEditScope, setRecurringEditScope] = useState<
    'choosing' | 'this_occurrence' | 'all_future' | null
  >(null);

  const initialValues = useRef<TaskFormValues>({
    title: task?.title ?? '',
    projectId:
      mode === 'edit'
        ? (task?.projectId ?? '')
        : resolveDefaultProject(null, projects, defaultProjectId ?? null),
    priority: task?.priority ?? 'can_wait',
    status: task?.status ?? defaultStatus,
    date: task?.date ?? defaultDate ?? '',
    startTime: extractTime(task?.startAt),
    endTime: extractTime(task?.endAt),
    description: task?.description ?? '',
    isRecurring: task?.isRecurring ?? false,
    recurrenceRuleJson: task?.recurrenceRule ? JSON.stringify(task.recurrenceRule) : '',
  });

  const [formValues, setFormValues] = useState<TaskFormValues>({
    ...initialValues.current,
  });

  useEffect(() => {
    if (mode === 'new') {
      const lastUsed = localStorage.getItem(LOCAL_STORAGE_KEY);
      const resolved = resolveDefaultProject(lastUsed, projects, defaultProjectId ?? null);
      setResolvedProjectId(resolved);
      setFormValues((prev) => ({ ...prev, projectId: resolved }));
      initialValues.current = { ...initialValues.current, projectId: resolved };
    }
  }, [mode, projects, defaultProjectId]);

  // Sync recurrence state into formValues for dirty checking
  useEffect(() => {
    const isRec = recurrenceFrequency !== 'one_time' && !!formValues.date;
    const rule = isRec
      ? buildRecurrenceRule(
          recurrenceFrequency,
          recurrenceInterval,
          recurrenceDaysOfWeek,
          recurrenceDayOfMonth,
          recurrenceWeekOfMonth,
          recurrenceEndsType,
          recurrenceEndsDate,
          recurrenceEndsAfter,
        )
      : null;
    setFormValues((prev) => ({
      ...prev,
      isRecurring: isRec,
      recurrenceRuleJson: rule !== null ? JSON.stringify(rule) : '',
    }));
  }, [
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceDaysOfWeek,
    recurrenceDayOfMonth,
    recurrenceWeekOfMonth,
    recurrenceEndsType,
    recurrenceEndsDate,
    recurrenceEndsAfter,
    formValues.date,
  ]);

  const updateField = useCallback(
    <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
      setFormValues((prev) => {
        const updated = { ...prev, [field]: value };
        if (field === 'date' && !value) {
          updated.startTime = '';
          updated.endTime = '';
          setRecurrenceFrequency('one_time');
        }
        return updated;
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    if (isTaskDirty(initialValues.current, formValues)) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  }, [formValues, onClose]);

  function getFrequencyLabelFromState(): string {
    const rule = buildRecurrenceRule(
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceWeekOfMonth,
      recurrenceEndsType,
      recurrenceEndsDate,
      recurrenceEndsAfter,
    );
    if (rule === null) return "Doesn't repeat";
    return getFrequencyLabel(rule);
  }

  const handleSave = useCallback(
    (scope?: 'this_occurrence' | 'all_future') => {
      const currentRule = buildRecurrenceRule(
        recurrenceFrequency,
        recurrenceInterval,
        recurrenceDaysOfWeek,
        recurrenceDayOfMonth,
        recurrenceWeekOfMonth,
        recurrenceEndsType,
        recurrenceEndsDate,
        recurrenceEndsAfter,
      );
      const isRecurring = recurrenceFrequency !== 'one_time' && !!formValues.date;

      // For editing recurring tasks, prompt for scope if not already chosen
      const taskIsRecurring =
        task?.isRecurring === true || (task?.recurringMasterId !== null && task?.recurringMasterId !== undefined);
      if (mode === 'edit' && taskIsRecurring && scope === undefined && recurringEditScope === null) {
        setRecurringEditScope('choosing');
        return;
      }

      const effectiveScope = scope ?? (recurringEditScope !== 'choosing' ? recurringEditScope : null);

      startTransition(async () => {
        const startAt = buildDateTime(formValues.date, formValues.startTime);
        const endAt = buildDateTime(formValues.date, formValues.endTime);

        let result: { error: string | null };

        if (mode === 'edit' && task !== undefined) {
          if (effectiveScope === 'this_occurrence') {
            const masterId = task.recurringMasterId ?? task.id;
            const occurrenceDate = task.date ?? '';
            result = await createExceptionRecord({
              masterId,
              occurrenceDate,
              title: formValues.title,
              projectId: formValues.projectId,
              priority: formValues.priority,
              status: formValues.status,
              date: formValues.date || null,
              startAt,
              endAt,
              description: formValues.description || null,
            });
          } else if (effectiveScope === 'all_future') {
            const masterId = task.recurringMasterId ?? task.id;
            const occurrenceDate = task.date ?? '';
            result = await updateAllFutureOccurrences({
              masterId,
              occurrenceDate,
              title: formValues.title,
              projectId: formValues.projectId,
              priority: formValues.priority,
              status: formValues.status,
              date: formValues.date || null,
              startAt,
              endAt,
              description: formValues.description || null,
              isRecurring,
              recurrenceRule: currentRule,
            });
          } else {
            // Non-recurring or no scope needed
            result = await updateTaskAction({
              id: task.id,
              title: formValues.title,
              projectId: formValues.projectId,
              priority: formValues.priority,
              status: formValues.status,
              date: formValues.date || null,
              startAt,
              endAt,
              description: formValues.description || null,
              isRecurring,
              recurrenceRule: currentRule,
            });
          }
        } else {
          result = await createTaskAction({
            title: formValues.title,
            projectId: formValues.projectId,
            priority: formValues.priority,
            status: formValues.status,
            date: formValues.date || null,
            startAt,
            endAt,
            description: formValues.description || null,
            isRecurring,
            recurrenceRule: currentRule,
          });
        }

        if (result.error !== null) {
          setError(result.error);
          return;
        }

        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, formValues.projectId);
        } catch {
          // localStorage may be unavailable in some environments
        }

        onSaved?.();
        onClose();
      });
    },
    [
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceWeekOfMonth,
      recurrenceEndsType,
      recurrenceEndsDate,
      recurrenceEndsAfter,
      formValues,
      mode,
      task,
      recurringEditScope,
      onSaved,
      onClose,
    ],
  );

  const handleDelete = () => {
    if (mode !== 'edit' || task === undefined) return;
    startTransition(async () => {
      await deleteTaskAction(task.id);
      onClose();
    });
  };

  const currentProject = projects.find((p) => p.id === formValues.projectId);

  if (showDiscard) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40,30,20,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 16,
            padding: '28px 32px',
            maxWidth: 360,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
            Discard changes?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Your unsaved changes will be lost.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={() => setShowDiscard(false)}
            >
              Keep editing
            </button>
            <button type="button" className="fb-btn fb-btn--danger" onClick={onClose}>
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recurring edit scope prompt
  if (recurringEditScope === 'choosing') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40,30,20,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: '0 12px 40px rgba(40,30,20,0.18)',
            padding: 22,
            width: 460,
            maxWidth: '96vw',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Icon name="repeat" size={16} color="var(--accent)" />
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              This is a recurring task
            </h3>
          </div>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            How would you like to apply your changes?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => {
                setRecurringEditScope('this_occurrence');
                handleSave('this_occurrence');
              }}
              style={{
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="calendar" size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  This occurrence only
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                  Just today's instance
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setRecurringEditScope('all_future');
                handleSave('all_future');
              }}
              style={{
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--accent-tint)',
                border: '1px solid var(--accent-soft)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#FFF8F4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="repeat" size={15} color="#FFF8F4" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-ink)' }}>
                  All future occurrences
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--accent-ink)',
                    opacity: 0.75,
                    marginTop: 1,
                  }}
                >
                  Update the recurring rule
                </div>
              </div>
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={() => setRecurringEditScope(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(40,30,20,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          width: 580,
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              marginBottom: 4,
            }}
          >
            {currentProject?.name ?? 'No project'}
          </div>
          <input
            className="fb-input"
            placeholder="Task title"
            value={formValues.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={isPending}
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: 22,
              fontWeight: 500,
              border: 'none',
              background: 'transparent',
              padding: 0,
              width: '100%',
              outline: 'none',
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Main column */}
          <div
            style={{
              flex: 1,
              padding: '18px 22px',
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {error !== null && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--p-must)', fontWeight: 500 }}>
                {error}
              </p>
            )}

            {showDescription ? (
              <textarea
                className="fb-textarea"
                placeholder="Add a description…"
                value={formValues.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={isPending}
                onBlur={() => {
                  if (!formValues.description) setShowDescription(false);
                }}
                rows={4}
                style={{ resize: 'vertical', width: '100%' }}
                autoFocus={!formValues.description}
              />
            ) : (
              <button
                type="button"
                className="fb-btn fb-btn--ghost"
                onClick={() => setShowDescription(true)}
                style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }}
              >
                <Icon name="plus" size={14} />
                Add description
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div
            style={{
              width: 230,
              background: 'var(--bg-base)',
              padding: '18px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Project */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                Project
              </label>
              <select
                className="fb-select"
                value={formValues.projectId}
                onChange={(e) => updateField('projectId', e.target.value)}
                disabled={isPending}
                style={{ width: '100%' }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                Priority
              </label>
              <Segmented
                options={PRIORITY_OPTIONS}
                value={formValues.priority}
                onChange={(val) => updateField('priority', val as TaskFormValues['priority'])}
                fullWidth
              />
            </div>

            {/* Status */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 4 }}>
                Status
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {STATUS_OPTIONS.map((option) => {
                  const isActive = formValues.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('status', option.value)}
                      disabled={isPending}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: isActive ? 'var(--accent-tint)' : 'transparent',
                        color: isActive ? 'var(--accent-ink)' : 'var(--text-secondary)',
                      }}
                    >
                      {isActive ? (
                        <Icon name="check" size={12} />
                      ) : (
                        <span style={{ width: 12, display: 'inline-block' }} />
                      )}
                      <span style={{ paddingLeft: isActive ? 0 : 0 }}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                className="fb-input"
                value={formValues.date}
                onChange={(e) => updateField('date', e.target.value)}
                disabled={isPending}
                style={{ width: '100%' }}
              />
            </div>

            {/* Time */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                Start time
              </label>
              <input
                type="time"
                className="fb-input"
                value={formValues.startTime}
                onChange={(e) => updateField('startTime', e.target.value)}
                disabled={isPending || !formValues.date}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                End time
              </label>
              <input
                type="time"
                className="fb-input"
                value={formValues.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
                disabled={isPending || !formValues.date}
                style={{ width: '100%' }}
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="fb-label" style={{ display: 'block', marginBottom: 6 }}>
                Recurrence
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 11px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    opacity: !formValues.date ? 0.5 : 1,
                  }}
                >
                  <Icon name="repeat" size={13} color="var(--text-secondary)" />
                  <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                    {recurrenceFrequency === 'one_time'
                      ? "Doesn't repeat"
                      : getFrequencyLabelFromState()}
                  </span>
                  <Icon name="chevronDown" size={12} color="var(--text-tertiary)" />
                </div>
                <select
                  value={recurrenceFrequency}
                  onChange={(e) =>
                    setRecurrenceFrequency(
                      e.target.value as typeof recurrenceFrequency,
                    )
                  }
                  disabled={!formValues.date || isPending}
                  aria-label="Recurrence frequency"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: formValues.date ? 'pointer' : 'not-allowed',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <option value="one_time">Doesn't repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom…</option>
                </select>
              </div>

              {recurrenceFrequency === 'custom' && formValues.date && (
                <CustomRuleBuilder
                  interval={recurrenceInterval}
                  daysOfWeek={recurrenceDaysOfWeek}
                  endsType={recurrenceEndsType}
                  endsDate={recurrenceEndsDate}
                  endsAfter={recurrenceEndsAfter}
                  onIntervalChange={setRecurrenceInterval}
                  onDaysOfWeekChange={setRecurrenceDaysOfWeek}
                  onEndsTypeChange={setRecurrenceEndsType}
                  onEndsDateChange={setRecurrenceEndsDate}
                  onEndsAfterChange={setRecurrenceEndsAfter}
                  isPending={isPending}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: 'var(--bg-base)',
            borderTop: '1px solid var(--border)',
            padding: '12px 22px',
          }}
        >
          {showDeleteConfirm && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            >
              <span>Delete this task?</span>
              <button
                type="button"
                className="fb-btn fb-btn--danger"
                onClick={handleDelete}
                disabled={isPending}
              >
                Confirm
              </button>
              <button
                type="button"
                className="fb-btn fb-btn--ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'edit' && !showDeleteConfirm && (
              <button
                type="button"
                className="fb-btn fb-btn--ghost"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                style={{ color: 'var(--p-must)' }}
              >
                <Icon name="trash" size={14} />
                Delete
              </button>
            )}

            <div style={{ flex: 1 }} />

            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              onClick={() => handleSave()}
              disabled={isPending || !formValues.title.trim() || !formValues.projectId}
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
