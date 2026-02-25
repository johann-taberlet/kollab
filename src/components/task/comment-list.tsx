'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { updateComment, deleteComment, type CommentWithAuthor } from '@/lib/actions/comment'
import { createClient } from '@/utils/supabase/client'
import { CommentEditor } from './comment-editor'

interface CommentListProps {
  taskId: string
  projectId: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function CommentEditEditor({
  content,
  onSave,
  onCancel,
}: {
  content: string
  onSave: (html: string) => void
  onCancel: () => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[60px] focus:outline-none px-0 py-1',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border p-3 transition-colors focus-within:border-ring">
        <EditorContent editor={editor} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(editor.getHTML())}
          disabled={editor.getText().trim().length === 0}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

export function CommentList({ taskId, projectId }: CommentListProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingComment, setDeletingComment] = useState<CommentWithAuthor | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  // Fetch comments on mount
  useEffect(() => {
    const supabase = createClient()

    async function fetchComments() {
      const { data } = await supabase
        .from('comments')
        .select(
          `
          *,
          author:profiles!comments_author_id_fkey(id, full_name, avatar_url, email)
        `
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (data) {
        setComments(
          data.map((c) => ({
            ...c,
            author: c.author as unknown as CommentWithAuthor['author'],
          }))
        )
      }
      setLoading(false)
    }

    fetchComments()
  }, [taskId])

  // Subscribe to Realtime changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          // Fetch the full comment with author profile
          const { data } = await supabase
            .from('comments')
            .select(
              `
              *,
              author:profiles!comments_author_id_fkey(id, full_name, avatar_url, email)
            `
            )
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setComments((prev) => {
              // Don't add if already exists (optimistic update)
              if (prev.some((c) => c.id === data.id)) return prev
              return [
                ...prev,
                {
                  ...data,
                  author: data.author as unknown as CommentWithAuthor['author'],
                },
              ]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setComments((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? { ...c, content: payload.new.content, updated_at: payload.new.updated_at }
                : c
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleCommentAdded = useCallback((comment: CommentWithAuthor) => {
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev
      return [...prev, comment]
    })
  }, [])

  const handleEdit = async (commentId: string, newContent: string) => {
    setEditingId(null)
    // Optimistically update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, content: newContent, updated_at: new Date().toISOString() }
          : c
      )
    )
    await updateComment(commentId, newContent)
  }

  const handleDelete = async () => {
    if (!deletingComment) return
    const commentId = deletingComment.id
    setDeletingComment(null)
    // Optimistically remove
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    await deleteComment(commentId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group flex gap-3">
              <Avatar size="sm" className="mt-0.5 shrink-0">
                {comment.author.avatar_url && (
                  <AvatarImage
                    src={comment.author.avatar_url}
                    alt={comment.author.full_name}
                  />
                )}
                <AvatarFallback>
                  {getInitials(comment.author.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.author.full_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}

                  {currentUserId === comment.author_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreHorizontal className="size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingId(comment.id)}
                        >
                          <Pencil className="mr-2 size-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingComment(comment)}
                        >
                          <Trash2 className="mr-2 size-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {editingId === comment.id ? (
                  <CommentEditEditor
                    content={comment.content}
                    onSave={(html) => handleEdit(comment.id, html)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      ) : null}

      <CommentEditor
        taskId={taskId}
        projectId={projectId}
        onCommentAdded={handleCommentAdded}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deletingComment}
        onOpenChange={(open) => !open && setDeletingComment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingComment(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
