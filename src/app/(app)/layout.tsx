import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import type { Organization } from '@/lib/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Fetch user's organizations through memberships
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, organizations(*)')
    .eq('user_id', user.id)

  const orgs: Organization[] = (memberships ?? [])
    .map((m) => m.organizations as unknown as Organization | null)
    .filter((o): o is Organization => o !== null)

  // Count unread notifications
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  return (
    <div className="flex h-full">
      <Sidebar
        profile={profile}
        orgs={orgs}
        unreadCount={unreadCount ?? 0}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
