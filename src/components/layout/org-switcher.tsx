'use client'

import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import type { Organization } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface OrgSwitcherProps {
  orgs: Organization[]
  currentOrgSlug?: string
}

export function OrgSwitcher({ orgs, currentOrgSlug }: OrgSwitcherProps) {
  const router = useRouter()
  const currentOrg = orgs.find((org) => org.slug === currentOrgSlug)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-2 font-semibold"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">
              {currentOrg?.name ?? 'Select organization'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => router.push(`/${org.slug}`)}
            className={
              org.slug === currentOrgSlug ? 'bg-accent' : ''
            }
          >
            <Building2 className="size-4" />
            <span className="truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/onboarding')}>
          <Plus className="size-4" />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
