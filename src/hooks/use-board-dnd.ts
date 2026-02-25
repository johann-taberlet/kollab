'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import type { ColumnWithTasks, TaskWithRelations } from '@/lib/types'
import { getPositionBetween } from '@/lib/utils/position'
import { moveTask } from '@/lib/actions/task'
import { moveColumn } from '@/lib/actions/column'
import { arrayMove } from '@dnd-kit/sortable'

export function useBoardDnd(initialColumns: ColumnWithTasks[]) {
  const [columns, setColumns] = useState(initialColumns)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeType, setActiveType] = useState<'task' | 'column' | null>(null)

  // Snapshot for reverting on error
  const snapshotRef = useRef<ColumnWithTasks[]>([])

  // Sync external column changes (e.g. after server revalidation)
  const prevInitialRef = useRef(initialColumns)
  if (prevInitialRef.current !== initialColumns) {
    prevInitialRef.current = initialColumns
    setColumns(initialColumns)
  }

  // ---------- Helpers ----------

  function findColumnOfTask(taskId: UniqueIdentifier): ColumnWithTasks | undefined {
    return columns.find((col) =>
      col.tasks.some((t) => t.id === taskId)
    )
  }

  function findTask(taskId: UniqueIdentifier): TaskWithRelations | undefined {
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === taskId)
      if (task) return task
    }
    return undefined
  }

  // ---------- Handlers ----------

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const type = active.data.current?.type as 'task' | 'column' | undefined

      setActiveId(active.id)
      setActiveType(type ?? null)
      snapshotRef.current = columns.map((col) => ({
        ...col,
        tasks: [...col.tasks],
      }))
    },
    [columns]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeData = active.data.current
      if (activeData?.type !== 'task') return

      const activeTaskId = active.id
      const overData = over.data.current

      // Determine target column
      let overColumnId: string | undefined
      if (overData?.type === 'column') {
        overColumnId = over.id as string
      } else if (overData?.type === 'task') {
        // The over item is a task — find which column it's in
        const overCol = columns.find((col) =>
          col.tasks.some((t) => t.id === over.id)
        )
        overColumnId = overCol?.id
      }

      if (!overColumnId) return

      const activeCol = findColumnOfTask(activeTaskId)
      if (!activeCol) return

      // If task is already in the target column, skip (sorting within column is handled in dragEnd)
      if (activeCol.id === overColumnId) return

      // Move task across columns optimistically
      setColumns((prev) => {
        const sourceCol = prev.find((c) => c.id === activeCol.id)
        const destCol = prev.find((c) => c.id === overColumnId)
        if (!sourceCol || !destCol) return prev

        const taskIndex = sourceCol.tasks.findIndex((t) => t.id === activeTaskId)
        if (taskIndex === -1) return prev

        const task = sourceCol.tasks[taskIndex]

        // Determine the index to insert into the destination column
        let insertIndex = destCol.tasks.length
        if (overData?.type === 'task') {
          const overIndex = destCol.tasks.findIndex((t) => t.id === over.id)
          if (overIndex !== -1) {
            insertIndex = overIndex
          }
        }

        const newSourceTasks = [...sourceCol.tasks]
        newSourceTasks.splice(taskIndex, 1)

        const newDestTasks = [...destCol.tasks]
        newDestTasks.splice(insertIndex, 0, {
          ...task,
          column_id: overColumnId!,
        })

        return prev.map((col) => {
          if (col.id === sourceCol.id) return { ...col, tasks: newSourceTasks }
          if (col.id === destCol.id) return { ...col, tasks: newDestTasks }
          return col
        })
      })
    },
    [columns]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      setActiveType(null)

      if (!over) {
        // Dropped outside — revert
        setColumns(snapshotRef.current)
        return
      }

      const activeData = active.data.current
      const overData = over.data.current

      // ---------- Column sorting ----------
      if (activeData?.type === 'column') {
        if (active.id === over.id) return

        setColumns((prev) => {
          const oldIndex = prev.findIndex((c) => c.id === active.id)
          const newIndex = prev.findIndex((c) => c.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return prev
          return arrayMove(prev, oldIndex, newIndex)
        })

        // Calculate the new position and persist
        const currentCols = (() => {
          const oldIndex = columns.findIndex((c) => c.id === active.id)
          const newIndex = columns.findIndex((c) => c.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return columns
          return arrayMove(columns, oldIndex, newIndex)
        })()

        const movedIndex = currentCols.findIndex((c) => c.id === active.id)
        const before = movedIndex > 0 ? currentCols[movedIndex - 1].position : null
        const after = movedIndex < currentCols.length - 1 ? currentCols[movedIndex + 1].position : null
        const newPosition = getPositionBetween(before, after)

        moveColumn(active.id as string, newPosition).then((result) => {
          if (result.error) {
            setColumns(snapshotRef.current)
          }
        })
        return
      }

      // ---------- Task sorting / cross-column move ----------
      if (activeData?.type === 'task') {
        const taskId = active.id as string

        // Find current column of the active task (after dragOver mutations)
        const currentCol = columns.find((col) =>
          col.tasks.some((t) => t.id === taskId)
        )
        // But we need to use the latest state — columns may have been updated by dragOver
        // So re-derive from current state
        let finalColumns: ColumnWithTasks[]

        setColumns((prev) => {
          const col = prev.find((c) => c.tasks.some((t) => t.id === taskId))
          if (!col) {
            finalColumns = prev
            return prev
          }

          if (overData?.type === 'task' && active.id !== over.id) {
            // Reorder within the same column
            const oldIndex = col.tasks.findIndex((t) => t.id === active.id)
            const newIndex = col.tasks.findIndex((t) => t.id === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
              const newTasks = arrayMove(col.tasks, oldIndex, newIndex)
              const updated = prev.map((c) =>
                c.id === col.id ? { ...c, tasks: newTasks } : c
              )
              finalColumns = updated
              return updated
            }
          }

          finalColumns = prev
          return prev
        })

        // Persist after state is set — use a microtask so setColumns has flushed
        setTimeout(() => {
          // Get the latest columns state
          setColumns((latestColumns) => {
            const col = latestColumns.find((c) => c.tasks.some((t) => t.id === taskId))
            if (!col) return latestColumns

            const taskIndex = col.tasks.findIndex((t) => t.id === taskId)
            const before = taskIndex > 0 ? col.tasks[taskIndex - 1].position : null
            const after =
              taskIndex < col.tasks.length - 1 ? col.tasks[taskIndex + 1].position : null
            const newPosition = getPositionBetween(before, after)

            moveTask(taskId, col.id, newPosition).then((result) => {
              if (result.error) {
                setColumns(snapshotRef.current)
              }
            })

            return latestColumns
          })
        }, 0)
      }
    },
    [columns]
  )

  return {
    columns,
    setColumns,
    activeId,
    activeType,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    findTask,
  }
}
