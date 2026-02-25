import type { Database } from './supabase/database.types'

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Organization = Tables['organizations']['Row']
export type OrgMember = Tables['org_members']['Row']
export type Project = Tables['projects']['Row']
export type ProjectMember = Tables['project_members']['Row']
export type Column = Tables['columns']['Row']
export type Task = Tables['tasks']['Row']
export type TaskLabel = Tables['task_labels']['Row']
export type Label = Tables['labels']['Row']
export type Comment = Tables['comments']['Row']
export type Attachment = Tables['attachments']['Row']
export type Notification = Tables['notifications']['Row']
export type Invitation = Tables['invitations']['Row']
export type CustomField = Tables['custom_fields']['Row']

export type TaskWithRelations = Task & {
  labels: Label[]
  assignee: Profile | null
  subtasks: Task[]
  _count: {
    comments: number
    attachments: number
    subtasks_completed: number
  }
}

export type ColumnWithTasks = Column & {
  tasks: TaskWithRelations[]
}
