import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  NotificationList,
  type NotificationItem,
} from '@/components/notifications/notification-list'

export default async function InboxPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all notifications for the current user with joined data
  const { data: notifications } = await supabase
    .from('notifications')
    .select(
      `
      id,
      type,
      read_at,
      created_at,
      task_id,
      tasks!notifications_task_id_fkey(
        id,
        title,
        project_id,
        projects!tasks_project_id_fkey(
          id,
          name,
          org_id,
          organizations!projects_org_id_fkey(slug)
        )
      ),
      triggered_by_profile:profiles!notifications_triggered_by_fkey(
        full_name,
        avatar_url
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Transform raw data into NotificationItem shape
  const items: NotificationItem[] = (notifications ?? [])
    .map((n) => {
      const task = n.tasks as unknown as {
        id: string
        title: string
        project_id: string
        projects: {
          id: string
          name: string
          org_id: string
          organizations: { slug: string }
        }
      } | null

      const triggeredBy = n.triggered_by_profile as unknown as {
        full_name: string
        avatar_url: string | null
      } | null

      if (!task || !triggeredBy) return null

      return {
        id: n.id,
        type: n.type,
        read_at: n.read_at,
        created_at: n.created_at,
        task_id: task.id,
        task_title: task.title,
        project_id: task.project_id,
        project_name: task.projects.name,
        org_slug: task.projects.organizations.slug,
        triggered_by_name: triggeredBy.full_name,
        triggered_by_avatar: triggeredBy.avatar_url,
      }
    })
    .filter((item): item is NotificationItem => item !== null)

  return <NotificationList notifications={items} />
}
