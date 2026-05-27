'use client';

import React, { useState, useTransition, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskModal } from '@/components/TaskModal';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { PRIORITY_COLORS } from '@/lib/design';
import {
  reorderBacklogTask,
  rebalanceBacklogOrder,
  updateProjectDescription,
} from '@/lib/project-detail-actions';
import {
  calculateStats,
  sortBacklogTasks,
  getBacklogOrderBetween,
  needsRebalance,
} from '@/lib/project-detail-utils';
import type { ProjectDetailData, ProjectDetailTask } from '@/lib/project-detail-utils';
import { getTodayString } from '@/lib/board-utils';

type ActiveProjects = Array<{ id: string; name: string; color: string }>;

type Props = {
  data: ProjectDetailData;
  projects: ActiveProjects;
};

type ModalState =
  | { mode: 'new'; defaults: { status?: 'backlog' | 'up_next' | 'in_progress' | 'done'; projectId?: string } }
  | { mode: 'edit'; task: ProjectDetailTask }
  | null;

const STATUS_LABELS: Record<string, string> = {
  up_next: "What's next",
  in_progress: 'In progress',
  done: 'Done',
};

const STATUS_ACCENT: Record<string, string> = {
  up_next: 'var(--accent)',
  in_progress: 'var(--p-fun)',
  done: 'var(--text-tertiary)',
};

function TaskRow({
  task,
  isDragging = false,
  onClick,
}: {
  task: ProjectDetailTask;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const priorityColor = PRIORITY_COLORS[task.priority].color;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px 7px 0',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        cursor: onClick !== undefined ? 'pointer' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(-1.5deg)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        paddingLeft: 'calc(10px + 3px)',
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
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: task.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-tertiary)',
        }}
      >
        {task.title}
      </span>
      {task.date !== null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        >
          <Icon name="calendar" size={10} />
          {task.date}
        </span>
      )}
      {task.isRecurring && (
        <Icon name="repeat" size={11} color="var(--text-tertiary)" />
      )}
    </div>
  );
}

function SortableTaskRow({
  task,
  onClick,
}: {
  task: ProjectDetailTask;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} suppressHydrationWarning>
      <TaskRow task={task} isDragging={isDragging} onClick={onClick} />
    </div>
  );
}

function StatSegment({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '12px 8px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontWeight: 450,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DescriptionEditor({
  projectId,
  initialDescription,
}: {
  projectId: string;
  initialDescription: string | null;
}) {
  const [value, setValue] = useState(initialDescription ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (value.trim() !== (initialDescription ?? '').trim()) {
      startTransition(async () => {
        await updateProjectDescription(projectId, value);
      });
    }
  }, [value, initialDescription, projectId]);

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          fontFamily: 'var(--font-sans)',
          fontSize: 13.5,
          color: 'var(--text-primary)',
          background: 'var(--bg-base)',
          border: '1px solid var(--accent)',
          borderRadius: 8,
          padding: '8px 10px',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: 1.5,
        }}
        placeholder="Add a project description…"
        aria-label="Project description"
      />
    );
  }

  if (value.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--text-tertiary)',
          padding: 0,
          fontFamily: 'var(--font-sans)',
          fontStyle: 'italic',
          textAlign: 'left',
        }}
      >
        + Add description
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      style={{
        fontSize: 13.5,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        cursor: 'text',
        padding: '4px 0',
        whiteSpace: 'pre-wrap',
      }}
    >
      {value}
    </div>
  );
}

