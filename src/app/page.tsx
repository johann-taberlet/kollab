import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's organization memberships
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, organizations(slug)')
    .eq('user_id', user.id)
    .limit(1)

  const firstOrg = memberships?.[0]

  if (firstOrg && firstOrg.organizations) {
    // organizations is returned as an object (single FK join)
    const org = firstOrg.organizations as unknown as { slug: string }
    redirect(`/${org.slug}`)
  }

  // No org memberships — send to onboarding
  redirect('/onboarding')
}
