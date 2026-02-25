'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Create an attachment record after a file has been uploaded to Supabase Storage.
 */
export async function createAttachment(
  taskId: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  mimeType: string
): Promise<{ attachmentId?: string; error?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: attachment, error } = await supabase
    .from('attachments')
    .insert({
      task_id: taskId,
      uploaded_by: user.id,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select('id')
    .single()

  if (error || !attachment) {
    return { error: error?.message ?? 'Failed to create attachment.' }
  }

  revalidatePath('/', 'layout')
  return { attachmentId: attachment.id }
}

/**
 * Delete an attachment from both Storage and the database.
 */
export async function deleteAttachment(
  id: string,
  filePath: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([filePath])

  if (storageError) {
    return { error: storageError.message }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
