import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users } from 'lucide-react'
import { OrgSettingsForm } from '@/components/org/org-settings-form'

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch the org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  // Check membership and role
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    notFound()
  }

  const isAdminOrOwner = membership.role === 'owner' || membership.role === 'admin'

  if (!isAdminOrOwner) {
    return (
      <div className="flex-1 p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Settings className="mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Only organization owners and admins can access settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organization Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your organization details
            </p>
          </div>
          <Link
            href={`/${orgSlug}/settings/members`}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="size-4" />
            Members
          </Link>
        </div>

        <OrgSettingsForm
          orgId={org.id}
          initialName={org.name}
          initialSlug={org.slug}
        />
      </div>
    </div>
  )
}
