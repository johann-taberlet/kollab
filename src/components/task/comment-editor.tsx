'use client'

import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { createComment, type CommentWithAuthor } from '@/lib/actions/comment'
import { createClient } from '@/utils/supabase/client'
import { createMentionSuggestion } from './mention-suggestion'
import type { Profile } from '@/lib/types'

interface CommentEditorProps {
  taskId: string
  projectId: string
  onCommentAdded?: (comment: CommentWithAuthor) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function CommentEditor({ taskId, projectId, onCommentAdded }: CommentEditorProps) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('id', user.id)
          .single()

        if (profile) setCurrentUser(profile as Profile)
      }
    }

    fetchCurrentUser()
  }, [])

  const mentionSuggestion = createMentionSuggestion(projectId)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder: 'Write a comment... (Ctrl+Enter to send)',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: mentionSuggestion,
      }),
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      setEmpty(e.getText().trim().length === 0)
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[48px] focus:outline-none px-0 py-1',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          handleSubmit()
          return true
        }
        return false
      },
    },
  })

  const handleSubmit = useCallback(async () => {
    if (!editor || empty || submitting) return

    const content = editor.getHTML()
    setSubmitting(true)

    const result = await createComment(taskId, content)

    if (result.comment) {
      editor.commands.clearContent()
      setEmpty(true)
      onCommentAdded?.(result.comment)
    }

    setSubmitting(false)
  }, [editor, empty, submitting, taskId, onCommentAdded])

  if (!editor) return null

  return (
    <div className="flex gap-3">
      {currentUser && (
        <Avatar size="sm" className="mt-2 shrink-0">
          {currentUser.avatar_url && (
            <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />
          )}
          <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="rounded-lg border bg-muted/30 px-3 py-2 transition-colors focus-within:border-ring focus-within:bg-background">
          <EditorContent editor={editor} />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={empty || submitting}
            className="h-7 gap-1.5 text-xs"
          >
            <Send className="size-3" />
            {submitting ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
