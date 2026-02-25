'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, CheckSquare, Bell, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile, Organization } from '@/lib/types'
import { OrgSwitcher } from '@/components/layout/org-switcher'
import { UserMenu } from '@/components/layout/user-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  profile: Profile
  orgs: Organization[]
  currentOrgSlug?: string
  unreadCount?: number
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function Sidebar({
  profile,
  orgs,
  currentOrgSlug: currentOrgSlugProp,
  unreadCount = 0,
}: SidebarProps) {
  const pathname = usePathname()

  // Derive the current org slug from the pathname if not provided as a prop.
  // The first segment after "/" is the org slug when it matches one of the user's orgs.
  const orgSlugs = new Set(orgs.map((o) => o.slug))
  const firstSegment = pathname.split('/')[1] ?? ''
  const currentOrgSlug =
    currentOrgSlugProp ?? (orgSlugs.has(firstSegment) ? firstSegment : orgs[0]?.slug)

  const navItems: NavItem[] = [
    {
      label: 'Projects',
      href: currentOrgSlug ? `/${currentOrgSlug}` : '/',
      icon: FolderKanban,
    },
    {
      label: 'My Tasks',
      href: '/my-tasks',
      icon: CheckSquare,
    },
    {
      label: 'Inbox',
      href: '/inbox',
      icon: Bell,
      badge: unreadCount,
    },
    ...(currentOrgSlug
      ? [
          {
            label: 'Settings',
            href: `/${currentOrgSlug}/settings`,
            icon: Settings,
          },
        ]
      : []),
  ]

  function isActive(href: string): boolean {
    if (href === `/${currentOrgSlug}`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background">
      {/* Top: Org switcher */}
      <div className="px-3 py-3">
        <OrgSwitcher orgs={orgs} currentOrgSlug={currentOrgSlug} />
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto size-5 justify-center p-0 text-[10px]">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      {/* Bottom: User menu */}
      <div className="px-3 py-3">
        <UserMenu profile={profile} />
      </div>
    </aside>
  )
}
