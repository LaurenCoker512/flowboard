import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/components/NavBar';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { getWeekTasks } from '@/lib/week-actions';
import { getActiveProjects } from '@/lib/task-actions';
import { getWeekDays, getWeekStart } from '@/lib/week-utils';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { getTodayString } from '@/lib/board-utils';

export const metadata = { title: 'Week — Flowboard' };

export default async function WeekPage() {
  const session = await auth();
  if (session === null || session.user === undefined) {
    redirect('/login');
  }

  const [settingsRow] = await db.select({ weekStartDay: settings.weekStartDay }).from(settings).limit(1);
  const weekStartDay = settingsRow?.weekStartDay ?? 'sunday';

  const today = getTodayString();
  const anchor = new Date();
  const weekDays = getWeekDays(anchor, weekStartDay, today);
  const weekStartDate = weekDays[0]!.dateStr;
  const weekEndDate = weekDays[6]!.dateStr;

  const [taskRows, projects] = await Promise.all([
    getWeekTasks(weekStartDate, weekEndDate),
    getActiveProjects(),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <WeeklyCalendar
        initialTasks={taskRows}
        initialWeekStart={weekStartDate}
        weekStartDay={weekStartDay}
        today={today}
        projects={projects}
      />
    </div>
  );
}
