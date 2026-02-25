'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useTaskPanel } from '@/hooks/use-task-panel'
import { TaskTitle } from './task-title'
import { TaskAssignee } from './task-assignee'
import { TaskDueDate } from './task-due-date'
import { TaskLabels } from './task-labels'
import { TaskDescription } from './task-description'
import { TaskSubtasks } from './task-subtasks'
import { TaskCustomFields } from './task-custom-fields'
import { TaskAttachments } from './task-attachments'
import { createClient } from '@/utils/supabase/client'
import { deleteTask } from '@/lib/actions/task'
import type { Profile, Label } from '@/lib/types'

interface TaskDetail {
  id: string
  title: string
  description: string | null
  project_id: string
  column_id: string | null
  assignee_id: string | null
  due_date: string | null
  completed_at: string | null
  assignee: Profile | null
  labels: Label[]
}

interface TaskPanelProps {
  projectId: string
}

export function TaskPanel({ projectId }: TaskPanelProps) {
  const { taskId, closeTask } = useTaskPanel()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!taskId) {
      setTask(null)
      return
    }

    setLoading(true)
    const supabase = createClient()

    async function fetchTask() {
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          task_labels(label_id, labels(id, name, color, project_id))
        `)
        .eq('id', taskId!)
        .single()

      if (data) {
        const labels = (data.task_labels ?? [])
          .map(
            (tl: { label_id: string; labels: Label | null }) => tl.labels
          )
          .filter(Boolean) as Label[]

        setTask({
          id: data.id,
          title: data.title,
          description: data.description,
          project_id: data.project_id,
          column_id: data.column_id,
          assignee_id: data.assignee_id,
          due_date: data.due_date,
          completed_at: data.completed_at,
          assignee: (data.assignee as unknown as Profile) ?? null,
          labels,
        })
      }
      setLoading(false)
    }

    fetchTask()
  }, [taskId])

  const handleDelete = () => {
    if (!task) return
    startTransition(async () => {
      await deleteTask(task.id)
      closeTask()
    })
  }

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && closeTask()}>
      <SheetContent
        side="right"
        className="w-[600px] overflow-y-auto sm:max-w-[600px]"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : task ? (
          <>
            <SheetHeader className="gap-0">
              <SheetTitle className="sr-only">Task details</SheetTitle>
              <SheetDescription className="sr-only">
                View and edit task details
              </SheetDescription>
              <TaskTitle taskId={task.id} initialTitle={task.title} />
            </SheetHeader>

            <div className="flex flex-col gap-5 pb-8">
              {/* Metadata row */}
              <div className="flex flex-wrap gap-4">
                <TaskAssignee
                  taskId={task.id}
                  projectId={projectId}
                  assignee={task.assignee}
                />
                <TaskDueDate
                  taskId={task.id}
                  dueDate={task.due_date}
                  completedAt={task.completed_at}
                />
              </div>

              <TaskLabels
                taskId={task.id}
                projectId={projectId}
                initialLabels={task.labels}
              />

              <TaskCustomFields
                taskId={task.id}
                projectId={projectId}
              />

              <Separator />

              <TaskDescription
                taskId={task.id}
                initialDescription={task.description}
              />

              <Separator />

              <TaskSubtasks
                taskId={task.id}
                projectId={projectId}
                columnId={task.column_id}
              />

              <Separator />

              <TaskAttachments
                taskId={task.id}
                projectId={projectId}
              />

              <Separator />

              {/* Delete task */}
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="gap-2"
                >
                  <Trash2 className="size-3" />
                  Delete task
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Task not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
