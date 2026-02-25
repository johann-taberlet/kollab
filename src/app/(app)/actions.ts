'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/login')
}

export async function createOrganization(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!name || !slug) {
    return { error: 'Name and slug are required.' }
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  }

  // Check if slug is already taken
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .single()

  if (existing) {
    return { error: 'This slug is already taken. Please choose another.' }
  }

  // Create the organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      created_by: user.id,
    })
    .select()
    .single()

  if (orgError) {
    return { error: orgError.message }
  }

  // Add the user as owner
  const { error: memberError } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath('/')
  redirect(`/${slug}`)
}
