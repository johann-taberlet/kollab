'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * Hook that tracks unread notification count with realtime updates.
 * Takes an initial count from the server and subscribes to new notifications.
 */
export function useNotificationCount(initialCount: number, userId: string) {
  const [count, setCount] = useState(initialCount)

  // Sync with server-provided count when it changes (e.g. after marking as read)
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return count
}
