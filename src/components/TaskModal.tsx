'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { Icon } from './ui/Icon';
import { Segmented } from './ui/Segmented';
import { PRIORITY_COLORS } from '@/lib/design';
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from '@/lib/task-actions';
import { resolveDefaultProject, isTaskDirty, type TaskFormValues } from '@/lib/task-defaults';

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

  const updateField = useCallback(
    <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
      setFormValues((prev) => {
        const updated = { ...prev, [field]: value };
        if (field === 'date' && !value) {
          updated.startTime = '';
          updated.endTime = '';
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

  const handleSave = () => {
    startTransition(async () => {
      const startAt = buildDateTime(formValues.date, formValues.startTime);
      const endAt = buildDateTime(formValues.date, formValues.endTime);

      let result: { error: string | null };
      if (mode === 'edit' && task !== undefined) {
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
        });
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
  };

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
            <button
              type="button"
              className="fb-btn fb-btn--danger"
              onClick={onClose}
            >
              Discard
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
                onChange={(val) =>
                  updateField('priority', val as TaskFormValues['priority'])
                }
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
              onClick={handleSave}
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
