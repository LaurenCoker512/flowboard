'use client';

import { useState, useTransition, useEffect } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icon';
import { ProjectDot } from '@/components/ui/ProjectDot';
import {
  updateSettings,
  exportDataJSON,
  exportDataCSV,
  clearOldArchived,
} from '@/lib/settings-actions';
import { validateClearThreshold } from '@/lib/settings-utils';
import type { Settings } from '@/types';

type Props = {
  initialSettings: Settings | null;
  projects: Array<{ id: string; name: string; color: string }>;
};

type SettingRowProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function SettingRow({ label, hint, children }: SettingRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {hint !== undefined && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SettingsClient({ initialSettings, projects }: Props) {
  const [weekStartDay, setWeekStartDay] = useState(initialSettings?.weekStartDay ?? 'sunday');
  const [defaultView, setDefaultView] = useState(initialSettings?.defaultView ?? 'board');
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(
    initialSettings?.defaultProjectId ?? null,
  );
  const [density, setDensity] = useState(initialSettings?.density ?? 'default');
  const [quietEvenings, setQuietEvenings] = useState(initialSettings?.quietEvenings ?? false);
  const [clearDays, setClearDays] = useState('90');
  const [clearDaysError, setClearDaysError] = useState<string | null>(null);
  const [clearStatus, setClearStatus] = useState<string | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [, startSettingsTransition] = useTransition();

  useEffect(() => {
    document.body.dataset.density = initialSettings?.density ?? 'default';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleWeekStartChange(val: string) {
    setWeekStartDay(val as 'sunday' | 'monday');
    startSettingsTransition(() => void updateSettings({ weekStartDay: val as 'sunday' | 'monday' }));
  }

  function handleDefaultViewChange(val: string) {
    setDefaultView(val as 'board' | 'week' | 'month');
    startSettingsTransition(
      () => void updateSettings({ defaultView: val as 'board' | 'week' | 'month' }),
    );
  }

  function handleDefaultProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value === '' ? null : e.target.value;
    setDefaultProjectId(id);
    startSettingsTransition(() => void updateSettings({ defaultProjectId: id }));
  }

  function handleDensityChange(val: string) {
    setDensity(val as 'compact' | 'default' | 'roomy');
    document.body.dataset.density = val;
    startSettingsTransition(
      () => void updateSettings({ density: val as 'compact' | 'default' | 'roomy' }),
    );
  }

  function handleQuietEveningsToggle() {
    const next = !quietEvenings;
    setQuietEvenings(next);
    startSettingsTransition(() => void updateSettings({ quietEvenings: next }));
  }

  function handleExportJSON() {
    startExportTransition(async () => {
      const data = await exportDataJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'flowboard-export.json');
    });
  }

  function handleExportCSV() {
    startExportTransition(async () => {
      const csv = await exportDataCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, 'flowboard-tasks.csv');
    });
  }

  async function handleClearArchived() {
    const days = validateClearThreshold(clearDays);
    if (days === null) {
      setClearDaysError('Enter a number between 1 and 36500.');
      return;
    }
    setClearDaysError(null);
    const confirmed = window.confirm(
      `Permanently delete all archived tasks older than ${days} days? This cannot be undone.`,
    );
    if (!confirmed) return;
    const result = await clearOldArchived(days);
    if (result.error !== null) {
      setClearStatus(result.error);
    } else {
      setClearStatus(
        result.deletedCount === 0
          ? 'No tasks matched that threshold.'
          : `Deleted ${result.deletedCount} task${result.deletedCount !== 1 ? 's' : ''}.`,
      );
    }
  }

  const selectedProject = projects.find((p) => p.id === defaultProjectId);

  return (
    <div
      style={{
        flex: 1,
        padding: '14px 22px 18px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            margin: '4px 0 4px',
          }}
        >
          Settings
        </h1>
        <p
          style={{
            margin: '0 0 18px',
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            maxWidth: 480,
            lineHeight: 1.55,
          }}
        >
          A few small choices to shape how Flowboard fits your week.
        </p>

        {/* Preferences */}
        <section style={{ marginBottom: 22 }}>
          <div
            className="fb-section-h"
            style={{ margin: '0 0 12px' }}
          >
            Preferences
          </div>

          <SettingRow label="Week starts on" hint="The first column in the weekly view.">
            <Segmented
              options={[
                { value: 'sunday', label: 'Sunday' },
                { value: 'monday', label: 'Monday' },
              ]}
              value={weekStartDay}
              onChange={handleWeekStartChange}
            />
          </SettingRow>

          <SettingRow label="Default view" hint="Where Flowboard opens.">
            <Segmented
              options={[
                { value: 'board', label: 'Board' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={defaultView}
              onChange={handleDefaultViewChange}
            />
          </SettingRow>

          <SettingRow
            label="Default project"
            hint="New tasks get this project unless you choose another."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedProject !== undefined && (
                <ProjectDot color={selectedProject.color} size={10} />
              )}
              <select
                className="fb-select"
                value={defaultProjectId ?? ''}
                onChange={handleDefaultProjectChange}
                style={{ minWidth: 160, padding: '7px 11px', fontSize: 13 }}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </SettingRow>

          <SettingRow label="Display density" hint="Controls how compact or spacious task rows appear.">
            <Segmented
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'default', label: 'Default' },
                { value: 'roomy', label: 'Roomy' },
              ]}
              value={density}
              onChange={handleDensityChange}
            />
          </SettingRow>

          <SettingRow
            label="Quiet evenings"
            hint="Hide tomorrow's tasks after 8pm so you can wind down."
          >
            <Toggle
              on={quietEvenings}
              onToggle={handleQuietEveningsToggle}
              label="Quiet evenings"
            />
          </SettingRow>
        </section>

        {/* Data */}
        <section style={{ marginBottom: 22 }}>
          <div
            className="fb-section-h"
            style={{ margin: '0 0 12px' }}
          >
            Data
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}
            >
              Export your data
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Includes all tasks, projects, completion history, and recurring rules.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="fb-btn"
                onClick={handleExportJSON}
                disabled={isExporting}
              >
                <Icon name="download" size={13} />
                Export as JSON
              </button>
              <button
                type="button"
                className="fb-btn"
                onClick={handleExportCSV}
                disabled={isExporting}
              >
                <Icon name="download" size={13} />
                Export as CSV
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}
            >
              Clear archived tasks
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Permanently remove archived tasks. There&apos;s no undo for this.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Older than</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="number"
                  className="fb-input"
                  value={clearDays}
                  min={1}
                  onChange={(e) => {
                    setClearDays(e.target.value);
                    setClearDaysError(null);
                    setClearStatus(null);
                  }}
                  style={{ width: 72, textAlign: 'center', padding: '6px 8px' }}
                />
                {clearDaysError !== null && (
                  <span style={{ fontSize: 11.5, color: 'var(--p-must)' }}>{clearDaysError}</span>
                )}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>days</span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="fb-btn fb-btn--danger"
                onClick={() => void handleClearArchived()}
              >
                Clear archived
              </button>
            </div>
            {clearStatus !== null && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {clearStatus}
              </div>
            )}
          </div>
        </section>

        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            fontStyle: 'italic',
            fontFamily: 'var(--font-serif)',
          }}
        >
          Made gently · v1.0.0
        </p>
      </div>
    </div>
  );
}
