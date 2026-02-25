import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch the org by slug
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  // Verify user has access (is a member of the org)
  const { data: membership } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    notFound()
  }

  return <>{children}</>
}
