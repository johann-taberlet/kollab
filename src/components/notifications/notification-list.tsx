'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { markAsRead, markAllAsRead } from '@/lib/actions/notification'

export interface NotificationItem {
  id: string
  type: string
  read_at: string | null
  created_at: string
  task_id: string
  task_title: string
  project_id: string
  project_name: string
  org_slug: string
  triggered_by_name: string
  triggered_by_avatar: string | null
}

interface NotificationListProps {
  notifications: NotificationItem[]
}

function getDescription(type: string, name: string, taskTitle: string): string {
  switch (type) {
    case 'mention':
      return `${name} mentioned you in "${taskTitle}"`
    case 'assignment':
      return `${name} assigned you to "${taskTitle}"`
    case 'comment':
      return `${name} commented on "${taskTitle}"`
    default:
      return `${name} updated "${taskTitle}"`
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const hasUnread = notifications.some((n) => !n.read_at)

  function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllAsRead()
    })
  }

  function handleClickNotification(notification: NotificationItem) {
    // Mark as read if unread
    if (!notification.read_at) {
      startTransition(async () => {
        await markAsRead(notification.id)
      })
    }

    // Navigate to the project board with the task panel open
    router.push(
      `/${notification.org_slug}/projects/${notification.project_id}?task=${notification.task_id}`
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Bell className="mb-3 size-10 opacity-40" />
        <p className="text-sm font-medium">No notifications yet</p>
        <p className="text-xs">You will see notifications here when someone mentions you, assigns you a task, or comments.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Inbox</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ul className="divide-y">
        {notifications.map((notification) => {
          const isUnread = !notification.read_at
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleClickNotification(notification)}
                className={cn(
                  'flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/50',
                  isUnread && 'bg-accent/30'
                )}
              >
                {/* Unread indicator */}
                <div className="mt-2 flex w-2 shrink-0 items-start">
                  {isUnread && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </div>

                {/* Avatar */}
                <Avatar size="default">
                  {notification.triggered_by_avatar && (
                    <AvatarImage
                      src={notification.triggered_by_avatar}
                      alt={notification.triggered_by_name}
                    />
                  )}
                  <AvatarFallback>
                    {getInitials(notification.triggered_by_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm leading-snug',
                      isUnread ? 'font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {getDescription(
                      notification.type,
                      notification.triggered_by_name,
                      notification.task_title
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {notification.project_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
