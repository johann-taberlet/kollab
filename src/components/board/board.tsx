'use client'

import type { ColumnWithTasks } from '@/lib/types'
import { BoardColumn } from './column'
import { AddColumnInline } from './add-column-inline'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TaskCard } from './task-card'
import { useBoardDnd } from '@/hooks/use-board-dnd'
import { useMemo } from 'react'

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'

interface BoardProps {
  columns: ColumnWithTasks[]
  projectId: string
}

export function Board({ columns: initialColumns, projectId }: BoardProps) {
  const {
    columns,
    activeId,
    activeType,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    findTask,
  } = useBoardDnd(initialColumns)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const columnIds = useMemo(
    () => columns.map((col) => col.id),
    [columns]
  )

  // Find the active item for the drag overlay
  const activeTask = activeId && activeType === 'task' ? findTask(activeId) : null
  const activeColumn = activeId && activeType === 'column'
    ? columns.find((col) => col.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-full">
        <div className="flex h-full gap-4 p-6">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} projectId={projectId} />
            ))}
          </SortableContext>
          <AddColumnInline projectId={projectId} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag Overlay — renders a ghost copy of the item being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[268px]">
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
        {activeColumn ? (
          <BoardColumn column={activeColumn} projectId={projectId} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
