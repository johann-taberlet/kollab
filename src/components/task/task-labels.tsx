'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { toggleTaskLabel, createLabel } from '@/lib/actions/label'
import { createClient } from '@/utils/supabase/client'
import type { Label } from '@/lib/types'

interface TaskLabelsProps {
  taskId: string
  projectId: string
  initialLabels: Label[]
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

export function TaskLabels({ taskId, projectId, initialLabels }: TaskLabelsProps) {
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(initialLabels)
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return

    const supabase = createClient()

    async function fetchLabels() {
      const { data } = await supabase
        .from('labels')
        .select('*')
        .eq('project_id', projectId)
        .order('name')

      if (data) setAllLabels(data)
    }

    fetchLabels()
  }, [open, projectId])

  const isSelected = (labelId: string) =>
    selectedLabels.some((l) => l.id === labelId)

  const handleToggle = (label: Label) => {
    const attach = !isSelected(label.id)

    if (attach) {
      setSelectedLabels((prev) => [...prev, label])
    } else {
      setSelectedLabels((prev) => prev.filter((l) => l.id !== label.id))
    }

    setOpen(false)

    startTransition(async () => {
      await toggleTaskLabel(taskId, label.id, attach)
    })
  }

  const handleCreate = () => {
    if (!newName.trim()) return

    startTransition(async () => {
      const result = await createLabel(projectId, newName, newColor)
      if (result.labelId) {
        const newLabel: Label = {
          id: result.labelId,
          project_id: projectId,
          name: newName.trim(),
          color: newColor,
        }
        setAllLabels((prev) => [...prev, newLabel])
        setSelectedLabels((prev) => [...prev, newLabel])
        await toggleTaskLabel(taskId, result.labelId, true)
      }
      setNewName('')
      setIsCreating(false)
      setOpen(false)
    })
  }

  return (
    <div className="flex min-h-8 items-start">
      <span className="mt-1.5 w-28 shrink-0 text-xs text-muted-foreground">Labels</span>
      <div className="flex flex-wrap items-center gap-1">
        {selectedLabels.map((label) => (
          <Badge
            key={label.id}
            variant="secondary"
            className="h-6 gap-1 text-xs font-normal"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
            >
              <Plus className="size-3" />
              {selectedLabels.length === 0 && 'Add'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="flex flex-col gap-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Project labels
              </p>
              {allLabels.map((label) => (
                <div
                  key={label.id}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => handleToggle(label)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleToggle(label)
                    }
                  }}
                >
                  <Checkbox
                    checked={isSelected(label.id)}
                    className="pointer-events-none"
                  />
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="truncate">{label.name}</span>
                </div>
              ))}

              {isCreating ? (
                <div className="flex flex-col gap-2 border-t pt-2">
                  <Input
                    placeholder="Label name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') setIsCreating(false)
                    }}
                    autoFocus
                    className="h-7 text-xs"
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className="size-5 rounded-full ring-offset-1 transition-all"
                        style={{
                          backgroundColor: color,
                          boxShadow:
                            newColor === color
                              ? `0 0 0 2px var(--background), 0 0 0 4px ${color}`
                              : 'none',
                        }}
                        onClick={() => setNewColor(color)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="xs" onClick={handleCreate} disabled={!newName.trim()}>
                      Add
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="size-3" />
                  Create label
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