export function ProjectDetailClient({ data, projects }: Props) {
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const boardTasks = data.tasks.filter((t) => t.status !== 'backlog');
  const [localBacklog, setLocalBacklog] = useState<ProjectDetailTask[]>(() =>
    sortBacklogTasks(data.tasks.filter((t) => t.status === 'backlog')),
  );

  const today = getTodayString();
  const stats = calculateStats(data.tasks, today);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const backlogIds = localBacklog.map((t) => t.id);
  const activeTask = activeId !== null ? localBacklog.find((t) => t.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (over === null || active.id === over.id) return;

    const oldIndex = localBacklog.findIndex((t) => t.id === active.id);
    const newIndex = localBacklog.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localBacklog, oldIndex, newIndex);
    const prevOrder = newIndex > 0 ? (reordered[newIndex - 1]?.backlogOrder ?? null) : null;
    const nextOrder =
      newIndex < reordered.length - 1
        ? (reordered[newIndex + 1]?.backlogOrder ?? null)
        : null;

    let newOrder: string;
    try {
      newOrder = getBacklogOrderBetween(prevOrder, nextOrder);
    } catch {
      startTransition(async () => {
        await rebalanceBacklogOrder(data.id);
      });
      return;
    }

    const shouldRebalance = needsRebalance(newOrder);

    setLocalBacklog(
      reordered.map((t, i) => (i === newIndex ? { ...t, backlogOrder: newOrder } : t)),
    );

    startTransition(async () => {
      await reorderBacklogTask(String(active.id), newOrder, data.id);
      if (shouldRebalance) {
        await rebalanceBacklogOrder(data.id);
      }
    });
  }

  function handleTaskClick(task: ProjectDetailTask) {
    setModal({ mode: 'edit', task });
  }

  function handleModalClose() {
    setModal(null);
  }

  const upNext = boardTasks.filter((t) => t.status === 'up_next');
  const inProgress = boardTasks.filter((t) => t.status === 'in_progress');
  const done = boardTasks.filter((t) => t.status === 'done');
  const boardGroups = [
    { key: 'up_next', tasks: upNext },
    { key: 'in_progress', tasks: inProgress },
    { key: 'done', tasks: done },
  ].filter((g) => g.tasks.length > 0);

  return (
    <>
      {/* Back link + header */}
      <div style={{ marginBottom: 8 }}>
        <Link
          href="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12.5,
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            marginBottom: 14,
          }}
        >
          <Icon name="chevronLeft" size={13} />
          Projects
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <ProjectDot color={data.color} size={14} />
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            fontWeight: 500,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {data.name}
        </h1>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        <StatSegment value={stats.total} label="Total" />
        <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
        <StatSegment value={stats.inProgress} label="In progress" />
        <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
        <StatSegment value={stats.backlog} label="Later" />
        <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
        <StatSegment value={stats.doneThisMonth} label="Done this month" />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 28 }}>
        <DescriptionEditor projectId={data.id} initialDescription={data.description} />
      </div>

      {/* Later (backlog) section */}
      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontWeight: 500,
              margin: 0,
              color: 'var(--text-primary)',
              letterSpacing: '-0.005em',
            }}
          >
            Later
          </h2>
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
            {localBacklog.length}
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            style={{ fontSize: 12, padding: '3px 8px' }}
            onClick={() =>
              setModal({ mode: 'new', defaults: { status: 'backlog', projectId: data.id } })
            }
          >
            + Add
          </button>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {localBacklog.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--text-tertiary)',
                    fontStyle: 'italic',
                    fontFamily: 'var(--font-serif)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                >
                  Nothing in the backlog.
                </div>
              ) : (
                localBacklog.map((task) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask !== undefined && activeTask !== null && (
              <TaskRow task={activeTask} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </section>

      {/* Board section */}
      {boardGroups.length > 0 && (
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontWeight: 500,
              margin: '0 0 16px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.005em',
            }}
          >
            On the board
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {boardGroups.map((group) => (
              <div key={group.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginBottom: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: STATUS_ACCENT[group.key],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {STATUS_LABELS[group.key]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--bg-sunken)',
                    }}
                  >
                    {group.tasks.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {modal !== null && modal.mode === 'new' && (
        <TaskModal
          mode="new"
          projects={projects}
          defaultStatus={modal.defaults.status}
          defaultProjectId={modal.defaults.projectId}
          onClose={handleModalClose}
        />
      )}

      {modal !== null && modal.mode === 'edit' && (
        <TaskModal
          mode="edit"
          task={{
            id: modal.task.id,
            title: modal.task.title,
            projectId: data.id,
            priority: modal.task.priority,
            status: modal.task.status,
            date: modal.task.date,
            startAt: null,
            endAt: null,
            description: null,
          }}
          projects={projects}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
