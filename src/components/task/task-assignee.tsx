'use client'

import { useState, useEffect, useTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { UserCircle, X } from 'lucide-react'
import { updateTask } from '@/lib/actions/task'
import { createClient } from '@/utils/supabase/client'
import type { Profile } from '@/lib/types'

interface TaskAssigneeProps {
  taskId: string
  projectId: string
  assignee: Profile | null
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TaskAssignee({
  taskId,
  projectId,
  assignee: initialAssignee,
}: TaskAssigneeProps) {
  const [assignee, setAssignee] = useState<Profile | null>(initialAssignee)
  const [members, setMembers] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Fetch project members when the popover opens
  useEffect(() => {
    if (!open) return

    const supabase = createClient()

    async function fetchMembers() {
      // Get org members who can access this project
      // Fetch project's org_id first, then org members
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      if (!project) return

      const { data: orgMembers } = await supabase
        .from('org_members')
        .select('user_id, profiles(id, full_name, avatar_url, email)')
        .eq('org_id', project.org_id)

      if (orgMembers) {
        const profiles = orgMembers
          .map((m) => m.profiles as unknown as Profile)
          .filter(Boolean)
        setMembers(profiles)
      }
    }

    fetchMembers()
  }, [open, projectId])

  const handleSelect = (profile: Profile | null) => {
    setAssignee(profile)
    setOpen(false)
    startTransition(async () => {
      await updateTask(taskId, { assignee_id: profile?.id ?? null })
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Assignee</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 px-2 font-normal"
          >
            {assignee ? (
              <>
                <Avatar size="sm">
                  {assignee.avatar_url && (
                    <AvatarImage src={assignee.avatar_url} alt={assignee.full_name} />
                  )}
                  <AvatarFallback>{getInitials(assignee.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{assignee.full_name}</span>
              </>
            ) : (
              <>
                <UserCircle className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unassigned</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {assignee && (
                  <CommandItem onSelect={() => handleSelect(null)}>
                    <X className="mr-2 size-4" />
                    Unassign
                  </CommandItem>
                )}
                {members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.full_name}
                    onSelect={() => handleSelect(member)}
                  >
                    <Avatar size="sm" className="mr-2">
                      {member.avatar_url && (
                        <AvatarImage src={member.avatar_url} alt={member.full_name} />
                      )}
                      <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <span>{member.full_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
