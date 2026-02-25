import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; projectId: string }>
}) {
  const { orgSlug, projectId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Verify the user can access this project
  const { data: canAccess } = await supabase.rpc('can_access_project', {
    p_project_id: projectId,
  })

  if (!canAccess) {
    notFound()
  }

  // Fetch the project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-3">
        <Link
          href={`/${orgSlug}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold">{project.name}</h1>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
