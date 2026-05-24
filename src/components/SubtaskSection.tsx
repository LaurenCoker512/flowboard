'use client';

import React, { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/ui/Icon';
import {
  getSubtasksForTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
} from '@/lib/subtask-actions';
import type { SubtaskData } from '@/types';

type SubtaskRowProps = {
  subtask: SubtaskData;
  onToggle: (id: string, isCompleted: boolean) => void;
  onTitleChange: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

function SubtaskRow({ subtask, onToggle, onTitleChange, onDelete, isPending }: SubtaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleTitleBlur() {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== subtask.title) {
      onTitleChange(subtask.id, trimmed);
    } else {
      setEditValue(subtask.title);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setEditValue(subtask.title);
      setIsEditing(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 0',
          borderRadius: 6,
          background: 'transparent',
        }}
        className="fb-subtask-row"
      >
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'grab',
            color: 'var(--text-tertiary)',
            padding: '0 2px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="drag" size={12} />
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={subtask.isCompleted}
          onChange={(e) => onToggle(subtask.id, e.target.checked)}
          disabled={isPending}
          aria-label={`Mark "${subtask.title}" as ${subtask.isCompleted ? 'incomplete' : 'complete'}`}
          style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
        />

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="fb-input"
              autoFocus
              style={{
                fontSize: 13,
                padding: '1px 4px',
                width: '100%',
                textDecoration: subtask.isCompleted ? 'line-through' : 'none',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditValue(subtask.title);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '1px 4px',
                fontSize: 13,
                cursor: 'text',
                textAlign: 'left',
                width: '100%',
                color: subtask.isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
                textDecoration: subtask.isCompleted ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {subtask.title}
            </button>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(subtask.id)}
          disabled={isPending}
          aria-label={`Delete subtask "${subtask.title}"`}
          className="fb-subtask-delete"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            padding: '0 2px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            opacity: 0,
          }}
        >
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  );
}

type SubtaskSectionProps = {
  taskId: string;
  initialSubtasks: SubtaskData[];
  modalIsPending: boolean;
};

export function SubtaskSection({ taskId, initialSubtasks, modalIsPending }: SubtaskSectionProps) {
  const [subtaskList, setSubtaskList] = useState<SubtaskData[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getSubtasksForTask(taskId).then((data) => {
      if (!cancelled) setSubtaskList(data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const completedCount = subtaskList.filter((st) => st.isCompleted).length;
  const totalCount = subtaskList.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleToggle = useCallback((id: string, isCompleted: boolean) => {
    setSubtaskList((prev) =>
      prev.map((st) => (st.id === id ? { ...st, isCompleted } : st)),
    );
    startTransition(async () => {
      await updateSubtask({ id, isCompleted });
    });
  }, []);

  const handleTitleChange = useCallback((id: string, title: string) => {
    setSubtaskList((prev) =>
      prev.map((st) => (st.id === id ? { ...st, title } : st)),
    );
    startTransition(async () => {
      await updateSubtask({ id, title });
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSubtaskList((prev) => prev.filter((st) => st.id !== id));
    startTransition(async () => {
      await deleteSubtask(id);
    });
  }, []);

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitNewSubtask();
    }
    if (e.key === 'Escape') {
      setNewTitle('');
    }
  }

  function commitNewSubtask() {
    const title = newTitle.trim();
    if (!title) return;

    const lastOrder = subtaskList.length > 0 ? subtaskList[subtaskList.length - 1]!.sortOrder : 0;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: SubtaskData = { id: optimisticId, title, isCompleted: false, sortOrder: lastOrder + 1 };

    setSubtaskList((prev) => [...prev, optimistic]);
    setNewTitle('');

    startTransition(async () => {
      const result = await createSubtask({ taskId, title });
      if (result.error === null) {
        setSubtaskList((prev) =>
          prev.map((st) =>
            st.id === optimisticId
              ? { id: result.id, title, isCompleted: false, sortOrder: result.sortOrder }
              : st,
          ),
        );
      } else {
        setSubtaskList((prev) => prev.filter((st) => st.id !== optimisticId));
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;

    const oldIndex = subtaskList.findIndex((st) => st.id === active.id);
    const newIndex = subtaskList.findIndex((st) => st.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subtaskList, oldIndex, newIndex).map((st, i) => ({
      ...st,
      sortOrder: i + 1,
    }));
    setSubtaskList(reordered);

    const orderedIds = reordered.map((st) => st.id);
    startTransition(async () => {
      await reorderSubtasks(taskId, orderedIds);
    });
  }

  return (
    <div>
      <style>{`
        .fb-subtask-row:hover .fb-subtask-delete { opacity: 1 !important; }
        .fb-subtask-row:hover { background: var(--bg-subtle) !important; }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Subtasks
        </span>
        {totalCount > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            · {completedCount} / {totalCount} complete
          </span>
        )}
      </div>

      {subtaskList.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={subtaskList.map((st) => st.id)} strategy={verticalListSortingStrategy}>
            <div role="list" aria-label="Subtasks">
              {subtaskList.map((subtask) => (
                <SubtaskRow
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={handleToggle}
                  onTitleChange={handleTitleChange}
                  onDelete={handleDelete}
                  isPending={isPending || modalIsPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Icon name="plus" size={13} color="var(--text-tertiary)" />
        <input
          ref={newInputRef}
          type="text"
          placeholder="Add subtask…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleAddKeyDown}
          onBlur={commitNewSubtask}
          disabled={isPending || modalIsPending}
          aria-label="New subtask title"
          style={{
            flex: 1,
            fontSize: 13,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            padding: '2px 0',
          }}
        />
      </div>
    </div>
  );
}
