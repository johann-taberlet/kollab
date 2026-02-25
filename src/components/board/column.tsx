'use client'

import type { ColumnWithTasks } from '@/lib/types'
import { TaskCard } from './task-card'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BoardColumnProps {
  column: ColumnWithTasks
}

export function BoardColumn({ column }: BoardColumnProps) {
  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.name}</h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="flex flex-col gap-2">
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </ScrollArea>

      {/* Add task button */}
      <div className="px-2 pb-2">
        <Button
          variant="ghost"
          className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
          disabled
        >
          <Plus className="size-3" />
          Add task
        </Button>
      </div>
    </div>
  )
}
