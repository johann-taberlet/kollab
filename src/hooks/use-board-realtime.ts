'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

/**
 * Subscribe to Supabase Realtime for task and column changes on a project.
 * On any change, calls router.refresh() to re-fetch server data.
 * Debounces rapid changes to avoid excessive refreshes.
 */
export function useBoardRealtime(projectId: string) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    function handleChange() {
      // Debounce rapid changes (e.g. drag-and-drop reorder fires multiple updates)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        router.refresh()
      }, 500)
    }

    const channel = supabase
      .channel(`board-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `project_id=eq.${projectId}`,
        },
        handleChange
      )
      .subscribe()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [projectId, router])
}
