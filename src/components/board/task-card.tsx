'use client'

import type { TaskWithRelations } from '@/lib/types'
import { format, isPast, isToday } from 'date-fns'
import {
  MessageSquare,
  Paperclip,
  CheckSquare,
  Calendar,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskPanel } from '@/hooks/use-task-panel'

interface TaskCardProps {
  task: TaskWithRelations
  /** When true, renders as a static card (e.g. for drag overlay) without sortable behavior. */
  isOverlay?: boolean
}

const MAX_LABELS_SHOWN = 3

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const { openTask } = useTaskPanel()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: isOverlay,
  })

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const hasLabels = task.labels.length > 0
  const hasDueDate = !!task.due_date
  const hasAssignee = !!task.assignee
  const commentCount = task._count.comments
  const attachmentCount = task._count.attachments
  const subtaskTotal = task._subtaskTotal ?? 0
  const subtaskCompleted = task._count.subtasks_completed

  const isOverdue =
    hasDueDate && isPast(new Date(task.due_date!)) && !isToday(new Date(task.due_date!)) && !task.completed_at

  const hasFooter = hasDueDate || hasAssignee || commentCount > 0 || attachmentCount > 0 || subtaskTotal > 0

  const handleClick = () => {
    if (!isDragging && !isOverlay) {
      openTask(task.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'group cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-30',
        isOverlay && 'rotate-3 shadow-lg'
      )}
    >
      {/* Labels row */}
      {hasLabels && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, MAX_LABELS_SHOWN).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > MAX_LABELS_SHOWN && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{task.labels.length - MAX_LABELS_SHOWN}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

      {/* Footer row */}
      {hasFooter && (
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {/* Due date */}
          {hasDueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-destructive'
              )}
            >
              <Calendar className="size-3" />
              {format(new Date(task.due_date!), 'MMM d')}
            </span>
          )}

          {/* Subtask progress */}
          {subtaskTotal > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" />
              {subtaskCompleted}/{subtaskTotal}
            </span>
          )}

          {/* Comment count */}
          {commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {commentCount}
            </span>
          )}

          {/* Attachment count */}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3" />
              {attachmentCount}
            </span>
          )}

          {/* Spacer + Assignee avatar */}
          {hasAssignee && (
            <div className="ml-auto">
              <Avatar size="sm">
                {task.assignee!.avatar_url && (
                  <AvatarImage
                    src={task.assignee!.avatar_url}
                    alt={task.assignee!.full_name}
                  />
                )}
                <AvatarFallback>
                  {task.assignee!.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
