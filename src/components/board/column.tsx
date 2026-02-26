'use client'

import { useState, useRef, useTransition } from 'react'
import type { ColumnWithTasks } from '@/lib/types'
import { TaskCard } from './task-card'
import { AddTaskInline } from './add-task-inline'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { updateColumn, deleteColumn } from '@/lib/actions/column'

interface BoardColumnProps {
  column: ColumnWithTasks
  projectId: string
  isOverlay?: boolean
}

export function BoardColumn({ column, projectId, isOverlay }: BoardColumnProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [name, setName] = useState(column.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingRenameRef = useRef(false)

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

  function combinedRef(node: HTMLElement | null) {
    setSortableRef(node)
    setDroppableRef(node)
  }

  const handleRenameSave = () => {
    setIsRenaming(false)
    const trimmed = name.trim()
    if (!trimmed || trimmed === column.name) {
      setName(column.name)
      return
    }
    startTransition(async () => {
      await updateColumn(column.id, { name: trimmed })
    })
  }

  const handleDelete = () => {
    setConfirmDelete(false)
    startTransition(async () => {
      await deleteColumn(column.id)
    })
  }

  return (
    <>
      <div
        ref={combinedRef}
        style={style}
        className={cn(
          'flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50',
          isDragging && 'opacity-30',
          isOverlay && 'rotate-2 shadow-xl'
        )}
      >
        {/* Column header */}
        <div
          className={cn(
            "group/header flex items-center justify-between px-3 py-2.5",
            !isRenaming && "cursor-grab"
          )}
          {...attributes}
          {...(isRenaming ? {} : listeners)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isRenaming ? (
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleRenameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    inputRef.current?.blur()
                  }
                  if (e.key === 'Escape') {
                    setName(column.name)
                    setIsRenaming(false)
                  }
                }}
                autoFocus
                className="h-6 border-none bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="truncate text-sm font-semibold">{column.name}</h3>
            )}
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
              {column.tasks.length}
            </span>
          </div>

          {!isOverlay && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 transition-opacity group-hover/header:opacity-100 data-[state=open]:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => {
                if (pendingRenameRef.current) {
                  e.preventDefault()
                  pendingRenameRef.current = false
                  setIsRenaming(true)
                }
              }}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    pendingRenameRef.current = true
                  }}
                >
                  <Pencil className="mr-2 size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDelete(true)
                  }}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete column &ldquo;{column.name}&rdquo;</DialogTitle>
            <DialogDescription>
              {column.tasks.length > 0
                ? `This will permanently delete the column and its ${column.tasks.length} task${column.tasks.length > 1 ? 's' : ''}. This action cannot be undone.`
                : 'This will permanently delete the column. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
