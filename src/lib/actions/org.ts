'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Helper: verify the current user is an owner or admin of the given org.
 * Returns { user, membership } on success, or throws/returns null.
 */
async function requireOrgAdmin(orgId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Insufficient permissions' }
  }

  return { user, membership, supabase }
}

/**
 * Update organization name and/or slug. Owner/admin only.
 */
export async function updateOrganization(
  orgId: string,
  data: { name?: string; slug?: string }
): Promise<{ error?: string; success?: boolean }> {
  const result = await requireOrgAdmin(orgId)
  if ('error' in result) return { error: result.error }

  const { supabase } = result

  // Validate slug format if provided
  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  }

  // Check slug uniqueness if changing it
  if (data.slug) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', data.slug)
      .neq('id', orgId)
      .limit(1)
      .single()

    if (existing) {
      return { error: 'This slug is already taken.' }
    }
  }

  const updatePayload: Record<string, string> = {}
  if (data.name) updatePayload.name = data.name
  if (data.slug) updatePayload.slug = data.slug

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'Nothing to update.' }
  }

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove a member from the organization. Owner/admin only.
 * Cannot remove the last owner.
 */
export async function removeMember(
  orgId: string,
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  const result = await requireOrgAdmin(orgId)
  if ('error' in result) return { error: result.error }

  const { supabase } = result

  // Check if the target user is an owner
  const { data: targetMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!targetMember) {
    return { error: 'Member not found.' }
  }

  // If the target is an owner, make sure they're not the last one
  if (targetMember.role === 'owner') {
    const { count } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'owner')

    if (count !== null && count <= 1) {
      return { error: 'Cannot remove the last owner of the organization.' }
    }
  }

  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Update a member's role. Owner only.
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Only owners can change roles
  const { data: callerMembership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!callerMembership || callerMembership.role !== 'owner') {
    return { error: 'Only owners can change member roles.' }
  }

  // Validate role
  if (!['owner', 'admin', 'member'].includes(newRole)) {
    return { error: 'Invalid role.' }
  }

  // If demoting an owner, make sure they're not the last one
  if (newRole !== 'owner') {
    const { data: targetMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .single()

    if (targetMember?.role === 'owner') {
      const { count } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'owner')

      if (count !== null && count <= 1) {
        return { error: 'Cannot demote the last owner.' }
      }
    }
  }

  const { error } = await supabase
    .from('org_members')
    .update({ role: newRole })
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
