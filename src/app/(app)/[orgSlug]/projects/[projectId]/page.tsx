import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Board } from '@/components/board/board'
import type { ColumnWithTasks, TaskWithRelations } from '@/lib/types'

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>
}) {
  const { projectId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all columns for the project, ordered by position
  const { data: columns } = await supabase
    .from('columns')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  // Fetch all top-level tasks for the project with relations
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
      task_labels(label_id, labels(id, name, color))
    `)
    .eq('project_id', projectId)
    .is('parent_task_id', null)
    .order('position', { ascending: true })

  // Fetch comment counts per task
  const taskIds = (tasks ?? []).map((t) => t.id)
  let commentCounts: Record<string, number> = {}
  let attachmentCounts: Record<string, number> = {}
  let subtaskCounts: Record<string, { total: number; completed: number }> = {}

  if (taskIds.length > 0) {
    // Comment counts
    const { data: comments } = await supabase
      .from('comments')
      .select('task_id')
      .in('task_id', taskIds)

    if (comments) {
      commentCounts = comments.reduce<Record<string, number>>((acc, c) => {
        acc[c.task_id] = (acc[c.task_id] ?? 0) + 1
        return acc
      }, {})
    }

    // Attachment counts
    const { data: attachments } = await supabase
      .from('attachments')
      .select('task_id')
      .in('task_id', taskIds)

    if (attachments) {
      attachmentCounts = attachments.reduce<Record<string, number>>((acc, a) => {
        acc[a.task_id] = (acc[a.task_id] ?? 0) + 1
        return acc
      }, {})
    }

    // Subtask counts (total and completed)
    const { data: subtasks } = await supabase
      .from('tasks')
      .select('parent_task_id, completed_at')
      .in('parent_task_id', taskIds)

    if (subtasks) {
      subtaskCounts = subtasks.reduce<
        Record<string, { total: number; completed: number }>
      >((acc, s) => {
        const parentId = s.parent_task_id!
        if (!acc[parentId]) {
          acc[parentId] = { total: 0, completed: 0 }
        }
        acc[parentId].total += 1
        if (s.completed_at) {
          acc[parentId].completed += 1
        }
        return acc
      }, {})
    }
  }

  // Build TaskWithRelations from raw data
  const enrichedTasks: TaskWithRelations[] = (tasks ?? []).map((task) => {
    const labels = (task.task_labels ?? [])
      .map((tl: { label_id: string; labels: { id: string; name: string; color: string } | null }) => tl.labels)
      .filter(Boolean) as TaskWithRelations['labels']

    return {
      id: task.id,
      project_id: task.project_id,
      column_id: task.column_id,
      parent_task_id: task.parent_task_id,
      title: task.title,
      description: task.description,
      position: task.position,
      assignee_id: task.assignee_id,
      created_by: task.created_by,
      due_date: task.due_date,
      completed_at: task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      labels,
      assignee: task.assignee ?? null,
      subtasks: [],
      _count: {
        comments: commentCounts[task.id] ?? 0,
        attachments: attachmentCounts[task.id] ?? 0,
        subtasks_completed: subtaskCounts[task.id]?.completed ?? 0,
      },
      _subtaskTotal: subtaskCounts[task.id]?.total ?? 0,
    }
  })

  // Group tasks by column_id
  const tasksByColumn: Record<string, TaskWithRelations[]> = {}
  for (const task of enrichedTasks) {
    const colId = task.column_id ?? '__uncategorized'
    if (!tasksByColumn[colId]) {
      tasksByColumn[colId] = []
    }
    tasksByColumn[colId].push(task)
  }

  // Build columns with tasks
  const columnsWithTasks: ColumnWithTasks[] = (columns ?? []).map((col) => ({
    ...col,
    tasks: tasksByColumn[col.id] ?? [],
  }))

  return <Board columns={columnsWithTasks} />
}
