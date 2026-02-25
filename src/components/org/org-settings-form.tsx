'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganization } from '@/lib/actions/org'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface OrgSettingsFormProps {
  orgId: string
  initialName: string
  initialSlug: string
}

type FormState = { error?: string; success?: boolean } | null

export function OrgSettingsForm({
  orgId,
  initialName,
  initialSlug,
}: OrgSettingsFormProps) {
  const router = useRouter()

  const [state, formAction, pending] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      const name = formData.get('name') as string
      const slug = formData.get('slug') as string

      const result = await updateOrganization(orgId, { name, slug })

      if (result.success && slug !== initialSlug) {
        // Slug changed, redirect to new URL
        router.push(`/${slug}/settings`)
        router.refresh()
        return { success: true }
      }

      if (result.success) {
        router.refresh()
      }

      return result
    },
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          Update your organization name and URL slug
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              name="name"
              defaultValue={initialName}
              placeholder="Acme Inc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">URL slug</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>kollab.app/</span>
              <Input
                id="org-slug"
                name="slug"
                defaultValue={initialSlug}
                placeholder="acme-inc"
                required
                className="flex-1"
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          {state?.success && (
            <p className="text-sm text-green-600">Settings updated successfully.</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
