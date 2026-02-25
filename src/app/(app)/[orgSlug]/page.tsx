import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Plus, FolderKanban, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch the org by slug
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  // Fetch all projects in the org
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  // Fetch member counts per project
  const projectIds = (projects ?? []).map((p) => p.id)
  let memberCounts: Record<string, number> = {}

  if (projectIds.length > 0) {
    const { data: members } = await supabase
      .from('project_members')
      .select('project_id')
      .in('project_id', projectIds)

    if (members) {
      memberCounts = members.reduce<Record<string, number>>((acc, m) => {
        acc[m.project_id] = (acc[m.project_id] ?? 0) + 1
        return acc
      }, {})
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-muted-foreground">Projects</p>
        </div>
        <Button disabled>
          <Plus className="mr-2 size-4" />
          New project
        </Button>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FolderKanban className="mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-semibold">No projects yet</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first project to start organizing your work.
          </p>
          <Button disabled>
            <Plus className="mr-2 size-4" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  <span>
                    {memberCounts[project.id] ?? 0}{' '}
                    {(memberCounts[project.id] ?? 0) === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
