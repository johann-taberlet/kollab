import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, UserPlus, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { MemberActions } from '@/components/org/member-actions'
import { InviteDialog } from '@/components/org/invite-dialog'
import { InvitationActions } from '@/components/org/invitation-actions'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case 'owner':
      return 'default' as const
    case 'admin':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export default async function MembersPage({
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
  const { data: currentMembership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!currentMembership) {
    notFound()
  }

  const isAdminOrOwner =
    currentMembership.role === 'owner' || currentMembership.role === 'admin'
  const isOwner = currentMembership.role === 'owner'

  if (!isAdminOrOwner) {
    return (
      <div className="flex-1 p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Settings className="mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Only organization owners and admins can manage members.
          </p>
        </div>
      </div>
    )
  }

  // Fetch all org members with profiles
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, created_at, profiles(id, full_name, email, avatar_url)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('org_id', org.id)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/${orgSlug}/settings`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to settings
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Members</h1>
              <p className="text-sm text-muted-foreground">
                Manage who has access to {org.name}
              </p>
            </div>
            <InviteDialog orgId={org.id} orgSlug={orgSlug}>
              <Button>
                <UserPlus className="mr-2 size-4" />
                Invite member
              </Button>
            </InviteDialog>
          </div>
        </div>

        {/* Members list */}
        <div className="rounded-lg border">
          <div className="p-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {members?.length ?? 0} {(members?.length ?? 0) === 1 ? 'member' : 'members'}
            </h2>
          </div>
          <Separator />
          <div className="divide-y">
            {(members ?? []).map((member) => {
              const profile = member.profiles as unknown as {
                id: string
                full_name: string
                email: string
                avatar_url: string | null
              }
              if (!profile) return null

              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar size="default">
                      {profile.avatar_url && (
                        <AvatarImage
                          src={profile.avatar_url}
                          alt={profile.full_name}
                        />
                      )}
                      <AvatarFallback>
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {profile.full_name}
                        {member.user_id === user.id && (
                          <span className="ml-1 text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    {isAdminOrOwner && member.user_id !== user.id && (
                      <MemberActions
                        orgId={org.id}
                        userId={member.user_id}
                        currentRole={member.role}
                        isOwner={isOwner}
                        memberName={profile.full_name}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending invitations */}
        {invitations && invitations.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Pending invitations</h2>
            <div className="rounded-lg border">
              <div className="divide-y">
                {invitations.map((invitation) => {
                  const isExpired =
                    new Date(invitation.expires_at) < new Date()

                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          <AvatarFallback>
                            {invitation.email[0]?.toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {invitation.email}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {isExpired ? (
                              <span className="text-destructive">Expired</span>
                            ) : (
                              <span>
                                Expires{' '}
                                {new Date(
                                  invitation.expires_at
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={roleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <InvitationActions invitationId={invitation.id} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
