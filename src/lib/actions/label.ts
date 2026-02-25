'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Toggle a label on/off for a task.
 */
export async function toggleTaskLabel(
  taskId: string,
  labelId: string,
  attach: boolean
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  if (attach) {
    const { error } = await supabase
      .from('task_labels')
      .insert({ task_id: taskId, label_id: labelId })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId)
    if (error) return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Create a new label for a project.
 */
export async function createLabel(
  projectId: string,
  name: string,
  color: string
): Promise<{ labelId?: string; error?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: canAccess } = await supabase.rpc('can_access_project', {
    p_project_id: projectId,
  })

  if (!canAccess) return { error: 'You do not have access to this project.' }

  const { data: label, error } = await supabase
    .from('labels')
    .insert({ project_id: projectId, name: name.trim(), color })
    .select('id')
    .single()

  if (error || !label) return { error: error?.message ?? 'Failed to create label.' }

  revalidatePath('/', 'layout')
  return { labelId: label.id }
}
