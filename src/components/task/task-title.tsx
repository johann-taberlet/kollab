'use client'

import { useState, useRef, useCallback } from 'react'
import { updateTask } from '@/lib/actions/task'

interface TaskTitleProps {
  taskId: string
  initialTitle: string
}

export function TaskTitle({ taskId, initialTitle }: TaskTitleProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const save = useCallback(async () => {
    setIsEditing(false)
    const trimmed = title.trim()
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle)
      return
    }
    await updateTask(taskId, { title: trimmed })
  }, [taskId, title, initialTitle])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setTitle(initialTitle)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full border-none bg-transparent text-xl font-semibold tracking-tight outline-none focus:ring-0"
      />
    )
  }

  return (
    <h2
      className="cursor-text text-xl font-semibold leading-tight tracking-tight hover:text-foreground/80"
      onClick={() => setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
    >
      {title}
    </h2>
  )
}
