'use client'

import type { ColumnWithTasks } from '@/lib/types'
import { BoardColumn } from './column'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface BoardProps {
  columns: ColumnWithTasks[]
}

export function Board({ columns }: BoardProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex h-full gap-4 p-6">
        {columns.map((column) => (
          <BoardColumn key={column.id} column={column} />
        ))}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            className="h-10 w-72 justify-start gap-2 text-muted-foreground"
            disabled
          >
            <Plus className="size-4" />
            Add column
          </Button>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
