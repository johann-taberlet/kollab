'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, isPast, isToday } from 'date-fns'
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { updateTask } from '@/lib/actions/task'

export interface MyTaskItem {
  id: string
  title: string
  due_date: string | null
  completed_at: string | null
  project_id: string
  project_name: string
  project_color: string
  column_name: string | null
  org_slug: string
}

export interface MyTaskGroup {
  label: string
  tasks: MyTaskItem[]
}

interface MyTasksListProps {
  groups: MyTaskGroup[]
}

export function MyTasksList({ groups }: MyTasksListProps) {
  const nonEmptyGroups = groups.filter((g) => g.tasks.length > 0)

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <CheckCircle2 className="mb-3 size-10 opacity-40" />
        <p className="text-sm font-medium">No tasks assigned to you</p>
        <p className="text-xs">Tasks assigned to you will appear here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">My Tasks</h1>
      </div>
      <div className="divide-y">
        {nonEmptyGroups.map((group) => (
          <TaskGroupSection key={group.label} group={group} />
        ))}
      </div>
    </div>
  )
}

function TaskGroupSection({ group }: { group: MyTaskGroup }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-6 py-2.5 text-left text-sm font-semibold hover:bg-accent/50"
      >
        {collapsed ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
        {group.label}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({group.tasks.length})
        </span>
      </button>
      {!collapsed && (
        <ul>
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskRow({ task }: { task: MyTaskItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCompleted, setIsCompleted] = useState(!!task.completed_at)

  const hasDueDate = !!task.due_date
  const isOverdue =
    hasDueDate &&
    isPast(new Date(task.due_date!)) &&
    !isToday(new Date(task.due_date!)) &&
    !isCompleted

  function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    const newCompleted = !isCompleted
    setIsCompleted(newCompleted)
    startTransition(async () => {
      await updateTask(task.id, {
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
    })
  }

  function handleClick() {
    router.push(
      `/${task.org_slug}/projects/${task.project_id}?task=${task.id}`
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {isCompleted ? (
            <CheckCircle2 className="size-5 text-green-600" />
          ) : (
            <Circle className="size-5" />
          )}
        </button>

        {/* Title */}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            isCompleted && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </span>

        {/* Project badge */}
        <Badge variant="secondary" className="shrink-0 gap-1.5 text-[10px]">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: task.project_color }}
          />
          {task.project_name}
        </Badge>

        {/* Column name */}
        {task.column_name && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {task.column_name}
          </span>
        )}

        {/* Due date */}
        {hasDueDate && (
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 text-xs text-muted-foreground',
              isOverdue && 'text-destructive'
            )}
          >
            <Calendar className="size-3" />
            {format(new Date(task.due_date!), 'MMM d')}
          </span>
        )}
      </button>
    </li>
  )
}
