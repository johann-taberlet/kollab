'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export interface CommentWithAuthor {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  author: {
    id: string
    full_name: string
    avatar_url: string | null
    email: string
  }
}

/**
 * Create a new comment on a task.
 * After inserting, parses content for @mentions and creates notification records.
 */
export async function createComment(
  taskId: string,
  content: string
): Promise<{ comment?: CommentWithAuthor; error?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      author_id: user.id,
      content,
    })
    .select(
      `
      *,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_url, email)
    `
    )
    .single()

  if (error || !comment) {
    return { error: error?.message ?? 'Failed to create comment.' }
  }

  // Parse mentions from content and create notifications
  const mentionedUserIds = parseMentionIds(content)
  if (mentionedUserIds.length > 0) {
    // Filter out the current user from mentions (don't notify yourself)
    const otherMentionedIds = mentionedUserIds.filter((id) => id !== user.id)

    if (otherMentionedIds.length > 0) {
      const notifications = otherMentionedIds.map((userId) => ({
        user_id: userId,
        type: 'mention',
        task_id: taskId,
        triggered_by: user.id,
      }))

      await supabase.from('notifications').insert(notifications)
    }
  }

  revalidatePath('/', 'layout')
  return {
    comment: {
      ...comment,
      author: comment.author as unknown as CommentWithAuthor['author'],
    },
  }
}

/**
 * Update a comment's content. Only the author can update their own comment.
 */
export async function updateComment(
  id: string,
  content: string
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
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Delete a comment. Only the author can delete their own comment.
 */
export async function deleteComment(
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

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Parse mention data-id attributes from HTML content.
 * Mentions are rendered as: <span data-type="mention" data-id="user-uuid" ...>
 */
function parseMentionIds(html: string): string[] {
  const regex = /data-type="mention"[^>]*data-id="([^"]+)"/g
  const ids: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1])
    }
  }

  // Also check the reverse attribute order
  const regex2 = /data-id="([^"]+)"[^>]*data-type="mention"/g
  while ((match = regex2.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1])
    }
  }

  return ids
}
