'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { cancelInvitation, resendInvitation } from '@/lib/actions/invite'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface InvitationActionsProps {
  invitationId: string
}

export function InvitationActions({ invitationId }: InvitationActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (!confirm('Cancel this invitation?')) return

    startTransition(async () => {
      const result = await cancelInvitation(invitationId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleResend() {
    startTransition(async () => {
      const result = await resendInvitation(invitationId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8 p-0" disabled={isPending}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Invitation actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleResend}>
          <RefreshCw className="mr-2 size-4" />
          Resend invitation
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleCancel}>
          <Trash2 className="mr-2 size-4" />
          Cancel invitation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
