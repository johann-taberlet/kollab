'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPositionBetween } from '@/lib/utils/position'

/**
 * Create a new task at the bottom of a column.
 */
export async function createTask(
  projectId: string,
  columnId: string,
  title: string
): Promise<{ taskId: string } | { error: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify user can access the project
  const { data: canAccess } = await supabase.rpc('can_access_project', {
    p_project_id: projectId,
  })

  if (!canAccess) {
    return { error: 'You do not have access to this project.' }
  }

  // Find the last task in this column to calculate position
  const { data: lastTask } = await supabase
    .from('tasks')
    .select('position')
    .eq('column_id', columnId)
    .is('parent_task_id', null)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = getPositionBetween(lastTask?.position ?? null, null)

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      column_id: columnId,
      title: title.trim(),
      position,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !task) {
    return { error: error?.message ?? 'Failed to create task.' }
  }

  revalidatePath('/', 'layout')
  return { taskId: task.id }
}

/**
 * Update a task's fields.
 */
export async function updateTask(
  id: string,
  data: Partial<{
    title: string
    description: string | null
    column_id: string
    position: number
    assignee_id: string | null
    due_date: string | null
    completed_at: string | null
  }>
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.title !== undefined) updatePayload.title = data.title
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.column_id !== undefined) updatePayload.column_id = data.column_id
  if (data.position !== undefined) updatePayload.position = data.position
  if (data.assignee_id !== undefined) updatePayload.assignee_id = data.assignee_id
  if (data.due_date !== undefined) updatePayload.due_date = data.due_date
  if (data.completed_at !== undefined) updatePayload.completed_at = data.completed_at

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'Nothing to update.' }
  }

  const { error } = await supabase.from('tasks').update(updatePayload).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Move a task to a new column and/or position.
 */
export async function moveTask(
  id: string,
  columnId: string,
  position: number
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('tasks')
    .update({ column_id: columnId, position })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Delete a task.
 */
export async function deleteTask(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
