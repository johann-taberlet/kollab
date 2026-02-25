'use client'

import { useState, useRef, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createColumn } from '@/lib/actions/column'

interface AddColumnInlineProps {
  projectId: string
  onColumnCreated?: (columnId: string) => void
}

export function AddColumnInline({ projectId, onColumnCreated }: AddColumnInlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleCancel() {
    setIsEditing(false)
    setName('')
  }

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await createColumn(projectId, trimmed)
      if ('columnId' in result) {
        onColumnCreated?.(result.columnId)
      }
    })

    // Clear and close after submit
    setName('')
    setIsEditing(false)
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
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          className="h-10 w-72 justify-start gap-2 text-muted-foreground"
          onClick={handleOpen}
        >
          <Plus className="size-4" />
          Add column
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0">
      <div className="w-72 rounded-lg bg-muted/50 p-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter column name..."
          disabled={isPending}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <div className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            Add column
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
    </div>
  )
}
