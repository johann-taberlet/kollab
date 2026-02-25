'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Shield, ShieldAlert, User, UserMinus } from 'lucide-react'
import { removeMember, updateMemberRole } from '@/lib/actions/org'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MemberActionsProps {
  orgId: string
  userId: string
  currentRole: string
  isOwner: boolean
  memberName: string
}

export function MemberActions({
  orgId,
  userId,
  currentRole,
  isOwner,
  memberName,
}: MemberActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm(`Remove ${memberName} from the organization?`)) return

    startTransition(async () => {
      const result = await removeMember(orgId, userId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleRoleChange(newRole: string) {
    startTransition(async () => {
      const result = await updateMemberRole(orgId, userId, newRole)
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
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isOwner && (
          <>
            <DropdownMenuLabel>Change role</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Shield className="mr-2 size-4" />
                Role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleRoleChange('owner')}
                  disabled={currentRole === 'owner'}
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Owner
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRoleChange('admin')}
                  disabled={currentRole === 'admin'}
                >
                  <Shield className="mr-2 size-4" />
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRoleChange('member')}
                  disabled={currentRole === 'member'}
                >
                  <User className="mr-2 size-4" />
                  Member
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={handleRemove}>
          <UserMinus className="mr-2 size-4" />
          Remove member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
