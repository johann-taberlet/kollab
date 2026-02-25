'use client'

import type { ColumnWithTasks } from '@/lib/types'
import { TaskCard } from './task-card'
import { AddTaskInline } from './add-task-inline'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface BoardColumnProps {
  column: ColumnWithTasks
  projectId: string
  /** When true, renders as a static column (e.g. for drag overlay) without sortable behavior. */
  isOverlay?: boolean
}

export function BoardColumn({ column, projectId, isOverlay }: BoardColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
    disabled: isOverlay,
  })

  // Make the column droppable so empty columns accept task drops
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  })

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const taskIds = useMemo(
    () => column.tasks.map((t) => t.id),
    [column.tasks]
  )

  // Combine refs for sortable (column reorder) and droppable (accept task drops)
  function combinedRef(node: HTMLElement | null) {
    setSortableRef(node)
    setDroppableRef(node)
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50',
        isDragging && 'opacity-30',
        isOverlay && 'rotate-2 shadow-xl'
      )}
    >
      {/* Column header — drag handle */}
      <div
        className="flex cursor-grab items-center justify-between px-3 py-2.5"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.name}</h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {column.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add task */}
      {!isOverlay && (
        <AddTaskInline projectId={projectId} columnId={column.id} />
      )}
    </div>
  )
}
