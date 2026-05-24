'use client';

import React, { useState, useOptimistic, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import { PRIORITY_COLORS } from '@/lib/design';
import { promoteToBoard } from '@/lib/backlog-actions';
import type { BacklogTaskRow } from '@/lib/backlog-actions';
import { groupByProject } from '@/lib/backlog-utils';

type BacklogPanelProps = {
  initialTasks: BacklogTaskRow[];
  projects: Array<{ id: string; name: string; color: string }>;
  onAddTask: (projectId?: string) => void;
  isOverlay?: boolean;
  onClose?: () => void;
};

export function BacklogPanel({ initialTasks, projects, onAddTask, isOverlay = false, onClose }: BacklogPanelProps) {
  const [, startTransition] = useTransition();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const [optimisticTasks, removeOptimisticTask] = useOptimistic(
    initialTasks,
    (current: BacklogTaskRow[], removedId: string) =>
      current.filter((task) => task.id !== removedId),
  );

  const handlePromote = useCallback(
    (taskId: string) => {
      startTransition(async () => {
        removeOptimisticTask(taskId);
        await promoteToBoard(taskId);
      });
    },
    [removeOptimisticTask],
  );

  const handleToggleCollapse = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const filteredTasks =
    selectedProjectId !== null
      ? optimisticTasks.filter((task) => task.projectId === selectedProjectId)
      : optimisticTasks;

  const groups = groupByProject(filteredTasks, projects);

  const projectsWithTasks = projects.filter((project) =>
    optimisticTasks.some((task) => task.projectId === project.id),
  );

  const overlayStyle: React.CSSProperties = isOverlay
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 35,
        width: '100%',
        maxWidth: '100%',
        borderLeft: 'none',
        borderTop: '1px solid var(--border)',
      }
    : {};

  return (
    <>
      {isOverlay && onClose !== undefined && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(40,30,20,0.35)',
            zIndex: 34,
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    <aside
      aria-label="Later — backlog tasks"
      style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...overlayStyle,
      }}
    >
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 500,
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
          {optimisticTasks.length}
        </span>
        <div style={{ flex: 1 }} />
        {isOverlay && onClose !== undefined && (
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            onClick={onClose}
            aria-label="Close backlog panel"
            style={{ padding: 6 }}
          >
            <Icon name="x" size={16} />
          </button>
        )}
        <button
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={() => onAddTask(selectedProjectId ?? undefined)}
          style={{ fontSize: 12, padding: '3px 8px' }}
        >
          + Add
        </button>
      </div>

      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-base)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Icon name="folder" size={12} color="var(--text-tertiary)" />
          <span
            style={{
              flex: 1,
              fontSize: 12,
              color: selectedProjectId !== null ? 'var(--text-primary)' : 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedProjectId !== null
              ? (projects.find((proj) => proj.id === selectedProjectId)?.name ?? 'All projects')
              : 'All projects'}
          </span>
          <Icon name="chevronDown" size={11} color="var(--text-tertiary)" />
        </div>
        <select
          aria-label="Filter by project"
          value={selectedProjectId ?? ''}
          onChange={(event) =>
            setSelectedProjectId(event.target.value === '' ? null : event.target.value)
          }
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          }}
        >
          <option value="">All projects</option>
          {projectsWithTasks.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {groups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-serif)',
              }}
            >
              Nothing in the backlog.
            </span>
          </div>
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsedProjects.has(group.projectId);
            return (
              <div key={group.projectId}>
                <button
                  type="button"
                  onClick={() => handleToggleCollapse(group.projectId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    width: '100%',
                    padding: '5px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon
                    name={isCollapsed ? 'chevronRight' : 'chevronDown'}
                    size={11}
                    color="var(--text-tertiary)"
                  />
                  <ProjectDot color={group.projectColor} size={9} />
                  <Link
                    href={`/projects/${group.projectId}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                    }}
                  >
                    {group.projectName}
                  </Link>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-tertiary)',
                      fontWeight: 400,
                    }}
                  >
                    {group.tasks.length}
                  </span>
                </button>

                {!isCollapsed &&
                  group.tasks.map((task) => {
                    const priorityColor = PRIORITY_COLORS[task.priority].color;
                    const isHovered = hoveredRowId === task.id;
                    return (
                      <div
                        key={task.id}
                        onMouseEnter={() => setHoveredRowId(task.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 14px 3px 28px',
                          background: isHovered ? 'var(--bg-subtle)' : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 18,
                            borderRadius: 2,
                            background: priorityColor,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12.5,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}
                        >
                          {task.title}
                        </span>
                        {task.isRecurring && (
                          <Icon name="repeat" size={10} color="var(--text-tertiary)" />
                        )}
                        {isHovered && (
                          <button
                            type="button"
                            onClick={() => handlePromote(task.id)}
                            aria-label={`Move "${task.title}" to board`}
                            style={{
                              color: 'var(--accent)',
                              background: 'var(--accent-tint)',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer',
                              flexShrink: 0,
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            → board
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </aside>
    </>
  );
}
