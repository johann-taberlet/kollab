'use client'

import { useCallback } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

/**
 * Hook to manage task detail panel state via URL query params.
 * Uses `?task={taskId}` to keep the URL shareable.
 */
export function useTaskPanel() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const taskId = searchParams.get('task')

  const openTask = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('task', id)
      router.push(pathname + '?' + params.toString(), { scroll: false })
    },
    [searchParams, pathname, router]
  )

  const closeTask = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('task')
    const qs = params.toString()
    router.push(qs ? pathname + '?' + qs : pathname, { scroll: false })
  }, [searchParams, pathname, router])

  return { taskId, openTask, closeTask }
}
