'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Create a new project with default columns ("To Do", "In Progress", "Done").
 * The caller is automatically added as a project member with the "owner" role.
 */
export async function createProject(
  orgId: string,
  name: string,
  description: string | null,
  color: string
): Promise<{ projectId: string } | { error: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify the user is a member of the org
  const { data: membership } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'You are not a member of this organization.' }
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      org_id: orgId,
      name,
      description,
      color,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: projectError?.message ?? 'Failed to create project.' }
  }

  // Add the creator as a project member with owner role
  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'owner',
  })

  // Create default columns
  const defaultColumns = [
    { name: 'To Do', position: 1000 },
    { name: 'In Progress', position: 2000 },
    { name: 'Done', position: 3000 },
  ]

  await supabase.from('columns').insert(
    defaultColumns.map((col) => ({
      project_id: project.id,
      name: col.name,
      position: col.position,
    }))
  )

  revalidatePath('/')
  return { projectId: project.id }
}

/**
 * Update a project's name, description, or color.
 */
export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; color?: string }
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify the user can access this project
  const { data: canAccess } = await supabase.rpc('can_access_project', {
    p_project_id: projectId,
  })

  if (!canAccess) {
    return { error: 'You do not have access to this project.' }
  }

  const updatePayload: Record<string, string> = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.color !== undefined) updatePayload.color = data.color

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'Nothing to update.' }
  }

  const { error } = await supabase
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Delete a project. Only org owner/admin or project owner can do this.
 */
export async function deleteProject(
  projectId: string
): Promise<{ error?: string; success?: boolean }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the project to get the org_id
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id, created_by')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { error: 'Project not found.' }
  }

  // Check if user is the project creator
  const isCreator = project.created_by === user.id

  // Check if user is an org owner or admin
  const { data: orgMembership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', project.org_id)
    .eq('user_id', user.id)
    .single()

  const isOrgAdmin =
    orgMembership?.role === 'owner' || orgMembership?.role === 'admin'

  if (!isCreator && !isOrgAdmin) {
    return { error: 'Only the project creator or org admins can delete projects.' }
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
