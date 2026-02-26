'use client'

import { useState, useEffect, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createSubtask, toggleSubtask, updateTask } from '@/lib/actions/task'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

interface Subtask {
  id: string
  title: string
  completed_at: string | null
}

interface TaskSubtasksProps {
  taskId: string
  projectId: string
  columnId: string | null
}

export function TaskSubtasks({ taskId, projectId, columnId }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  // Fetch subtasks
  useEffect(() => {
    const supabase = createClient()

    async function fetchSubtasks() {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, completed_at')
        .eq('parent_task_id', taskId)
        .order('position', { ascending: true })

      if (data) setSubtasks(data)
    }

    fetchSubtasks()
  }, [taskId])

  const completedCount = subtasks.filter((s) => s.completed_at).length

  const handleToggle = (subtask: Subtask) => {
    const completed = !subtask.completed_at

    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtask.id
          ? { ...s, completed_at: completed ? new Date().toISOString() : null }
          : s
      )
    )

    startTransition(async () => {
      await toggleSubtask(subtask.id, completed)
    })
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return

    const title = newTitle.trim()
    setNewTitle('')

    startTransition(async () => {
      const result = await createSubtask(
        taskId,
        title,
        projectId,
        columnId ?? ''
      )
      if (result.taskId) {
        setSubtasks((prev) => [
          ...prev,
          { id: result.taskId!, title, completed_at: null },
        ])
      }
    })
  }

  const handleEditSave = (subtaskId: string) => {
    const trimmed = editTitle.trim()
    setEditingId(null)
    if (!trimmed) return

    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, title: trimmed } : s))
    )

    startTransition(async () => {
      await updateTask(subtaskId, { title: trimmed })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Subtasks{subtasks.length > 0 && ` (${completedCount}/${subtasks.length})`}
        </span>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="flex flex-col gap-0.5">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
          >
            <Checkbox
              checked={!!subtask.completed_at}
              onCheckedChange={() => handleToggle(subtask)}
            />
            {editingId === subtask.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleEditSave(subtask.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave(subtask.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
                className="h-6 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            ) : (
              <span
                className={cn(
                  'flex-1 cursor-text text-sm',
                  subtask.completed_at && 'text-muted-foreground line-through'
                )}
                onClick={() => {
                  setEditingId(subtask.id)
                  setEditTitle(subtask.title)
                }}
              >
                {subtask.title}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Subtask title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setIsAdding(false)
                setNewTitle('')
              }
            }}
            autoFocus
            className="h-7 text-sm"
          />
          <Button size="xs" onClick={handleAdd} disabled={!newTitle.trim()}>
            Add
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setIsAdding(false)
              setNewTitle('')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="size-3" />
          Add subtask
        </Button>
      )}
    </div>
  )
}
