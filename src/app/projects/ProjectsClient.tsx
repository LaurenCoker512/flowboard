'use client';

import { useState, useTransition } from 'react';
import type { ProjectWithCount } from '@/lib/project-actions';
import {
  createProjectAction,
  updateProjectAction,
  archiveProjectAction,
  restoreProjectAction,
  deleteProjectAction,
} from '@/lib/project-actions';
import { PROJECT_PALETTE } from '@/lib/design';

type ConfirmDelete = { id: string; name: string; taskCount: number };

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 6,
        width: 'fit-content',
      }}
      role="radiogroup"
      aria-label="Project color"
    >
      {(PROJECT_PALETTE as readonly string[]).map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Color ${color}`}
            onClick={() => onChange(color)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: color,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxShadow: selected
                ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${color}`
                : 'inset 0 0 0 1px rgba(0,0,0,0.10)',
              flexShrink: 0,
            }}
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="M2 5l2.5 2.5L8 3"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ProjectForm({
  heading,
  name,
  color,
  error,
  isPending,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  heading: string;
  name: string;
  color: string;
  error: string | null;
  isPending: boolean;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div
      className="fb-card"
      style={{ padding: 16, marginBottom: 4 }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {heading}
      </div>
      <ColorPicker value={color} onChange={onColorChange} />
      <input
        className="fb-input"
        placeholder="Project name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        maxLength={100}
        style={{ marginTop: 10 }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      {error !== null && (
        <div style={{ color: 'var(--p-must)', fontSize: 12, marginTop: 6 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="fb-btn fb-btn--primary"
          onClick={onSave}
          disabled={isPending}
        >
          {saveLabel}
        </button>
        <button className="fb-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({
  project,
  isPending,
  onConfirm,
  onCancel,
}: {
  project: ConfirmDelete;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const hasText =
    project.taskCount > 0
      ? `This will permanently delete ${project.taskCount} task${project.taskCount !== 1 ? 's' : ''}. This cannot be undone.`
      : `Delete "${project.name}"? This cannot be undone.`;

  return (
    <div
      style={{
        background: 'var(--p-must-tint)',
        border: '1px solid var(--p-must-soft)',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 4,
      }}
      role="alertdialog"
      aria-label="Confirm project deletion"
    >
      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-primary)' }}>{hasText}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="fb-btn fb-btn--danger"
          onClick={onConfirm}
          disabled={isPending}
        >
          Delete project
        </button>
        <button className="fb-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ProjectsClient({ initialProjects }: { initialProjects: ProjectWithCount[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState((PROJECT_PALETTE as readonly string[])[0] ?? '#D49B92');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const activeProjects = initialProjects.filter((p) => !p.isArchived);
  const archivedProjects = initialProjects.filter((p) => p.isArchived);

  function openAddForm() {
    setShowAddForm(true);
    setEditingId(null);
    setConfirmDelete(null);
    setCreateError(null);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setNewName('');
    setNewColor((PROJECT_PALETTE as readonly string[])[0] ?? '#D49B92');
    setCreateError(null);
  }

  function startEdit(project: ProjectWithCount) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
    setEditError(null);
    setShowAddForm(false);
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function handleCreate() {
    const formData = new FormData();
    formData.set('name', newName);
    formData.set('color', newColor);
    startTransition(async () => {
      const result = await createProjectAction({ error: null }, formData);
      if (result.error !== null) {
        setCreateError(result.error);
      } else {
        closeAddForm();
      }
    });
  }

  function handleUpdate(id: string) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('name', editName);
    formData.set('color', editColor);
    startTransition(async () => {
      const result = await updateProjectAction({ error: null }, formData);
      if (result.error !== null) {
        setEditError(result.error);
      } else {
        setEditingId(null);
        setEditError(null);
      }
    });
  }

  function handleArchive(id: string) {
    startTransition(() => archiveProjectAction(id));
  }

  function handleRestore(id: string) {
    startTransition(() => restoreProjectAction(id));
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProjectAction(id);
      setConfirmDelete(null);
    });
  }

  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px 10px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    marginBottom: 4,
  };

  const taskLabel = (n: number) => (n === 1 ? '1 task' : `${n} tasks`);

  return (
    <div style={{ maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 500,
            margin: 0,
          }}
        >
          Projects
        </h1>
        {!showAddForm && (
          <button className="fb-btn fb-btn--primary" onClick={openAddForm}>
            + New project
          </button>
        )}
      </div>

      {showAddForm && (
        <ProjectForm
          heading="New project"
          name={newName}
          color={newColor}
          error={createError}
          isPending={isPending}
          onNameChange={setNewName}
          onColorChange={setNewColor}
          onSave={handleCreate}
          onCancel={closeAddForm}
          saveLabel="Create"
        />
      )}

      {/* Active projects */}
      <div>
        {activeProjects.length === 0 && !showAddForm && (
          <p
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 13.5,
              textAlign: 'center',
              padding: '40px 0',
              margin: 0,
            }}
          >
            No projects yet. Create one to get started.
          </p>
        )}

        {activeProjects.map((project) => {
          const isEditing = editingId === project.id;
          const isConfirming = confirmDelete?.id === project.id;
          return (
            <div key={project.id}>
              {isEditing ? (
                <ProjectForm
                  heading="Edit project"
                  name={editName}
                  color={editColor}
                  error={editError}
                  isPending={isPending}
                  onNameChange={setEditName}
                  onColorChange={setEditColor}
                  onSave={() => handleUpdate(project.id)}
                  onCancel={cancelEdit}
                  saveLabel="Save"
                />
              ) : (
                <div
                  style={{
                    ...rowBase,
                    borderLeft: `4px solid ${project.color}`,
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 450 }}>{project.name}</span>
                  <span
                    style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 52 }}
                  >
                    {taskLabel(project.taskCount)}
                  </span>
                  <button
                    className="fb-btn fb-btn--ghost"
                    style={{ padding: '5px 8px', fontSize: 12 }}
                    onClick={() => startEdit(project)}
                    disabled={isPending}
                    aria-label={`Edit ${project.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="fb-btn fb-btn--ghost"
                    style={{ padding: '5px 8px', fontSize: 12 }}
                    onClick={() => handleArchive(project.id)}
                    disabled={isPending}
                    aria-label={`Archive ${project.name}`}
                  >
                    Archive
                  </button>
                  <button
                    className="fb-btn fb-btn--ghost fb-btn--danger"
                    style={{ padding: '5px 8px', fontSize: 12 }}
                    onClick={() =>
                      setConfirmDelete({
                        id: project.id,
                        name: project.name,
                        taskCount: project.taskCount,
                      })
                    }
                    disabled={isPending}
                    aria-label={`Delete ${project.name}`}
                  >
                    Delete
                  </button>
                </div>
              )}

              {isConfirming && confirmDelete !== null && (
                <DeleteConfirm
                  project={confirmDelete}
                  isPending={isPending}
                  onConfirm={() => handleDelete(project.id)}
                  onCancel={() => setConfirmDelete(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Archived section */}
      {archivedProjects.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            className="fb-btn fb-btn--ghost"
            style={{ fontSize: 12.5, padding: '4px 0', marginBottom: 8, gap: 6 }}
            onClick={() => setArchivedExpanded((prev) => !prev)}
            aria-expanded={archivedExpanded}
          >
            <span aria-hidden="true">{archivedExpanded ? '▾' : '▸'}</span>
            Archived ({archivedProjects.length})
          </button>

          {archivedExpanded && (
            <div>
              {archivedProjects.map((project) => {
                const isConfirming = confirmDelete?.id === project.id;
                return (
                  <div key={project.id}>
                    <div
                      style={{
                        ...rowBase,
                        borderLeft: `4px solid ${project.color}`,
                        opacity: isPending ? 0.7 : 0.75,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 450, color: 'var(--text-secondary)' }}>
                        {project.name}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 52 }}>
                        {taskLabel(project.taskCount)}
                      </span>
                      <button
                        className="fb-btn fb-btn--ghost"
                        style={{ padding: '5px 8px', fontSize: 12 }}
                        onClick={() => handleRestore(project.id)}
                        disabled={isPending}
                        aria-label={`Restore ${project.name}`}
                      >
                        Restore
                      </button>
                      <button
                        className="fb-btn fb-btn--ghost fb-btn--danger"
                        style={{ padding: '5px 8px', fontSize: 12 }}
                        onClick={() =>
                          setConfirmDelete({
                            id: project.id,
                            name: project.name,
                            taskCount: project.taskCount,
                          })
                        }
                        disabled={isPending}
                        aria-label={`Delete ${project.name}`}
                      >
                        Delete
                      </button>
                    </div>

                    {isConfirming && confirmDelete !== null && (
                      <DeleteConfirm
                        project={confirmDelete}
                        isPending={isPending}
                        onConfirm={() => handleDelete(project.id)}
                        onCancel={() => setConfirmDelete(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
