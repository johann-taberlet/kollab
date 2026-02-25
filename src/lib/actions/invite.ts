'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Create an invitation to join an org (and optionally a project).
 * Only owners/admins of the org can invite.
 */
export async function createInvitation(
  email: string,
  role: string,
  orgId: string,
  projectId?: string | null
): Promise<{ error?: string; inviteUrl?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify caller is owner/admin of the org
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Insufficient permissions' }
  }

  // Validate role
  if (!['admin', 'member'].includes(role)) {
    return { error: 'Invalid role. Must be admin or member.' }
  }

  // Check if user is already a member
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', existingProfile.id)
      .single()

    if (existingMember) {
      return { error: 'This user is already a member of the organization.' }
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email)
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return { error: 'A pending invitation already exists for this email.' }
  }

  // Create the invitation (token has a default via the DB, expires_at defaults to 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email,
      role,
      org_id: orgId,
      project_id: projectId ?? null,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('token')
    .single()

  if (error) {
    return { error: error.message }
  }

  const inviteUrl = `/invite/${invitation.token}`

  revalidatePath('/')
  return { inviteUrl }
}

/**
 * Cancel a pending invitation. Owner/admin only.
 */
export async function cancelInvitation(
  invitationId: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the invitation to get the org_id
  const { data: invitation } = await supabase
    .from('invitations')
    .select('org_id')
    .eq('id', invitationId)
    .single()

  if (!invitation || !invitation.org_id) {
    return { error: 'Invitation not found.' }
  }

  // Verify caller is owner/admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', invitation.org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Resend an invitation by updating its expiration date.
 */
export async function resendInvitation(
  invitationId: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('org_id')
    .eq('id', invitationId)
    .single()

  if (!invitation || !invitation.org_id) {
    return { error: 'Invitation not found.' }
  }

  // Verify caller is owner/admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', invitation.org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Insufficient permissions' }
  }

  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 7)

  const { error } = await supabase
    .from('invitations')
    .update({ expires_at: newExpiry.toISOString() })
    .eq('id', invitationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Accept an invitation by token.
 * Validates token, not expired, not already accepted.
 * Adds user to org_members (or project_members) and marks invitation accepted.
 */
export async function acceptInvitation(
  token: string
): Promise<{ error?: string; redirectTo?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to accept an invitation.' }
  }

  // Fetch the invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, organizations(slug)')
    .eq('token', token)
    .single()

  if (!invitation) {
    return { error: 'Invalid invitation.' }
  }

  if (invitation.accepted_at) {
    return { error: 'This invitation has already been accepted.' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired.' }
  }

  // Verify email matches
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found.' }
  }

  if (profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { error: `This invitation was sent to ${invitation.email}. You are logged in as ${profile.email}.` }
  }

  // Add to org_members if org invitation
  if (invitation.org_id) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', invitation.org_id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      const { error: memberError } = await supabase.from('org_members').insert({
        org_id: invitation.org_id,
        user_id: user.id,
        role: invitation.role,
      })

      if (memberError) {
        return { error: memberError.message }
      }
    }
  }

  // Add to project_members if project invitation
  if (invitation.project_id) {
    const { data: existing } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', invitation.project_id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      const { error: memberError } = await supabase.from('project_members').insert({
        project_id: invitation.project_id,
        user_id: user.id,
        role: invitation.role,
      })

      if (memberError) {
        return { error: memberError.message }
      }
    }
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/')

  // Determine redirect URL
  const orgData = invitation.organizations as { slug: string } | null
  if (orgData?.slug) {
    return { redirectTo: `/${orgData.slug}` }
  }

  return { redirectTo: '/' }
}
