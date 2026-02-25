'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Upsert a custom field value for a task.
 * Uses the composite primary key (task_id, field_id).
 */
export async function upsertCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: string | null
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('custom_field_values')
    .upsert(
      { task_id: taskId, field_id: fieldId, value },
      { onConflict: 'task_id,field_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
