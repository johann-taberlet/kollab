'use client'

import { useState, useRef, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTask } from '@/lib/actions/task'

interface AddTaskInlineProps {
  projectId: string
  columnId: string
  onTaskCreated?: (taskId: string) => void
}

export function AddTaskInline({ projectId, columnId, onTaskCreated }: AddTaskInlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setIsEditing(true)
    // Focus after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleCancel() {
    setIsEditing(false)
    setTitle('')
  }

  function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await createTask(projectId, columnId, trimmed)
      if ('taskId' in result) {
        onTaskCreated?.(result.taskId)
      }
    })

    // Clear and keep open for rapid entry
    setTitle('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isEditing) {
    return (
      <div className="px-2 pb-2">
        <Button
          variant="ghost"
          className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
          onClick={handleOpen}
        >
          <Plus className="size-3" />
          Add a card
        </Button>
      </div>
    )
  }

  return (
    <div className="px-2 pb-2">
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a title..."
          disabled={isPending}
          className="w-full rounded bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={handleSubmit}
          disabled={isPending || !title.trim()}
        >
          Add card
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
