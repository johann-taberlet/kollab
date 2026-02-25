'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPositionBetween } from '@/lib/utils/position'

/**
 * Create a new column at the end of a project's board.
 */
export async function createColumn(
  projectId: string,
  name: string
): Promise<{ columnId: string } | { error: string }> {
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

  // Find the last column to calculate position
  const { data: lastColumn } = await supabase
    .from('columns')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = getPositionBetween(lastColumn?.position ?? null, null)

  const { data: column, error } = await supabase
    .from('columns')
    .insert({
      project_id: projectId,
      name: name.trim(),
      position,
    })
    .select('id')
    .single()

  if (error || !column) {
    return { error: error?.message ?? 'Failed to create column.' }
  }

  revalidatePath('/', 'layout')
  return { columnId: column.id }
}

/**
 * Update a column's name or position.
 */
export async function updateColumn(
  id: string,
  data: { name?: string; position?: number }
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
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.position !== undefined) updatePayload.position = data.position

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'Nothing to update.' }
  }

  const { error } = await supabase.from('columns').update(updatePayload).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Move a column to a new position.
 */
export async function moveColumn(
  id: string,
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
    .from('columns')
    .update({ position })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Delete a column. Fails if the column still has tasks.
 */
export async function deleteColumn(
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

  // Check if the column has any tasks
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('column_id', id)

  if (count && count > 0) {
    return { error: 'Cannot delete a column that still has tasks. Move or delete tasks first.' }
  }

  const { error } = await supabase.from('columns').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
