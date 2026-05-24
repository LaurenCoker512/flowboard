import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  usePathname: () => '/board',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/lib/auth-actions', () => ({ logoutAction: vi.fn() }));

vi.mock('@/lib/task-actions', () => ({
  createTaskAction: vi.fn().mockResolvedValue({ error: null }),
  updateTaskAction: vi.fn().mockResolvedValue({ error: null }),
  deleteTaskAction: vi.fn().mockResolvedValue({ error: null }),
  createExceptionRecord: vi.fn().mockResolvedValue({ error: null }),
  updateAllFutureOccurrences: vi.fn().mockResolvedValue({ error: null }),
  getActiveProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/recurrence', () => ({
  getFrequencyLabel: vi.fn().mockReturnValue('Daily'),
}));

vi.mock('@/lib/task-defaults', () => ({
  resolveDefaultProject: vi.fn().mockReturnValue('proj-1'),
  isTaskDirty: vi.fn().mockReturnValue(false),
}));

// ─── NavBar ──────────────────────────────────────────────────────────────────

describe('NavBar accessibility', () => {
  it('has no axe violations', async () => {
    const { NavBar } = await import('@/components/NavBar');
    const { container } = render(<NavBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── MobileTabBar ────────────────────────────────────────────────────────────

describe('MobileTabBar accessibility', () => {
  it('has no axe violations', async () => {
    const { MobileTabBar } = await import('@/components/MobileTabBar');
    const { container } = render(<MobileTabBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── TaskModal ───────────────────────────────────────────────────────────────

describe('TaskModal accessibility', () => {
  it('has no axe violations when open in new mode', async () => {
    const { TaskModal } = await import('@/components/TaskModal');
    const projects = [{ id: 'proj-1', name: 'Project 1', color: '#88B5A4' }];
    const { container } = render(
      <TaskModal
        mode="new"
        projects={projects}
        onClose={vi.fn()}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
