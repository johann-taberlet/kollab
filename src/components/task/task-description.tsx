'use client'

import { useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { updateTask } from '@/lib/actions/task'

interface TaskDescriptionProps {
  taskId: string
  initialDescription: string | null
}

export function TaskDescription({ taskId, initialDescription }: TaskDescriptionProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const value = html === '<p></p>' ? null : html
        await updateTask(taskId, { description: value })
      }, 500)
    },
    [taskId]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Add a description...',
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: initialDescription ?? '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[80px] focus:outline-none px-0 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      save(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Description</span>
      <div className="rounded-md border p-3 transition-colors focus-within:border-ring">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
