'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvitation } from '@/lib/actions/invite'
import { Button } from '@/components/ui/button'

interface AcceptInviteButtonProps {
  token: string
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitation(token)
      if (result.error) {
        alert(result.error)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    })
  }

  return (
    <Button onClick={handleAccept} disabled={isPending}>
      {isPending ? 'Accepting...' : 'Accept invitation'}
    </Button>
  )
}
