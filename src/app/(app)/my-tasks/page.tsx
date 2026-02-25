import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  MyTasksList,
  type MyTaskItem,
  type MyTaskGroup,
} from '@/components/my-tasks/my-tasks-list'
import { isToday, addDays, startOfDay } from 'date-fns'

export default async function MyTasksPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all tasks assigned to the current user across all projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      due_date,
      completed_at,
      project_id,
      column_id,
      projects!tasks_project_id_fkey(
        id,
        name,
        color,
        org_id,
        organizations!projects_org_id_fkey(slug)
      ),
      columns!tasks_column_id_fkey(name)
    `
    )
    .eq('assignee_id', user.id)
    .is('parent_task_id', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  // Transform raw data into MyTaskItem shape
  const items: MyTaskItem[] = (tasks ?? [])
    .map((t) => {
      const project = t.projects as unknown as {
        id: string
        name: string
        color: string
        org_id: string
        organizations: { slug: string }
      } | null

      const column = t.columns as unknown as { name: string } | null

      if (!project) return null

      return {
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        completed_at: t.completed_at,
        project_id: project.id,
        project_name: project.name,
        project_color: project.color,
        column_name: column?.name ?? null,
        org_slug: project.organizations.slug,
      }
    })
    .filter((item): item is MyTaskItem => item !== null)

  // Group tasks by due date category
  const now = new Date()
  const today = startOfDay(now)
  const weekFromNow = addDays(today, 7)

  const overdue: MyTaskItem[] = []
  const dueToday: MyTaskItem[] = []
  const dueThisWeek: MyTaskItem[] = []
  const later: MyTaskItem[] = []
  const noDueDate: MyTaskItem[] = []

  for (const task of items) {
    // Skip completed tasks from overdue/due-today groupings, put them in their date group
    if (!task.due_date) {
      noDueDate.push(task)
    } else {
      const dueDate = startOfDay(new Date(task.due_date))

      if (isToday(dueDate)) {
        dueToday.push(task)
      } else if (dueDate < today && !task.completed_at) {
        overdue.push(task)
      } else if (dueDate <= weekFromNow) {
        dueThisWeek.push(task)
      } else {
        later.push(task)
      }
    }
  }

  const groups: MyTaskGroup[] = [
    { label: 'Overdue', tasks: overdue },
    { label: 'Due today', tasks: dueToday },
    { label: 'Due this week', tasks: dueThisWeek },
    { label: 'Later', tasks: later },
    { label: 'No due date', tasks: noDueDate },
  ]

  return <MyTasksList groups={groups} />
}
