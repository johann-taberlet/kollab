'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar, X } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { updateTask } from '@/lib/actions/task'
import { cn } from '@/lib/utils'

interface TaskDueDateProps {
  taskId: string
  dueDate: string | null
  completedAt: string | null
}

export function TaskDueDate({ taskId, dueDate: initialDueDate, completedAt }: TaskDueDateProps) {
  const [dueDate, setDueDate] = useState<string | null>(initialDueDate)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isOverdue =
    dueDate &&
    isPast(new Date(dueDate)) &&
    !isToday(new Date(dueDate)) &&
    !completedAt

  const handleChange = (value: string) => {
    setDueDate(value || null)
    setOpen(false)
    startTransition(async () => {
      await updateTask(taskId, { due_date: value || null })
    })
  }

  const handleClear = () => {
    setDueDate(null)
    setOpen(false)
    startTransition(async () => {
      await updateTask(taskId, { due_date: null })
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Due date</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 justify-start gap-2 px-2 font-normal',
              isOverdue && 'text-destructive'
            )}
          >
            <Calendar className="size-4" />
            <span className="text-sm">
              {dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : 'Add due date'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={dueDate ?? ''}
              onChange={(e) => handleChange(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {dueDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="justify-start gap-2"
              >
                <X className="size-3" />
                Clear date
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
