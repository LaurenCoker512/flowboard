import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { MonthlyCalendar } from '@/components/MonthlyCalendar';
import { getMonthTasks } from '@/lib/month-actions';
import { getActiveProjects } from '@/lib/task-actions';
import { getMonthRange } from '@/lib/month-utils';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { getTodayString } from '@/lib/board-utils';

export const metadata = { title: 'Month — Flowboard' };

export default async function MonthPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [settingsRow] = await db.select({ weekStartDay: settings.weekStartDay }).from(settings).limit(1);
  const weekStartDay = settingsRow?.weekStartDay ?? 'sunday';

  const today = getTodayString();
  const [yearStr, monthStr] = today.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const { startDate, endDate } = getMonthRange(year, month);

  const [taskRows, projects] = await Promise.all([
    getMonthTasks(startDate, endDate),
    getActiveProjects(),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <MonthlyCalendar
        initialTasks={taskRows}
        initialYear={year}
        initialMonth={month}
        weekStartDay={weekStartDay}
        today={today}
        projects={projects}
      />
    </div>
  );
}
